import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DiscoverPlace } from "@/data/discover/types";
import {
  PLAN_FIELDS,
  effectiveCoordinates,
  effectiveStrollerFriendly,
  isPlanReady,
  planReadiness,
} from "@/lib/discover/planReadiness";

/** Test-only fixture. Not catalog data; never published. */
function readyPlace(overrides: Partial<DiscoverPlace> = {}): DiscoverPlace {
  return {
    id: "TEST-PLACE-001",
    slug: "test-place",
    name: "Test Place",
    category: "parks_nature",
    allAges: false,
    ageMin: 2,
    ageMax: 10,
    setting: "outdoor",
    costTier: "free",
    typicalVisitMinutes: 90,
    toddlerFriendly: "yes",
    strollerFriendly: "yes",
    hoursKind: "dawn_to_dusk",
    latitude: 43.55,
    longitude: -79.6,
    sourceUrl: "https://example.org/test-place",
    sourceCheckedDate: "2026-10-01",
    publicationState: "draft",
    ...overrides,
  };
}

/** A row exactly as the migration's defaults leave it. */
function freshDraft(): DiscoverPlace {
  return {
    id: "TEST-PLACE-002",
    slug: "fresh-draft",
    name: "Fresh Draft",
    category: "play_entertainment",
    allAges: false,
    setting: "unknown",
    costTier: "unknown",
    toddlerFriendly: "unknown",
    strollerFriendly: "unknown",
    hoursKind: "unknown",
    publicationState: "draft",
  };
}

function gapFields(place: DiscoverPlace, venue?: Parameters<typeof planReadiness>[1]) {
  return planReadiness(place, venue).gaps.map((g) => g.field);
}

describe("planReadiness", () => {
  it("passes a place with every Plan fact verified", () => {
    const result = planReadiness(readyPlace());
    assert.equal(result.ready, true);
    assert.deepEqual(result.gaps, []);
    assert.equal(isPlanReady(readyPlace()), true);
  });

  it("reports every field, in checklist order, for a row left at its defaults", () => {
    const result = planReadiness(freshDraft());
    assert.equal(result.ready, false);
    assert.deepEqual(
      result.gaps.map((g) => g.field),
      [...PLAN_FIELDS],
    );
    for (const gap of result.gaps) {
      assert.ok(gap.label.length > 0);
      assert.ok(gap.reason.length > 0);
    }
  });

  it("treats a recorded fact of 'free' as known, and 'unknown' cost as a gap", () => {
    assert.deepEqual(gapFields(readyPlace({ costTier: "free" })), []);
    assert.deepEqual(gapFields(readyPlace({ costTier: "unknown" })), ["costTier"]);
  });

  it("treats a verified 'no' as a known fact, not a gap", () => {
    assert.deepEqual(
      gapFields(readyPlace({ toddlerFriendly: "no", strollerFriendly: "no" })),
      [],
    );
  });

  describe("ages", () => {
    it("accepts all ages without a range", () => {
      assert.deepEqual(
        gapFields(readyPlace({ allAges: true, ageMin: null, ageMax: null })),
        [],
      );
    });

    it("rejects all ages combined with an upper age limit", () => {
      const result = planReadiness(readyPlace({ allAges: true, ageMax: 12 }));
      assert.deepEqual(result.gaps.map((g) => g.field), ["ages"]);
      assert.match(result.gaps[0].reason, /upper age limit/);
    });

    it("needs both ends of the range when not all ages", () => {
      assert.deepEqual(gapFields(readyPlace({ ageMax: null })), ["ages"]);
      assert.deepEqual(gapFields(readyPlace({ ageMin: null })), ["ages"]);
    });

    it("rejects an inverted or fractional range", () => {
      assert.deepEqual(gapFields(readyPlace({ ageMin: 8, ageMax: 3 })), ["ages"]);
      assert.deepEqual(gapFields(readyPlace({ ageMin: 2.5 })), ["ages"]);
      assert.deepEqual(gapFields(readyPlace({ ageMin: -1 })), ["ages"]);
    });
  });

  describe("hours", () => {
    it("needs weekly rows when hours are marked fixed", () => {
      assert.deepEqual(gapFields(readyPlace({ hoursKind: "fixed" })), ["hours"]);
      assert.deepEqual(gapFields(readyPlace({ hoursKind: "fixed", hours: [] })), ["hours"]);
      assert.deepEqual(
        gapFields(
          readyPlace({
            hoursKind: "fixed",
            hours: [{ weekday: 6, opensAt: "10:00", closesAt: "18:00" }],
          }),
        ),
        [],
      );
    });

    it("accepts dawn-to-dusk and varies without rows", () => {
      assert.deepEqual(gapFields(readyPlace({ hoursKind: "dawn_to_dusk" })), []);
      assert.deepEqual(gapFields(readyPlace({ hoursKind: "varies" })), []);
    });
  });

  describe("visit length", () => {
    it("needs a whole number of minutes within a day", () => {
      assert.deepEqual(gapFields(readyPlace({ typicalVisitMinutes: null })), ["visitLength"]);
      assert.deepEqual(gapFields(readyPlace({ typicalVisitMinutes: 0 })), ["visitLength"]);
      assert.deepEqual(gapFields(readyPlace({ typicalVisitMinutes: 2000 })), ["visitLength"]);
      assert.deepEqual(gapFields(readyPlace({ typicalVisitMinutes: 45.5 })), ["visitLength"]);
    });
  });

  describe("venue fallbacks", () => {
    it("borrows stroller access from the venue only when the place's fact is unknown", () => {
      const place = readyPlace({ strollerFriendly: "unknown" });
      assert.deepEqual(gapFields(place), ["strollerFriendly"]);
      assert.deepEqual(gapFields(place, { strollerFriendly: "yes" }), []);
      assert.equal(
        effectiveStrollerFriendly(readyPlace({ strollerFriendly: "no" }), {
          strollerFriendly: "yes",
        }),
        "no",
      );
    });

    it("borrows coordinates from the venue when the place has none", () => {
      const place = readyPlace({ latitude: null, longitude: null });
      assert.deepEqual(gapFields(place), ["location"]);
      assert.deepEqual(gapFields(place, { latitude: 43.6, longitude: -79.7 }), []);
      assert.deepEqual(effectiveCoordinates(place, { latitude: 43.6, longitude: -79.7 }), {
        latitude: 43.6,
        longitude: -79.7,
      });
    });

    it("prefers the place's own coordinates over the venue's", () => {
      assert.deepEqual(
        effectiveCoordinates(readyPlace(), { latitude: 1, longitude: 1 }),
        { latitude: 43.55, longitude: -79.6 },
      );
    });

    it("rejects out-of-range or half-recorded coordinates", () => {
      assert.deepEqual(gapFields(readyPlace({ latitude: 200 })), ["location"]);
      assert.deepEqual(gapFields(readyPlace({ longitude: null })), ["location"]);
      assert.deepEqual(gapFields(readyPlace({ latitude: Number.NaN })), ["location"]);
    });
  });

  describe("verification", () => {
    it("needs both a source and a real verified date", () => {
      assert.deepEqual(gapFields(readyPlace({ sourceCheckedDate: null })), ["verification"]);
      assert.deepEqual(gapFields(readyPlace({ sourceUrl: "  " })), ["verification"]);
      assert.deepEqual(gapFields(readyPlace({ sourceCheckedDate: "2026-02-30" })), ["verification"]);
      assert.deepEqual(gapFields(readyPlace({ sourceCheckedDate: "Oct 1, 2026" })), ["verification"]);
    });
  });
});
