/**
 * Field-level persistent verification (Prompt 7B).
 *
 * Creates append-only `CampReviewDecision` rows. Overall status is computed
 * server-side from fieldDecisions — never trusted from the client.
 *
 * Approve is not publish: this module writes ingestion review tables only.
 * There is no path into CampProgram / CampSession / Provider / Venue.
 */

import type {
  CampCandidate,
  CampReviewDecision,
  FieldDecision,
} from "@/data/camps/ingestion/types";
import { newIngestionId, type IdFactory } from "@/lib/camps/ingestion/ids";
import type { CampIngestionStore } from "@/lib/camps/ingestion/repositories/types";
import {
  candidateStatusForReviewOutcome,
  computeReviewOutcome,
  isFieldDecision,
} from "@/lib/camps/ingestion/reviewOutcome";

export type PersistFieldReviewInput = {
  store: CampIngestionStore;
  candidateId: string;
  fieldDecisions: Record<string, FieldDecision | string>;
  notes?: string | null;
  /** Attributed reviewer. Anonymous decisions are rejected. */
  reviewedBy: string;
  /**
   * Snapshot that supplied the evidence for this pass.
   * When omitted, derived from the candidate (snapshotId / changeSet).
   */
  sourceSnapshotId?: string | null;
  /** Ignored if provided — overallStatus is always computed server-side. */
  overallStatus?: unknown;
  now?: () => Date;
  newId?: IdFactory;
};

export type FieldReviewFailureReason =
  | "empty_field_decisions"
  | "invalid_field_decision"
  | "unknown_field"
  | "missing_reviewer"
  | "candidate_not_found";

export type PersistFieldReviewResult =
  | {
      ok: true;
      decision: CampReviewDecision;
      candidate: CampCandidate;
      /** Always false: field review never publishes. */
      published: false;
      message: string;
    }
  | { ok: false; reason: FieldReviewFailureReason; message: string };

/**
 * Validate field decisions, compute overallStatus, append one CampReviewDecision,
 * and sync the candidate queue status. Never updates a prior review row.
 */
export async function persistFieldReview(
  input: PersistFieldReviewInput,
): Promise<PersistFieldReviewResult> {
  const { store, candidateId } = input;

  const reviewedBy = input.reviewedBy.trim();
  if (reviewedBy === "") {
    return {
      ok: false,
      reason: "missing_reviewer",
      message: "A review decision needs an attributed reviewer.",
    };
  }

  const candidate = await store.candidates.getCandidate(candidateId);
  if (!candidate) {
    return {
      ok: false,
      reason: "candidate_not_found",
      message: `No candidate ${candidateId}.`,
    };
  }

  const allowedFields = new Set(candidate.changeSet.map((change) => change.field));
  const normalized: Record<string, FieldDecision> = {};

  for (const [field, raw] of Object.entries(input.fieldDecisions)) {
    if (!allowedFields.has(field)) {
      return {
        ok: false,
        reason: "unknown_field",
        message: `Field "${field}" is not in this candidate's change set.`,
      };
    }
    if (!isFieldDecision(raw)) {
      return {
        ok: false,
        reason: "invalid_field_decision",
        message: `Invalid field decision for "${field}": ${String(raw)}`,
      };
    }
    normalized[field] = raw;
  }

  const outcome = computeReviewOutcome(normalized);
  if (!outcome.ok) {
    return {
      ok: false,
      reason: "empty_field_decisions",
      message: outcome.message,
    };
  }

  const reviewedAt = (input.now ?? (() => new Date()))().toISOString();
  const newId = input.newId ?? newIngestionId;
  const notes = input.notes?.trim() ? input.notes.trim() : null;
  const sourceSnapshotId =
    input.sourceSnapshotId !== undefined
      ? input.sourceSnapshotId
      : resolveEvidenceSnapshotId(candidate);

  const decision: CampReviewDecision = {
    id: newId(),
    candidateId,
    sourceSnapshotId,
    fieldDecisions: normalized,
    overallStatus: outcome.overallStatus,
    notes,
    reviewedBy,
    reviewedAt,
  };

  const saved = await store.reviewDecisions.createDecision(decision);

  const queueStatus = candidateStatusForReviewOutcome(outcome.overallStatus);
  const updated = await store.candidates.recordReviewDecision({
    candidateId,
    decision: queueStatus,
    reviewedBy,
    reviewedAt,
    note: composeFieldReviewReason(candidate, saved),
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
    decision: saved,
    candidate: updated,
    published: false,
    message: describeFieldReview(saved.overallStatus),
  };
}

function resolveEvidenceSnapshotId(candidate: CampCandidate): string | null {
  if (candidate.snapshotId) return candidate.snapshotId;
  for (const change of candidate.changeSet) {
    if (change.sourceSnapshotId) return change.sourceSnapshotId;
  }
  return null;
}

function composeFieldReviewReason(
  candidate: CampCandidate,
  decision: CampReviewDecision,
): string {
  const decided = Object.keys(decision.fieldDecisions).length;
  const line = decision.notes
    ? `${decision.overallStatus} by ${decision.reviewedBy} (${decided} fields): ${decision.notes}`
    : `${decision.overallStatus} by ${decision.reviewedBy} (${decided} fields)`;
  const previous = candidate.reviewReason?.trim();
  return previous ? `${previous} · ${line}` : line;
}

export function describeFieldReview(status: CampReviewDecision["overallStatus"]): string {
  switch (status) {
    case "fully_approved":
      return "All decided fields approved. Recorded as reviewed truth — publishing remains a separate step.";
    case "partially_approved":
      return "Mixed field decisions recorded (includes at least one rejection). Not published.";
    case "needs_followup":
      return "Follow-up required on one or more fields. Candidate stays in the review queue.";
    case "rejected":
      return "All decided fields rejected. Recorded; nothing published.";
  }
}

/** Parse `fieldDecision:<field>` entries from a review form. */
export function parseFieldDecisionsFromFormData(
  formData: FormData,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("fieldDecision:")) continue;
    if (typeof value !== "string" || value.trim() === "") continue;
    const field = key.slice("fieldDecision:".length);
    if (field) out[field] = value;
  }
  return out;
}
