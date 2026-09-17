/**
 * Deterministic ReviewOutcome from field-level decisions.
 *
 * FIRST-MATCH-WINS precedence (Prompt 7B):
 *
 *   RULE 0 — empty fieldDecisions → INVALID (caller must not persist)
 *   RULE 1 — every decided field is approved → fully_approved
 *   RULE 2 — every decided field is rejected → rejected
 *   RULE 3 — at least one rejected AND at least one approved|needs_followup
 *            → partially_approved
 *            (covers approved+rejected, rejected+needs_followup, and all three)
 *   RULE 4 — otherwise, at least one needs_followup → needs_followup
 *            (covers needs_followup-only and approved+needs_followup)
 *
 * There is no valid non-empty combination that falls through without an outcome.
 */

import type { FieldDecision, ReviewOutcome } from "@/data/camps/ingestion/types";

export type ReviewOutcomeComputation =
  | { ok: true; overallStatus: ReviewOutcome }
  | { ok: false; reason: "empty_field_decisions"; message: string };

const FIELD_DECISIONS: ReadonlySet<string> = new Set([
  "approved",
  "rejected",
  "needs_followup",
]);

export function isFieldDecision(value: unknown): value is FieldDecision {
  return typeof value === "string" && FIELD_DECISIONS.has(value);
}

/**
 * Compute overallStatus from fieldDecisions.
 * Does not persist; empty maps are rejected before any CampReviewDecision row.
 */
export function computeReviewOutcome(
  fieldDecisions: Record<string, FieldDecision>,
): ReviewOutcomeComputation {
  const values = Object.values(fieldDecisions);

  // RULE 0 — EMPTY DECISION GUARD
  if (values.length === 0) {
    return {
      ok: false,
      reason: "empty_field_decisions",
      message:
        "A review requires at least one field decision. An empty object must never become fully_approved.",
    };
  }

  const allApproved = values.every((v) => v === "approved");
  const allRejected = values.every((v) => v === "rejected");
  const hasRejected = values.some((v) => v === "rejected");
  const hasApprovedOrFollowup = values.some(
    (v) => v === "approved" || v === "needs_followup",
  );
  const hasFollowup = values.some((v) => v === "needs_followup");

  // RULE 1 — ALL APPROVED
  if (allApproved) {
    return { ok: true, overallStatus: "fully_approved" };
  }

  // RULE 2 — ALL REJECTED
  if (allRejected) {
    return { ok: true, overallStatus: "rejected" };
  }

  // RULE 3 — REJECTED MIXED WITH ANY OTHER STATE
  if (hasRejected && hasApprovedOrFollowup) {
    return { ok: true, overallStatus: "partially_approved" };
  }

  // RULE 4 — OTHERWISE, NEEDS FOLLOWUP
  if (hasFollowup) {
    return { ok: true, overallStatus: "needs_followup" };
  }

  // Unreachable for valid FieldDecision values; kept as a hard guard.
  throw new Error(
    `computeReviewOutcome: no ReviewOutcome for fieldDecisions=${JSON.stringify(fieldDecisions)}`,
  );
}

/** Map a persisted review outcome onto the candidate queue status. */
export function candidateStatusForReviewOutcome(
  outcome: ReviewOutcome,
): "approved" | "rejected" | "needs_review" {
  switch (outcome) {
    case "fully_approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "partially_approved":
    case "needs_followup":
      return "needs_review";
  }
}
