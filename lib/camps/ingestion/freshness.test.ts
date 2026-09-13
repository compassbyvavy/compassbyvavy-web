/**
 * Tests for freshness labels and check scheduling.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSource } from "@/data/camps/ingestion/types";
import {
  freshnessLabel,
  hoursSince,
  isSourceDue,
  isSourceStale,
  nextCheckAtFrom,
} from "@/lib/camps/ingestion/freshness";

const NOW = new Date("2026-09-12T16:00:00.000Z");

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
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("freshnessLabel", () => {
  it("labels recent checks Fresh", () => {
    assert.equal(freshnessLabel("2026-09-12T15:00:00.000Z", NOW), "Fresh");
    assert.equal(freshnessLabel("2026-09-11T16:00:00.000Z", NOW), "Fresh");
  });

  it("labels day-old checks Recently checked", () => {
    assert.equal(freshnessLabel("2026-09-11T10:00:00.000Z", NOW), "Recently checked");
    assert.equal(freshnessLabel("2026-09-09T17:00:00.000Z", NOW), "Recently checked");
  });

  it("labels older checks Stale", () => {
    assert.equal(freshnessLabel("2026-09-01T16:00:00.000Z", NOW), "Stale");
    assert.equal(isSourceStale("2026-09-01T16:00:00.000Z", NOW), true);
    assert.equal(isSourceStale("2026-09-12T15:00:00.000Z", NOW), false);
  });

  it("never renders unknown or unparseable check times as fresh", () => {
    assert.equal(freshnessLabel(null, NOW), "Unknown");
    assert.equal(freshnessLabel(undefined, NOW), "Unknown");
    assert.equal(freshnessLabel("not-a-date", NOW), "Unknown");
  });

  it("treats future timestamps as zero elapsed hours", () => {
    assert.equal(hoursSince("2026-09-13T16:00:00.000Z", NOW), 0);
    assert.equal(freshnessLabel("2026-09-13T16:00:00.000Z", NOW), "Fresh");
  });
});

describe("scheduling", () => {
  it("uses the source interval, defaulting to daily", () => {
    assert.equal(
      nextCheckAtFrom({ checkIntervalHours: 6 }, NOW),
      "2026-09-12T22:00:00.000Z",
    );
    assert.equal(nextCheckAtFrom({}, NOW), "2026-09-13T16:00:00.000Z");
    assert.equal(
      nextCheckAtFrom({ checkIntervalHours: 0 }, NOW),
      "2026-09-13T16:00:00.000Z",
    );
  });

  it("treats never-scheduled active sources as due", () => {
    assert.equal(isSourceDue(source(), NOW), true);
    assert.equal(isSourceDue(source({ nextCheckAt: null }), NOW), true);
    assert.equal(isSourceDue(source({ nextCheckAt: "garbage" }), NOW), true);
  });

  it("respects a future nextCheckAt and inactive sources", () => {
    assert.equal(
      isSourceDue(source({ nextCheckAt: "2026-09-12T18:00:00.000Z" }), NOW),
      false,
    );
    assert.equal(
      isSourceDue(source({ nextCheckAt: "2026-09-12T16:00:00.000Z" }), NOW),
      true,
    );
    assert.equal(
      isSourceDue(source({ isActive: false, nextCheckAt: null }), NOW),
      false,
    );
  });
});
