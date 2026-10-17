import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAMPLE_LISTING_NOTE } from "@/lib/discover/exampleListing";
import {
  allExampleListings,
  registeredDiscoverCategories,
} from "@/lib/discover/catalog";
import {
  DISCOVER_CATEGORIES,
  liveDiscoverCategories,
} from "@/lib/discover/categories";
import { SERVICES_GOVERNANCE_NOTE } from "@/lib/discover/categoryPages";
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
  it("registers examples only for available non-camp categories", () => {
    const available = DISCOVER_CATEGORIES.filter(
      (category) => category.status === "available" && category.slug !== "camps",
    ).map((category) => category.slug);
    assert.deepEqual(
      registeredDiscoverCategories().slice().sort(),
      available.slice().sort(),
    );
    assert.ok(liveDiscoverCategories().some((category) => category.slug === "camps"));
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

  it("does not put a quality ranking on the services directory note", () => {
    assert.match(SERVICES_GOVERNANCE_NOTE, /does not rank/i);
    assert.match(SERVICES_GOVERNANCE_NOTE, /not medical advice/i);
    assert.doesNotMatch(SERVICES_GOVERNANCE_NOTE, /\b(best|top-rated|five-star)\b/i);
  });
});
