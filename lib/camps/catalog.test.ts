import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSession } from "@/data/camps/types";
import {
  loadCampsCatalog,
  resolveCatalogProgramBySlug,
} from "@/lib/camps/catalog";
import { loadCampsRealDevCatalog } from "@/lib/camps/realDevCatalog";
import { buildCampCardSummary } from "@/lib/camps/campCardSummary";
import { buildSessionDetailRow } from "@/lib/camps/campDetail";
import { getRegistrationAction } from "@/lib/camps/registrationAction";
import {
  EMPTY_LISTING_FILTERS,
  buildListingResults,
  sessionMatchesListingFilters,
} from "@/lib/camps/listingFilter";

describe("camps real-dev catalog adapter", () => {
  it("loads only MSC-0201 Nutty Scientists in non-production", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    assert.equal(catalog.sourceLabel, "real_dev");
    assert.equal(catalog.sourceCandidateId, "MSC-0201");
    assert.equal(catalog.programs.length, 1);
    assert.equal(catalog.providers.length, 1);
    assert.equal(catalog.venues.length, 1);
    assert.equal(catalog.programs[0].slug, "nutty-summer-science-camp");
    assert.equal(catalog.providers[0].name, "Nutty Scientists Canada");
    assert.equal(catalog.sessions.length, 8);
    assert.ok(!catalog.programs.some((p) => p.id.startsWith("prog-dev-")));
  });

  it("does not invent calendar years; dates stay unverified at session and card level", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    for (const session of catalog.sessions) {
      assert.equal(session.startDate, null);
      assert.equal(session.endDate, null);
      assert.match(session.notes ?? "", /year not yet verified/i);
      assert.doesNotMatch(session.id, /2026/);
    }

    const detail = resolveCatalogProgramBySlug(
      catalog,
      "nutty-summer-science-camp",
    );
    assert.ok(detail);
    const summary = buildCampCardSummary({
      program: detail.program,
      matchingSessions: detail.sessions,
      venuesById: detail.venuesById,
    });
    assert.equal(summary.dates.kind, "unverified");
    assert.match(summary.dates.label, /not yet verified/i);
    assert.doesNotMatch(summary.dates.label, /2026/);
  });

  it("audits registration lifecycle separately from seats — no open ended weeks, no scarcity", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    assert.equal(catalog.sessions.length, 8);

    for (const session of catalog.sessions) {
      assert.equal(session.seatAvailability, "unknown");
      assert.equal(session.registrationStatus, "availability_unknown");
      assert.ok(session.registrationUrl);

      const action = getRegistrationAction(
        { kind: "session", session },
        { now: new Date("2026-08-30T16:00:00.000Z") },
      );
      assert.equal(action.displayState, "availability_unknown");
      assert.equal(action.label, "Registration availability to confirm");
      assert.doesNotMatch(action.label, /full/i);
      assert.doesNotMatch(action.label, /registration open/i);
      assert.notEqual(action.buttonText, "Register with provider");
    }

    const detail = resolveCatalogProgramBySlug(
      catalog,
      "nutty-summer-science-camp",
    );
    assert.ok(detail);
    const summary = buildCampCardSummary({
      program: detail.program,
      matchingSessions: detail.sessions,
      venuesById: detail.venuesById,
      now: new Date("2026-08-30T16:00:00.000Z"),
    });
    assert.equal(summary.status.kind, "single");
    if (summary.status.kind === "single") {
      assert.equal(summary.status.action.displayState, "availability_unknown");
      assert.equal(
        summary.status.action.label,
        "Registration availability to confirm",
      );
      assert.doesNotMatch(summary.status.action.label, /full/i);
      assert.doesNotMatch(summary.status.action.label, /\bopen\b/i);
    }
  });

  it("shows exact weekly price with tax — no From; qualifies care; keeps session-owned facts", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const detail = resolveCatalogProgramBySlug(
      catalog,
      "nutty-summer-science-camp",
    );
    assert.ok(detail);

    const summary = buildCampCardSummary({
      program: detail.program,
      matchingSessions: detail.sessions,
      venuesById: detail.venuesById,
    });
    assert.equal(summary.price.label, "CAD $399/week + tax");
    assert.doesNotMatch(summary.price.label, /^From /);
    assert.match(summary.hours.careNote ?? "", /advance request/i);
    assert.match(summary.hours.careNote ?? "", /additional fee/i);
    assert.match(summary.venue.label, /Streetsville/);
    assert.match(summary.venue.label, /Mississauga/);
    assert.match(summary.venue.label, /Vic Johnson/);

    // Listing summary count: 1 program · 8 sessions.
    assert.equal(detail.sessions.length, 8);
    assert.equal(catalog.programs.length, 1);

    const row = buildSessionDetailRow(
      detail.sessions[0],
      detail.venuesById,
    );
    assert.match(row.datesLabel, /July 6–10/);
    assert.match(row.datesLabel, /year not yet verified/i);
    assert.equal(row.priceLabel, "CAD $399/week + tax");
    assert.equal(row.session.ageMin, 5);
    assert.equal(row.session.ageMax, 7);
    assert.equal(row.session.coreHoursStart, "10:30");
    assert.equal(row.session.coreHoursEnd, "16:00");
    assert.ok(row.session.registrationUrl);
    assert.match(row.ageAssessmentNote ?? "", /Ask the provider/i);
  });

  it("keeps Mississauga as city and Streetsville as neighbourhood", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const venue = catalog.venues[0];
    assert.equal(venue.city, "Mississauga");
    assert.equal(venue.neighbourhood, "Streetsville");
    assert.notEqual(venue.city, venue.neighbourhood);
  });

  it("session rows keep own venue, ages, and do not invent scarcity seats", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    for (const session of catalog.sessions) {
      assert.equal(session.venueId, "venue-vic-johnson-community-centre");
      assert.ok(session.ageMin != null && session.ageMax != null);
      assert.equal(session.seatAvailability, "unknown");
      assert.ok(session.registrationUrl);
      assert.equal(
        session.sourceUrl,
        "https://nuttyscientistscanada.ca/summercamp",
      );
    }
    const ages = new Set(
      catalog.sessions.map((s) => `${s.ageMin}-${s.ageMax}`),
    );
    assert.deepEqual([...ages].sort(), ["5-7", "8-10"]);
  });

  it("resolves detail by slug with session-owned facts", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const detail = resolveCatalogProgramBySlug(
      catalog,
      "nutty-summer-science-camp",
    );
    assert.ok(detail);
    assert.equal(detail.sessions.length, 8);
    assert.ok(detail.venuesById["venue-vic-johnson-community-centre"]);
    assert.equal(
      resolveCatalogProgramBySlug(catalog, "stem-explorers-dev"),
      null,
    );
  });

  it("soft-loads null in production (fixture-style gate)", () => {
    const prev = process.env.NODE_ENV;
    // @ts-expect-error test override
    process.env.NODE_ENV = "production";
    try {
      assert.equal(loadCampsRealDevCatalog(), null);
      assert.equal(loadCampsCatalog(), null);
    } finally {
      // @ts-expect-error restore
      process.env.NODE_ENV = prev;
    }
  });
});

describe("MSC-0201 evidence-correction checkpoint assertions", () => {
  it("1. unverified-year sessions remain visible when no date filter is applied", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const venuesById = Object.fromEntries(
      catalog.venues.map((v) => [v.id, v]),
    );
    const results = buildListingResults(
      {
        programs: catalog.programs,
        providers: catalog.providers,
        sessions: catalog.sessions,
        venuesById,
      },
      { ...EMPTY_LISTING_FILTERS },
      { sort: "soonest_start" },
    );
    assert.equal(results.matches.length, 1);
    assert.equal(results.matches[0].matchingSessions.length, 8);
    assert.equal(results.matchingSessionCount, 8);
    assert.equal(results.programCount, 1);
    for (const session of results.matches[0].matchingSessions) {
      assert.equal(session.startDate, null);
      assert.equal(session.endDate, null);
    }
  });

  it("2. unverified-year sessions never match a specific date-range filter", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const venuesById = Object.fromEntries(
      catalog.venues.map((v) => [v.id, v]),
    );
    const withRange = buildListingResults(
      {
        programs: catalog.programs,
        providers: catalog.providers,
        sessions: catalog.sessions,
        venuesById,
      },
      {
        ...EMPTY_LISTING_FILTERS,
        dateFrom: "2026-07-01",
        dateTo: "2026-08-31",
      },
      { sort: "soonest_start" },
    );
    assert.equal(withRange.matches.length, 0);
    assert.equal(withRange.matchingSessionCount, 0);
    for (const session of catalog.sessions) {
      assert.equal(
        sessionMatchesListingFilters(
          session,
          catalog.programs[0],
          catalog.providers[0],
          venuesById,
          {
            ...EMPTY_LISTING_FILTERS,
            dateFrom: "2026-07-01",
            dateTo: "2026-08-31",
          },
        ),
        false,
      );
    }
  });

  it("3. soonest_start does not treat null/unverified dates as earliest confirmed", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const venuesById = Object.fromEntries(
      catalog.venues.map((v) => [v.id, v]),
    );
    const dated: CampSession = {
      ...catalog.sessions[0],
      id: "sess-confirmed-early",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      notes: null,
    };
    const results = buildListingResults(
      {
        programs: catalog.programs,
        providers: catalog.providers,
        sessions: [...catalog.sessions, dated],
        venuesById,
      },
      { ...EMPTY_LISTING_FILTERS },
      { sort: "soonest_start" },
    );
    assert.equal(results.matches.length, 1);
    const ordered = results.matches[0].matchingSessions;
    assert.equal(ordered[0].id, "sess-confirmed-early");
    assert.equal(ordered[0].startDate, "2026-06-01");
    for (const later of ordered.slice(1)) {
      assert.equal(later.startDate, null);
    }
  });

  it("4. availability_unknown + registration URL never gets a generic Register CTA", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    for (const session of catalog.sessions) {
      assert.equal(session.registrationStatus, "availability_unknown");
      assert.ok(session.registrationUrl);
      const action = getRegistrationAction({ kind: "session", session });
      assert.equal(action.displayState, "availability_unknown");
      assert.equal(action.label, "Registration availability to confirm");
      assert.equal(action.buttonText, "Check availability with provider");
      assert.equal(action.href, session.registrationUrl);
      assert.notEqual(action.buttonText, "Register with provider");
      assert.doesNotMatch(action.buttonText ?? "", /^Register$/i);
    }
  });

  it("5. Nutty grouped summary has zero open sessions and no full/closed/seat claim", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const detail = resolveCatalogProgramBySlug(
      catalog,
      "nutty-summer-science-camp",
    );
    assert.ok(detail);
    const summary = buildCampCardSummary({
      program: detail.program,
      matchingSessions: detail.sessions,
      venuesById: detail.venuesById,
    });
    assert.equal(summary.status.kind, "single");
    if (summary.status.kind === "single") {
      assert.equal(summary.status.action.displayState, "availability_unknown");
      assert.equal(
        summary.status.action.label,
        "Registration availability to confirm",
      );
      assert.doesNotMatch(summary.status.action.label, /full/i);
      assert.doesNotMatch(summary.status.action.label, /closed/i);
      assert.doesNotMatch(summary.status.action.label, /seat/i);
      assert.doesNotMatch(summary.status.action.label, /open/i);
    }
    const openActions = detail.sessions.filter(
      (s) =>
        getRegistrationAction({ kind: "session", session: s }).displayState ===
        "registration_open",
    );
    assert.equal(openActions.length, 0);
    for (const session of detail.sessions) {
      assert.equal(session.seatAvailability, "unknown");
    }
  });

  it('6. exact Nutty pricing displays "CAD $399/week + tax" without From', () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const detail = resolveCatalogProgramBySlug(
      catalog,
      "nutty-summer-science-camp",
    );
    assert.ok(detail);
    const summary = buildCampCardSummary({
      program: detail.program,
      matchingSessions: detail.sessions,
      venuesById: detail.venuesById,
    });
    assert.equal(summary.price.label, "CAD $399/week + tax");
    assert.doesNotMatch(summary.price.label, /From/i);
    const row = buildSessionDetailRow(
      detail.sessions[0],
      detail.venuesById,
    );
    assert.equal(row.priceLabel, "CAD $399/week + tax");
    assert.doesNotMatch(row.priceLabel, /From/i);
  });

  it("7. care copy includes advance request and additional-fee qualification", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const detail = resolveCatalogProgramBySlug(
      catalog,
      "nutty-summer-science-camp",
    );
    assert.ok(detail);
    const summary = buildCampCardSummary({
      program: detail.program,
      matchingSessions: detail.sessions,
      venuesById: detail.venuesById,
    });
    assert.match(summary.hours.careNote ?? "", /advance request/i);
    assert.match(summary.hours.careNote ?? "", /additional fee/i);
    const row = buildSessionDetailRow(
      detail.sessions[0],
      detail.venuesById,
    );
    assert.match(row.careLabel, /advance request/i);
    assert.match(row.careLabel, /additional fee/i);
  });
});
