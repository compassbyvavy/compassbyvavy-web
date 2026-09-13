import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampCandidate, FieldDecision } from "@/data/camps/ingestion/types";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import { persistFieldReview } from "@/lib/camps/ingestion/runner/fieldReview";

const REVIEWED_AT = "2026-09-12T20:00:00.000Z";

function candidate(overrides: Partial<CampCandidate> = {}): CampCandidate {
  return {
    id: "cand-session-1",
    candidateType: "session",
    sourceRecordIds: ["rec-1"],
    matchedCatalogId: "sess-1",
    matchConfidence: 0.95,
    candidateData: { priceAmount: 450, ageMax: 12, staffRatio: "1:8" },
    changeSet: [
      {
        field: "price",
        changeType: "changed",
        oldValue: 399,
        newValue: 450,
        confidence: 0.92,
        sourceSnapshotId: "snap-a",
      },
      {
        field: "ageMax",
        changeType: "changed",
        oldValue: 10,
        newValue: 12,
        confidence: 0.9,
        sourceSnapshotId: "snap-a",
      },
      {
        field: "staffRatio",
        changeType: "added",
        newValue: "1:8",
        confidence: 0.7,
        sourceSnapshotId: "snap-a",
      },
      {
        field: "cancellationFee",
        changeType: "added",
        newValue: 50,
        confidence: 0.6,
        sourceSnapshotId: "snap-a",
      },
    ],
    status: "needs_review",
    reviewReason: "Matched with proposed changes",
    qualityFlags: [],
    pipelineOutcome: "MATCHED_CHANGED",
    sourceId: "src-1",
    snapshotId: "snap-a",
    createdAt: "2026-09-12T12:00:00.000Z",
    updatedAt: "2026-09-12T12:00:00.000Z",
    ...overrides,
  };
}

function seedStore(overrides?: Partial<CampCandidate>) {
  return createMemoryIngestionStore({
    candidates: [candidate(overrides)],
  });
}

describe("persistFieldReview fixtures (Prompt 7B)", () => {
  it("A. fully approved — all changes approved → one decision, fully_approved", async () => {
    const store = seedStore();
    const result = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: {
        price: "approved",
        ageMax: "approved",
        staffRatio: "approved",
        cancellationFee: "approved",
      },
      reviewedBy: "vineeta",
      notes: "All facts match the provider page",
      now: () => new Date(REVIEWED_AT),
      newId: createSequentialIdFactory("rev"),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.decision.overallStatus, "fully_approved");
    assert.equal(result.decision.notes, "All facts match the provider page");
    assert.equal(result.decision.reviewedBy, "vineeta");
    assert.equal(result.decision.reviewedAt, REVIEWED_AT);
    assert.equal(result.decision.sourceSnapshotId, "snap-a");
    assert.equal(result.published, false);
    assert.equal(result.candidate.status, "approved");

    const rows = await store.reviewDecisions.listDecisionsForCandidate("cand-session-1");
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].fieldDecisions, result.decision.fieldDecisions);
  });

  it("B. partially approved — two approved, one rejected", async () => {
    const store = seedStore();
    const result = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: {
        price: "approved",
        ageMax: "approved",
        cancellationFee: "rejected",
      },
      reviewedBy: "vineeta",
      now: () => new Date(REVIEWED_AT),
      newId: createSequentialIdFactory("rev"),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.decision.overallStatus, "partially_approved");
    assert.equal(result.candidate.status, "needs_review");
  });

  it("C. rejected + needs_followup → partially_approved", async () => {
    const store = seedStore();
    const result = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: {
        price: "rejected",
        staffRatio: "needs_followup",
      } satisfies Record<string, FieldDecision>,
      reviewedBy: "vineeta",
      now: () => new Date(REVIEWED_AT),
      newId: createSequentialIdFactory("rev"),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.decision.overallStatus, "partially_approved");
  });

  it("D. needs_followup with no rejected → needs_followup", async () => {
    const store = seedStore();
    const result = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: {
        price: "approved",
        staffRatio: "needs_followup",
      },
      reviewedBy: "vineeta",
      now: () => new Date(REVIEWED_AT),
      newId: createSequentialIdFactory("rev"),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.decision.overallStatus, "needs_followup");
    assert.equal(result.candidate.status, "needs_review");
  });

  it("E. all rejected → rejected", async () => {
    const store = seedStore();
    const result = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: {
        price: "rejected",
        ageMax: "rejected",
      },
      reviewedBy: "vineeta",
      now: () => new Date(REVIEWED_AT),
      newId: createSequentialIdFactory("rev"),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.decision.overallStatus, "rejected");
    assert.equal(result.candidate.status, "rejected");
  });

  it("F. empty fieldDecisions → validation failure, no persisted row", async () => {
    const store = seedStore();
    const result = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: {},
      reviewedBy: "vineeta",
      now: () => new Date(REVIEWED_AT),
      newId: createSequentialIdFactory("rev"),
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "empty_field_decisions");
    const rows = await store.reviewDecisions.listDecisionsForCandidate("cand-session-1");
    assert.equal(rows.length, 0);
  });

  it("G. review same candidate twice — append-only; row A unchanged", async () => {
    const store = seedStore();
    const ids = createSequentialIdFactory("rev");

    const first = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: { price: "approved", ageMax: "approved" },
      reviewedBy: "vineeta",
      sourceSnapshotId: "snap-a",
      notes: "pass one",
      now: () => new Date("2026-09-10T12:00:00.000Z"),
      newId: ids,
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const second = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: {
        price: "approved",
        staffRatio: "needs_followup",
      },
      reviewedBy: "vineeta",
      sourceSnapshotId: "snap-b",
      notes: "pass two after new snapshot",
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId: ids,
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;

    const rows = await store.reviewDecisions.listDecisionsForCandidate("cand-session-1");
    assert.equal(rows.length, 2);

    const rowA = rows.find((row) => row.id === first.decision.id);
    const rowB = rows.find((row) => row.id === second.decision.id);
    assert.ok(rowA);
    assert.ok(rowB);
    assert.equal(rowA!.sourceSnapshotId, "snap-a");
    assert.equal(rowA!.notes, "pass one");
    assert.equal(rowA!.overallStatus, "fully_approved");
    assert.equal(rowB!.sourceSnapshotId, "snap-b");
    assert.equal(rowB!.overallStatus, "needs_followup");

    const latest = await store.reviewDecisions.getLatestDecisionForCandidate(
      "cand-session-1",
    );
    assert.equal(latest?.id, second.decision.id);
  });

  it("rejects unknown field keys not present on the candidate changeSet", async () => {
    const store = seedStore();
    const result = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: { madeUpField: "approved" },
      reviewedBy: "vineeta",
      now: () => new Date(REVIEWED_AT),
      newId: createSequentialIdFactory("rev"),
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "unknown_field");
  });

  it("ignores client-supplied overallStatus", async () => {
    const store = seedStore();
    const result = await persistFieldReview({
      store,
      candidateId: "cand-session-1",
      fieldDecisions: { price: "rejected" },
      reviewedBy: "vineeta",
      overallStatus: "fully_approved",
      now: () => new Date(REVIEWED_AT),
      newId: createSequentialIdFactory("rev"),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.decision.overallStatus, "rejected");
  });
});
