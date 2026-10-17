import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PARKS_EXAMPLES } from "@/data/discover/examples/parks";
import { getCategoryPage } from "@/lib/discover/categoryPages";
import {
  filterDiscoverListings,
  parseDiscoverQuery,
} from "@/lib/discover/listingQuery";

const parks = getCategoryPage("parks");
if (!parks) throw new Error("parks page missing");

describe("discover listing query", () => {
  it("matches a search token in the title", () => {
    const query = parseDiscoverQuery(new URLSearchParams("q=splash"), parks);
    const rows = filterDiscoverListings(PARKS_EXAMPLES, query, parks);
    assert.deepEqual(
      rows.map((row) => row.slug),
      ["example-north-splash"],
    );
  });

  it("filters by kind", () => {
    const query = parseDiscoverQuery(
      new URLSearchParams("kind=beach"),
      parks,
    );
    const rows = filterDiscoverListings(PARKS_EXAMPLES, query, parks);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].extension.placeKind, "beach");
  });

  it("does not treat an unknown city as a selected city", () => {
    const query = parseDiscoverQuery(
      new URLSearchParams("city=Example+Harbour"),
      parks,
    );
    const rows = filterDiscoverListings(PARKS_EXAMPLES, query, parks);
    assert.ok(rows.every((row) => row.city === "Example Harbour"));
    assert.equal(
      rows.some((row) => row.slug === "example-ridge-trail"),
      false,
    );
  });

  it("keeps Unknown washrooms out of both Yes and No", () => {
    const yes = filterDiscoverListings(
      PARKS_EXAMPLES,
      parseDiscoverQuery(new URLSearchParams("washrooms=yes"), parks),
      parks,
    );
    const no = filterDiscoverListings(
      PARKS_EXAMPLES,
      parseDiscoverQuery(new URLSearchParams("washrooms=no"), parks),
      parks,
    );
    assert.ok(yes.every((row) => row.extension.category === "parks" && row.extension.washrooms === "yes"));
    assert.equal(no.length, 0);
    assert.equal(
      yes.some((row) => row.slug === "example-north-splash"),
      false,
    );
  });

  it("ignores a kind that this category does not have", () => {
    const query = parseDiscoverQuery(
      new URLSearchParams("kind=trampoline"),
      parks,
    );
    assert.equal(query.placeKind, "");
    assert.equal(
      filterDiscoverListings(PARKS_EXAMPLES, query, parks).length,
      PARKS_EXAMPLES.length,
    );
  });
});
