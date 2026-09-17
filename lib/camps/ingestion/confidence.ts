/**
 * Confidence bands for ingestion candidates.
 *
 * Confidence describes how sure the extractor/matcher is about a fact — never
 * whether the fact may be published. HIGH confidence buys a *shorter review*,
 * not a bypass: `mayAutoPublishToCatalog()` is hard-coded `false` so no code
 * path can grow an auto-publish branch by accident.
 */

import type { ConfidenceBand, IngestionQualityFlag } from "@/data/camps/ingestion/types";

export const HIGH_CONFIDENCE_MIN = 0.9;
export const MEDIUM_CONFIDENCE_MIN = 0.7;

/**
 * Quality flags that keep a candidate in full review regardless of score:
 * either the match itself is uncertain or the source is not trustworthy today.
 */
const REVIEW_BLOCKING_FLAGS: ReadonlySet<IngestionQualityFlag> = new Set([
  "ambiguous_match",
  "conflicting_sources",
  "possible_duplicate",
  "possible_removed_session",
  "source_blocked",
  "source_stale",
  "extraction_partial",
]);

/** Clamp any extractor-provided score into 0…1. */
export function clampConfidence(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(1, Math.max(0, score));
}

export function confidenceBand(score: number): ConfidenceBand {
  const clamped = clampConfidence(score);
  if (clamped >= HIGH_CONFIDENCE_MIN) return "HIGH";
  if (clamped >= MEDIUM_CONFIDENCE_MIN) return "MEDIUM";
  return "LOW";
}

/**
 * True when a candidate is a lower-risk *review* item: HIGH confidence and no
 * flag that questions the match or the source. Still requires a human.
 */
export function isLowerRiskReviewEligible(
  score: number,
  qualityFlags: readonly IngestionQualityFlag[] = [],
): boolean {
  if (confidenceBand(score) !== "HIGH") return false;
  return !qualityFlags.some((flag) => REVIEW_BLOCKING_FLAGS.has(flag));
}

/**
 * Always false. External sources never write the parent-facing catalog without
 * an explicit human publish step, no matter how confident extraction was.
 */
export function mayAutoPublishToCatalog(): false {
  return false;
}

/** Lowest confidence across a set of observations (0 when empty). */
export function weakestConfidence(scores: readonly number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((lowest, score) => Math.min(lowest, clampConfidence(score)), 1);
}
