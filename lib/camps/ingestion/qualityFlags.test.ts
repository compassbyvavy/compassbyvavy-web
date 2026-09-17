/**
 * Tests for ingestion quality flags and source health labels.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import {
  applyMatchQualityFlags,
  mergeQualityFlags,
  qualityFlagsForExtractedSession,
  sourceHealthLabel,
  sourceQualityFlags,
} from "@/lib/camps/ingestion/qualityFlags";
import { ingestionSnapshots, ingestionSources } from "@/data/camps/ingestion/fixtures";

const completeSession = {
  startDate: "2026-07-13",
  endDate: "2026-07-17",
  ageMin: 6,
  ageMax: 10,
  priceAmount: 399,
  venueId: "venue-1",
  registrationUrl: "https://example.com/register",
};

function source(overrides: Partial<CampSource> = {}): CampSource {
  return {
    id: "src-test",
    providerId: "prov-test",
    sourceType: "provider_website",
    sourceUrl: "https://example.com/camps",
    canonicalUrl: "https://example.com/camps",
    registrationPlatform: null,
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "daily",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-09-12T16:00:00.000Z",
    ...overrides,
  };
}

function snapshot(overrides: Partial<CampSourceSnapshot> = {}): CampSourceSnapshot {
  return {
    id: "snap-test",
    sourceId: "src-test",
    retrievedAt: "2026-09-12T16:00:00.000Z",
    contentHash: "sha256:abc",
    fetchStatus: "success",
    ...overrides,
  };
}

describe("qualityFlagsForExtractedSession", () => {
  it("returns no flags for a complete session", () => {
    assert.deepEqual(qualityFlagsForExtractedSession(completeSession), []);
  });

  it("flags each missing fact category", () => {
    assert.deepEqual(qualityFlagsForExtractedSession({}), [
      "missing_dates",
      "missing_price",
      "missing_age",
      "missing_location",
      "missing_registration_url",
    ]);
  });

  it("treats a half-open age band as unproven eligibility", () => {
    assert.deepEqual(
      qualityFlagsForExtractedSession({ ...completeSession, ageMax: null }),
      ["missing_age"],
    );
  });

  it("keeps a stated zero price as a fact", () => {
    assert.deepEqual(
      qualityFlagsForExtractedSession({ ...completeSession, priceAmount: 0 }),
      [],
    );
  });

  it("does not demand a venue for online sessions", () => {
    assert.deepEqual(
      qualityFlagsForExtractedSession({
        ...completeSession,
        venueId: null,
        deliveryMode: "online",
      }),
      [],
    );
  });

  it("flags cancelled or removed sessions for review", () => {
    assert.deepEqual(
      qualityFlagsForExtractedSession({ ...completeSession, cancelled: true }),
      ["possible_removed_session"],
    );
    assert.deepEqual(
      qualityFlagsForExtractedSession({ ...completeSession, status: "Cancelled" }),
      ["possible_removed_session"],
    );
  });

  it("adds extraction_partial from run context", () => {
    assert.deepEqual(
      qualityFlagsForExtractedSession(completeSession, { extractionPartial: true }),
      ["extraction_partial"],
    );
  });

  it("ignores blank strings as missing", () => {
    assert.deepEqual(
      qualityFlagsForExtractedSession({ ...completeSession, registrationUrl: "  " }),
      ["missing_registration_url"],
    );
  });
});

describe("mergeQualityFlags", () => {
  it("dedupes and applies a stable display order", () => {
    assert.deepEqual(
      mergeQualityFlags(
        ["source_stale", "missing_price"],
        ["missing_price", "ambiguous_match"],
        null,
      ),
      ["missing_price", "ambiguous_match", "source_stale"],
    );
  });
});

describe("applyMatchQualityFlags", () => {
  it("flags ambiguity from matcher reasons", () => {
    assert.deepEqual(
      applyMatchQualityFlags([], { reasons: ["ambiguous_name_match"] }),
      ["ambiguous_match"],
    );
  });

  it("flags more than one plausible catalog row", () => {
    assert.deepEqual(
      applyMatchQualityFlags([], { catalogCandidateCount: 2 }),
      ["ambiguous_match"],
    );
  });

  it("flags a matched row held together by weak confidence", () => {
    assert.deepEqual(
      applyMatchQualityFlags([], { matchedCatalogId: "sess-1", matchConfidence: 0.4 }),
      ["ambiguous_match"],
    );
    assert.deepEqual(
      applyMatchQualityFlags([], { matchedCatalogId: "sess-1", matchConfidence: 0.98 }),
      [],
    );
  });

  it("flags collapsed duplicate records and conflicting fields", () => {
    assert.deepEqual(
      applyMatchQualityFlags(["missing_price"], {
        matchedCatalogId: "sess-1",
        matchConfidence: 0.95,
        sourceRecordIds: ["ext-a", "ext-b"],
        conflictingFields: ["priceAmount"],
      }),
      ["missing_price", "possible_duplicate", "conflicting_sources"],
    );
  });
});

describe("sourceQualityFlags", () => {
  it("reports blocked and stale sources", () => {
    const now = new Date("2026-09-20T16:00:00.000Z");
    assert.deepEqual(
      sourceQualityFlags(
        source({ lastCheckedAt: "2026-09-01T16:00:00.000Z" }),
        snapshot({ fetchStatus: "blocked" }),
        now,
      ),
      ["source_stale", "source_blocked"],
    );
    assert.deepEqual(
      sourceQualityFlags(
        source({ lastCheckedAt: "2026-09-20T15:00:00.000Z" }),
        snapshot(),
        now,
      ),
      [],
    );
  });
});

describe("sourceHealthLabel", () => {
  it("labels manual and unsupported sources before failure states", () => {
    assert.equal(
      sourceHealthLabel(
        source({ crawlStrategy: "manual", lastErrorAt: "2026-09-12T16:00:00.000Z" }),
      ),
      "Manual",
    );
    assert.equal(
      sourceHealthLabel(source({ crawlStrategy: "unsupported" })),
      "Unsupported",
    );
  });

  it("distinguishes blocked from failed", () => {
    assert.equal(
      sourceHealthLabel(source(), snapshot({ fetchStatus: "blocked" })),
      "Blocked",
    );
    assert.equal(
      sourceHealthLabel(source(), snapshot({ fetchStatus: "error" })),
      "Failed",
    );
    assert.equal(
      sourceHealthLabel(
        source({
          lastSuccessfulAt: "2026-09-10T16:00:00.000Z",
          lastErrorAt: "2026-09-12T16:00:00.000Z",
        }),
      ),
      "Failed",
    );
  });

  it("treats an error older than the last success as resolved", () => {
    assert.equal(
      sourceHealthLabel(
        source({
          lastCheckedAt: "2026-09-12T16:00:00.000Z",
          lastSuccessfulAt: "2026-09-12T16:00:00.000Z",
          lastErrorAt: "2026-09-10T16:00:00.000Z",
        }),
      ),
      "Healthy",
    );
  });

  it("reports Changed when the last check found new content", () => {
    assert.equal(
      sourceHealthLabel(
        source({
          lastCheckedAt: "2026-09-12T16:00:00.000Z",
          lastChangedAt: "2026-09-12T16:00:00.000Z",
        }),
      ),
      "Changed",
    );
    assert.equal(
      sourceHealthLabel(
        source({
          lastCheckedAt: "2026-09-12T16:00:00.000Z",
          lastChangedAt: "2026-09-10T16:00:00.000Z",
        }),
      ),
      "Healthy",
    );
  });

  it("labels every fixture source as its documented health state", () => {
    const latestBySource = new Map<string, CampSourceSnapshot>();
    for (const snap of ingestionSnapshots) {
      const current = latestBySource.get(snap.sourceId);
      if (!current || snap.retrievedAt > current.retrievedAt) {
        latestBySource.set(snap.sourceId, snap);
      }
    }
    const labels = Object.fromEntries(
      ingestionSources.map((s) => [
        s.id,
        sourceHealthLabel(s, latestBySource.get(s.id) ?? null),
      ]),
    );
    assert.deepEqual(labels, {
      "src-nutty-provider-page": "Changed",
      "src-nutty-registration": "Healthy",
      "src-duplicate-provider-page": "Healthy",
      "src-blocked-municipal": "Blocked",
      "src-unsupported-pdf": "Unsupported",
      "src-manual-intake": "Manual",
    });
  });
});
