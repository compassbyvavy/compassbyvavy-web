/**
 * Human review decisions on ingestion candidates.
 *
 * Approve is not publish. Approving records that a person judged the proposed
 * facts to be true; it writes `camp_candidates` and nothing else. There is no
 * code path from this module into `Provider` / `CampProgram` / `CampSession` /
 * `Venue`, and adding one is a separate, explicit piece of work with its own
 * review. Automation gathers and proposes facts; human review establishes
 * Compass-approved truth.
 */

import type {
  CampCandidate,
  CandidateReviewDecision,
  CandidateStatus,
} from "@/data/camps/ingestion/types";
import type {
  CampIngestionStore,
  CandidateFilter,
} from "@/lib/camps/ingestion/repositories/types";

/** Operator-facing verbs. The stored decision values differ (past tense). */
export type ReviewAction = "approve" | "reject" | "ignore" | "needs_review";

export const REVIEW_ACTIONS: readonly ReviewAction[] = [
  "approve",
  "reject",
  "ignore",
  "needs_review",
];

const DECISION_BY_ACTION: Record<ReviewAction, CandidateReviewDecision> = {
  approve: "approved",
  reject: "rejected",
  ignore: "ignored",
  needs_review: "needs_review",
};

const ACTION_LABELS: Record<ReviewAction, string> = {
  approve: "Approve",
  reject: "Reject",
  ignore: "Ignore",
  needs_review: "Needs review",
};

/** Statuses still awaiting a decision. */
export const REVIEW_QUEUE_STATUSES: readonly CandidateStatus[] = [
  "needs_review",
  "new",
  "changed",
  "matched",
];

export function isReviewAction(value: unknown): value is ReviewAction {
  return typeof value === "string" && (REVIEW_ACTIONS as readonly string[]).includes(value);
}

export function decisionForAction(action: ReviewAction): CandidateReviewDecision {
  return DECISION_BY_ACTION[action];
}

export function reviewActionLabel(action: ReviewAction): string {
  return ACTION_LABELS[action];
}

export type PersistCandidateReviewInput = {
  store: CampIngestionStore;
  candidateId: string;
  action: ReviewAction | string;
  /** Who decided. Recorded for audit; anonymous decisions are rejected. */
  reviewedBy: string;
  note?: string | null;
  now?: () => Date;
};

export type ReviewFailureReason = "invalid_action" | "missing_reviewer" | "candidate_not_found";

export type PersistCandidateReviewResult =
  | {
      ok: true;
      candidate: CampCandidate;
      decision: CandidateReviewDecision;
      /** Always false: this module has no catalog write path. */
      published: false;
      message: string;
    }
  | { ok: false; reason: ReviewFailureReason; message: string };

/**
 * Record one review decision. Returns a result rather than throwing so form
 * actions can render the failure instead of a 500.
 */
export async function persistCandidateReview(
  input: PersistCandidateReviewInput,
): Promise<PersistCandidateReviewResult> {
  const { store, candidateId } = input;

  if (!isReviewAction(input.action)) {
    return {
      ok: false,
      reason: "invalid_action",
      message: `Unknown review action: ${String(input.action)}`,
    };
  }
  const reviewedBy = input.reviewedBy.trim();
  if (reviewedBy === "") {
    return {
      ok: false,
      reason: "missing_reviewer",
      message: "A review decision needs an attributed reviewer.",
    };
  }

  const existing = await store.candidates.getCandidate(candidateId);
  if (!existing) {
    return {
      ok: false,
      reason: "candidate_not_found",
      message: `No candidate ${candidateId}.`,
    };
  }

  const decision = decisionForAction(input.action);
  const reviewedAt = (input.now ?? (() => new Date()))().toISOString();

  const updated = await store.candidates.recordReviewDecision({
    candidateId,
    decision,
    reviewedBy,
    reviewedAt,
    note: composeReviewReason(existing, decision, reviewedBy, input.note),
  });

  if (!updated) {
    return {
      ok: false,
      reason: "candidate_not_found",
      message: `No candidate ${candidateId}.`,
    };
  }

  return {
    ok: true,
    candidate: updated,
    decision,
    published: false,
    message: describeDecision(decision),
  };
}

/**
 * Keeps the automated reason and appends the human one, so a candidate's
 * history reads as "the pipeline said this, then a person said that".
 */
function composeReviewReason(
  candidate: CampCandidate,
  decision: CandidateReviewDecision,
  reviewedBy: string,
  note: string | null | undefined,
): string {
  const trimmedNote = note?.trim() ?? "";
  const decisionLine = trimmedNote
    ? `${decision} by ${reviewedBy}: ${trimmedNote}`
    : `${decision} by ${reviewedBy}`;
  const previous = candidate.reviewReason?.trim();
  return previous ? `${previous} · ${decisionLine}` : decisionLine;
}

export function describeDecision(decision: CandidateReviewDecision): string {
  switch (decision) {
    case "approved":
      return "Recorded as reviewed truth. Publishing to the public catalog is a separate step.";
    case "rejected":
      return "Rejected. The source facts were judged wrong and will not be used.";
    case "ignored":
      return "Ignored. The change is real but not worth acting on.";
    case "needs_review":
      return "Returned to the queue for another look.";
  }
}

/** Candidates still awaiting a decision, newest first. */
export async function listReviewQueue(
  store: CampIngestionStore,
  filter: Omit<CandidateFilter, "status"> = {},
): Promise<CampCandidate[]> {
  return store.candidates.listCandidates({ ...filter, status: REVIEW_QUEUE_STATUSES });
}

/** Candidates a human has already ruled on, newest first. */
export async function listReviewedCandidates(
  store: CampIngestionStore,
  filter: Omit<CandidateFilter, "status"> = {},
): Promise<CampCandidate[]> {
  return store.candidates.listCandidates({
    ...filter,
    status: ["approved", "rejected", "ignored"],
  });
}
