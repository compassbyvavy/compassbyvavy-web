/**
 * Quality flags: the honest "what is wrong or unproven here" layer.
 *
 * Flags are how ingestion refuses to paper over gaps. A missing price stays a
 * missing price (`missing_price`), never a zero; an uncertain match stays
 * `ambiguous_match` rather than picking the closest name. Reviewers see the
 * flags next to the change set and decide.
 */

import type {
  CampSource,
  CampSourceSnapshot,
  IngestionQualityFlag,
  SourceHealthLabel,
} from "@/data/camps/ingestion/types";
import { MEDIUM_CONFIDENCE_MIN } from "@/lib/camps/ingestion/confidence";
import { isSourceStale } from "@/lib/camps/ingestion/freshness";

/** Canonical display order so the admin UI is stable across runs. */
const FLAG_ORDER: readonly IngestionQualityFlag[] = [
  "missing_dates",
  "missing_price",
  "missing_age",
  "missing_location",
  "missing_registration_url",
  "ambiguous_match",
  "possible_duplicate",
  "conflicting_sources",
  "possible_removed_session",
  "extraction_partial",
  "source_stale",
  "source_blocked",
];

/** A stated 0 (e.g. a free camp) is a fact; null/undefined/"" are not. */
function present(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

export type ExtractedSessionQualityContext = {
  /** Extraction run only partially understood the page. */
  extractionPartial?: boolean;
};

/**
 * Flags for one extracted session's normalized fields.
 *
 * Age needs both bounds to prove eligibility, so a half-open band is still
 * `missing_age`. Online sessions are not flagged for a missing venue.
 */
export function qualityFlagsForExtractedSession(
  fields: Record<string, unknown>,
  context: ExtractedSessionQualityContext = {},
): IngestionQualityFlag[] {
  const flags: IngestionQualityFlag[] = [];

  if (!present(fields.startDate) || !present(fields.endDate)) {
    flags.push("missing_dates");
  }
  if (!present(fields.priceAmount)) {
    flags.push("missing_price");
  }
  if (!present(fields.ageMin) || !present(fields.ageMax)) {
    flags.push("missing_age");
  }

  const isOnline = fields.deliveryMode === "online";
  const hasLocation =
    present(fields.venueId) ||
    present(fields.venueName) ||
    present(fields.addressLine) ||
    present(fields.location);
  if (!isOnline && !hasLocation) {
    flags.push("missing_location");
  }

  if (!present(fields.registrationUrl)) {
    flags.push("missing_registration_url");
  }

  const statusText = String(fields.status ?? "").toLowerCase();
  if (
    fields.cancelled === true ||
    fields.removed === true ||
    statusText === "cancelled" ||
    statusText === "canceled"
  ) {
    flags.push("possible_removed_session");
  }

  if (context.extractionPartial) {
    flags.push("extraction_partial");
  }

  return mergeQualityFlags(flags);
}

/** Deduplicate and order flags from several stages of the pipeline. */
export function mergeQualityFlags(
  ...groups: ReadonlyArray<readonly IngestionQualityFlag[] | undefined | null>
): IngestionQualityFlag[] {
  const seen = new Set<IngestionQualityFlag>();
  for (const group of groups) {
    for (const flag of group ?? []) {
      seen.add(flag);
    }
  }
  const ordered = FLAG_ORDER.filter((flag) => seen.has(flag));
  // Any future flag not yet in FLAG_ORDER still surfaces, just at the end.
  for (const flag of seen) {
    if (!ordered.includes(flag)) ordered.push(flag);
  }
  return ordered;
}

export type MatchQualityInput = {
  matchedCatalogId?: string | null;
  matchConfidence?: number | null;
  /** Matcher reasons — `ambiguous_*` reasons force review. */
  reasons?: readonly string[];
  /** How many catalog rows plausibly matched. More than one is ambiguous. */
  catalogCandidateCount?: number;
  /** Extracted record ids that collapsed into this candidate. */
  sourceRecordIds?: readonly string[];
  /** Fields where two sources disagree. */
  conflictingFields?: readonly string[];
};

/** Layer match-stage uncertainty on top of field-level flags. */
export function applyMatchQualityFlags(
  base: readonly IngestionQualityFlag[],
  input: MatchQualityInput,
): IngestionQualityFlag[] {
  const flags: IngestionQualityFlag[] = [];

  const reasons = input.reasons ?? [];
  const ambiguousReason = reasons.some((reason) => reason.startsWith("ambiguous"));
  const tooManyCatalogHits = (input.catalogCandidateCount ?? 0) > 1;
  const weakMatch =
    Boolean(input.matchedCatalogId) &&
    (input.matchConfidence ?? 0) < MEDIUM_CONFIDENCE_MIN;

  if (ambiguousReason || tooManyCatalogHits || weakMatch) {
    flags.push("ambiguous_match");
  }
  if ((input.sourceRecordIds?.length ?? 0) > 1) {
    flags.push("possible_duplicate");
  }
  if ((input.conflictingFields?.length ?? 0) > 0) {
    flags.push("conflicting_sources");
  }

  return mergeQualityFlags(base, flags);
}

/** Source-level flags for candidates produced from a given source/snapshot. */
export function sourceQualityFlags(
  source: CampSource,
  latestSnapshot: CampSourceSnapshot | null,
  now: Date = new Date(),
): IngestionQualityFlag[] {
  const flags: IngestionQualityFlag[] = [];
  if (latestSnapshot?.fetchStatus === "blocked") flags.push("source_blocked");
  if (isSourceStale(source.lastCheckedAt, now)) flags.push("source_stale");
  return mergeQualityFlags(flags);
}

/**
 * One-word health for the source registry table.
 *
 * Order matters: a manual or unsupported source is never "Failed" for not
 * being crawled, and a blocked fetch is reported as blocked rather than as a
 * generic error, because the operator response differs.
 */
export function sourceHealthLabel(
  source: CampSource,
  latestSnapshot: CampSourceSnapshot | null = null,
): SourceHealthLabel {
  if (source.crawlStrategy === "manual" || source.sourceType === "manual") {
    return "Manual";
  }
  if (
    source.crawlStrategy === "unsupported" ||
    latestSnapshot?.fetchStatus === "unsupported"
  ) {
    return "Unsupported";
  }
  if (latestSnapshot?.fetchStatus === "blocked") {
    return "Blocked";
  }
  if (latestSnapshot?.fetchStatus === "error" || errorIsCurrent(source)) {
    return "Failed";
  }
  if (sourceChangedOnLastCheck(source, latestSnapshot)) {
    return "Changed";
  }
  return "Healthy";
}

function errorIsCurrent(source: CampSource): boolean {
  if (!source.lastErrorAt) return false;
  if (!source.lastSuccessfulAt) return true;
  return source.lastErrorAt > source.lastSuccessfulAt;
}

function sourceChangedOnLastCheck(
  source: CampSource,
  latestSnapshot: CampSourceSnapshot | null,
): boolean {
  if (source.lastChangedAt && source.lastCheckedAt) {
    return source.lastChangedAt >= source.lastCheckedAt;
  }
  return Boolean(
    latestSnapshot?.previousSnapshotId && latestSnapshot.fetchStatus === "success",
  );
}
