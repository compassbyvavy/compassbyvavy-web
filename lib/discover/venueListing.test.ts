import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pe001AmazingFunPark } from "@/data/discover/venues/pe001AmazingFunPark";
import { pe002BooglesPlayhouse } from "@/data/discover/venues/pe002BooglesPlayhouse";
import { childPriceFrom, venueToDiscoverListing } from "@/lib/discover/venueListing";
import { loadCategoryVenues, previewAsPublished } from "@/lib/discover/venuesCatalog";
import { publishedVenuesInCategoriesQueryUrl } from "@/lib/discover/venuesSupabase";

describe("Play & Entertainment listing cards from venue records", () => {
  const afp = venueToDiscoverListing(previewAsPublished(pe001AmazingFunPark), "play");
  const boogles = venueToDiscoverListing(previewAsPublished(pe002BooglesPlayhouse), "play");

  it("links each card to the venue's own page", () => {
    assert.equal(afp.href, "/discover/play/amazing-fun-park");
    assert.equal(boogles.href, `/discover/play/${pe002BooglesPlayhouse.place.slug}`);
  });

  it("quotes the lowest regular child admission, never a promotion or sibling rate", () => {
    assert.equal(afp.costSummary, "From $24.95 a child + tax");
    assert.equal(boogles.costSummary, "From $20 a child + tax");
  });

  it("keeps the venue's own ages and checked date", () => {
    assert.equal(afp.ageMin, pe001AmazingFunPark.place.ageMin);
    assert.equal(afp.ageMax, pe001AmazingFunPark.place.ageMax);
    assert.equal(afp.lastVerifiedOn, pe001AmazingFunPark.place.sourceCheckedDate);
    assert.equal(afp.verification, "source_checked");
    assert.equal(afp.providerName, null);
  });

  it("files indoor playgrounds under Indoor play", () => {
    assert.equal(afp.extension.category, "play");
    assert.equal(afp.extension.category === "play" && afp.extension.placeKind, "indoor_play");
  });

  it("says nothing about price when the venue publishes none", () => {
    assert.equal(childPriceFrom([]), null);
  });
});

describe("published venues for a category", () => {
  it("asks Supabase only for published, open venues in the category's database categories", () => {
    const url = new URL(publishedVenuesInCategoriesQueryUrl("https://x.supabase.co", ["play_entertainment", "indoor_play"]));
    assert.equal(url.pathname, "/rest/v1/places");
    assert.equal(url.searchParams.get("category"), "in.(play_entertainment,indoor_play)");
    assert.equal(url.searchParams.get("publication_state"), "eq.published");
    assert.equal(url.searchParams.get("published_at"), "not.is.null");
    assert.equal(url.searchParams.get("operating_status"), "eq.open");
  });

  it("falls back to coming soon in production when nothing is published", async () => {
    const empty = async () => new Response("[]", { status: 200 });
    const catalog = await loadCategoryVenues({
      categorySlug: "play",
      nodeEnv: "production",
      supabase: { url: "https://x.supabase.co", anonKey: "k", fetchImpl: empty },
      reviewFlag: null,
    });
    assert.equal(catalog, null);
  });

  it("falls back to coming soon in production when Supabase fails", async () => {
    const failing = async () => new Response("oops", { status: 500 });
    const catalog = await loadCategoryVenues({
      categorySlug: "play",
      nodeEnv: "production",
      supabase: { url: "https://x.supabase.co", anonKey: "k", fetchImpl: failing },
      reviewFlag: null,
    });
    assert.equal(catalog, null);
  });

  it("has no venues for categories without venue records", async () => {
    const catalog = await loadCategoryVenues({ categorySlug: "nope", nodeEnv: "development" });
    assert.equal(catalog, null);
  });

  it("previews real records in development, never marked published", async () => {
    const catalog = await loadCategoryVenues({ categorySlug: "play", nodeEnv: "development" });
    assert.ok(catalog);
    assert.equal(catalog.sourceLabel, "dev_preview");
    assert.ok(catalog.records.some((r) => r.place.id === "PE-001"));
  });
});
