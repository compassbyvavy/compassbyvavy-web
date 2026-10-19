import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAMPLE_LISTING_NOTE } from "@/lib/discover/exampleListing";
import {
  allExampleListings,
  listingsForCategory,
  registeredDiscoverCategories,
} from "@/lib/discover/catalog";
import { CATEGORY_PAGES } from "@/lib/discover/categoryPages";
import {
  DISCOVER_CATEGORIES,
  liveDiscoverCategories,
} from "@/lib/discover/categories";
import type { CompassListing } from "@/lib/listings/types";

function walkStrings(value: unknown, out: string[]) {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) walkStrings(nested, out);
  }
}

describe("discover example catalog", () => {
  it("keeps public categories coming_soon and does not register Services", () => {
    assert.deepEqual(
      liveDiscoverCategories().map((category) => category.slug),
      ["camps"],
    );
    for (const category of DISCOVER_CATEGORIES) {
      if (category.slug === "camps") continue;
      assert.equal(category.status, "coming_soon");
    }
    assert.deepEqual(registeredDiscoverCategories().slice().sort(), [
      "classes",
      "events",
      "food",
      "learning",
      "parks",
      "play",
      "shopping",
      "travel",
    ]);
    assert.equal(listingsForCategory("services"), null);
  });

  it("keeps every row fictional, labelled, and free of a live badge", () => {
    const listings = allExampleListings();
    assert.ok(listings.length > 0);
    const ids = new Set<string>();
    const strings: string[] = [];
    for (const listing of listings) {
      assert.equal(ids.has(listing.id), false);
      ids.add(listing.id);
      assert.equal(listing.verification, "example");
      assert.equal(listing.exampleNote, EXAMPLE_LISTING_NOTE);
      assert.equal(listing.category, listing.extension.category);
      assert.equal(listing.href, `/discover/${listing.category}/${listing.slug}`);
      assert.match(listing.title, /^Example /);
      assert.match(listing.id, new RegExp(`^example-${listing.category}-`));
      if (listing.providerUrl) {
        assert.match(listing.providerUrl, /^https:\/\/example\.com\//);
      }
      const contract: CompassListing = listing;
      assert.equal(contract.verification, "example");
      walkStrings(listing, strings);
    }
    for (const value of strings) {
      assert.doesNotMatch(value, /\blive\b/i);
    }
  });

  it("covers every kind once a category is registered", () => {
    for (const page of CATEGORY_PAGES) {
      const rows = listingsForCategory(page.slug);
      if (!rows) {
        assert.equal(page.slug, "services");
        continue;
      }
      for (const kind of page.placeKinds) {
        assert.ok(
          rows.some((row) => row.extension.placeKind === kind.id),
          `${page.slug} is missing ${kind.id}`,
        );
      }
    }
  });
});
