import assert from "node:assert/strict";
import test from "node:test";
import { PLAY_VENUES } from "@/data/play/venues";
import { getPlayVenue, getPublishedPlayVenues } from "./catalog";

test("play venue IDs and slugs are unique", () => {
  assert.equal(new Set(PLAY_VENUES.map((venue) => venue.id)).size, PLAY_VENUES.length);
  assert.equal(new Set(PLAY_VENUES.map((venue) => venue.slug)).size, PLAY_VENUES.length);
});

test("PE-001 resolves to the verified Sky Zone record", () => {
  const venue = getPlayVenue("sky-zone-mississauga");
  assert.equal(venue?.id, "PE-001");
  assert.equal(venue?.status, "verified");
  assert.equal(venue?.activities.length, 10);
});

test("every sourced fact points to a declared source", () => {
  for (const venue of PLAY_VENUES) {
    const ids = new Set(venue.sources.map((source) => source.id));
    const referenced = [
      ...venue.summary.sourceIds,
      ...venue.officialEligibility.sourceIds,
      ...venue.activities.flatMap((item) => item.sourceIds),
      ...venue.programs.flatMap((item) => item.sourceIds),
      ...venue.pricing.flatMap((item) => item.sourceIds),
      ...venue.offers.flatMap((item) => item.sourceIds),
      ...venue.partySummary.sourceIds,
      ...venue.practical.flatMap((item) => item.sourceIds),
      ...venue.amenities.flatMap((item) => item.sourceIds),
      ...venue.reviewSignal.sourceIds,
      ...(venue.firstHandNote?.sourceIds ?? []),
    ];
    for (const id of referenced) assert.ok(ids.has(id), `missing source ${id}`);
  }
});

test("only verified venues are published", () => {
  assert.ok(getPublishedPlayVenues().every((venue) => venue.status === "verified"));
});
