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
  DATE_RANGE_OVERLAP_LABEL,
  EMPTY_LISTING_FILTERS,
  buildListingHref,
  buildListingResults,
  countActiveFilters,
  dateRangeFilterIsActive,
  formatListingCounts,
  knownSessionAttendanceDates,
  listActiveFilterChips,
  parseListingHrefSearch,
  removeActiveFilterChip,
  resolveChildAgeFilter,
  sessionMatchesListingFilters,
  sessionMatchesRegistrationFilter,
  sessionOverlapsDateRange,
  toFlatRows,
  toProviderGroups,
  listingDistanceAvailability,
  venueHasVerifiedCoordinates,
  DISTANCE_UNAVAILABLE_NO_COORDS,
  DISTANCE_UNAVAILABLE_NO_MAP,
  UNSUPPORTED_LISTING_FILTERS,
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

  it("sibling ages must all fit the same session — not two sessions stitched", () => {
    const siblings = filters({
      childAge: {
        ageYears: 4,
        siblingAges: [7],
        asOfDate: "2026-07-01",
      },
    });
    assert.equal(
      sessionMatchesListingFilters(sessionA, program, provider, venuesById, siblings),
      false,
    );
    assert.equal(
      sessionMatchesListingFilters(sessionB, program, provider, venuesById, siblings),
      false,
    );
    const href = buildListingHref({
      filters: siblings,
      sort: "soonest_start",
      listingView: "program",
    });
    assert.match(href, /ages=7/);
    const parsed = parseListingHrefSearch(href);
    assert.deepEqual(parsed.filters.childAge?.siblingAges, [7]);
  });

  it("date range excludes sessions outside the window", () => {
    const criteria = filters({
      dateFrom: "2026-07-12",
      dateTo: "2026-07-18",
    });
    const results = buildListingResults(catalog, criteria);
    assert.deepEqual(results.matches[0]?.matchingSessionIds, ["sess-b"]);
  });

  it("date range matches partial overlap and labels it as overlap, not exact dates", () => {
    const overlap = filters({
      dateFrom: "2026-07-08",
      dateTo: "2026-07-09",
    });
    assert.equal(
      sessionOverlapsDateRange(sessionA, overlap.dateFrom, overlap.dateTo),
      true,
    );
    assert.equal(
      sessionOverlapsDateRange(sessionB, overlap.dateFrom, overlap.dateTo),
      false,
    );
    const results = buildListingResults(catalog, overlap);
    assert.deepEqual(results.matches[0]?.matchingSessionIds, ["sess-a"]);
    assert.equal(DATE_RANGE_OVERLAP_LABEL, "Overlaps these dates.");
    assert.equal(dateRangeFilterIsActive(overlap), true);
    assert.equal(dateRangeFilterIsActive(filters()), false);
  });

  it("unknown attendance dates never match a date-range filter", () => {
    const undated = sess({
      id: "sess-undated",
      registrationStatus: "availability_unknown",
      startDate: null,
      endDate: null,
    });
    assert.equal(
      sessionOverlapsDateRange(undated, "2026-07-01", "2026-07-31"),
      false,
    );
    assert.deepEqual(knownSessionAttendanceDates(undated), []);
    assert.deepEqual(knownSessionAttendanceDates(sessionA), [
      "2026-07-06",
      "2026-07-10",
    ]);
  });

  it("stay type filters on the same session and unknown stay never matches", () => {
    const overnightOnly = filters({ stayTypes: ["overnight"] });
    assert.equal(
      sessionMatchesListingFilters(
        sessionA,
        program,
        provider,
        venuesById,
        overnightOnly,
      ),
      false,
    );
    const dayOnly = filters({ stayTypes: ["day"] });
    const results = buildListingResults(catalog, dayOnly);
    assert.deepEqual(results.matches[0]?.matchingSessionIds, ["sess-a", "sess-b"]);
  });

  it("registration filter uses helper states; unknown never matches open or closed", () => {
    const unknownSession = sess({
      id: "sess-unk-reg",
      registrationStatus: "availability_unknown",
      venueId: "venue-a",
      startDate: "2026-07-20",
      endDate: "2026-07-24",
    });
    const closedSession = sess({
      id: "sess-closed",
      registrationStatus: "registration_closed",
      venueId: "venue-a",
      startDate: "2026-07-27",
      endDate: "2026-07-31",
      seatAvailability: "confirmed_available",
    });

    assert.equal(
      sessionMatchesRegistrationFilter(sessionA, "registration_open"),
      true,
    );
    assert.equal(
      sessionMatchesRegistrationFilter(unknownSession, "registration_open"),
      false,
    );
    assert.equal(
      sessionMatchesRegistrationFilter(unknownSession, "full_or_closed"),
      false,
    );
    assert.equal(
      sessionMatchesRegistrationFilter(closedSession, "full_or_closed"),
      true,
    );
    assert.equal(
      sessionMatchesRegistrationFilter(unknownSession, "availability_unknown"),
      true,
    );
    assert.equal(
      sessionMatchesRegistrationFilter(sessionA, "availability_unknown"),
      false,
    );

    const openOnly = filters({ registrationFilter: "registration_open" });
    assert.equal(
      sessionMatchesListingFilters(
        unknownSession,
        program,
        provider,
        venuesById,
        openOnly,
      ),
      false,
    );
    assert.equal(
      sessionMatchesListingFilters(
        sessionA,
        program,
        provider,
        venuesById,
        openOnly,
      ),
      true,
    );
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

  it("provider groups nest the same filtered matches without merging programs by name", () => {
    const secondProgram: CampProgram = {
      ...program,
      id: "prog-b",
      slug: "prog-b",
      name: "Second Camp Same Provider",
    };
    const sessionC = sess({
      id: "sess-c",
      programId: secondProgram.id,
      registrationStatus: "registration_open",
      venueId: "venue-a",
      startDate: "2026-07-20",
      endDate: "2026-07-24",
      priceAmount: 180,
      priceUnit: "per_week",
      currency: "CAD",
    });
    const otherProvider: Provider = { id: "prov-b", name: "Provider B" };
    const otherProgram: CampProgram = {
      ...program,
      id: "prog-other",
      slug: "prog-other",
      providerId: otherProvider.id,
      name: "Mixed Venue Camp",
    };
    const sessionOther = sess({
      id: "sess-other",
      programId: otherProgram.id,
      registrationStatus: "waitlist",
      waitlistUrl: "https://example.invalid/w",
      venueId: "venue-b",
      startDate: "2026-07-13",
      endDate: "2026-07-17",
    });

    const multi = {
      programs: [program, secondProgram, otherProgram, awaitingProgram],
      providers: [provider, otherProvider],
      sessions: [sessionA, sessionB, sessionC, sessionOther],
      venuesById,
    };
    const criteria = filters({ locations: ["Port Credit"] });
    const results = buildListingResults(multi, criteria);
    const groups = toProviderGroups(results);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].provider.id, "prov-a");
    assert.deepEqual(
      groups[0].matches.map((m) => m.program.id).sort(),
      ["prog-a", "prog-b"],
    );
    assert.deepEqual(groups[0].matches[0].matchingSessionIds.includes("sess-a") || groups[0].matches[1].matchingSessionIds.includes("sess-a"), true);
    for (const group of groups) {
      for (const match of group.matches) {
        assert.equal(match.provider.id, group.provider.id);
        assert.ok(match.matchingSessionIds.length > 0);
      }
    }
    assert.equal(
      groups[0].matchingSessionCount,
      groups[0].matches.reduce((n, m) => n + m.matchingSessionIds.length, 0),
    );
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

    const withReg = buildListingResults(
      catalog,
      filters({ registrationFilter: "registration_open" }),
    );
    assert.equal(withReg.awaitingDatesCount, 0);
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

describe("listing URL state and selected-filter chips", () => {
  it("defaults grouping to camp and round-trips filters/sort/view", () => {
    const parsedDefault = parseListingHrefSearch("");
    assert.equal(parsedDefault.listingView, "program");
    assert.equal(parsedDefault.sort, "soonest_start");
    assert.equal(parsedDefault.filters.registrationFilter, "all");

    const href = buildListingHref({
      filters: filters({
        keyword: "harbour",
        dateFrom: "2026-07-06",
        dateTo: "2026-07-10",
        stayTypes: ["day"],
        requireBeforeCare: true,
        registrationFilter: "registration_open",
      }),
      sort: "price_asc",
      listingView: "session",
    });
    const parsed = parseListingHrefSearch(href.replace("/camps", ""));
    assert.equal(parsed.filters.keyword, "harbour");
    assert.equal(parsed.filters.dateFrom, "2026-07-06");
    assert.deepEqual(parsed.filters.stayTypes, ["day"]);
    assert.equal(parsed.filters.requireBeforeCare, true);
    assert.equal(parsed.filters.registrationFilter, "registration_open");
    assert.equal(parsed.sort, "price_asc");
    assert.equal(parsed.listingView, "session");
  });

  it("legacy group=0 without view hydrates as each-session", () => {
    const parsed = parseListingHrefSearch("group=0");
    assert.equal(parsed.listingView, "session");
  });

  it("view=provider wins over group=1", () => {
    const parsed = parseListingHrefSearch("view=provider&group=1");
    assert.equal(parsed.listingView, "provider");
  });

  it("lists and dismisses selected filter chips without dropping unrelated state", () => {
    const start = filters({
      keyword: "stem",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      themes: ["STEM", "Arts"],
      stayTypes: ["day"],
      registrationFilter: "not_yet_open",
    });
    const chips = listActiveFilterChips(start);
    assert.ok(chips.some((c) => c.id === "keyword"));
    assert.ok(chips.some((c) => c.id === "dates"));
    assert.ok(chips.some((c) => c.id === "theme:STEM"));
    assert.ok(chips.some((c) => c.id === "stay:day"));
    assert.ok(chips.some((c) => c.id === "reg"));

    const withoutTheme = removeActiveFilterChip(start, "theme:STEM");
    assert.deepEqual(withoutTheme.themes, ["Arts"]);
    assert.equal(withoutTheme.keyword, "stem");
    assert.equal(withoutTheme.registrationFilter, "not_yet_open");
    const withoutDates = removeActiveFilterChip(withoutTheme, "dates");
    assert.equal(withoutDates.dateFrom, null);
    assert.equal(withoutDates.dateTo, null);
    assert.deepEqual(withoutDates.themes, ["Arts"]);
    const withoutReg = removeActiveFilterChip(withoutDates, "reg");
    assert.equal(withoutReg.registrationFilter, "all");
    assert.deepEqual(withoutReg.themes, ["Arts"]);
  });
});

describe("playbook features that stay unsupported until verified data exists", () => {
  it("does not ship live weather, invented school boards, or Camp Buddies", () => {
    const ids = UNSUPPORTED_LISTING_FILTERS.map((item) => item.id);
    assert.ok(ids.includes("weather"));
    assert.ok(ids.includes("school_board"));
    assert.ok(ids.includes("camp_buddies"));
    const blob = UNSUPPORTED_LISTING_FILTERS.map((i) => i.reason).join(" ");
    assert.match(blob, /does not show live weather/i);
    assert.match(blob, /not part of this release/i);
  });
});

describe("honest distance chrome", () => {
  it("never reports distance available without inventing kilometres", () => {
    const none = listingDistanceAvailability(Object.values(venuesById));
    assert.equal(none.available, false);
    assert.equal(none.reason, DISTANCE_UNAVAILABLE_NO_COORDS);
    assert.equal(venueHasVerifiedCoordinates(venuesById["venue-a"]), false);

    const withCoords: Venue = {
      id: "venue-coords",
      name: "Mapped venue",
      city: "Mississauga",
      latitude: 43.589,
      longitude: -79.644,
    };
    const mapped = listingDistanceAvailability([withCoords]);
    assert.equal(mapped.available, false);
    assert.equal(mapped.reason, DISTANCE_UNAVAILABLE_NO_MAP);
  });
});
