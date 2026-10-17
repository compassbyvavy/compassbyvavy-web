import assert from "node:assert/strict";
import { describe, it } from "node:test";
import rawData from "@/data/discover/ontario-location-data.json";
import {
  DEFAULT_SUGGESTION_LIMIT,
  autoHighlightIndex,
  buildLocationIndex,
  getLocationById,
  isAmbiguousLocationName,
  locationLabel,
  nameFromLocationId,
  normalizeLocationText,
  searchLocations,
  starterSuggestions,
  type OntarioLocationData,
} from "@/lib/location/ontarioLocations";

const data = rawData as OntarioLocationData;
const index = buildLocationIndex(data);

const names = (query: string, limit?: number) =>
  searchLocations(index, query, limit).map((s) => s.location.name);

describe("Ontario location data", () => {
  it("holds 2,184 unique places across the 15 tourism regions", () => {
    assert.equal(data.locations.length, 2184);
    assert.equal(data.exactDuplicatesRemoved, 2);
    assert.equal(data.regions.length, 15);
    assert.equal(index.byId.size, 2184);
    const keys = new Set(
      data.locations.map((l) => `${normalizeLocationText(l.name)}|${l.region}`),
    );
    assert.equal(keys.size, data.locations.length, "no exact duplicates remain");
  });

  it("gives every place a known region and a unique, stable id", () => {
    const codes = new Set(data.regions.map((r) => r.code));
    for (const l of data.locations) {
      assert.ok(codes.has(l.region), `${l.name} has region ${l.region}`);
      assert.equal(l.id.endsWith(`--r${l.region}`), true, l.id);
    }
  });

  it("collapses an exact duplicate row if one is ever reintroduced", () => {
    const withDuplicate: OntarioLocationData = {
      ...data,
      locations: [
        ...data.locations,
        { id: "cobourg--r8-copy", name: "Cobourg", region: "8" },
      ],
    };
    const dupIndex = buildLocationIndex(withDuplicate);
    assert.equal(dupIndex.byId.size, 2184);
    assert.equal(
      searchLocations(dupIndex, "cobourg").filter((s) => s.location.name === "Cobourg").length,
      1,
    );
  });
});

describe("searchLocations", () => {
  it("returns Mississauga, Oakville and Brampton for an empty field", () => {
    assert.deepEqual(names(""), ["Mississauga", "Oakville", "Brampton"]);
    assert.deepEqual(names("   "), ["Mississauga", "Oakville", "Brampton"]);
    assert.deepEqual(
      starterSuggestions(index).map((s) => s.subtitle),
      [
        "Region 5 · Greater Toronto Area",
        "Region 3 · Hamilton, Halton and Brant",
        "Region 5 · Greater Toronto Area",
      ],
    );
  });

  it("ranks name-prefix matches first and shows the region as the subtitle", () => {
    const results = searchLocations(index, "port cr");
    assert.equal(results[0].location.name, "Port Credit");
    assert.equal(results[0].subtitle, "Region 5 · Greater Toronto Area");
    const oak = searchLocations(index, "oak");
    assert.equal(oak[0].rank, 0);
    assert.ok(oak.every((s, i) => i === 0 || s.rank >= oak[i - 1].rank));
    assert.ok(names("oak").includes("Oakville"));
  });

  it("puts the exact name before longer names with the same prefix", () => {
    assert.equal(names("milton")[0], "Milton");
    assert.equal(names("perth")[0], "Perth");
  });

  it("matches words inside multi-word names after whole-name prefixes", () => {
    const results = searchLocations(index, "credit");
    const portCredit = results.find((s) => s.location.name === "Port Credit");
    assert.ok(portCredit);
    assert.equal(portCredit.rank, 1);
  });

  it("ignores case, accents and punctuation", () => {
    assert.ok(names("niagara on the lake").includes("Niagara-On-The-Lake"));
    assert.ok(names("chute a blondeau").includes("Chute-à-Blondeau"));
    assert.ok(names("BURKS FALLS").includes("Burk's Falls"));
  });

  it("finds places by region name and region code", () => {
    const muskoka = searchLocations(index, "parry sound and algonquin");
    assert.ok(muskoka.length > 0);
    assert.ok(muskoka.every((s) => s.location.region === "12"));
    const r13b = searchLocations(index, "region 13b");
    assert.ok(r13b.length > 0);
    assert.ok(r13b.every((s) => s.location.region === "13b"));
  });

  it("caps suggestions at 12 by default", () => {
    assert.equal(DEFAULT_SUGGESTION_LIMIT, 12);
    assert.equal(searchLocations(index, "s").length, 12);
    assert.equal(searchLocations(index, "s", 5).length, 5);
  });

  it("returns nothing for a place that is not in the list", () => {
    assert.deepEqual(names("atlantis"), []);
  });
});

describe("same-name places in different regions", () => {
  it("keeps both Richmonds as separate results with their own regions", () => {
    const results = searchLocations(index, "richmond").filter(
      (s) => s.location.name === "Richmond",
    );
    assert.deepEqual(
      results.map((s) => [s.location.id, s.subtitle]),
      [
        ["richmond--r1", "Region 1 · Southwest Ontario"],
        ["richmond--r10", "Region 10 · Ottawa and Countryside"],
      ],
    );
    assert.ok(results.every((s) => s.ambiguous));
  });

  it("labels an ambiguous place with its region and a unique one without", () => {
    assert.equal(isAmbiguousLocationName(index, "Mount Pleasant"), true);
    assert.equal(isAmbiguousLocationName(index, "Mississauga"), false);
    const r10 = getLocationById(index, "richmond--r10");
    assert.ok(r10);
    assert.equal(locationLabel(index, r10), "Richmond (Region 10)");
    const sauga = getLocationById(index, "mississauga--r5");
    assert.ok(sauga);
    assert.equal(locationLabel(index, sauga), "Mississauga");
  });

  it("never pre-highlights a result for an ambiguous name", () => {
    const results = searchLocations(index, "Richmond");
    assert.equal(autoHighlightIndex(index, "Richmond", results), null);
    const mp = searchLocations(index, "mount pleasant");
    assert.equal(autoHighlightIndex(index, "mount pleasant", mp), null);
  });

  it("pre-highlights only an exact, unique name", () => {
    const results = searchLocations(index, "Oakville");
    const i = autoHighlightIndex(index, "Oakville", results);
    assert.notEqual(i, null);
    assert.equal(results[i!].location.id, "oakville--r3");
    assert.equal(autoHighlightIndex(index, "oak", searchLocations(index, "oak")), null);
    assert.equal(autoHighlightIndex(index, "", starterSuggestions(index)), null);
  });
});

describe("location ids", () => {
  it("returns null for unknown ids instead of a guess", () => {
    assert.equal(getLocationById(index, "atlantis--r5"), null);
    assert.equal(getLocationById(index, null), null);
  });

  it("derives a readable name from an id before data loads", () => {
    assert.equal(nameFromLocationId("port-credit--r5"), "Port Credit");
  });
});
