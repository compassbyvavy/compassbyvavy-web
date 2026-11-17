import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapExistingPlaces, placesFromSeedSql } from "@/lib/discover/mapPlaces";
import { parseDiscoverSheets, publicPlaceTypes, stableSeed } from "@/lib/discover/workbook";

const sheets = [
  {
    name: "Discover Categories",
    rows: [
      ["ID", "Slug", "Name", "Sort order", "Card copy", "Icon", "Status"],
      ["CAT-CAMP", "camps", "Camps", "1", "Day camps.", "Tent", "Live"],
      ["CAT-SHOP", "shopping", "Shopping", "10", "", "", "Parked"],
    ],
  },
  {
    name: "Discover Subcategories",
    rows: [
      ["ID", "Category ID", "Slug", "Name", "Sort order", "Description", "Is new"],
      ["DS-PLAY", "CAT-PLAY", "indoor-playgrounds", "Indoor playgrounds", "1", "", "No"],
    ],
  },
  {
    name: "Discover Map",
    rows: [
      ["ID", "Name", "Discover subcategory ID", "Source category", "Source subcategory", "Indoor/Outdoor", "Permanent/Seasonal", "Primary age group", "Discover status", "Merged into"],
      ["PT-PE-001", "Soft Play Centre", "DS-PLAY", "Play", "Indoor", "Indoor", "Permanent", "3-8", "Live", ""],
      ["PT-PN-031", "Off-Leash Dog Park", "", "Parks", "Parks", "", "", "", "Parked", ""],
      ["PT-PN-040", "Tent Campground", "", "Parks", "Camp", "", "", "", "Merged", "PT-TRV-018"],
    ],
  },
  {
    name: "Discover Filters",
    rows: [
      ["Slug", "Label", "Group", "Applies to", "Logic", "Feature IDs", "Status"],
      ["indoor-outdoor", "Indoor or outdoor", "Place", "All", "Indoor or outdoor", "FT-CF-012, FT-CF-013", "Ready"],
      ["free", "Free", "Cost", "All", "Price is 0", "—", "Gap"],
    ],
  },
  {
    name: "Regions Reference",
    rows: [
      ["ID", "Name", "Number"],
      ["R5", "Greater Toronto Area", "5"],
    ],
  },
  {
    name: "Feature Matrix",
    rows: [
      ["Place type ID", "FT-CF-012", "FT-FB-025"],
      ["PT-PE-001", "C", "?"],
      ["PT-PN-031", "—", ""],
    ],
  },
];

describe("discover workbook", () => {
  it("imports the sheets and keeps a second read identical", () => {
    const first = parseDiscoverSheets(sheets);
    const second = parseDiscoverSheets(sheets);
    assert.equal(stableSeed(first), stableSeed(second));
    assert.equal(first.categories.length, 2);
    assert.equal(first.categories[1].status, "parked");
    assert.equal(first.filters[0].featureIds.join(","), "FT-CF-012,FT-CF-013");
    assert.deepEqual(first.features, [
      { placeTypeId: "PT-PE-001", featureId: "FT-CF-012", applicability: "C" },
      { placeTypeId: "PT-PE-001", featureId: "FT-FB-025", applicability: "?" },
    ]);
  });

  it("keeps Parked and Merged types out of the public list", () => {
    const book = parseDiscoverSheets(sheets);
    assert.deepEqual(
      publicPlaceTypes(book.placeTypes).map((row) => row.id),
      ["PT-PE-001"],
    );
  });

  it("maps a place only on an exact Live name", () => {
    const types = parseDiscoverSheets(sheets).placeTypes;
    const mapped = mapExistingPlaces(
      [
        { id: "PE-001", name: "Amazing Fun Park", label: "Indoor Playgrounds" },
        { id: "PE-009", name: "Soft Play", label: "Soft Play Centre" },
        { id: "PE-010", name: "Dog park", label: "Off-Leash Dog Park" },
      ],
      types,
    );
    assert.equal(mapped[0].placeTypeId, undefined);
    assert.match(mapped[0].reason, /exact name/);
    assert.equal(mapped[1].placeTypeId, "PT-PE-001");
    assert.equal(mapped[2].placeTypeId, undefined);
  });

  it("reads place labels from a venue seed", () => {
    const sql = `insert into public.cities values ('mississauga', 'Canada', 'Ontario', 'Mississauga');\ninsert into public.places (id) values ('PE-033', 'sky-zone-mississauga', 'Sky Zone', 'A park.', 'play_entertainment'::public.discover_category, 'Trampoline Parks', (select id from public.cities`;
    assert.deepEqual(placesFromSeedSql(sql), [
      { id: "PE-033", name: "Sky Zone", label: "Trampoline Parks" },
    ]);
  });
});
