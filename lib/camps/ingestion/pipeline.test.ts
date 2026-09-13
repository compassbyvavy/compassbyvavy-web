/**
 * Tests for the extraction hash gate and candidate outcome resolution.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSourceSnapshot } from "@/data/camps/ingestion/types";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import {
  decideExtraction,
  resolveCandidateOutcome,
} from "@/lib/camps/ingestion/pipeline";

const html = "<html><body><p>Full week $350</p></body></html>";
const changedHtml = "<html><body><p>Full week $370</p></body></html>";

function snapshot(overrides: Partial<CampSourceSnapshot> = {}): CampSourceSnapshot {
  return {
    id: "snap-1",
    sourceId: "src-1",
    retrievedAt: "2026-09-12T16:00:00.000Z",
    contentHash: hashSourceContent(html),
    rawContent: html,
    fetchStatus: "success",
    ...overrides,
  };
}

describe("decideExtraction", () => {
  it("skips extraction when the content hash is unchanged", () => {
    assert.deepEqual(
      decideExtraction({
        snapshot: snapshot(),
        previousHash: hashSourceContent(html),
      }),
      {
        shouldExtract: false,
        reason: "content_unchanged",
        outcome: "UNCHANGED_SOURCE",
      },
    );
  });

  it("extracts when the content hash changed", () => {
    assert.deepEqual(
      decideExtraction({
        snapshot: snapshot({
          contentHash: hashSourceContent(changedHtml),
          rawContent: changedHtml,
        }),
        previousHash: hashSourceContent(html),
      }),
      { shouldExtract: true, reason: "content_changed", outcome: null },
    );
  });

  it("extracts the first time a source is seen", () => {
    assert.deepEqual(decideExtraction({ snapshot: snapshot(), previousHash: null }), {
      shouldExtract: true,
      reason: "no_previous_hash",
      outcome: null,
    });
  });

  it("honours a forced re-extraction", () => {
    assert.deepEqual(
      decideExtraction({
        snapshot: snapshot(),
        previousHash: hashSourceContent(html),
        force: true,
      }),
      { shouldExtract: true, reason: "forced", outcome: null },
    );
  });

  it("maps fetch failures onto pipeline outcomes without extracting", () => {
    assert.deepEqual(decideExtraction({ snapshot: snapshot({ fetchStatus: "blocked" }) }), {
      shouldExtract: false,
      reason: "fetch_blocked",
      outcome: "BLOCKED",
    });
    assert.deepEqual(
      decideExtraction({ snapshot: snapshot({ fetchStatus: "unsupported" }) }),
      { shouldExtract: false, reason: "fetch_unsupported", outcome: "UNSUPPORTED" },
    );
    assert.deepEqual(decideExtraction({ snapshot: snapshot({ fetchStatus: "error" }) }), {
      shouldExtract: false,
      reason: "fetch_error",
      outcome: "FAILED",
    });
  });

  it("treats a 304 as an unchanged source", () => {
    assert.deepEqual(
      decideExtraction({ snapshot: snapshot({ fetchStatus: "not_modified" }) }),
      { shouldExtract: false, reason: "fetch_not_modified", outcome: "UNCHANGED_SOURCE" },
    );
  });

  it("re-extracts a 304 only when forced and content is retained", () => {
    assert.equal(
      decideExtraction({
        snapshot: snapshot({ fetchStatus: "not_modified" }),
        force: true,
      }).shouldExtract,
      true,
    );
    assert.equal(
      decideExtraction({
        snapshot: snapshot({ fetchStatus: "not_modified", rawContent: null }),
        force: true,
      }).shouldExtract,
      false,
    );
  });

  it("reports an empty 200 as a failure rather than a silent skip", () => {
    assert.deepEqual(
      decideExtraction({ snapshot: snapshot({ rawContent: "" }), force: true }),
      { shouldExtract: false, reason: "no_content", outcome: "FAILED" },
    );
  });
});

describe("resolveCandidateOutcome", () => {
  it("sends ambiguous matches to review", () => {
    const resolution = resolveCandidateOutcome({
      matchedCatalogId: null,
      hasMaterialChanges: true,
      qualityFlags: ["ambiguous_match"],
    });
    assert.equal(resolution.status, "needs_review");
    assert.equal(resolution.pipelineOutcome, "AMBIGUOUS");
  });

  it("marks unmatched records as new", () => {
    const resolution = resolveCandidateOutcome({
      matchedCatalogId: null,
      hasMaterialChanges: true,
      qualityFlags: ["missing_price"],
    });
    assert.equal(resolution.status, "new");
    assert.equal(resolution.pipelineOutcome, "NEW");
  });

  it("marks matched records with changes as needs_review", () => {
    const resolution = resolveCandidateOutcome({
      matchedCatalogId: "sess-1",
      hasMaterialChanges: true,
      qualityFlags: [],
    });
    assert.equal(resolution.status, "needs_review");
    assert.equal(resolution.pipelineOutcome, "MATCHED_CHANGED");
  });

  it("marks matched records without changes as matched", () => {
    const resolution = resolveCandidateOutcome({
      matchedCatalogId: "sess-1",
      hasMaterialChanges: false,
      qualityFlags: [],
    });
    assert.equal(resolution.status, "matched");
    assert.equal(resolution.pipelineOutcome, "MATCHED_UNCHANGED");
  });

  it("routes a possibly removed session to review", () => {
    const resolution = resolveCandidateOutcome({
      matchedCatalogId: "sess-1",
      hasMaterialChanges: false,
      qualityFlags: ["possible_removed_session"],
    });
    assert.equal(resolution.status, "needs_review");
    assert.match(resolution.reviewReason, /no longer stated/);
  });

  it("never resolves to approved", () => {
    const statuses = [
      resolveCandidateOutcome({ hasMaterialChanges: true, qualityFlags: [] }).status,
      resolveCandidateOutcome({
        matchedCatalogId: "x",
        hasMaterialChanges: false,
        qualityFlags: [],
      }).status,
    ];
    assert.equal(statuses.includes("approved"), false);
  });
});
