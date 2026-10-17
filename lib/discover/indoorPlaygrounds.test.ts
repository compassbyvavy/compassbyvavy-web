import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLAY_VENUES } from "@/data/play/venues";
import type { VenueRecord } from "@/data/discover/venueTypes";
import { venuesDevRecords } from "@/data/discover/venues.dev";
import { resolvePublicVenue } from "@/lib/discover/venueDetail";
import {
  UNRESOLVED_INDOOR_PLAY_ROSTER,
  advertisedIndoorFilters,
  auditCanonicalPlayResearch,
  filterIndoorPlaygrounds,
  indoorPlayCard,
  indoorPlayCountsByCity,
  indoorPlaygroundRoster,
  loadIndoorPlaygroundBrowse,
  nextPlayVenueId,
  parseIndoorPlayQuery,
  publicIndoorPlayTypes,
} from "@/lib/discover/indoorPlaygrounds";

const [heartland, brampton, draft, closed] = venuesDevRecords;

function clone(record: VenueRecord): VenueRecord {
  return structuredClone(record);
}

describe("canonical indoor-playground coverage", () => {
  it("keeps PE-001 Sky Zone verified and outside the indoor-playground directory", () => {
    assert.deepEqual(
      PLAY_VENUES.map((venue) => venue.id),
      ["PE-001"],
    );
    const sky = PLAY_VENUES[0];
    assert.equal(sky.name, "Sky Zone Mississauga");
    assert.equal(sky.status, "verified");
    assert.equal(sky.primaryCategory, "Trampoline Parks");
    assert.equal(sky.address.city, "Mississauga");
    assert.equal(sky.address.street, "3636 Hawkestone Rd");

    const audit = auditCanonicalPlayResearch();
    assert.equal(audit.length, 1);
    assert.equal(audit[0].id, "PE-001");
    assert.equal(audit[0].status, "verified");
    assert.equal(audit[0].disposition, "excluded_other_taxonomy");
    assert.deepEqual(audit[0].taxonomy, [
      "Trampoline Parks",
      "Ninja Warrior Gyms",
      "Adventure Courses",
      "Family Entertainment Centres",
    ]);
    assert.equal(audit.filter((row) => row.disposition === "listed_indoor_playground").length, 0);
    assert.match(UNRESOLVED_INDOOR_PLAY_ROSTER[0].summary, /No indoor-playground candidate roster/);
    assert.equal(nextPlayVenueId(PLAY_VENUES.map((venue) => venue.id)), "PE-002");
    assert.equal(PLAY_VENUES.some((venue) => venue.id === "PE-002"), false);
  });

  it("counts no verified indoor playgrounds in the three cities from canonical research", () => {
    const rows = auditCanonicalPlayResearch().filter((row) => row.disposition === "listed_indoor_playground");
    for (const city of ["Mississauga", "Oakville", "Brampton"]) {
      assert.equal(rows.filter((row) => row.city === city).length, 0, city);
    }
  });
});

describe("indoor playground publication roster", () => {
  it("lists multi-tag indoor playgrounds and drops draft, closed, and other taxonomies", () => {
    const trampolineOnly = clone(heartland);
    trampolineOnly.place = {
      ...trampolineOnly.place,
      id: "DEV-TRAMP",
      slug: "trampoline-only",
      name: "Jump Only",
      placeType: "Trampoline Park",
    };
    trampolineOnly.types = trampolineOnly.types.filter((type) => type.placeType === "Trampoline Park");

    const roster = indoorPlaygroundRoster([...venuesDevRecords, trampolineOnly]);
    assert.deepEqual(
      roster.listed.map((record) => record.place.id),
      ["DEV-PE-002", "DEV-PE-001"],
    );
    assert.deepEqual(indoorPlayCountsByCity(roster.listed), {
      mississauga: 1,
      oakville: 0,
      brampton: 1,
    });
    assert.equal(roster.review.find((item) => item.id === "DEV-PE-003")?.reason, "draft");
    assert.equal(roster.review.find((item) => item.id === "DEV-PE-004")?.reason, "closed");
    assert.equal(roster.review.some((item) => item.id === "DEV-TRAMP"), false);
    assert.deepEqual(publicIndoorPlayTypes(heartland), ["Indoor Playground", "Toddler Play Area"]);
  });

  it("keeps unknown operating status and unverified indoor types in review", () => {
    const unknown = clone(heartland);
    unknown.place = { ...unknown.place, id: "DEV-UNKNOWN", slug: "unknown-status", operatingStatus: "unknown" };
    const followUp = clone(heartland);
    followUp.place = { ...followUp.place, id: "DEV-FOLLOW", slug: "follow-up-type" };
    followUp.types = followUp.types.map((type) => ({ ...type, verificationStatus: "needs_follow_up" as const }));
    const roster = indoorPlaygroundRoster([unknown, followUp]);
    assert.deepEqual(roster.listed, []);
    assert.equal(roster.review.find((item) => item.id === "DEV-UNKNOWN")?.reason, "needs_review");
    assert.equal(roster.review.find((item) => item.id === "DEV-FOLLOW")?.reason, "needs_review");
  });

  it("sends out-of-city indoor playgrounds to review", () => {
    const toronto = clone(heartland);
    toronto.place = { ...toronto.place, id: "DEV-TOR", slug: "toronto-play", cityId: "toronto" };
    toronto.cityName = "Toronto";
    const roster = indoorPlaygroundRoster([toronto]);
    assert.deepEqual(roster.listed, []);
    assert.equal(roster.review[0]?.reason, "out_of_city");
  });

  it("keeps the newer duplicate branch and holds same-day conflicts for review", () => {
    const older = clone(heartland);
    older.place = { ...older.place, id: "DEV-OLD", slug: "maple-leap-old", sourceCheckedDate: "2026-09-01" };
    const newer = clone(heartland);
    newer.place = { ...newer.place, id: "DEV-NEW", slug: "maple-leap-new", sourceCheckedDate: "2026-10-12" };
    const kept = indoorPlaygroundRoster([older, newer]);
    assert.deepEqual(kept.listed.map((record) => record.place.id), ["DEV-NEW"]);
    assert.equal(kept.review.find((item) => item.id === "DEV-OLD")?.reason, "duplicate");

    const tieA = clone(heartland);
    tieA.place = { ...tieA.place, id: "DEV-TIE-A", slug: "tie-a", sourceCheckedDate: "2026-10-10" };
    const tieB = clone(heartland);
    tieB.place = { ...tieB.place, id: "DEV-TIE-B", slug: "tie-b", sourceCheckedDate: "2026-10-10" };
    const tied = indoorPlaygroundRoster([tieA, tieB]);
    assert.deepEqual(tied.listed, []);
    assert.equal(tied.review.filter((item) => item.reason === "unresolved_duplicate").length, 2);
  });

  it("filters by city, age, toddler-friendly, and verified play style", () => {
    const roster = indoorPlaygroundRoster(venuesDevRecords);
    const filters = advertisedIndoorFilters(roster.listed);
    assert.equal(filters.age, true);
    assert.equal(filters.toddler, true);
    assert.deepEqual(filters.styles, ["toddler-play"]);
    assert.equal(filters.styles.includes("soft-play"), false);
    assert.equal(filters.styles.includes("adventure-play"), false);
    assert.equal(filters.styles.includes("multi-level"), false);

    const oakville = filterIndoorPlaygrounds(roster.listed, parseIndoorPlayQuery({ city: "oakville" }), filters);
    assert.deepEqual(oakville, []);
    const ageFour = filterIndoorPlaygrounds(roster.listed, parseIndoorPlayQuery({ age: "4" }), filters);
    assert.deepEqual(ageFour.map((record) => record.place.id), ["DEV-PE-001"]);
    const ageFourteen = filterIndoorPlaygrounds(roster.listed, parseIndoorPlayQuery({ age: "14" }), filters);
    assert.deepEqual(ageFourteen, []);
    const toddlers = filterIndoorPlaygrounds(roster.listed, parseIndoorPlayQuery({ toddler: "1" }), filters);
    assert.deepEqual(toddlers.map((record) => record.place.id), ["DEV-PE-001"]);
    const toddlerPlay = filterIndoorPlaygrounds(
      roster.listed,
      parseIndoorPlayQuery({ style: "toddler-play" }),
      filters,
    );
    assert.deepEqual(toddlerPlay.map((record) => record.place.id), ["DEV-PE-001"]);

    const soft = clone(heartland);
    soft.place = { ...soft.place, id: "DEV-SOFT", slug: "soft-adventure", cityId: "oakville", neighbourhood: "Downtown" };
    soft.cityName = "Oakville";
    soft.types = [
      { ...soft.types[0], placeType: "Soft Play", isPrimary: true },
      { ...soft.types[0], placeType: "Adventure Play", isPrimary: false },
      { ...soft.types[0], placeType: "Multi-level Play", isPrimary: false },
    ];
    const withStyles = indoorPlaygroundRoster([soft]);
    const styleFilters = advertisedIndoorFilters(withStyles.listed);
    assert.deepEqual(styleFilters.styles, ["soft-play", "adventure-play", "multi-level"]);
    const both = filterIndoorPlaygrounds(
      withStyles.listed,
      parseIndoorPlayQuery({ style: ["soft-play", "adventure-play"] }),
      styleFilters,
    );
    assert.equal(both.length, 1);
    const card = indoorPlayCard(both[0]);
    assert.deepEqual(card.playStyles, ["Soft Play", "Adventure Play", "Multi-level Play"]);
    assert.equal(card.cityName, "Oakville");
  });

  it("ignores a play-style filter the listed data does not support", () => {
    const roster = indoorPlaygroundRoster(venuesDevRecords);
    const filters = advertisedIndoorFilters(roster.listed);
    const queried = filterIndoorPlaygrounds(
      roster.listed,
      parseIndoorPlayQuery({ style: "soft-play" }),
      filters,
    );
    assert.equal(queried.length, roster.listed.length);
    const rejected = parseIndoorPlayQuery({ age: "nope" });
    assert.equal(rejected.age, null);
    assert.equal(rejected.ageRejected, true);
  });

  it("links listed venues to the shared detail route and keeps drafts and closed venues off it", () => {
    const roster = indoorPlaygroundRoster(venuesDevRecords);
    for (const record of roster.listed) {
      assert.equal(resolvePublicVenue(venuesDevRecords, "play", record.place.slug)?.place.id, record.place.id);
      assert.match(indoorPlayCard(record).href, /^\/discover\/play\//);
    }
    assert.equal(resolvePublicVenue(venuesDevRecords, "play", draft.place.slug), null);
    assert.equal(resolvePublicVenue(venuesDevRecords, "play", closed.place.slug), null);
    assert.equal(roster.listed.some((record) => record.place.slug === "sky-zone-mississauga"), false);
  });

  it("shows preview fixtures in development and nothing in production", async () => {
    const dev = await loadIndoorPlaygroundBrowse({ nodeEnv: "development" });
    assert.equal(dev.preview, true);
    assert.match(dev.banner ?? "", /DEV ONLY/);
    assert.deepEqual(indoorPlayCountsByCity(dev.listed), { mississauga: 1, oakville: 0, brampton: 1 });
    const production = await loadIndoorPlaygroundBrowse({ nodeEnv: "production" });
    assert.equal(production.preview, false);
    assert.equal(production.banner, null);
    assert.deepEqual(production.listed, []);
    assert.deepEqual(production.review, []);
  });

  it("builds a parent card from verified facts only", () => {
    const card = indoorPlayCard(heartland);
    assert.equal(card.name, "Maple Leap Play Centre");
    assert.equal(card.branchName, "Heartland");
    assert.equal(card.neighbourhood, "Heartland");
    assert.equal(card.bestFit, "Ages 0–9");
    assert.equal(card.officialAges, "Ages 1–12");
    assert.equal(card.price, "From $12.99 plus tax");
    assert.match(card.description ?? "", /toddler zone/);
    const sparse = indoorPlayCard(brampton);
    assert.equal(sparse.bestFit, null);
    assert.equal(sparse.price, null);
    assert.equal(sparse.description, null);
    assert.equal(sparse.neighbourhood, null);
  });
});
