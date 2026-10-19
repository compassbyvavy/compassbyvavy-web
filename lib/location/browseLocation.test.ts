import assert from "node:assert/strict";
import { describe, it } from "node:test";
import rawData from "@/data/discover/ontario-location-data.json";
import type { CampSession, Venue } from "@/data/camps/types";
import {
  BROWSE_LOCATION_STORAGE_KEY,
  browseLocationEmptyMessage,
  browseVenueIdsFor,
  buildCampsCoverage,
  isValidLocationId,
  readStoredBrowseLocation,
  resolveBrowseLocation,
  writeStoredBrowseLocation,
} from "@/lib/location/browseLocation";
import {
  EMPTY_LISTING_FILTERS,
  buildListingHref,
  parseListingHrefSearch,
} from "@/lib/camps/listingFilter";
import {
  buildLocationIndex,
  type OntarioLocationData,
} from "@/lib/location/ontarioLocations";

const index = buildLocationIndex(rawData as OntarioLocationData);

/** Test-only venues and sessions. Not catalog data. */
const venues: Venue[] = [
  { id: "V-SV", name: "Test Hall", neighbourhood: "Streetsville", city: "Mississauga", province: "ON" },
  { id: "V-PC", name: "Test Pier", neighbourhood: "Port Credit", city: "Mississauga", province: "ON" },
  { id: "V-RICH", name: "Test Barn", city: "Richmond", province: "ON" },
  { id: "V-BC", name: "Test Rink", city: "Oakville", province: "BC" },
  { id: "V-UNUSED", name: "No Sessions", city: "Brampton", province: "ON" },
];
const sessions: Pick<CampSession, "venueId">[] = [
  { venueId: "V-SV" },
  { venueId: "V-PC" },
  { venueId: "V-RICH" },
  { venueId: "V-BC" },
  { venueId: null },
];
const coverage = buildCampsCoverage(sessions, venues);

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

describe("coverage from published listings", () => {
  it("counts only venues that host a listed session, in Ontario", () => {
    assert.deepEqual([...coverage.byCity.keys()].sort(), ["mississauga", "richmond"]);
    assert.deepEqual(
      [...coverage.byNeighbourhood.keys()].sort(),
      ["port credit", "streetsville"],
    );
  });

  it("resolves a city with listings to its venues", () => {
    const r = resolveBrowseLocation(index, "mississauga--r5", coverage);
    assert.equal(r.status, "covered");
    if (r.status !== "covered") return;
    assert.equal(r.matchedBy, "city");
    assert.deepEqual([...r.venueIds].sort(), ["V-PC", "V-SV"]);
  });

  it("resolves a community name that listed venues use as their neighbourhood", () => {
    const r = resolveBrowseLocation(index, "streetsville--r5", coverage);
    assert.equal(r.status, "covered");
    if (r.status !== "covered") return;
    assert.equal(r.matchedBy, "neighbourhood");
    assert.deepEqual([...r.venueIds], ["V-SV"]);
  });

  it("reports no listings for a real place without published venues", () => {
    assert.equal(resolveBrowseLocation(index, "brampton--r5", coverage).status, "no_listings");
    // An out-of-province venue named Oakville does not count for Ontario's Oakville.
    assert.equal(resolveBrowseLocation(index, "oakville--r3", coverage).status, "no_listings");
  });

  it("never maps a place to a nearby city", () => {
    // Meadowvale and Erin Mills are in Mississauga, but no listed venue uses those names.
    const r = resolveBrowseLocation(index, "milton--r3", coverage);
    assert.equal(r.status, "no_listings");
    assert.equal(browseVenueIdsFor(r)!.size, 0);
  });

  it("refuses to confirm an ambiguous name even when a venue uses it", () => {
    for (const id of ["richmond--r1", "richmond--r10"]) {
      const r = resolveBrowseLocation(index, id, coverage);
      assert.equal(r.status, "unconfirmed", id);
      assert.equal(browseVenueIdsFor(r)!.size, 0);
    }
  });

  it("treats an id that is not in the list as unknown", () => {
    assert.deepEqual(resolveBrowseLocation(index, "atlantis--r5", coverage), {
      status: "unknown_location",
      id: "atlantis--r5",
    });
  });

  it("applies no constraint when no place is chosen", () => {
    const r = resolveBrowseLocation(index, null, coverage);
    assert.equal(r.status, "none");
    assert.equal(browseVenueIdsFor(r), null);
  });

  it("explains every empty outcome and stays quiet otherwise", () => {
    const none = resolveBrowseLocation(index, "brampton--r5", coverage);
    assert.match(browseLocationEmptyMessage(none, "Brampton")!.title, /No camp listings for Brampton/);
    const unconfirmed = resolveBrowseLocation(index, "richmond--r10", coverage);
    assert.match(browseLocationEmptyMessage(unconfirmed, "Richmond (Region 10)")!.body, /won't guess/);
    const covered = resolveBrowseLocation(index, "mississauga--r5", coverage);
    assert.equal(browseLocationEmptyMessage(covered, "Mississauga"), null);
  });
});

describe("persistence and URL", () => {
  it("accepts only well-formed location ids", () => {
    assert.equal(isValidLocationId("mississauga--r5"), true);
    assert.equal(isValidLocationId("sault-ste-marie--r13b"), true);
    assert.equal(isValidLocationId("mississauga"), false);
    assert.equal(isValidLocationId("x--r14"), false);
    assert.equal(isValidLocationId("<script>--r5"), false);
  });

  it("remembers and forgets the choice in storage", () => {
    const storage = memoryStorage();
    writeStoredBrowseLocation(storage, "oakville--r3");
    assert.equal(storage.map.get(BROWSE_LOCATION_STORAGE_KEY), "oakville--r3");
    assert.equal(readStoredBrowseLocation(storage), "oakville--r3");
    writeStoredBrowseLocation(storage, null);
    assert.equal(readStoredBrowseLocation(storage), null);
  });

  it("ignores tampered or blocked storage", () => {
    assert.equal(
      readStoredBrowseLocation(memoryStorage({ [BROWSE_LOCATION_STORAGE_KEY]: "bad value" })),
      null,
    );
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(readStoredBrowseLocation(throwing), null);
    assert.doesNotThrow(() => writeStoredBrowseLocation(throwing, "oakville--r3"));
  });

  it("round-trips `where` on /camps without touching the search text", () => {
    const href = buildListingHref({
      filters: { ...EMPTY_LISTING_FILTERS, keyword: "splash", whereId: "port-credit--r5" },
      sort: "soonest_start",
      listingView: "program",
    });
    const parsed = parseListingHrefSearch(href.slice("/camps".length));
    assert.equal(parsed.filters.whereId, "port-credit--r5");
    assert.equal(parsed.filters.keyword, "splash");
    assert.deepEqual(parsed.filters.locations, [], "header location is not a refine filter");
  });

  it("drops a malformed `where` param instead of guessing", () => {
    assert.equal(parseListingHrefSearch("?where=Mississauga").filters.whereId, null);
    assert.equal(parseListingHrefSearch("?q=hockey").filters.whereId, null);
  });
});

describe("camps listing with a browse location", () => {
  // Gated dev fixtures: three fictional Mississauga venues (Erin Mills,
  // Port Credit, City Centre), used here only as test data.
  const load = async () => {
    const f = await import("@/data/camps/fixtures.dev");
    const { buildListingResults } = await import("@/lib/camps/listingFilter");
    const catalog = {
      programs: f.campsDevPrograms,
      providers: f.campsDevProviders,
      sessions: f.campsDevSessions,
      venuesById: Object.fromEntries(f.campsDevVenues.map((v) => [v.id, v])),
    };
    const cov = buildCampsCoverage(f.campsDevSessions, f.campsDevVenues);
    const run = (whereId: string | null) =>
      buildListingResults(catalog, EMPTY_LISTING_FILTERS, {
        browseVenueIds: browseVenueIdsFor(resolveBrowseLocation(index, whereId, cov)),
      });
    return { f, run };
  };

  it("shows only sessions held in the chosen place", async () => {
    const { f, run } = await load();
    const all = run(null);
    const portCredit = run("port-credit--r5");
    const sessionIds = portCredit.matches.flatMap((m) => m.matchingSessionIds);
    assert.ok(sessionIds.length > 0);
    const venueOf = new Map(f.campsDevSessions.map((s) => [s.id, s.venueId]));
    assert.ok(sessionIds.every((id) => venueOf.get(id) === "venue-dev-port-credit"));
    assert.ok(portCredit.programCount <= all.programCount);
    assert.equal(portCredit.awaitingDatesCount, 0, "undated programs have no confirmed place");
  });

  it("shows every session with a known venue when the whole city is chosen", async () => {
    const { f, run } = await load();
    const ids = run("mississauga--r5").matches.flatMap((m) => m.matchingSessionIds).sort();
    const withVenue = run(null)
      .matches.flatMap((m) => m.matchingSessionIds)
      .filter((id) => f.campsDevSessions.find((s) => s.id === id)?.venueId)
      .sort();
    assert.deepEqual(ids, withVenue);
    // A session with no venue cannot be confirmed in any place.
    assert.ok(f.campsDevSessions.some((s) => !s.venueId));
  });

  it("shows nothing — not a nearby city — for a place without listings", async () => {
    const { run } = await load();
    const brampton = run("brampton--r5");
    assert.equal(brampton.programCount, 0);
    assert.equal(brampton.awaitingDatesCount, 0);
  });
});
