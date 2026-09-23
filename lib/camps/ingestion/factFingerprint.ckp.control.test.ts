/**
 * Prompt 9A — Creative Kids Place semantic fingerprint control.
 *
 * Proves:
 * - raw chrome changes do not create review work
 * - meaningful fact changes do
 * - age-band changes are identity-bearing (8B): no silent same-session match
 *
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type {
  CampExtractedRecord,
  CampSource,
  CampSourceSnapshot,
} from "@/data/camps/ingestion/types";
import {
  FACT_FINGERPRINT_VERSION,
  compareFactFingerprints,
  hashFactFingerprint,
} from "@/lib/camps/ingestion/factFingerprint";
import { creativeKidsPlaceExtractor } from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
import { CREATIVE_KIDS_PLACE_OFFERING_GRAIN } from "@/lib/camps/ingestion/extractors/offeringGrain";
import { FixtureSourceFetcher } from "@/lib/camps/ingestion/fetcher";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { exactSessionMatcher } from "@/lib/camps/ingestion/matchers";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import type { IngestionCatalogSnapshot } from "@/lib/camps/ingestion/repositories/types";
import { runCampSource } from "@/lib/camps/ingestion/runner/runDueCampSources";
import {
  CREATIVE_KIDS_PLACE_PROVIDER_ID,
  CREATIVE_KIDS_PLACE_SOURCE_ID,
  CREATIVE_KIDS_PLACE_SOURCE_URL,
  creativeKidsPlaceSource,
} from "@/lib/camps/ingestion/sources/seedSources";

const BENCHMARK_DIR = "../../../data/camps/ingestion/benchmarks";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const goldHtml = readBenchmark("creative-kids-place-square-one.html");

function chromeOnlyVariant(html: string): string {
  return html
    .replace("<body", '<body data-build="chrome-9a" class="nav-reordered"')
    .replace(
      "</body>",
      `<script>window.__ckpChrome = "decorative-static";</script>
<footer class="site-chrome">Updated footer copy that is not camp facts.</footer>
</body>`,
    )
    .replace(/class="/g, 'class="x-');
}

function extractRecords(
  html: string,
  runId = "run-ckp-fp",
): CampExtractedRecord[] {
  const document = cleanHtmlToDocument(html, {
    baseUrl: CREATIVE_KIDS_PLACE_SOURCE_URL,
  });
  const source: CampSource = {
    ...creativeKidsPlaceSource(new Date("2026-09-12T16:00:00.000Z")),
  };
  const snapshot: CampSourceSnapshot = {
    id: "snap-ckp-fp",
    sourceId: source.id,
    retrievedAt: "2026-09-12T16:00:00.000Z",
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(html),
    rawContent: html,
    fetchStatus: "success",
  };
  const result = creativeKidsPlaceExtractor.extract({
    source,
    snapshot,
    document,
    rawHtml: html,
    extractionRunId: runId,
    newId: createSequentialIdFactory("fp"),
    now: new Date("2026-09-12T16:00:00.000Z"),
  });
  assert.notEqual(result.status, "failed");
  return result.records;
}

function emptyCatalog(): IngestionCatalogSnapshot {
  return { providers: [], programs: [], sessions: [], venues: [] };
}

function sessionsOf(records: CampExtractedRecord[]): CampExtractedRecord[] {
  return records.filter((record) => record.recordType === "session");
}

function mutateSession(
  records: CampExtractedRecord[],
  predicate: (record: CampExtractedRecord) => boolean,
  patch: (fields: Record<string, unknown>) => Record<string, unknown>,
): CampExtractedRecord[] {
  return records.map((record) => {
    if (record.recordType !== "session" || !predicate(record)) return record;
    return {
      ...record,
      normalizedFields: patch({ ...record.normalizedFields }),
    };
  });
}

function mutateProgram(
  records: CampExtractedRecord[],
  patch: (fields: Record<string, unknown>) => Record<string, unknown>,
): CampExtractedRecord[] {
  return records.map((record) => {
    if (record.recordType !== "program") return record;
    return {
      ...record,
      normalizedFields: patch({ ...record.normalizedFields }),
    };
  });
}

function findBattlebot(records: CampExtractedRecord[]): CampExtractedRecord {
  const battlebots = sessionsOf(records).filter((session) =>
    String(session.normalizedFields.themeTitleNormalized ?? "").includes(
      "battlebot",
    ),
  );
  assert.equal(battlebots.length, 2, "Week 1 Battlebot must exist on both short windows");
  const juneWindow = battlebots.find(
    (session) => session.normalizedFields.startDate === "2026-06-29",
  );
  assert.ok(juneWindow, "expected Battlebot Technicians on Jun 29–30");
  return juneWindow;
}

describe("CKP semantic fingerprint control (Prompt 9A)", () => {
  it("fingerprints all 93 session offerings under camp-facts-v2", () => {
    const records = extractRecords(goldHtml);
    assert.equal(sessionsOf(records).length, 93);
    const fingerprint = hashFactFingerprint(records);
    assert.match(
      fingerprint,
      new RegExp(`^${FACT_FINGERPRINT_VERSION}:sha256:[0-9a-f]{64}$`),
    );
    assert.equal(hashFactFingerprint([...records].reverse()), fingerprint);
  });

  it("record order does not change the fingerprint", () => {
    const records = extractRecords(goldHtml);
    const sessions = sessionsOf(records);
    const shuffled = [...sessions].sort((a, b) =>
      b.sourceIdentity.localeCompare(a.sourceIdentity),
    );
    const nonSessions = records.filter((record) => record.recordType !== "session");
    assert.equal(
      hashFactFingerprint([...nonSessions, ...shuffled]),
      hashFactFingerprint(records),
    );
  });

  it("evidence wording is excluded from the fingerprint", () => {
    const records = extractRecords(goldHtml);
    const reworded = records.map((record) => {
      const observations = record.normalizedFields.observations as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (!observations) return record;
      const next: Record<string, Record<string, unknown>> = {};
      for (const [key, observation] of Object.entries(observations)) {
        next[key] = {
          ...observation,
          rawValue: `reworded:${String(observation.rawValue ?? "")}`,
          observedAt: "2099-01-01T00:00:00.000Z",
          sourceSnapshotId: "snap-reword",
        };
      }
      return {
        ...record,
        id: `${record.id}-reword`,
        extractionRunId: "run-reword",
        normalizedFields: { ...record.normalizedFields, observations: next },
      };
    });
    assert.equal(hashFactFingerprint(records), hashFactFingerprint(reworded));
  });

  it("price change alters fingerprint; identity key stays matchable", () => {
    const records = extractRecords(goldHtml);
    const target = sessionsOf(records).find(
      (session) =>
        String(session.normalizedFields.themeTitleNormalized ?? "").includes(
          "ultimate detective",
        ) && session.normalizedFields.ageMin === 8,
    );
    assert.ok(target);
    const changed = mutateSession(
      records,
      (record) => record.sourceIdentity === target.sourceIdentity,
      (fields) => ({ ...fields, priceAmount: 365 }),
    );
    assert.notEqual(hashFactFingerprint(records), hashFactFingerprint(changed));

    const catalogSession = {
      id: "catalog-sess",
      programId: "prog",
      startDate: String(target.normalizedFields.startDate),
      endDate: String(target.normalizedFields.endDate),
      ageMin: Number(target.normalizedFields.ageMin),
      ageMax: Number(target.normalizedFields.ageMax),
      themeTitle: String(target.normalizedFields.themeTitle ?? ""),
      themeTitleNormalized: String(
        target.normalizedFields.themeTitleNormalized ?? "",
      ),
      externalId: target.sourceIdentity,
      sourceUrl: CREATIVE_KIDS_PLACE_SOURCE_URL,
    };
    const withProgram = {
      ...target,
      normalizedFields: {
        ...target.normalizedFields,
        programId: "prog",
        externalId: target.sourceIdentity,
      },
    };
    const changedSession = sessionsOf(changed).find(
      (session) => session.sourceIdentity === target.sourceIdentity,
    )!;
    const changedWithProgram = {
      ...changedSession,
      normalizedFields: {
        ...changedSession.normalizedFields,
        programId: "prog",
        externalId: target.sourceIdentity,
        priceAmount: 365,
      },
    };

    const baseMatch = exactSessionMatcher.match(
      withProgram,
      [catalogSession],
      CREATIVE_KIDS_PLACE_OFFERING_GRAIN,
    );
    const changedMatch = exactSessionMatcher.match(
      changedWithProgram,
      [catalogSession],
      CREATIVE_KIDS_PLACE_OFFERING_GRAIN,
    );
    assert.equal(baseMatch.catalogId, "catalog-sess");
    assert.equal(changedMatch.catalogId, "catalog-sess");
  });

  it("identity-bearing age change: fingerprint moves, identities diverge, no silent match", () => {
    const records = extractRecords(goldHtml);
    const battlebot = findBattlebot(records);
    assert.equal(battlebot.normalizedFields.ageMin, 8);
    assert.equal(battlebot.normalizedFields.ageMax, 13);
    assert.match(battlebot.sourceIdentity, /:8-13$/);
    assert.ok(
      battlebot.sourceIdentity.includes("battlebot-technicians") ||
        battlebot.sourceIdentity.includes("creator-camp-battlebot"),
    );

    const oldIdentity = battlebot.sourceIdentity;
    const newIdentity = oldIdentity.replace(/:8-13$/, ":9-13");
    assert.notEqual(oldIdentity, newIdentity);

    const changed = records.map((record) => {
      if (record.sourceIdentity !== oldIdentity) return record;
      return {
        ...record,
        sourceIdentity: newIdentity,
        normalizedFields: {
          ...record.normalizedFields,
          ageMin: 9,
          externalId: newIdentity,
        },
      };
    });

    assert.notEqual(hashFactFingerprint(records), hashFactFingerprint(changed));

    const oldStillPresent = sessionsOf(changed).some(
      (session) => session.sourceIdentity === oldIdentity,
    );
    const newPresent = sessionsOf(changed).some(
      (session) => session.sourceIdentity === newIdentity,
    );
    assert.equal(oldStillPresent, false);
    assert.equal(newPresent, true);

    const catalogRow = {
      id: "catalog-battlebot-8-13",
      programId: "prog-ckp",
      startDate: String(battlebot.normalizedFields.startDate),
      endDate: String(battlebot.normalizedFields.endDate),
      ageMin: 8,
      ageMax: 13,
      themeTitle: String(battlebot.normalizedFields.themeTitle ?? ""),
      themeTitleNormalized: String(
        battlebot.normalizedFields.themeTitleNormalized ?? "",
      ),
      externalId: oldIdentity,
      sourceUrl: CREATIVE_KIDS_PLACE_SOURCE_URL,
    };
    const newExtract = sessionsOf(changed).find(
      (session) => session.sourceIdentity === newIdentity,
    )!;
    const match = exactSessionMatcher.match(
      {
        ...newExtract,
        normalizedFields: {
          ...newExtract.normalizedFields,
          programId: "prog-ckp",
          externalId: newIdentity,
        },
      },
      [catalogRow],
      CREATIVE_KIDS_PLACE_OFFERING_GRAIN,
    );
    assert.equal(match.kind, "NO_MATCH");
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
    assert.ok(!match.reasons.some((reason) => reason.includes("program_and_date_window")));
  });

  it("shared week surcharge change alters fingerprint for all affected sessions", () => {
    const records = extractRecords(goldHtml);
    const week2WithSafari = sessionsOf(records).filter(
      (session) =>
        session.normalizedFields.weekNumber === 2 &&
        session.normalizedFields.addOnFeeCad === 10,
    );
    assert.ok(week2WithSafari.length > 1);
    const changed = mutateSession(
      records,
      (record) =>
        record.normalizedFields.weekNumber === 2 &&
        record.normalizedFields.addOnFeeCad === 10,
      (fields) => ({ ...fields, addOnFeeCad: 12 }),
    );
    assert.notEqual(hashFactFingerprint(records), hashFactFingerprint(changed));
    const affected = sessionsOf(changed).filter(
      (session) =>
        session.normalizedFields.weekNumber === 2 &&
        session.normalizedFields.addOnFeeCad === 12,
    );
    assert.equal(affected.length, week2WithSafari.length);
  });

  it("marketing age copy change alters fingerprint without touching sessions", () => {
    const records = extractRecords(goldHtml);
    const changed = mutateProgram(records, (fields) => ({
      ...fields,
      marketingAgeMin: 5,
      typicalAgeMin: 5,
    }));
    assert.equal(sessionsOf(changed).length, sessionsOf(records).length);
    assert.notEqual(hashFactFingerprint(records), hashFactFingerprint(changed));
  });

  it("raw chrome change → unchanged_facts, zero candidates, zero review rows", async () => {
    const store = createMemoryIngestionStore({
      sources: [creativeKidsPlaceSource(new Date("2026-09-12T12:00:00.000Z"))],
    });
    const newId = createSequentialIdFactory("ckp9a");
    const chromeHtml = chromeOnlyVariant(goldHtml);
    assert.notEqual(hashSourceContent(goldHtml), hashSourceContent(chromeHtml));

    const first = await runCampSource({
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        {
          [CREATIVE_KIDS_PLACE_SOURCE_ID]: {
            content: goldHtml,
            fetchStatus: "success",
          },
        },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });
    assert.equal(first.status, "baseline");
    assert.ok(first.candidateIds.length > 0);
    const afterFirst = store.snapshotState();
    const fingerprint = afterFirst.sources[0].lastFactFingerprint;
    assert.ok(fingerprint);
    const candidatesAfterFirst = afterFirst.candidates.length;
    const reviewsAfterFirst = afterFirst.reviewDecisions.length;

    const second = await runCampSource({
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        {
          [CREATIVE_KIDS_PLACE_SOURCE_ID]: {
            content: chromeHtml,
            fetchStatus: "success",
          },
        },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-13T12:00:00.000Z"),
      newId,
    });

    assert.equal(second.status, "unchanged_facts");
    assert.equal(second.candidateIds.length, 0);
    assert.equal(second.summary.sourcesNonSemanticChange, 1);
    assert.ok(second.warnings.includes("unchanged_facts"));

    const state = store.snapshotState();
    assert.equal(state.snapshots.length, 2);
    assert.notEqual(state.snapshots[0].contentHash, state.snapshots[1].contentHash);
    assert.equal(state.snapshots[1].factFingerprint, fingerprint);
    assert.equal(state.sources[0].lastFactFingerprint, fingerprint);
    assert.equal(state.sources[0].lastContentHash, state.snapshots[1].contentHash);
    assert.equal(state.candidates.length, candidatesAfterFirst);
    assert.equal(state.reviewDecisions.length, reviewsAfterFirst);
    assert.equal(
      compareFactFingerprints(
        fingerprint,
        hashFactFingerprint(extractRecords(chromeHtml)),
      ).kind,
      "unchanged",
    );
  });

  it("raw unchanged short-circuits before extraction", async () => {
    const store = createMemoryIngestionStore({
      sources: [creativeKidsPlaceSource(new Date("2026-09-12T12:00:00.000Z"))],
    });
    const newId = createSequentialIdFactory("ckp9a-raw");
    const fetcher = new FixtureSourceFetcher(
      {
        [CREATIVE_KIDS_PLACE_SOURCE_ID]: {
          content: goldHtml,
          fetchStatus: "success",
        },
      },
      { newId },
    );

    const first = await runCampSource({
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      store,
      fetcher,
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });
    assert.equal(first.status, "baseline");

    const second = await runCampSource({
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      store,
      fetcher,
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-13T12:00:00.000Z"),
      newId,
    });
    assert.ok(
      second.status === "unchanged_raw" || second.status === "unchanged",
    );
    assert.equal(second.extractionRunId, null);
    assert.equal(second.candidateIds.length, 0);
    assert.equal(second.summary.sourcesUnchanged, 1);
  });

  it("fingerprint version mismatch never claims unchanged_facts", async () => {
    const store = createMemoryIngestionStore({
      sources: [
        {
          ...creativeKidsPlaceSource(new Date("2026-09-12T12:00:00.000Z")),
          lastContentHash: "sha256:deadbeef",
          lastFactFingerprint:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      ],
    });
    const newId = createSequentialIdFactory("ckp9a-ver");
    const result = await runCampSource({
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        {
          [CREATIVE_KIDS_PLACE_SOURCE_ID]: {
            content: goldHtml,
            fetchStatus: "success",
          },
        },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });
    assert.equal(result.status, "fingerprint_version_changed");
    assert.ok(result.warnings.includes("fingerprint_version_changed"));
    assert.ok(result.candidateIds.length > 0);
    assert.equal(result.summary.sourcesNonSemanticChange, 0);
  });

  it("rerun of identical facts does not duplicate session candidates", async () => {
    const store = createMemoryIngestionStore({
      sources: [creativeKidsPlaceSource(new Date("2026-09-12T12:00:00.000Z"))],
    });
    const newId = createSequentialIdFactory("ckp9a-rerun");
    const first = await runCampSource({
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        {
          [CREATIVE_KIDS_PLACE_SOURCE_ID]: {
            content: goldHtml,
            fetchStatus: "success",
          },
        },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });
    const sessionCandidates = (await store.candidates.listCandidates()).filter(
      (candidate) => candidate.candidateType === "session",
    );
    assert.equal(sessionCandidates.length, 93);
    assert.ok(first.extractedRecords > 93);

    const second = await runCampSource({
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        {
          [CREATIVE_KIDS_PLACE_SOURCE_ID]: {
            content: chromeOnlyVariant(goldHtml),
            fetchStatus: "success",
          },
        },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-13T12:00:00.000Z"),
      newId,
    });
    assert.equal(second.status, "unchanged_facts");
    const after = (await store.candidates.listCandidates()).filter(
      (candidate) => candidate.candidateType === "session",
    );
    assert.equal(after.length, sessionCandidates.length);
  });
});
