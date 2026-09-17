/**
 * Tests for ingestion confidence bands and the auto-publish prohibition.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampConfidence,
  confidenceBand,
  isLowerRiskReviewEligible,
  mayAutoPublishToCatalog,
  weakestConfidence,
} from "@/lib/camps/ingestion/confidence";

describe("confidenceBand", () => {
  it("splits HIGH / MEDIUM / LOW at documented thresholds", () => {
    assert.equal(confidenceBand(1), "HIGH");
    assert.equal(confidenceBand(0.9), "HIGH");
    assert.equal(confidenceBand(0.899), "MEDIUM");
    assert.equal(confidenceBand(0.7), "MEDIUM");
    assert.equal(confidenceBand(0.699), "LOW");
    assert.equal(confidenceBand(0), "LOW");
  });

  it("clamps out-of-range and non-finite scores", () => {
    assert.equal(clampConfidence(1.4), 1);
    assert.equal(clampConfidence(-3), 0);
    assert.equal(clampConfidence(Number.NaN), 0);
    assert.equal(confidenceBand(42), "HIGH");
    assert.equal(confidenceBand(Number.NaN), "LOW");
  });
});

describe("isLowerRiskReviewEligible", () => {
  it("requires HIGH confidence", () => {
    assert.equal(isLowerRiskReviewEligible(0.96), true);
    assert.equal(isLowerRiskReviewEligible(0.88), false);
  });

  it("is blocked by flags that question the match or source", () => {
    assert.equal(isLowerRiskReviewEligible(0.99, ["ambiguous_match"]), false);
    assert.equal(isLowerRiskReviewEligible(0.99, ["source_blocked"]), false);
    assert.equal(isLowerRiskReviewEligible(0.99, ["possible_removed_session"]), false);
    assert.equal(isLowerRiskReviewEligible(0.99, ["extraction_partial"]), false);
  });

  it("tolerates missing-fact flags — incomplete is not untrustworthy", () => {
    assert.equal(
      isLowerRiskReviewEligible(0.95, ["missing_price", "missing_location"]),
      true,
    );
  });
});

describe("mayAutoPublishToCatalog", () => {
  it("is always false", () => {
    assert.equal(mayAutoPublishToCatalog(), false);
  });
});

describe("weakestConfidence", () => {
  it("returns the lowest observation confidence", () => {
    assert.equal(weakestConfidence([0.99, 0.72, 0.9]), 0.72);
    assert.equal(weakestConfidence([]), 0);
  });
});
