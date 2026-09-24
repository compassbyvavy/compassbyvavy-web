import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DISCOVER_CATEGORIES,
  getDiscoverCategory,
  liveDiscoverCategories,
} from "@/lib/discover/categories";

const VISION_TITLES = [
  "Parks & Nature",
  "Play & Entertainment",
  "Learning & Culture",
  "Events",
  "Classes & Programs",
  "Camps",
  "Food & Treats",
  "Travel & Getaways",
  "Shopping",
  "Services",
] as const;

describe("Discover category map", () => {
  it("covers the vision map in order and exposes only reviewed live directories", () => {
    assert.deepEqual(
      DISCOVER_CATEGORIES.map((c) => c.title),
      [...VISION_TITLES],
    );
    const live = liveDiscoverCategories();
    assert.deepEqual(live.map((category) => category.slug), ["play", "camps"]);
    assert.deepEqual(live.map((category) => category.href), ["/play", "/camps"]);
    assert.ok(live.every((category) => category.status === "available"));
  });

  it("keeps every category except Play and Camps as an honest placeholder", () => {
    for (const category of DISCOVER_CATEGORIES) {
      if (category.slug === "camps" || category.slug === "play") continue;
      assert.equal(category.status, "coming_soon");
      assert.equal(category.href, `/discover/${category.slug}`);
      assert.equal(category.cta, "Coming soon");
      assert.doesNotMatch(category.blurb, /browse (all|every)/i);
    }
  });

  it("links Play & Entertainment to its verified venue directory", () => {
    const play = getDiscoverCategory("play");
    assert.ok(play);
    assert.equal(play.status, "available");
    assert.equal(play.href, "/play");
    assert.match(play.blurb, /verified/i);
  });

  it("does not present Services as a live directory", () => {
    const services = getDiscoverCategory("services");
    assert.ok(services);
    assert.equal(services.status, "coming_soon");
    assert.match(services.groupingNote ?? "", /not a provider directory/i);
  });

  it("returns undefined for unknown slugs rather than a substitute category", () => {
    assert.equal(getDiscoverCategory("community"), undefined);
    assert.equal(getDiscoverCategory("camps-2"), undefined);
  });
});
