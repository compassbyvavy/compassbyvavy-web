import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DiscoverDbCategory } from "@/data/discover/types";
import {
  DB_CATEGORIES_BY_SLUG,
  DISCOVER_CATEGORIES,
  dbCategoriesFor,
  discoverCategoryForDb,
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
  it("covers the vision map in order", () => {
    assert.deepEqual(
      DISCOVER_CATEGORIES.map((c) => c.title),
      [...VISION_TITLES],
    );
    const live = liveDiscoverCategories();
    assert.deepEqual(
      live.map((category) => category.slug),
      ["parks", "play", "learning", "events", "classes", "camps"],
    );
  });

  it("links camps to the existing listing and labels example categories", () => {
    for (const category of liveDiscoverCategories()) {
      assert.equal(category.status, "available");
      if (category.slug === "camps") {
        assert.equal(category.href, "/camps");
        assert.equal(category.cta, "Browse camps");
        assert.equal(category.dataLabel, undefined);
      } else {
        assert.equal(category.href, `/discover/${category.slug}`);
        assert.equal(category.cta, "Browse");
        assert.equal(category.dataLabel, "Example data");
      }
    }
  });

  it("keeps unpublished categories as honest coming-soon placeholders", () => {
    for (const category of DISCOVER_CATEGORIES) {
      if (category.status === "available") continue;
      assert.equal(category.status, "coming_soon");
      assert.equal(category.href, `/discover/${category.slug}`);
      assert.equal(category.cta, "Coming soon");
      assert.doesNotMatch(category.blurb, /browse (all|every)/i);
    }
  });

  it("keeps splash pads out of the Play blurb", () => {
    const play = getDiscoverCategory("play");
    assert.ok(play);
    assert.equal(play.status, "available");
    assert.doesNotMatch(play.blurb, /splash pad/i);
    assert.match(play.blurb, /rainy-day/i);
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

/** Every value of public.discover_category after migration 20261017020000. */
const DB_CATEGORIES: readonly DiscoverDbCategory[] = [
  "parks_nature",
  "play_entertainment",
  "splash_pads",
  "indoor_play",
  "learning_culture",
  "events",
  "classes",
  "camps",
  "food_treats",
  "getaways",
  "shopping",
  "other",
];

describe("Discover card to database category map", () => {
  it("has an entry for every UI card and nothing else", () => {
    assert.deepEqual(
      Object.keys(DB_CATEGORIES_BY_SLUG).sort(),
      DISCOVER_CATEGORIES.map((c) => c.slug).sort(),
    );
  });

  it("files every database category except 'other' under exactly one card", () => {
    for (const db of DB_CATEGORIES) {
      const owners = Object.entries(DB_CATEGORIES_BY_SLUG).filter(([, dbs]) =>
        dbs.includes(db),
      );
      assert.equal(owners.length, db === "other" ? 0 : 1, db);
    }
  });

  it("groups legacy splash pads and indoor play under Play & Entertainment", () => {
    assert.equal(discoverCategoryForDb("splash_pads")?.slug, "play");
    assert.equal(discoverCategoryForDb("indoor_play")?.slug, "play");
    assert.equal(discoverCategoryForDb("play_entertainment")?.slug, "play");
  });

  it("keeps Services and unknown slugs empty instead of borrowing another card's rows", () => {
    assert.deepEqual(dbCategoriesFor("services"), []);
    assert.deepEqual(dbCategoriesFor("community"), []);
    assert.equal(discoverCategoryForDb("other"), undefined);
  });
});
