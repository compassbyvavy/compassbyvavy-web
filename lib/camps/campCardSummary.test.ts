/**
 * Focused CampCard summary tests — mixed-status, missing-info, single session.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CampProgram,
  CampSession,
  Venue,
} from "@/data/camps/types";
import {
  buildCampCardSummary,
  summarizeMatchingSessionPrices,
  summarizeMatchingSessionStatus,
} from "@/lib/camps/campCardSummary";

const FIXED_NOW = new Date("2026-08-27T16:00:00.000Z");

const program: CampProgram = {
  id: "prog-test",
  slug: "prog-test",
  providerId: "prov-test",
  name: "Test Program",
  primaryCategory: "STEM",
  secondaryThemes: ["Robotics"],
  typicalAgeMin: 7,
  typicalAgeMax: 12,
};

const venuesById: Record<string, Venue> = {
  "venue-a": {
    id: "venue-a",
    name: "Venue A",
    neighbourhood: "Port Credit",
    city: "Mississauga",
  },
  "venue-b": {
    id: "venue-b",
    name: "Venue B",
    neighbourhood: "City Centre",
    city: "Mississauga",
  },
};

function sess(
  partial: Partial<CampSession> &
    Pick<CampSession, "id" | "registrationStatus">,
): CampSession {
  return {
    programId: program.id,
    ...partial,
  };
}

describe("CampCard summary — single matching session", () => {
  it("uses helper status and shows known price/venue from that session only", () => {
    const matching = [
      sess({
        id: "s1",
        registrationStatus: "registration_open",
        registrationUrl: "https://example.invalid/r",
        venueId: "venue-a",
        startDate: "2026-07-06",
        endDate: "2026-07-10",
        coreHoursStart: "09:00",
        coreHoursEnd: "16:00",
        priceAmount: 200,
        priceUnit: "per_week",
        currency: "CAD",
        ageMin: 7,
        ageMax: 12,
        ageMinInclusive: true,
        ageMaxInclusive: true,
        ageAssessmentRule: "as_of_date",
        ageAssessedAtDate: "2026-07-01",
      }),
    ];
    const summary = buildCampCardSummary({
      program,
      matchingSessions: matching,
      venuesById,
      now: FIXED_NOW,
    });
    assert.equal(summary.status.kind, "single");
    if (summary.status.kind === "single") {
      assert.equal(summary.status.action.displayState, "registration_open");
    }
    assert.equal(summary.price.kind, "known");
    if (summary.price.kind === "known") {
      assert.match(summary.price.label, /200/);
      assert.match(summary.price.label, /week/i);
      assert.match(summary.price.label, /^CAD \$/);
      assert.doesNotMatch(summary.price.label, /^From /);
    }
    assert.equal(summary.venue.kind, "known");
    assert.equal(summary.categoryLabel, "STEM");
    assert.equal(summary.eligibilityLabel, "Ages 7–12");
  });

  it("does not fall back to program typical ages when session ages are missing", () => {
    const matching = [
      sess({
        id: "s1",
        registrationStatus: "registration_open",
        venueId: "venue-a",
        startDate: "2026-07-06",
        endDate: "2026-07-10",
        priceAmount: 200,
        priceUnit: "per_week",
        currency: "CAD",
      }),
    ];
    const summary = buildCampCardSummary({
      program,
      matchingSessions: matching,
      venuesById,
      now: FIXED_NOW,
    });
    assert.equal(summary.eligibilityLabel, null);
  });
});

describe("CampCard summary — mixed status", () => {
  it("shows qualified open count without implying seats", () => {
    const matching = [
      sess({
        id: "s1",
        registrationStatus: "registration_open",
        registrationUrl: "https://example.invalid/r",
        venueId: "venue-a",
        startDate: "2026-07-06",
        endDate: "2026-07-10",
        priceAmount: 285,
        priceUnit: "per_week",
        currency: "CAD",
      }),
      sess({
        id: "s2",
        registrationStatus: "waitlist",
        waitlistUrl: "https://example.invalid/w",
        venueId: "venue-a",
        startDate: "2026-07-13",
        endDate: "2026-07-17",
        priceAmount: 285,
        priceUnit: "per_week",
        currency: "CAD",
        seatAvailability: "confirmed_full",
      }),
      sess({
        id: "s3",
        registrationStatus: "registration_closed",
        venueId: "venue-a",
        startDate: "2026-07-20",
        endDate: "2026-07-24",
        priceAmount: 295,
        priceUnit: "per_week",
        currency: "CAD",
        seatAvailability: "confirmed_available",
      }),
    ];
    const status = summarizeMatchingSessionStatus(matching, { now: FIXED_NOW });
    assert.equal(status.kind, "mixed");
    if (status.kind === "mixed") {
      assert.equal(status.openCount, 1);
      assert.equal(status.totalCount, 3);
      assert.match(status.label, /1 of 3 sessions have registration open/);
      assert.doesNotMatch(status.label, /seat/i);
    }
    const price = summarizeMatchingSessionPrices(matching);
    assert.equal(price.kind, "known");
    if (price.kind === "known") {
      assert.equal(price.amountMin, 285);
      assert.equal(price.amountMax, 295);
      assert.equal(price.unit, "per_week");
    }
  });

  it("multi-venue comes from matching sessions only", () => {
    const matching = [
      sess({
        id: "s1",
        registrationStatus: "registration_open",
        venueId: "venue-a",
        startDate: "2026-08-10",
        endDate: "2026-08-14",
        priceAmount: 310,
        priceUnit: "per_week",
        currency: "CAD",
      }),
      sess({
        id: "s2",
        registrationStatus: "not_yet_open",
        registrationOpensOn: "2026-09-01",
        venueId: "venue-b",
        startDate: "2026-08-17",
        endDate: "2026-08-21",
        priceAmount: 310,
        priceUnit: "per_week",
        currency: "CAD",
      }),
    ];
    const summary = buildCampCardSummary({
      program,
      matchingSessions: matching,
      venuesById,
      now: FIXED_NOW,
    });
    assert.equal(summary.venue.kind, "multi");
    if (summary.venue.kind === "multi") {
      assert.equal(summary.venue.venueNames.length, 2);
    }
    assert.equal(summary.status.kind, "mixed");
  });
});

describe("CampCard summary — missing information", () => {
  it("empty matching sessions → dates_unverified, not no upcoming sessions", () => {
    const summary = buildCampCardSummary({
      program,
      matchingSessions: [],
      venuesById,
      now: FIXED_NOW,
    });
    assert.equal(summary.status.kind, "dates_unverified");
    if (summary.status.kind === "dates_unverified") {
      assert.equal(
        summary.status.action.displayState,
        "dates_unverified",
      );
      assert.doesNotMatch(summary.status.action.label, /no upcoming/i);
    }
    assert.equal(summary.dates.kind, "unverified");
    assert.equal(summary.venue.kind, "unknown");
    assert.equal(summary.venue.label, "Venue to confirm");
    assert.equal(summary.price.kind, "unknown");
    assert.equal(summary.price.label, "Check with provider");
  });

  it("does not compare mixed price units", () => {
    const matching = [
      sess({
        id: "s1",
        registrationStatus: "registration_open",
        priceAmount: 50,
        priceUnit: "per_day",
        currency: "CAD",
      }),
      sess({
        id: "s2",
        registrationStatus: "registration_open",
        priceAmount: 250,
        priceUnit: "per_week",
        currency: "CAD",
      }),
    ];
    const price = summarizeMatchingSessionPrices(matching);
    assert.equal(price.kind, "mixed_units");
    assert.equal(price.label, "Check with provider");
  });

  it("unmatched sessions do not influence summaries", () => {
    const matching = [
      sess({
        id: "s1",
        registrationStatus: "registration_open",
        venueId: "venue-a",
        startDate: "2026-07-06",
        endDate: "2026-07-10",
        priceAmount: 100,
        priceUnit: "per_week",
        currency: "CAD",
        ageMin: 7,
        ageMax: 12,
        ageMinInclusive: true,
        ageMaxInclusive: true,
      }),
    ];
    // Deliberately not passed into summary:
    const unmatched = sess({
      id: "unmatched",
      registrationStatus: "waitlist",
      venueId: "venue-b",
      startDate: "2026-12-01",
      endDate: "2026-12-05",
      priceAmount: 999,
      priceUnit: "per_week",
      currency: "CAD",
      ageMin: 4,
      ageMax: 5,
      ageMinInclusive: true,
      ageMaxInclusive: true,
    });
    void unmatched;
    const summary = buildCampCardSummary({
      program,
      matchingSessions: matching,
      venuesById,
      now: FIXED_NOW,
    });
    assert.equal(summary.status.kind, "single");
    assert.equal(summary.venue.kind, "known");
    if (summary.venue.kind === "known") {
      assert.match(summary.venue.label, /Venue A/);
      assert.doesNotMatch(summary.venue.label, /Venue B/);
    }
    if (summary.price.kind === "known") {
      assert.equal(summary.price.amountMax, 100);
    }
    assert.equal(summary.eligibilityLabel, "Ages 7–12");
    assert.doesNotMatch(summary.eligibilityLabel ?? "", /4–5/);
  });

  it("preserves disjoint session age bands and qualifies mixed known/unknown", () => {
    const summaryDisjoint = buildCampCardSummary({
      program,
      matchingSessions: [
        sess({
          id: "y",
          registrationStatus: "registration_open",
          ageMin: 4,
          ageMax: 5,
          ageMinInclusive: true,
          ageMaxInclusive: true,
        }),
        sess({
          id: "o",
          registrationStatus: "registration_open",
          ageMin: 7,
          ageMax: 12,
          ageMinInclusive: true,
          ageMaxInclusive: true,
        }),
      ],
      venuesById,
      now: FIXED_NOW,
    });
    assert.equal(summaryDisjoint.eligibilityLabel, "Ages 4–5 · Ages 7–12");
    assert.doesNotMatch(summaryDisjoint.eligibilityLabel ?? "", /Ages 4–12/);

    const summaryMixed = buildCampCardSummary({
      program,
      matchingSessions: [
        sess({
          id: "known",
          registrationStatus: "registration_open",
          ageMin: 7,
          ageMax: 12,
          ageMinInclusive: true,
          ageMaxInclusive: true,
        }),
        sess({
          id: "unknown-age",
          registrationStatus: "registration_open",
        }),
      ],
      venuesById,
      now: FIXED_NOW,
    });
    assert.match(
      summaryMixed.eligibilityLabel ?? "",
      /Ages 7–12 · some session ages to confirm/,
    );
  });
});
