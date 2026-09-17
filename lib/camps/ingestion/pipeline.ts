/**
 * Pipeline decisions: when to extract, and what a candidate means.
 *
 * The hash gate is the cheapest correctness guard in ingestion. If a source
 * returns byte-equivalent content, nothing downstream runs — no extraction, no
 * matching, no new review item. Reviewers only ever see sources that actually
 * moved.
 */

import type {
  CampSourceSnapshot,
  CandidateStatus,
  IngestionQualityFlag,
  PipelineOutcome,
} from "@/data/camps/ingestion/types";
import { sourceContentUnchanged } from "@/lib/camps/ingestion/hash";

export type ExtractionDecisionReason =
  | "forced"
  | "no_previous_hash"
  | "content_changed"
  | "content_unchanged"
  | "fetch_not_modified"
  | "fetch_blocked"
  | "fetch_error"
  | "fetch_unsupported"
  | "no_content";

export type ExtractionDecision = {
  shouldExtract: boolean;
  reason: ExtractionDecisionReason;
  /** Set when the source stops here; null when extraction continues. */
  outcome: PipelineOutcome | null;
};

export type DecideExtractionInput = {
  snapshot: Pick<CampSourceSnapshot, "contentHash" | "fetchStatus"> &
    Partial<Pick<CampSourceSnapshot, "rawContent">>;
  /** Hash recorded on the source (or its previous snapshot). */
  previousHash?: string | null;
  /** Re-extract even when the hash is unchanged (operator override). */
  force?: boolean;
};

export function decideExtraction(input: DecideExtractionInput): ExtractionDecision {
  const { snapshot, previousHash, force = false } = input;
  const hasContent = typeof snapshot.rawContent === "string" && snapshot.rawContent !== "";

  switch (snapshot.fetchStatus) {
    case "blocked":
      return { shouldExtract: false, reason: "fetch_blocked", outcome: "BLOCKED" };
    case "unsupported":
      return { shouldExtract: false, reason: "fetch_unsupported", outcome: "UNSUPPORTED" };
    case "error":
      return { shouldExtract: false, reason: "fetch_error", outcome: "FAILED" };
    case "not_modified":
      if (force && hasContent) {
        return { shouldExtract: true, reason: "forced", outcome: null };
      }
      return {
        shouldExtract: false,
        reason: "fetch_not_modified",
        outcome: "UNCHANGED_SOURCE",
      };
    case "success":
      break;
  }

  if (!hasContent) {
    // A 200 with nothing to parse is a failure to report, not a quiet skip.
    return { shouldExtract: false, reason: "no_content", outcome: "FAILED" };
  }
  if (force) {
    return { shouldExtract: true, reason: "forced", outcome: null };
  }
  if (!previousHash) {
    return { shouldExtract: true, reason: "no_previous_hash", outcome: null };
  }
  if (sourceContentUnchanged(previousHash, snapshot.contentHash)) {
    return {
      shouldExtract: false,
      reason: "content_unchanged",
      outcome: "UNCHANGED_SOURCE",
    };
  }
  return { shouldExtract: true, reason: "content_changed", outcome: null };
}

export type CandidateResolutionInput = {
  matchedCatalogId?: string | null;
  hasMaterialChanges: boolean;
  qualityFlags: readonly IngestionQualityFlag[];
};

export type CandidateResolution = {
  status: CandidateStatus;
  pipelineOutcome: PipelineOutcome;
  reviewReason: string;
};

/**
 * Map match + diff + flags onto the reviewer-facing status.
 *
 * Nothing here can produce `approved`: only a human review decision does.
 */
export function resolveCandidateOutcome(
  input: CandidateResolutionInput,
): CandidateResolution {
  const { matchedCatalogId, hasMaterialChanges, qualityFlags } = input;

  if (qualityFlags.includes("ambiguous_match")) {
    return {
      status: "needs_review",
      pipelineOutcome: "AMBIGUOUS",
      reviewReason: "Ambiguous match — more than one catalog row is plausible",
    };
  }
  if (!matchedCatalogId) {
    return {
      status: "new",
      pipelineOutcome: "NEW",
      reviewReason: "No catalog match — proposed as a new record",
    };
  }
  if (qualityFlags.includes("possible_removed_session")) {
    return {
      status: "needs_review",
      pipelineOutcome: "MATCHED_CHANGED",
      reviewReason: "Catalog session no longer stated on the source",
    };
  }
  if (hasMaterialChanges) {
    return {
      status: "needs_review",
      pipelineOutcome: "MATCHED_CHANGED",
      reviewReason: "Matched catalog record with proposed field changes",
    };
  }
  return {
    status: "matched",
    pipelineOutcome: "MATCHED_UNCHANGED",
    reviewReason: "Matched catalog record with no material field changes",
  };
}
