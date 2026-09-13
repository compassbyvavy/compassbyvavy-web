import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampCandidate } from "@/data/camps/ingestion/types";
import {
  createMemoryIngestionStore,
  type MemoryIngestionStore,
} from "@/lib/camps/ingestion/repositories/memoryStore";
import {
  REVIEW_ACTIONS,
  decisionForAction,
  isReviewAction,
  listReviewQueue,
  listReviewedCandidates,
  persistCandidateReview,
} from "@/lib/camps/ingestion/runner/reviewActions";

const REVIEWED_AT = "2026-09-12T18:00:00.000Z";

function candidate(overrides: Partial<CampCandidate> = {}): CampCandidate {
  return {
    id: "cand-price-change",
    candidateType: "session",
    sourceRecordIds: ["rec-session-1"],
    matchedCatalogId: "sess-week-1",
    matchConfidence: 0.96,
    candidateData: { priceAmount: 429 },
    changeSet: [
      {
        field: "priceAmount",
        changeType: "changed",
        oldValue: 399,
        newValue: 429,
        confidence: 0.9,
        sourceSnapshotId: "snap-2",
      },
    ],
    status: "needs_review",
    reviewReason: "Matched catalog record with proposed field changes",
    qualityFlags: [],
    pipelineOutcome: "MATCHED_CHANGED",
    sourceId: "src-1",
    snapshotId: "snap-2",
    createdAt: "2026-09-12T12:00:00.000Z",
    updatedAt: "2026-09-12T12:00:00.000Z",
    ...overrides,
  };
}

function store(...candidates: CampCandidate[]): MemoryIngestionStore {
  return createMemoryIngestionStore({
    candidates: candidates.length > 0 ? candidates : [candidate()],
  });
}

describe("persistCandidateReview", () => {
  it("records an approval as reviewed truth without publishing", async () => {
    const memory = store();
    const result = await persistCandidateReview({
      store: memory,
      candidateId: "cand-price-change",
      action: "approve",
      reviewedBy: "dev-admin",
      note: "Checked the provider page — $429 is correct.",
      now: () => new Date(REVIEWED_AT),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.decision, "approved");
    assert.equal(result.published, false);
    assert.match(result.message, /separate step/);
    assert.equal(result.candidate.status, "approved");
    assert.equal(result.candidate.reviewedBy, "dev-admin");
    assert.equal(result.candidate.reviewedAt, REVIEWED_AT);
    assert.equal(result.candidate.updatedAt, REVIEWED_AT);
  });

  it("does not touch the published catalog", async () => {
    // A stand-in for the published catalog: any write would be visible here.
    const published = {
      sessions: [{ id: "sess-week-1", priceAmount: 399 }],
      programs: [{ id: "prog-1", name: "Bright Sparks Day Camp" }],
    };
    const before = structuredClone(published);
    const memory = store();
    const stateBefore = memory.snapshotState();

    const result = await persistCandidateReview({
      store: memory,
      candidateId: "cand-price-change",
      action: "approve",
      reviewedBy: "dev-admin",
      now: () => new Date(REVIEWED_AT),
    });

    assert.equal(result.ok, true);
    assert.deepEqual(published, before);

    // The only ingestion table that moved is camp_candidates.
    const stateAfter = memory.snapshotState();
    assert.deepEqual(stateAfter.sources, stateBefore.sources);
    assert.deepEqual(stateAfter.snapshots, stateBefore.snapshots);
    assert.deepEqual(stateAfter.extractionRuns, stateBefore.extractionRuns);
    assert.deepEqual(stateAfter.extractedRecords, stateBefore.extractedRecords);
    assert.deepEqual(stateAfter.runSummaries, stateBefore.runSummaries);
    assert.equal(stateAfter.candidates.length, 1);
    assert.equal(stateAfter.candidates[0].status, "approved");

    // The proposed value stays a proposal: nothing rewrites the change set.
    assert.equal(stateAfter.candidates[0].changeSet[0].oldValue, 399);
    assert.equal(stateAfter.candidates[0].changeSet[0].newValue, 429);
  });

  it("keeps the pipeline's reason and appends the human one", async () => {
    const memory = store();
    const result = await persistCandidateReview({
      store: memory,
      candidateId: "cand-price-change",
      action: "reject",
      reviewedBy: "dev-admin",
      note: "Stale page — the provider confirmed $399.",
      now: () => new Date(REVIEWED_AT),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(
      result.candidate.reviewReason,
      "Matched catalog record with proposed field changes · rejected by dev-admin: Stale page — the provider confirmed $399.",
    );
  });

  it("records a decision without a note", async () => {
    const memory = store();
    const result = await persistCandidateReview({
      store: memory,
      candidateId: "cand-price-change",
      action: "ignore",
      reviewedBy: "dev-admin",
      now: () => new Date(REVIEWED_AT),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.candidate.status, "ignored");
    assert.match(result.candidate.reviewReason ?? "", /ignored by dev-admin$/);
  });

  it("maps every operator action to a stored decision", () => {
    assert.deepEqual(
      REVIEW_ACTIONS.map(decisionForAction),
      ["approved", "rejected", "ignored", "needs_review"],
    );
    assert.ok(isReviewAction("approve"));
    assert.ok(!isReviewAction("publish"));
    assert.ok(!isReviewAction(undefined));
  });

  it("can send a candidate back to the queue", async () => {
    const memory = store(candidate({ status: "matched" }));
    const result = await persistCandidateReview({
      store: memory,
      candidateId: "cand-price-change",
      action: "needs_review",
      reviewedBy: "dev-admin",
      now: () => new Date(REVIEWED_AT),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.candidate.status, "needs_review");
    assert.equal((await listReviewQueue(memory)).length, 1);
  });

  it("rejects an unknown action rather than guessing", async () => {
    const memory = store();
    const result = await persistCandidateReview({
      store: memory,
      candidateId: "cand-price-change",
      action: "publish",
      reviewedBy: "dev-admin",
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "invalid_action");
    const unchanged = await memory.candidates.getCandidate("cand-price-change");
    assert.equal(unchanged?.status, "needs_review");
  });

  it("requires an attributed reviewer", async () => {
    const memory = store();
    const result = await persistCandidateReview({
      store: memory,
      candidateId: "cand-price-change",
      action: "approve",
      reviewedBy: "   ",
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "missing_reviewer");
    const unchanged = await memory.candidates.getCandidate("cand-price-change");
    assert.equal(unchanged?.status, "needs_review");
    assert.equal(unchanged?.reviewedBy ?? null, null);
  });

  it("reports a missing candidate instead of throwing", async () => {
    const result = await persistCandidateReview({
      store: store(),
      candidateId: "cand-does-not-exist",
      action: "approve",
      reviewedBy: "dev-admin",
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "candidate_not_found");
  });
});

describe("review queues", () => {
  it("separates open candidates from decided ones", async () => {
    const memory = store(
      candidate({ id: "cand-open", status: "needs_review" }),
      candidate({ id: "cand-new", status: "new" }),
      candidate({ id: "cand-done", status: "approved" }),
      candidate({ id: "cand-dropped", status: "rejected" }),
    );

    assert.deepEqual(
      (await listReviewQueue(memory)).map((row) => row.id).sort(),
      ["cand-new", "cand-open"],
    );
    assert.deepEqual(
      (await listReviewedCandidates(memory)).map((row) => row.id).sort(),
      ["cand-done", "cand-dropped"],
    );
  });

  it("scopes the queue to one source when asked", async () => {
    const memory = store(
      candidate({ id: "cand-a", sourceId: "src-1" }),
      candidate({ id: "cand-b", sourceId: "src-2" }),
    );

    const queue = await listReviewQueue(memory, { sourceId: "src-2" });
    assert.deepEqual(
      queue.map((row) => row.id),
      ["cand-b"],
    );
  });
});
