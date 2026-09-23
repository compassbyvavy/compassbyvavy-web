/**
 * One ingestion cycle: due sources → fetch → snapshot → hash gate → clean →
 * extract → normalize → match → change set → candidates → source marks.
 *
 * Design rules that matter more than throughput:
 * - **Sequential.** One source at a time, one request per source per cycle. A
 *   camp provider's site is not a load test.
 * - **Isolated failures.** A source that throws is recorded in the run summary
 *   and the cycle continues; one broken page cannot stop the others.
 * - **Hash gate first.** Unchanged content skips extraction, matching, and the
 *   review queue entirely.
 * - **Only stated facts are diffed.** A field the source did not state is not
 *   proposed as `null` and not reported as removed — an incomplete read must
 *   never look like a deletion. Whole sessions that vanish are flagged
 *   separately as `possible_removed_session`.
 * - **Nothing is published.** The cycle writes ingestion tables only. Candidates
 *   wait for a human; approval records reviewed truth, and publishing to the
 *   parent-facing catalog is a separate, explicit step.
 */

import type {
  CampCandidate,
  CampExtractedRecord,
  CampIngestionRunSummary,
  CampSource,
  CampSourceSnapshot,
  ExtractedRecordType,
  IngestionQualityFlag,
  MatchResult,
} from "@/data/camps/ingestion/types";
import { sameCanonicalUrl } from "@/lib/camps/ingestion/canonicalizeUrl";
import { generateChangeSet, hasMaterialChanges } from "@/lib/camps/ingestion/changeSet";
import {
  resolveExtractor,
  type ResolveExtractorInput,
} from "@/lib/camps/ingestion/extractors/registry";
import {
  extractorVersionLabel,
  type CampExtractor,
  type ExtractorResult,
} from "@/lib/camps/ingestion/extractors/types";
import type { CampSourceFetcher } from "@/lib/camps/ingestion/fetcher";
import { nextCheckAtFrom } from "@/lib/camps/ingestion/freshness";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { newIngestionId, type IdFactory } from "@/lib/camps/ingestion/ids";
import {
  exactProgramMatcher,
  exactProviderMatcher,
  exactSessionMatcher,
  exactVenueMatcher,
  normalizeMatchText,
} from "@/lib/camps/ingestion/matchers";
import {
  compareFactFingerprints,
  hashFactFingerprint,
} from "@/lib/camps/ingestion/factFingerprint";
import { sourceContentUnchanged } from "@/lib/camps/ingestion/hash";
import { decideExtraction, resolveCandidateOutcome } from "@/lib/camps/ingestion/pipeline";
import {
  applyMatchQualityFlags,
  mergeQualityFlags,
  qualityFlagsForExtractedSession,
} from "@/lib/camps/ingestion/qualityFlags";
import type {
  CampIngestionStore,
  IngestionCatalogSnapshot,
} from "@/lib/camps/ingestion/repositories/types";

export type RunDueCampSourcesOptions = {
  store: CampIngestionStore;
  fetcher: CampSourceFetcher;
  /** Published rows to match against. Read-only — never written by this run. */
  catalog: IngestionCatalogSnapshot;
  now?: () => Date;
  newId?: IdFactory;
  /** Cap on sources processed in this cycle. */
  limit?: number;
  /** Re-extract even when the content hash is unchanged. */
  force?: boolean;
  extractors?: readonly CampExtractor[];
  /** Flag catalog sessions a source stopped listing (default true). */
  detectRemovals?: boolean;
};

/**
 * Strategies a machine may read. Anything else — `manual`, `browser`, `pdf`,
 * `api` — is recorded as checked-and-unsupported without a request: a source
 * marked for human handling must never be fetched because it happened to
 * come due.
 */
const FETCHABLE_CRAWL_STRATEGIES: ReadonlySet<CampSource["crawlStrategy"]> = new Set(["html"]);

/** Catalog-comparable fields per record type. Plumbing keys stay out of diffs. */
const DIFF_FIELDS: Record<ExtractedRecordType, readonly string[]> = {
  provider: ["name", "websiteUrl", "registrationInfoUrl"],
  program: ["name", "slug", "typicalAgeMin", "typicalAgeMax", "primaryCategory"],
  session: [
    "startDate",
    "endDate",
    "ageMin",
    "ageMax",
    "themeTitle",
    "priceTierKey",
    "priceAmount",
    "priceUnit",
    "currency",
    "addOnFeeCad",
    "addOnLabel",
    "outingLabel",
    "coreHoursStart",
    "coreHoursEnd",
    "registrationUrl",
    "venueId",
  ],
  venue: ["name", "addressLine", "city", "province", "postalCode"],
};

export async function runDueCampSources(
  options: RunDueCampSourcesOptions,
): Promise<CampIngestionRunSummary> {
  const { store, fetcher, catalog } = options;
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? newIngestionId;

  const summary: CampIngestionRunSummary = {
    id: newId(),
    startedAt: now().toISOString(),
    completedAt: null,
    sourcesAttempted: 0,
    sourcesSucceeded: 0,
    sourcesUnchanged: 0,
    sourcesNonSemanticChange: 0,
    sourcesChanged: 0,
    extractionsSucceeded: 0,
    candidatesCreated: 0,
    errors: [],
  };

  const dueSources = await store.sources.listDueSources(now(), options.limit);

  for (const source of dueSources) {
    summary.sourcesAttempted += 1;
    try {
      await processSource({ ...options, store, fetcher, catalog, now, newId, source, summary });
    } catch (error) {
      // Isolation: one bad source never aborts the cycle.
      summary.errors.push({ sourceId: source.id, message: describeError(error) });
      await markCheckedSafely(store, {
        sourceId: source.id,
        checkedAt: now().toISOString(),
        changed: false,
        successful: false,
        nextCheckAt: nextCheckAtFrom(source, now()),
        error: describeError(error),
      });
    }
  }

  summary.completedAt = now().toISOString();
  await store.runs.saveRunSummary(summary);
  return summary;
}

export type RunCampSourceOptions = Omit<RunDueCampSourcesOptions, "limit"> & {
  /** Registered source id — never an arbitrary URL. */
  sourceId: string;
};

/**
 * Single-source run outcome for operators / future schedulers.
 *
 * RAW UNCHANGED → `unchanged_raw` (alias: `unchanged`)
 * FACTS UNCHANGED → `unchanged_facts` (alias: `non_semantic_change`)
 * FACTS CHANGED → `changed_facts` (alias: `changed`)
 * First successful facts → `baseline`
 * Fingerprint algorithm version moved with raw also changed → `fingerprint_version_changed`
 * Stored older fingerprint recomputed on unchanged raw → `fingerprint_rebaseline`
 */
export type CampSourceRunStatus =
  | "unchanged_raw"
  | "unchanged"
  | "unchanged_facts"
  | "non_semantic_change"
  | "changed_facts"
  | "changed"
  | "baseline"
  | "fingerprint_version_changed"
  | "fingerprint_rebaseline"
  | "partial"
  | "blocked"
  | "failed";

/**
 * Structured result of a single-source ingestion pass.
 * Suitable for a future scheduler to invoke: `runCampSource({ sourceId, ... })`.
 */
export type CampSourceRunResult = {
  sourceId: string;
  status: CampSourceRunStatus;
  snapshotId: string | null;
  extractionRunId: string | null;
  extractedRecords: number;
  candidateIds: string[];
  warnings: string[];
  durationMs: number;
  summary: CampIngestionRunSummary;
};

/**
 * Run the full Prompt 8A/9A path for one registered source:
 *
 *   registered source → fetch → raw hash
 *     same → STOP (`unchanged_raw`)
 *     different → extract + normalize → semantic fact fingerprint
 *       same version + same hash → persist check → STOP (`unchanged_facts`)
 *       no previous fingerprint → baseline → candidates
 *       version mismatch → continue candidates (never claim unchanged)
 *       facts changed → field diff → candidate → human review
 *
 * Does not schedule itself. Does not publish. Unregistered ids never fetch.
 */
export async function runCampSource(
  options: RunCampSourceOptions,
): Promise<CampSourceRunResult> {
  const { store, sourceId } = options;
  const started = Date.now();
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? newIngestionId;

  const emptySummary = (): CampIngestionRunSummary => ({
    id: newId(),
    startedAt: now().toISOString(),
    completedAt: null,
    sourcesAttempted: 0,
    sourcesSucceeded: 0,
    sourcesUnchanged: 0,
    sourcesNonSemanticChange: 0,
    sourcesChanged: 0,
    extractionsSucceeded: 0,
    candidatesCreated: 0,
    errors: [],
  });

  const source = await store.sources.getSource(sourceId);
  if (!source) {
    const summary = emptySummary();
    summary.sourcesAttempted = 1;
    summary.completedAt = now().toISOString();
    summary.errors.push({ sourceId, message: "source_not_registered" });
    await store.runs.saveRunSummary(summary);
    return {
      sourceId,
      status: "failed",
      snapshotId: null,
      extractionRunId: null,
      extractedRecords: 0,
      candidateIds: [],
      warnings: ["source_not_registered"],
      durationMs: Date.now() - started,
      summary,
    };
  }

  if (!source.isActive) {
    const summary = emptySummary();
    summary.sourcesAttempted = 1;
    summary.completedAt = now().toISOString();
    summary.errors.push({ sourceId, message: "source_inactive" });
    await store.runs.saveRunSummary(summary);
    return {
      sourceId,
      status: "blocked",
      snapshotId: null,
      extractionRunId: null,
      extractedRecords: 0,
      candidateIds: [],
      warnings: ["source_inactive"],
      durationMs: Date.now() - started,
      summary,
    };
  }

  const summary = emptySummary();
  summary.sourcesAttempted = 1;
  const candidatesBefore = await store.candidates.listCandidates({ sourceId });
  const candidateIdsBefore = new Set(candidatesBefore.map((candidate) => candidate.id));

  try {
    await processSource({
      ...options,
      store,
      fetcher: options.fetcher,
      catalog: options.catalog,
      now,
      newId,
      source,
      summary,
    });
  } catch (error) {
    summary.errors.push({ sourceId, message: describeError(error) });
    await markCheckedSafely(store, {
      sourceId,
      checkedAt: now().toISOString(),
      changed: false,
      successful: false,
      nextCheckAt: nextCheckAtFrom(source, now()),
      error: describeError(error),
    });
  }

  summary.completedAt = now().toISOString();
  await store.runs.saveRunSummary(summary);

  const snapshot = await store.snapshots.latestSnapshot(sourceId);
  let extractionRunId: string | null = null;
  let extractedRecords = 0;
  let extractionWarnings: string[] = [];
  let extractionStatus: string | null = null;

  if (snapshot) {
    const runs = await store.extractions.listExtractionRuns();
    const run = runs
      .filter((candidate) => candidate.snapshotId === snapshot.id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    if (run) {
      extractionRunId = run.id;
      extractionStatus = run.status;
      extractionWarnings = run.warnings ?? [];
      const records = await store.extractions.listExtractedRecords(run.id);
      extractedRecords = records.length;
    }
  }

  const candidatesAfter = await store.candidates.listCandidates({ sourceId });
  const candidateIds = candidatesAfter
    .filter((candidate) => !candidateIdsBefore.has(candidate.id))
    .map((candidate) => candidate.id);

  const warnings = [
    ...summary.errors.map((error) => error.message),
    ...extractionWarnings,
  ];

  let status: CampSourceRunStatus = "failed";
  if (warnings.includes("fingerprint_rebaseline")) {
    status = "fingerprint_rebaseline";
  } else if (summary.sourcesNonSemanticChange > 0) status = "unchanged_facts";
  else if (summary.sourcesUnchanged > 0) status = "unchanged_raw";
  else if (warnings.includes("fingerprint_version_changed")) {
    status = "fingerprint_version_changed";
  } else if (warnings.includes("fact_fingerprint_baseline")) {
    status = "baseline";
  } else if (
    extractionStatus === "partial" ||
    summary.errors.some((error) => /partial/i.test(error.message))
  ) {
    status = "partial";
  } else if (
    snapshot &&
    (snapshot.fetchStatus === "blocked" || snapshot.fetchStatus === "unsupported")
  ) {
    status = "blocked";
  } else if (summary.sourcesChanged > 0 && summary.extractionsSucceeded > 0) {
    status = "changed_facts";
  } else if (summary.errors.length > 0 || snapshot?.fetchStatus === "error") {
    status = "failed";
  } else if (summary.sourcesSucceeded > 0) {
    status = "changed_facts";
  }

  return {
    sourceId,
    status,
    snapshotId: snapshot?.id ?? null,
    extractionRunId,
    extractedRecords,
    candidateIds,
    warnings: [...new Set(warnings)],
    durationMs: Date.now() - started,
    summary,
  };
}

type ProcessSourceInput = RunDueCampSourcesOptions & {
  now: () => Date;
  newId: IdFactory;
  source: CampSource;
  summary: CampIngestionRunSummary;
};

async function processSource(input: ProcessSourceInput): Promise<void> {
  const { store, fetcher, source, summary, now, newId } = input;
  const checkedAt = now();
  const checkedAtIso = checkedAt.toISOString();
  const nextCheckAt = nextCheckAtFrom(source, checkedAt);

  if (!FETCHABLE_CRAWL_STRATEGIES.has(source.crawlStrategy)) {
    await markCheckedSafely(store, {
      sourceId: source.id,
      checkedAt: checkedAtIso,
      changed: false,
      successful: false,
      nextCheckAt,
      error: `crawl_strategy_not_fetchable:${source.crawlStrategy}`,
    });
    return;
  }

  const previousSnapshot = await store.snapshots.latestSnapshot(source.id);
  const fetched = await fetcher.fetchSource(source, {
    now: checkedAt,
    previousSnapshot,
    snapshotId: newId(),
  });
  const snapshot = await store.snapshots.saveSnapshot(fetched);

  const previousHash = previousContentHash(source, previousSnapshot);
  const decision = decideExtraction({
    snapshot,
    previousHash,
    previousFactFingerprint: source.lastFactFingerprint,
    force: input.force,
  });

  if (!decision.shouldExtract) {
    await handleStop({ ...input, snapshot, checkedAtIso, nextCheckAt, decisionOutcome: decision.outcome });
    return;
  }

  const rawHtml = snapshot.rawContent ?? "";
  const document = cleanHtmlToDocument(rawHtml, { baseUrl: source.canonicalUrl });
  const extractorInput: ResolveExtractorInput = {
    source,
    document,
    rawHtml,
    extractors: input.extractors,
  };
  const extractor = resolveExtractor(extractorInput);
  const extractionRunId = newId();
  const extractorVersion = extractorVersionLabel(extractor);

  // Written before the records that reference it, and again once the pipeline
  // has finished, so a crashed cycle leaves a visible `running` row.
  await store.extractions.saveExtractionRun({
    id: extractionRunId,
    snapshotId: snapshot.id,
    extractorVersion,
    startedAt: checkedAtIso,
    completedAt: null,
    status: "running",
    warnings: [],
    error: null,
  });

  let result: ExtractorResult;
  try {
    result = extractor.extract({
      source,
      snapshot,
      document,
      rawHtml,
      extractionRunId,
      newId,
      now: checkedAt,
    });
  } catch (error) {
    result = {
      status: "failed",
      records: [],
      warnings: [`extractor_threw:${describeError(error)}`],
    };
  }

  if (result.records.length > 0) {
    await store.extractions.saveExtractedRecords(result.records);
  }

  const pipelineWarnings: string[] = [];
  const factFingerprint =
    result.status === "failed" || result.records.length === 0
      ? null
      : hashFactFingerprint(result.records);

  // Persist fingerprint on the snapshot whenever extraction produced facts —
  // including the "raw changed, facts same" path — so the check is auditable.
  if (factFingerprint) {
    await store.snapshots.saveSnapshot({ ...snapshot, factFingerprint });
  }

  const fingerprintComparison = compareFactFingerprints(
    source.lastFactFingerprint,
    factFingerprint,
  );
  const rawUnchanged = Boolean(
    previousHash && sourceContentUnchanged(previousHash, snapshot.contentHash),
  );
  const factsSame =
    !input.force && fingerprintComparison.kind === "unchanged";

  if (
    result.status !== "failed" &&
    !input.force &&
    fingerprintComparison.kind === "version_mismatch" &&
    rawUnchanged
  ) {
    // CASE A: stored older fingerprint + same raw → persist v2, no candidates.
    pipelineWarnings.push("fingerprint_rebaseline");
    pipelineWarnings.push(
      `fingerprint_version:${fingerprintComparison.previousVersion}->${fingerprintComparison.nextVersion}`,
    );
    await store.extractions.saveExtractionRun({
      id: extractionRunId,
      snapshotId: snapshot.id,
      extractorVersion,
      startedAt: checkedAtIso,
      completedAt: now().toISOString(),
      status: result.status,
      warnings: [...result.warnings, ...pipelineWarnings],
      error: null,
    });
    summary.sourcesSucceeded += 1;
    summary.extractionsSucceeded += 1;
    await markCheckedSafely(store, {
      sourceId: source.id,
      checkedAt: checkedAtIso,
      contentHash: snapshot.contentHash,
      factFingerprint,
      changed: false,
      successful: true,
      nextCheckAt,
      error: null,
    });
    return;
  }

  if (result.status !== "failed" && factsSame) {
    // REGISTERED → FETCH → RAW HASH different → EXTRACT → FACT FINGERPRINT same.
    // Persist freshness/provenance, then STOP with no candidate / review.
    pipelineWarnings.push("non_semantic_source_change");
    pipelineWarnings.push("unchanged_facts");
    await store.extractions.saveExtractionRun({
      id: extractionRunId,
      snapshotId: snapshot.id,
      extractorVersion,
      startedAt: checkedAtIso,
      completedAt: now().toISOString(),
      status: result.status,
      warnings: [...result.warnings, ...pipelineWarnings],
      error: null,
    });
    summary.sourcesNonSemanticChange += 1;
    summary.sourcesSucceeded += 1;
    summary.extractionsSucceeded += 1;
    await markCheckedSafely(store, {
      sourceId: source.id,
      checkedAt: checkedAtIso,
      contentHash: snapshot.contentHash,
      factFingerprint,
      changed: false,
      successful: true,
      nextCheckAt,
      error: null,
    });
    return;
  }

  if (result.status !== "failed") {
    if (fingerprintComparison.kind === "baseline") {
      pipelineWarnings.push("fact_fingerprint_baseline");
    } else if (fingerprintComparison.kind === "version_mismatch") {
      pipelineWarnings.push("fingerprint_version_changed");
      pipelineWarnings.push(
        `fingerprint_version:${fingerprintComparison.previousVersion}->${fingerprintComparison.nextVersion}`,
      );
      if (!rawUnchanged) {
        pipelineWarnings.push("fingerprint_version_transition");
        pipelineWarnings.push("fingerprint_version_transition_with_raw_change");
      }
    } else if (fingerprintComparison.kind === "changed") {
      pipelineWarnings.push("changed_facts");
    }
    summary.sourcesChanged += 1;
    await buildCandidates({
      ...input,
      snapshot,
      result,
      checkedAtIso,
      pipelineWarnings,
      extractor,
    });
  }

  await store.extractions.saveExtractionRun({
    id: extractionRunId,
    snapshotId: snapshot.id,
    extractorVersion,
    startedAt: checkedAtIso,
    completedAt: now().toISOString(),
    status: result.status,
    warnings: [...result.warnings, ...pipelineWarnings],
    error: result.status === "failed" ? "extraction_failed" : null,
  });

  if (result.status === "failed") {
    summary.errors.push({
      sourceId: source.id,
      message: `extraction_failed: ${result.warnings.join("; ") || "no records"}`,
    });
    // The content hash is deliberately not recorded: the next cycle must retry
    // this content once the extractor can read it. Fact fingerprint is also
    // left alone so a prior good fingerprint can still short-circuit later.
    await markCheckedSafely(store, {
      sourceId: source.id,
      checkedAt: checkedAtIso,
      changed: true,
      successful: false,
      nextCheckAt,
      error: "extraction_failed",
    });
    return;
  }

  summary.extractionsSucceeded += 1;
  summary.sourcesSucceeded += 1;
  await markCheckedSafely(store, {
    sourceId: source.id,
    checkedAt: checkedAtIso,
    contentHash: snapshot.contentHash,
    factFingerprint,
    changed: true,
    successful: true,
    nextCheckAt,
    error: null,
  });
}

type HandleStopInput = ProcessSourceInput & {
  snapshot: CampSourceSnapshot;
  checkedAtIso: string;
  nextCheckAt: string;
  decisionOutcome: ReturnType<typeof decideExtraction>["outcome"];
};

async function handleStop(input: HandleStopInput): Promise<void> {
  const { store, source, summary, snapshot, checkedAtIso, nextCheckAt } = input;

  if (input.decisionOutcome === "UNCHANGED_SOURCE") {
    summary.sourcesUnchanged += 1;
    summary.sourcesSucceeded += 1;
    await markCheckedSafely(store, {
      sourceId: source.id,
      checkedAt: checkedAtIso,
      contentHash: snapshot.contentHash,
      changed: false,
      successful: true,
      nextCheckAt,
      error: null,
    });
    return;
  }

  const message = snapshot.fetchError ?? `fetch_${snapshot.fetchStatus}`;
  if (input.decisionOutcome !== "UNSUPPORTED") {
    // Unsupported sources are a known limitation, not a run failure.
    summary.errors.push({ sourceId: source.id, message });
  }
  await markCheckedSafely(store, {
    sourceId: source.id,
    checkedAt: checkedAtIso,
    changed: false,
    successful: false,
    nextCheckAt,
    error: message,
  });
}

type BuildCandidatesInput = ProcessSourceInput & {
  snapshot: CampSourceSnapshot;
  result: ExtractorResult;
  checkedAtIso: string;
  /** Warnings recorded on the extraction run (not the candidates). */
  pipelineWarnings: string[];
  extractor: CampExtractor;
};

async function buildCandidates(input: BuildCandidatesInput): Promise<void> {
  const { store, catalog, source, snapshot, result, summary, checkedAtIso, newId, extractor } =
    input;
  const extractionPartial = result.status === "partial";

  // Programs first: a session's program is how it finds its catalog sibling.
  const programIdByName = new Map<string, MatchResult>();
  for (const record of result.records) {
    if (record.recordType !== "program") continue;
    const match = exactProgramMatcher.match(record, catalog.programs);
    const name = normalizeMatchText(record.normalizedFields.name);
    if (name) programIdByName.set(name, match);
  }

  const matchedSessionIds = new Set<string>();
  let sessionRecordsSeen = 0;

  for (const record of result.records) {
    const { match, resolvedProgramId } = matchRecord({
      record,
      catalog,
      programIdByName,
      grain: extractor.grain,
    });
    if (record.recordType === "session") {
      sessionRecordsSeen += 1;
      if (match.catalogId) matchedSessionIds.add(match.catalogId);
    }

    const statedFields = pickStatedFields(record, resolvedProgramId);
    const currentFields = match.catalogId
      ? currentCatalogFields(record.recordType, match.catalogId, catalog, Object.keys(statedFields))
      : null;

    const changeSet = generateChangeSet(currentFields, statedFields, {
      confidenceByField: confidenceByFieldFrom(record),
      defaultConfidence: record.confidence,
      sourceSnapshotId: snapshot.id,
    });

    const fieldFlags: IngestionQualityFlag[] =
      record.recordType === "session"
        ? qualityFlagsForExtractedSession(record.normalizedFields, { extractionPartial })
        : extractionPartial
          ? ["extraction_partial"]
          : [];
    const qualityFlags = applyMatchQualityFlags(fieldFlags, {
      matchedCatalogId: match.catalogId,
      matchConfidence: match.confidence,
      reasons: match.reasons,
      sourceRecordIds: [record.id],
    });

    const resolution = resolveCandidateOutcome({
      matchedCatalogId: match.catalogId,
      hasMaterialChanges: hasMaterialChanges(changeSet),
      qualityFlags,
    });

    const candidateData = { ...record.normalizedFields };
    delete candidateData.observations;

    const transitionNote = input.pipelineWarnings.includes(
      "fingerprint_version_transition_with_raw_change",
    )
      ? " fingerprint_version_transition_with_raw_change"
      : "";

    const candidate: CampCandidate = {
      id: newId(),
      candidateType: record.recordType,
      sourceRecordIds: [record.id],
      matchedCatalogId: match.catalogId,
      matchConfidence: match.confidence,
      candidateData,
      changeSet,
      status: resolution.status,
      reviewReason: `${resolution.reviewReason} (${match.reasons.join(", ")})${transitionNote}`,
      qualityFlags,
      pipelineOutcome: resolution.pipelineOutcome,
      sourceId: source.id,
      snapshotId: snapshot.id,
      createdAt: checkedAtIso,
      updatedAt: checkedAtIso,
    };
    await store.candidates.saveCandidate(candidate);
    summary.candidatesCreated += 1;
  }

  if (input.detectRemovals !== false && sessionRecordsSeen > 0) {
    await flagRemovedSessions({ ...input, matchedSessionIds, sessionRecordsSeen });
  }
}

type MatchRecordInput = {
  record: CampExtractedRecord;
  catalog: IngestionCatalogSnapshot;
  programIdByName: Map<string, MatchResult>;
  grain: CampExtractor["grain"];
};

function matchRecord(input: MatchRecordInput): {
  match: MatchResult;
  resolvedProgramId: string | null;
} {
  const { record, catalog, programIdByName, grain } = input;

  switch (record.recordType) {
    case "provider":
      return { match: exactProviderMatcher.match(record, catalog.providers), resolvedProgramId: null };
    case "venue":
      return { match: exactVenueMatcher.match(record, catalog.venues), resolvedProgramId: null };
    case "program":
      return { match: exactProgramMatcher.match(record, catalog.programs), resolvedProgramId: null };
    case "session": {
      const resolvedProgramId = resolveProgramId(record, catalog, programIdByName);
      const forMatching: CampExtractedRecord = resolvedProgramId
        ? {
            ...record,
            normalizedFields: { ...record.normalizedFields, programId: resolvedProgramId },
          }
        : record;
      return {
        match: exactSessionMatcher.match(forMatching, catalog.sessions, grain),
        resolvedProgramId,
      };
    }
  }
}

/**
 * A session record rarely states a catalog program id. It is resolved from a
 * program record on the same page, then from the program name scoped to the
 * source's provider. An unresolvable program leaves the session unmatched,
 * which surfaces as a `new` candidate for a human rather than a guess.
 */
function resolveProgramId(
  record: CampExtractedRecord,
  catalog: IngestionCatalogSnapshot,
  programIdByName: Map<string, MatchResult>,
): string | null {
  const stated = record.normalizedFields.programId;
  if (typeof stated === "string" && stated !== "") return stated;

  const programName = normalizeMatchText(record.normalizedFields.programName);
  if (programName) {
    const fromPage = programIdByName.get(programName);
    if (fromPage?.catalogId) return fromPage.catalogId;
  }

  const providerId = record.normalizedFields.providerId;
  const nameForMatch = record.normalizedFields.programName;
  if (typeof nameForMatch === "string" && nameForMatch !== "") {
    const match = exactProgramMatcher.match(
      {
        ...record,
        recordType: "program",
        normalizedFields: { name: nameForMatch, providerId },
      },
      catalog.programs,
    );
    if (match.catalogId) return match.catalogId;
  }
  return null;
}

/** Only fields the source actually stated. Unstated is not `null`. */
function pickStatedFields(
  record: CampExtractedRecord,
  resolvedProgramId: string | null,
): Record<string, unknown> {
  const stated: Record<string, unknown> = {};
  for (const field of DIFF_FIELDS[record.recordType]) {
    const value = record.normalizedFields[field];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    stated[field] = value;
  }
  if (record.recordType === "session" && resolvedProgramId) {
    stated.programId = resolvedProgramId;
  }
  return stated;
}

function currentCatalogFields(
  recordType: ExtractedRecordType,
  catalogId: string,
  catalog: IngestionCatalogSnapshot,
  fields: readonly string[],
): Record<string, unknown> | null {
  const row = findCatalogRow(recordType, catalogId, catalog);
  if (!row) return null;
  const current: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in row) current[field] = (row as Record<string, unknown>)[field];
  }
  return current;
}

function findCatalogRow(
  recordType: ExtractedRecordType,
  catalogId: string,
  catalog: IngestionCatalogSnapshot,
): Record<string, unknown> | null {
  const collection =
    recordType === "provider"
      ? catalog.providers
      : recordType === "program"
        ? catalog.programs
        : recordType === "session"
          ? catalog.sessions
          : catalog.venues;
  return (
    (collection as ReadonlyArray<{ id: string }>).find((row) => row.id === catalogId) ?? null
  ) as Record<string, unknown> | null;
}

/** Per-field confidence from the extractor's field observations. */
function confidenceByFieldFrom(record: CampExtractedRecord): Record<string, number> {
  const observations = record.normalizedFields.observations;
  if (!observations || typeof observations !== "object") return {};
  const confidences: Record<string, number> = {};
  for (const [field, observation] of Object.entries(observations as Record<string, unknown>)) {
    if (!observation || typeof observation !== "object") continue;
    const confidence = (observation as { confidence?: unknown }).confidence;
    if (typeof confidence === "number") confidences[field] = confidence;
  }
  return confidences;
}

type FlagRemovedSessionsInput = BuildCandidatesInput & {
  matchedSessionIds: Set<string>;
  sessionRecordsSeen: number;
};

/**
 * A catalog session this source used to list, absent from a successful read of
 * the same page, is *possibly* removed — flagged for a human, never deleted.
 *
 * Three guards keep a parsing regression from looking like a week of
 * cancellations:
 * - the extraction must be fully successful, not partial;
 * - the page must have stated at least one session at all;
 * - the read must cover at least half the sessions on record for this page.
 *   A page that used to give us eight weeks and now parses as one is an
 *   incomplete read, so the shortfall is recorded as an extraction warning
 *   instead of seven removal candidates.
 *
 * Only catalog sessions whose `sourceUrl` canonically matches this source are
 * considered — another page's sessions are not this source's to judge.
 */
async function flagRemovedSessions(input: FlagRemovedSessionsInput): Promise<void> {
  const { store, catalog, source, snapshot, summary, checkedAtIso, newId, result } = input;
  if (result.status !== "success") return;

  const attributed = catalog.sessions.filter((session) =>
    sameCanonicalUrl(session.sourceUrl, source.canonicalUrl),
  );
  if (attributed.length === 0) return;

  if (input.sessionRecordsSeen * 2 < attributed.length) {
    input.pipelineWarnings.push(
      `removal_detection_skipped_low_coverage:${input.sessionRecordsSeen}_of_${attributed.length}`,
    );
    return;
  }

  for (const session of attributed) {
    if (input.matchedSessionIds.has(session.id)) continue;

    const qualityFlags = mergeQualityFlags(["possible_removed_session"]);
    const resolution = resolveCandidateOutcome({
      matchedCatalogId: session.id,
      hasMaterialChanges: false,
      qualityFlags,
    });
    const candidate: CampCandidate = {
      id: newId(),
      candidateType: "session",
      sourceRecordIds: [],
      matchedCatalogId: session.id,
      matchConfidence: null,
      candidateData: {},
      changeSet: [],
      status: resolution.status,
      reviewReason: resolution.reviewReason,
      qualityFlags,
      pipelineOutcome: resolution.pipelineOutcome,
      sourceId: source.id,
      snapshotId: snapshot.id,
      createdAt: checkedAtIso,
      updatedAt: checkedAtIso,
    };
    await store.candidates.saveCandidate(candidate);
    summary.candidatesCreated += 1;
  }
}

/**
 * The hash to compare against: the one recorded on the source, falling back to
 * the previous *successful* snapshot. An error snapshot's synthetic hash must
 * never be mistaken for page content.
 */
function previousContentHash(
  source: CampSource,
  previousSnapshot: CampSourceSnapshot | null,
): string | null {
  if (source.lastContentHash) return source.lastContentHash;
  if (previousSnapshot?.fetchStatus === "success") return previousSnapshot.contentHash;
  return null;
}

async function markCheckedSafely(
  store: CampIngestionStore,
  mark: Parameters<CampIngestionStore["sources"]["markSourceChecked"]>[0],
): Promise<void> {
  try {
    await store.sources.markSourceChecked(mark);
  } catch {
    // Bookkeeping must not mask the outcome already recorded in the summary.
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
