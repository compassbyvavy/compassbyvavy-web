/**
 * Same-session listing filter tests.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import {
  EMPTY_LISTING_FILTERS,
  buildListingResults,
  countActiveFilters,
  formatListingCounts,
  resolveChildAgeFilter,
  sessionMatchesListingFilters,
  toFlatRows,
  type CampsListingFilters,
} from "@/lib/camps/listingFilter";

const provider: Provider = {
  id: "prov-a",
  name: "Provider A",
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
    neighbourhood: "Erin Mills",
    city: "Mississauga",
  },
};

const program: CampProgram = {
  id: "prog-a",
  slug: "prog-a",
  providerId: provider.id,
  name: "Mixed Venue Camp",
  primaryCategory: "STEM",
  secondaryThemes: ["Robotics"],
  audience: "child_only",
  typicalAgeMin: 4,
  typicalAgeMax: 12,
};

const awaitingProgram: CampProgram = {
  id: "prog-awaiting",
  slug: "prog-awaiting",
  providerId: provider.id,
  name: "Awaiting Dates Camp",
  primaryCategory: "Outdoors",
  audience: "child_only",
};

function sess(
  partial: Partial<CampSession> & Pick<CampSession, "id" | "registrationStatus">,
): CampSession {
  return {
    programId: program.id,
    ...partial,
  };
}

/** Session A: expensive, early hours, Port Credit, ages 7–12 */
const sessionA = sess({
  id: "sess-a",
  registrationStatus: "registration_open",
  venueId: "venue-a",
  startDate: "2026-07-06",
  endDate: "2026-07-10",
  timingLabel: "Summer",
  scheduleFormat: "full_day",
  stayType: "day",
  coreHoursStart: "09:00",
  coreHoursEnd: "15:00",
  beforeCare: { offered: "no" },
  afterCare: { offered: "no" },
  priceAmount: 400,
  priceUnit: "per_week",
  currency: "CAD",
  ageMin: 7,
  ageMax: 12,
  ageMinInclusive: true,
  ageMaxInclusive: true,
  ageAssessmentRule: "as_of_date",
  ageAssessedAtDate: "2026-07-01",
});

/** Session B: cheaper, later hours, Erin Mills, ages 4–5, with care */
const sessionB = sess({
  id: "sess-b",
  registrationStatus: "registration_open",
  venueId: "venue-b",
  startDate: "2026-07-13",
  endDate: "2026-07-17",
  timingLabel: "Summer",
  scheduleFormat: "full_day",
  stayType: "day",
  coreHoursStart: "08:00",
  coreHoursEnd: "17:00",
  beforeCare: { offered: "yes", startTime: "07:30", endTime: "08:00" },
  afterCare: { offered: "yes", startTime: "17:00", endTime: "18:00" },
  priceAmount: 250,
  priceUnit: "per_week",
  currency: "CAD",
  ageMin: 4,
  ageMax: 5,
  ageMinInclusive: true,
  ageMaxInclusive: true,
  ageAssessmentRule: "as_of_date",
  ageAssessedAtDate: "2026-07-01",
});

const catalog = {
  programs: [program, awaitingProgram],
  providers: [provider],
  sessions: [sessionA, sessionB],
  venuesById,
};

function filters(
  partial: Partial<CampsListingFilters> = {},
): CampsListingFilters {
  return { ...EMPTY_LISTING_FILTERS, ...partial };
}

describe("same-session filtering", () => {
  it("does not stitch session A price with session B hours/care/venue", () => {
    // Cheap + Port Credit would only work if we wrongly mixed B's price with A's venue.
    const cheapPortCredit = filters({
      priceMax: 300,
      priceUnit: "per_week",
      locations: ["Port Credit"],
    });
    assert.equal(
      sessionMatchesListingFilters(
        sessionA,
        program,
        provider,
        venuesById,
        cheapPortCredit,
      ),
      false,
    );
    assert.equal(
      sessionMatchesListingFilters(
        sessionB,
        program,
        provider,
        venuesById,
        cheapPortCredit,
      ),
      false,
    );

    const results = buildListingResults(catalog, cheapPortCredit);
    assert.equal(results.matchingSessionCount, 0);
    assert.equal(results.programCount, 0);
  });

  it("matches only the session that satisfies combined venue + price + care + hours", () => {
    const criteria = filters({
      priceMax: 300,
      priceUnit: "per_week",
      locations: ["Erin Mills"],
      requireBeforeCare: true,
      requireAfterCare: true,
      coreHoursStartMax: "08:30",
      coreHoursEndMin: "16:30",
    });
    assert.equal(
      sessionMatchesListingFilters(
        sessionA,
        program,
        provider,
        venuesById,
        criteria,
      ),
      false,
    );
    assert.equal(
      sessionMatchesListingFilters(
        sessionB,
        program,
        provider,
        venuesById,
        criteria,
      ),
      true,
    );
    const results = buildListingResults(catalog, criteria);
    assert.deepEqual(results.matches[0]?.matchingSessionIds, ["sess-b"]);
  });

  it("age filter uses helper — unknown/no_match never count as eligible", () => {
    const ageOk = filters({
      childAge: { ageYears: 7, asOfDate: "2026-07-01" },
    });
    assert.equal(
      sessionMatchesListingFilters(sessionA, program, provider, venuesById, ageOk),
      true,
    );
    assert.equal(
      sessionMatchesListingFilters(sessionB, program, provider, venuesById, ageOk),
      false,
    );

    const wrongAsOf = filters({
      childAge: { ageYears: 7, asOfDate: "2026-08-28" },
    });
    assert.equal(
      sessionMatchesListingFilters(
        sessionA,
        program,
        provider,
        venuesById,
        wrongAsOf,
      ),
      false,
    );

    const unknownAgeSession = sess({
      id: "sess-unk-age",
      registrationStatus: "registration_open",
      startDate: "2026-07-20",
      endDate: "2026-07-24",
      priceAmount: 200,
      priceUnit: "per_week",
      currency: "CAD",
    });
    assert.equal(
      sessionMatchesListingFilters(
        unknownAgeSession,
        program,
        provider,
        venuesById,
        ageOk,
      ),
      false,
    );
  });

  it("date range excludes sessions outside the window", () => {
    const criteria = filters({
      dateFrom: "2026-07-12",
      dateTo: "2026-07-18",
    });
    const results = buildListingResults(catalog, criteria);
    assert.deepEqual(results.matches[0]?.matchingSessionIds, ["sess-b"]);
  });
});

describe("grouped/flat consistency", () => {
  it("flat rows use the same matching session IDs as the grouped match", () => {
    const results = buildListingResults(catalog, filters());
    assert.equal(results.programCount, 1);
    assert.equal(results.matchingSessionCount, 2);
    const match = results.matches[0];
    assert.deepEqual(match.matchingSessionIds, ["sess-a", "sess-b"]);

    const flat = toFlatRows(results);
    assert.equal(flat.length, 2);
    // Prove which sessions became rows — not merely that each row
    // carries a copied matchingSessionIds array that happens to include it.
    assert.deepEqual(
      flat.map((row) => row.session.id).sort(),
      [...match.matchingSessionIds].sort(),
    );
    for (const row of flat) {
      assert.deepEqual(row.matchingSessionIds, match.matchingSessionIds);
      assert.ok(match.matchingSessionIds.includes(row.session.id));
    }
  });

  it("filtering to one session keeps both views on that session's facts", () => {
    const criteria = filters({ locations: ["Port Credit"] });
    const results = buildListingResults(catalog, criteria);
    assert.deepEqual(results.matches[0]?.matchingSessionIds, ["sess-a"]);
    const flat = toFlatRows(results);
    assert.equal(flat.length, 1);
    assert.equal(flat[0].session.id, "sess-a");
    assert.equal(flat[0].session.venueId, "venue-a");
    assert.equal(flat[0].session.priceAmount, 400);
    assert.deepEqual(flat[0].matchingSessionIds, ["sess-a"]);
  });
});

describe("listing counts and empty/unknown states", () => {
  it("labels camps and sessions separately", () => {
    const results = buildListingResults(catalog, filters());
    assert.equal(
      formatListingCounts(results),
      "1 camp · 2 matching sessions · 1 camp awaiting dates",
    );
  });

  it("empty matches when nothing fits — no invented widening", () => {
    const results = buildListingResults(
      catalog,
      filters({ themes: ["Sports"] }),
    );
    assert.equal(results.programCount, 0);
    assert.equal(results.matchingSessionCount, 0);
    assert.equal(toFlatRows(results).length, 0);
    assert.match(formatListingCounts(results), /0 camps · 0 matching sessions/);
  });

  it("awaiting-dates program stays reachable until a session filter rules it out", () => {
    const open = buildListingResults(catalog, filters());
    assert.equal(open.awaitingDatesCount, 1);
    assert.equal(open.awaitingDates[0]?.program.id, "prog-awaiting");

    const withAge = buildListingResults(
      catalog,
      filters({ childAge: { ageYears: 7, asOfDate: "2026-07-01" } }),
    );
    assert.equal(withAge.awaitingDatesCount, 0);
    assert.ok(withAge.matches.every((m) => m.matchingSessionIds.length > 0));
  });
});

describe("resolveChildAgeFilter — incomplete age drafts", () => {
  it("empty inputs ⇒ no applied filter, no notice", () => {
    assert.deepEqual(resolveChildAgeFilter(null), {
      applied: null,
      notice: null,
    });
    assert.deepEqual(resolveChildAgeFilter({ ageYears: null, asOfDate: null }), {
      applied: null,
      notice: null,
    });
  });

  it("missing date (age only) ⇒ missing-date notice", () => {
    const result = resolveChildAgeFilter({
      ageYears: 7,
      asOfDate: null,
    });
    assert.equal(result.applied, null);
    assert.equal(
      result.notice,
      "Age filter not applied—add an age reference date.",
    );
    assert.equal(countActiveFilters(filters({ childAge: { ageYears: 7, asOfDate: null } })), 0);
  });

  it("missing age (date only) ⇒ missing-age notice", () => {
    const result = resolveChildAgeFilter({
      ageYears: null,
      asOfDate: "2026-07-01",
    });
    assert.equal(result.applied, null);
    assert.equal(
      result.notice,
      "Age filter not applied—add a child age.",
    );
  });

  it("invalid age ⇒ invalid-age notice (with or without date)", () => {
    assert.equal(
      resolveChildAgeFilter({ ageYears: 7.5, asOfDate: "2026-07-01" }).notice,
      "Age filter not applied—enter a whole-number age.",
    );
    assert.equal(
      resolveChildAgeFilter({ ageYears: 7.5, asOfDate: null }).notice,
      "Age filter not applied—enter a whole-number age.",
    );
    assert.equal(
      resolveChildAgeFilter({ ageYears: Number.NaN, asOfDate: null }).notice,
      "Age filter not applied—enter a whole-number age.",
    );
    assert.equal(
      resolveChildAgeFilter({ ageYears: 7.5, asOfDate: "2026-07-01" }).applied,
      null,
    );
  });

  it("invalid reference date with valid age ⇒ missing-date notice", () => {
    assert.equal(
      resolveChildAgeFilter({ ageYears: 7, asOfDate: "2026-13-40" }).notice,
      "Age filter not applied—add an age reference date.",
    );
  });

  it("valid pair ⇒ applied for eligibility helper; clearing either field drops applied", () => {
    const valid = resolveChildAgeFilter({
      ageYears: 7,
      asOfDate: "2026-07-01",
    });
    assert.deepEqual(valid.applied, {
      ageYears: 7,
      asOfDate: "2026-07-01",
    });
    assert.equal(valid.notice, null);
    assert.equal(
      countActiveFilters(
        filters({ childAge: { ageYears: 7, asOfDate: "2026-07-01" } }),
      ),
      1,
    );

    assert.equal(
      resolveChildAgeFilter({ ageYears: null, asOfDate: "2026-07-01" }).applied,
      null,
    );
    assert.equal(
      resolveChildAgeFilter({ ageYears: 7, asOfDate: null }).applied,
      null,
    );
  });

  it("blank (null) vs invalid (NaN) stay distinct when date is empty", () => {
    assert.equal(
      resolveChildAgeFilter({ ageYears: null, asOfDate: null }).notice,
      null,
    );
    assert.equal(
      resolveChildAgeFilter({ ageYears: Number.NaN, asOfDate: null }).notice,
      "Age filter not applied—enter a whole-number age.",
    );
  });
});
