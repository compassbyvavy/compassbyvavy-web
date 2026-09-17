import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeReviewOutcome,
  isFieldDecision,
} from "@/lib/camps/ingestion/reviewOutcome";

describe("computeReviewOutcome precedence", () => {
  it("RULE 0: empty fieldDecisions is invalid and must not persist", () => {
    const result = computeReviewOutcome({});
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "empty_field_decisions");
    }
  });

  it("RULE 1: single approved → fully_approved", () => {
    const result = computeReviewOutcome({ price: "approved" });
    assert.deepEqual(result, { ok: true, overallStatus: "fully_approved" });
  });

  it("RULE 1: all approved → fully_approved", () => {
    const result = computeReviewOutcome({
      price: "approved",
      ageMax: "approved",
    });
    assert.deepEqual(result, { ok: true, overallStatus: "fully_approved" });
  });

  it("RULE 2: single rejected → rejected", () => {
    const result = computeReviewOutcome({ price: "rejected" });
    assert.deepEqual(result, { ok: true, overallStatus: "rejected" });
  });

  it("RULE 2: all rejected → rejected", () => {
    const result = computeReviewOutcome({
      price: "rejected",
      ageMax: "rejected",
    });
    assert.deepEqual(result, { ok: true, overallStatus: "rejected" });
  });

  it("RULE 3: approved + rejected → partially_approved", () => {
    const result = computeReviewOutcome({
      price: "approved",
      ageMax: "rejected",
    });
    assert.deepEqual(result, { ok: true, overallStatus: "partially_approved" });
  });

  it("RULE 3: rejected + needs_followup → partially_approved (important)", () => {
    const result = computeReviewOutcome({
      price: "rejected",
      staffRatio: "needs_followup",
    });
    assert.deepEqual(result, { ok: true, overallStatus: "partially_approved" });
  });

  it("RULE 3: approved + rejected + needs_followup → partially_approved", () => {
    const result = computeReviewOutcome({
      price: "approved",
      cancellationFee: "rejected",
      staffRatio: "needs_followup",
    });
    assert.deepEqual(result, { ok: true, overallStatus: "partially_approved" });
  });

  it("RULE 4: needs_followup only → needs_followup", () => {
    const result = computeReviewOutcome({
      staffRatio: "needs_followup",
    });
    assert.deepEqual(result, { ok: true, overallStatus: "needs_followup" });
  });

  it("RULE 4: approved + needs_followup → needs_followup", () => {
    const result = computeReviewOutcome({
      price: "approved",
      staffRatio: "needs_followup",
    });
    assert.deepEqual(result, { ok: true, overallStatus: "needs_followup" });
  });

  it("isFieldDecision accepts only the closed vocabulary", () => {
    assert.equal(isFieldDecision("approved"), true);
    assert.equal(isFieldDecision("rejected"), true);
    assert.equal(isFieldDecision("needs_followup"), true);
    assert.equal(isFieldDecision("ignored"), false);
    assert.equal(isFieldDecision(""), false);
  });
});
