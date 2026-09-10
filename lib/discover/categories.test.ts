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
  it("covers the vision map in order, without inventing extra live directories", () => {
    assert.deepEqual(
      DISCOVER_CATEGORIES.map((c) => c.title),
      [...VISION_TITLES],
    );
    const live = liveDiscoverCategories();
    assert.equal(live.length, 1);
    assert.equal(live[0].slug, "camps");
    assert.equal(live[0].href, "/camps");
    assert.equal(live[0].status, "available");
  });

  it("keeps every non-camps category as an honest coming-soon placeholder", () => {
    for (const category of DISCOVER_CATEGORIES) {
      if (category.slug === "camps") continue;
      assert.equal(category.status, "coming_soon");
      assert.equal(category.href, `/discover/${category.slug}`);
      assert.equal(category.cta, "Coming soon");
      assert.doesNotMatch(category.blurb, /browse (all|every)/i);
    }
  });

  it("groups Play & Entertainment honestly instead of shipping fake splash-pad listings", () => {
    const play = getDiscoverCategory("play");
    assert.ok(play);
    assert.match(play.groupingNote ?? "", /splash pads/i);
    assert.match(play.groupingNote ?? "", /not live/i);
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
