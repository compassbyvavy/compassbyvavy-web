import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  campsDevPrograms,
  campsDevProviders,
  campsDevSessions,
  campsDevVenues,
  DEV_ONLY_CAMPS_FIXTURES,
} from "@/data/camps/fixtures.dev";
import {
  buildCampDetailHref,
  buildSessionDetailRow,
  formatSeatCapacityEvidence,
  parseMatchingSessionIds,
  resolveCampDetailBySlug,
  resolveSessionSelection,
  sanitizeCampsReturnPath,
  sessionMatchesListingFilters,
  summarizeProgramVenuesFromSessions,
} from "@/lib/camps/campDetail";
import { loadCampsDevFixtures } from "@/lib/camps/devFixtures";
import {
  EMPTY_LISTING_FILTERS,
  buildListingHref,
  parseListingHrefSearch,
} from "@/lib/camps/listingFilter";

const fixtures = {
  DEV_ONLY_CAMPS_FIXTURES,
  campsDevProviders,
  campsDevVenues,
  campsDevPrograms,
  campsDevSessions,
} as const;

const NOW = new Date("2026-08-27T16:00:00.000Z");

describe("camp detail — multi-venue program", () => {
  it("keeps each session's own venue — never a program-level venue", () => {
    const detail = resolveCampDetailBySlug(fixtures, "art-trail-multi-venue-dev");
    assert.ok(detail);
    const rows = detail.sessions.map((s) =>
      buildSessionDetailRow(s, detail.venuesById, { now: NOW }),
    );
    assert.equal(rows.length, 2);
    assert.match(rows[0].venueLabel, /Port Credit/);
    assert.match(rows[1].venueLabel, /City Centre/);
    assert.notEqual(rows[0].venueLabel, rows[1].venueLabel);
  });
});

describe("camp detail — mixed registration states", () => {
  it("resolves each STEM session action independently via getRegistrationAction", () => {
    const detail = resolveCampDetailBySlug(fixtures, "stem-explorers-dev");
    assert.ok(detail);
    const rows = detail.sessions.map((s) =>
      buildSessionDetailRow(s, detail.venuesById, { now: NOW }),
    );
    const states = rows.map((r) => r.registration.displayState);
    assert.ok(states.includes("registration_open"));
    assert.ok(states.includes("waitlist"));
    assert.ok(states.includes("full_or_closed"));
    assert.equal(new Set(states).size >= 2, true);
  });

  it("keeps capacity evidence independent of registration lifecycle", () => {
    const detail = resolveCampDetailBySlug(fixtures, "stem-explorers-dev");
    assert.ok(detail);
    const byId = Object.fromEntries(detail.sessions.map((s) => [s.id, s]));
    const openUnknown = formatSeatCapacityEvidence(byId["sess-dev-stem-w1"]!);
    const waitlistFull = formatSeatCapacityEvidence(byId["sess-dev-stem-w2"]!);
    const closedAvailable = formatSeatCapacityEvidence(
      byId["sess-dev-stem-w3"]!,
    );

    assert.equal(openUnknown.fact, "unknown");
    assert.match(openUnknown.label, /to confirm/i);
    assert.doesNotMatch(openUnknown.label, /\d+/);

    assert.equal(waitlistFull.fact, "confirmed_full");
    assert.match(waitlistFull.label, /full/i);
    assert.doesNotMatch(waitlistFull.label, /register/i);

    assert.equal(closedAvailable.fact, "confirmed_available");
    assert.match(closedAvailable.label, /available/i);
    assert.match(closedAvailable.label, /not a live inventory count/i);

    const openRow = buildSessionDetailRow(
      byId["sess-dev-stem-w1"]!,
      detail.venuesById,
      { now: NOW },
    );
    assert.equal(openRow.registration.displayState, "registration_open");
    assert.equal(openRow.capacity.fact, "unknown");
    assert.notEqual(openRow.capacity.fact, "confirmed_available");

    const fullRow = buildSessionDetailRow(
      byId["sess-dev-stem-w2"]!,
      detail.venuesById,
      { now: NOW },
    );
    assert.equal(fullRow.registration.displayState, "waitlist");
    assert.equal(fullRow.capacity.fact, "confirmed_full");
    assert.notEqual(fullRow.registration.buttonText, "Register with provider");
  });

  it("session selector facts stay on the selected session only", () => {
    const detail = resolveCampDetailBySlug(fixtures, "art-trail-multi-venue-dev");
    assert.ok(detail);
    const [portCredit, cityCentre] = detail.sessions.map((s) =>
      buildSessionDetailRow(s, detail.venuesById, { now: NOW }),
    );
    assert.match(portCredit.venueLabel, /Port Credit/);
    assert.match(cityCentre.venueLabel, /City Centre/);
    assert.notEqual(portCredit.datesLabel, cityCentre.datesLabel);
    assert.notEqual(
      portCredit.registration.displayState,
      cityCentre.registration.displayState,
    );

    const venues = summarizeProgramVenuesFromSessions(
      detail.sessions,
      detail.venuesById,
    );
    assert.equal(venues.kind, "multi");
    assert.equal(venues.names.length, 2);
  });
});

describe("camp detail — missing information", () => {
  it("shows explicit unknown labels — no invented venue, ages, hours, or fees", () => {
    const detail = resolveCampDetailBySlug(
      fixtures,
      "nature-walks-missing-info-dev",
    );
    assert.ok(detail);
    assert.equal(detail.sessions.length, 1);
    const row = buildSessionDetailRow(detail.sessions[0], detail.venuesById, {
      now: NOW,
    });
    assert.equal(row.venueLabel, "Venue to confirm");
    assert.equal(row.datesLabel, "Upcoming dates not yet verified");
    assert.equal(row.ageEligibilityLabel, "Ages to confirm");
    assert.equal(row.hoursLabel, "Hours to confirm");
    assert.equal(row.priceLabel, "Check with provider");
    assert.equal(row.registration.displayState, "availability_unknown");
  });

  it("never uses program typical ages on a session age band", () => {
    const detail = resolveCampDetailBySlug(fixtures, "adventure-multi-age-dev");
    assert.ok(detail);
    // Program typicalAges are 4–12; sessions stay disjoint 4–5 and 7–12.
    const bands = detail.sessions.map(
      (s) => buildSessionDetailRow(s, detail.venuesById, { now: NOW })
        .ageEligibilityLabel,
    );
    assert.deepEqual(bands.sort(), ["Ages 4–5", "Ages 7–12"].sort());
    assert.ok(!bands.some((b) => b.includes("4–12")));
  });
});

describe("camp detail — session selection", () => {
  it("selects a flat-result session that belongs to the program", () => {
    const detail = resolveCampDetailBySlug(fixtures, "stem-explorers-dev");
    assert.ok(detail);
    const sel = resolveSessionSelection(detail.sessions, "sess-dev-stem-w2");
    assert.equal(sel.kind, "selected");
    if (sel.kind === "selected") {
      assert.equal(sel.selectedSessionId, "sess-dev-stem-w2");
    }
  });

  it("rejects an invalid session id with a notice — does not invent selection", () => {
    const detail = resolveCampDetailBySlug(fixtures, "stem-explorers-dev");
    assert.ok(detail);
    const sel = resolveSessionSelection(detail.sessions, "sess-dev-art-pc");
    assert.equal(sel.kind, "invalid");
    if (sel.kind === "invalid") {
      assert.match(sel.notice, /not part of this program/i);
      assert.equal(sel.selectedSessionId, null);
    }
  });

  it("treats empty session param as no selection", () => {
    const detail = resolveCampDetailBySlug(fixtures, "stem-explorers-dev");
    assert.ok(detail);
    assert.equal(resolveSessionSelection(detail.sessions, null).kind, "none");
    assert.equal(resolveSessionSelection(detail.sessions, "").kind, "none");
  });
});

describe("camp detail — return path and href", () => {
  it("sanitizes return paths to Camps listing only", () => {
    assert.equal(sanitizeCampsReturnPath("/camps"), "/camps");
    assert.equal(sanitizeCampsReturnPath("/camps?q=stem"), "/camps?q=stem");
    assert.equal(sanitizeCampsReturnPath("https://evil.example/"), "/camps");
    assert.equal(sanitizeCampsReturnPath("//evil.example"), "/camps");
    assert.equal(sanitizeCampsReturnPath("/about"), "/camps");
  });

  it("grouped href omits session id; flat href selects that session only", () => {
    const grouped = buildCampDetailHref("stem-explorers-dev", {
      returnTo: "/camps?group=1",
      matchingSessionIds: ["sess-dev-stem-w1", "sess-dev-stem-w2"],
    });
    assert.doesNotMatch(grouped, /[?&]session=/);
    assert.match(grouped, /matches=/);

    const flat = buildCampDetailHref("stem-explorers-dev", {
      sessionId: "sess-dev-stem-w2",
      returnTo: "/camps?group=0",
      matchingSessionIds: ["sess-dev-stem-w1", "sess-dev-stem-w2"],
    });
    assert.match(flat, /session=sess-dev-stem-w2/);
    assert.doesNotMatch(flat, /session=sess-dev-stem-w1/);
  });

  it("round-trips listing search/filters/sort/grouping through buildListingHref", () => {
    const href = buildListingHref({
      filters: {
        ...EMPTY_LISTING_FILTERS,
        keyword: "art",
        timingShortcut: "summer",
        locations: ["Port Credit"],
        themes: ["Arts"],
      },
      sort: "name_asc",
      listingView: "session",
    });
    assert.match(href, /^\/camps\?/);
    const parsed = parseListingHrefSearch(href.slice("/camps".length));
    assert.equal(parsed.filters.keyword, "art");
    assert.equal(parsed.filters.timingShortcut, "summer");
    assert.deepEqual(parsed.filters.locations, ["Port Credit"]);
    assert.deepEqual(parsed.filters.themes, ["Arts"]);
    assert.equal(parsed.sort, "name_asc");
    assert.equal(parsed.listingView, "session");
  });
});

describe("camp detail — matching vs other sessions", () => {
  it("parses matches and distinguishes non-matching program sessions", () => {
    const detail = resolveCampDetailBySlug(fixtures, "stem-explorers-dev");
    assert.ok(detail);
    const ids = parseMatchingSessionIds("sess-dev-stem-w1", detail.sessions);
    assert.deepEqual(ids, ["sess-dev-stem-w1"]);
    assert.equal(
      sessionMatchesListingFilters("sess-dev-stem-w1", ids),
      true,
    );
    assert.equal(
      sessionMatchesListingFilters("sess-dev-stem-w3", ids),
      false,
    );
    assert.equal(sessionMatchesListingFilters("sess-dev-stem-w1", null), null);
  });

  it("drops foreign match ids that do not belong to the program", () => {
    const detail = resolveCampDetailBySlug(fixtures, "stem-explorers-dev");
    assert.ok(detail);
    const ids = parseMatchingSessionIds(
      "sess-dev-art-pc,sess-dev-stem-w2",
      detail.sessions,
    );
    assert.deepEqual(ids, ["sess-dev-stem-w2"]);
  });
});

describe("camp detail — unknown slug", () => {
  it("resolveCampDetailBySlug returns null for unknown slug", () => {
    assert.equal(resolveCampDetailBySlug(fixtures, "no-such-camp"), null);
  });
});

describe("camp detail — production fixture gate", () => {
  it("soft-loads null in production so detail pages cannot serve fixtures", () => {
    const prev = process.env.NODE_ENV;
    // @ts-expect-error test override
    process.env.NODE_ENV = "production";
    try {
      assert.equal(loadCampsDevFixtures(), null);
    } finally {
      // @ts-expect-error restore
      process.env.NODE_ENV = prev;
    }
  });
});
