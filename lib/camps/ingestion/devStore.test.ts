import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { LIVE_FETCH_ENV_VAR } from "@/lib/camps/ingestion/devGate";
import {
  getIngestionDevContext,
  resetIngestionDevContext,
  runIngestionDevCycle,
} from "@/lib/camps/ingestion/devStore";
import { persistCandidateReview } from "@/lib/camps/ingestion/runner/reviewActions";

const originalNodeEnv = process.env.NODE_ENV;

function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

afterEach(() => {
  setNodeEnv(originalNodeEnv);
  resetIngestionDevContext();
});

describe("ingestion dev store", () => {
  it("is unavailable in production", () => {
    setNodeEnv("production");
    resetIngestionDevContext();
    assert.equal(getIngestionDevContext(), null);
  });

  it("seeds from the fixture bundle", () => {
    const context = getIngestionDevContext();
    assert.ok(context, "expected a dev context outside production");
    assert.equal(context.store.kind, "memory");
    assert.ok(context.store.snapshotState().sources.length > 0);
    assert.ok(context.store.snapshotState().candidates.length > 0);
    assert.ok(context.catalog.sessions.length > 0);
  });

  it("hands out isolated state, so a caller cannot mutate fixtures", () => {
    const context = getIngestionDevContext();
    assert.ok(context);
    const state = context.store.snapshotState();
    state.sources[0].isActive = false;
    assert.equal(context.store.snapshotState().sources[0].isActive, true);
  });

  it("runs a real cycle over fixture content and records a run summary", async () => {
    const context = getIngestionDevContext();
    assert.ok(context);
    const before = context.store.snapshotState();
    const catalogBefore = structuredClone(context.catalog);

    const summary = await runIngestionDevCycle(new Date("2026-09-13T09:00:00.000Z"));
    assert.ok(summary, "expected a run summary");
    assert.ok(summary.sourcesAttempted > 0);
    assert.equal(summary.completedAt, "2026-09-13T09:00:00.000Z");

    const latest = await context.store.runs.latestRunSummary();
    assert.equal(latest?.id, summary.id);

    const after = context.store.snapshotState();
    assert.ok(after.snapshots.length > before.snapshots.length);
    // The fixture published catalog is input only.
    assert.deepEqual(context.catalog, catalogBefore);
  });

  it("produces real change candidates on the first cycle and nothing on the second", async () => {
    const context = getIngestionDevContext();
    assert.ok(context);

    const first = await runIngestionDevCycle(new Date("2026-09-13T09:00:00.000Z"));
    assert.ok(first);
    assert.ok(first.extractionsSucceeded > 0);
    assert.ok(first.candidatesCreated > 0);

    const changed = (await context.store.candidates.listCandidates()).filter(
      (candidate) => candidate.pipelineOutcome === "MATCHED_CHANGED",
    );
    assert.ok(changed.length > 0, "expected the fixture history to produce a change");
    assert.ok(
      changed.some((candidate) =>
        candidate.changeSet.some(
          (change) => change.field === "priceAmount" && change.newValue === 425,
        ),
      ),
      "expected the provider page price change to be proposed",
    );

    // Same content on the next pass: the hash gate stops everything downstream.
    const second = await runIngestionDevCycle(new Date("2026-09-14T09:00:00.000Z"));
    assert.ok(second);
    assert.equal(second.sourcesAttempted, first.sourcesAttempted);
    assert.equal(second.extractionsSucceeded, 0);
    assert.equal(second.candidatesCreated, 0);
    assert.ok(second.sourcesUnchanged > 0);
  });

  it("persists a review decision that survives a re-read", async () => {
    const context = getIngestionDevContext();
    assert.ok(context);

    const result = await persistCandidateReview({
      store: context.store,
      candidateId: "cand-session-changed",
      action: "approve",
      reviewedBy: "dev-admin (local)",
      now: () => new Date("2026-09-13T10:00:00.000Z"),
    });
    assert.equal(result.ok, true);

    const reread = await getIngestionDevContext()?.store.candidates.getCandidate(
      "cand-session-changed",
    );
    assert.equal(reread?.status, "approved");
    assert.equal(reread?.reviewedBy, "dev-admin (local)");
  });

  it("does not require the live-fetch env var to work offline", async () => {
    delete process.env[LIVE_FETCH_ENV_VAR];
    const summary = await runIngestionDevCycle(new Date("2026-09-13T09:00:00.000Z"));
    assert.ok(summary);
    assert.ok(summary.sourcesAttempted > 0);
  });
});
