import assert from "node:assert/strict";
import { describe, it } from "node:test";
import locationData from "@/data/discover/ontario-location-data.json";
import { parseListingHrefSearch } from "@/lib/camps/listingFilter";
import { getDiscoverCategory } from "@/lib/discover/categories";
import {
  DEFAULT_CITY_SLUG,
  FOUNDER_NOTE,
  HEADER_CITIES,
  HEADER_REGIONS,
  HOME_CATEGORIES,
  HOME_LEARN_ITEMS,
  HOME_PLACES,
  LIST_YOUR_CAMP_HREF,
  LOCATION_PICKER_LABEL,
  SAVED_HREF,
  SHOW_WAITLIST_UNTIL_LAUNCH,
  TOURISM_REGIONS,
  UNBUILT_LINKS,
  WINTER_CARDS,
  headerCityId,
  homeCategories,
  homeCategoryHref,
  linkSlugForPlace,
  waitlistEmailError,
  waitlistMailto,
} from "@/lib/home/home";
import { SHOW_SHOP_IN_MAIN_MENU, mainMenuLinks } from "@/lib/site/siteNav";

const CATEGORY_NAMES = [
  "Camps",
  "Play & Fun",
  "Parks & Nature",
  "Animals & Farms",
  "Learning & Culture",
  "Classes & Programs",
  "Events",
  "Food & Treats",
  "Day Trips & Getaways",
] as const;

describe("home page", () => {
  it("lists the nine categories, Camps first, with lucide icons and city links", () => {
    assert.deepEqual(
      HOME_CATEGORIES.map((category) => category.name),
      [...CATEGORY_NAMES],
    );
    assert.deepEqual(
      HOME_CATEGORIES.map((category) => category.icon),
      ["Tent", "FerrisWheel", "Trees", "PawPrint", "Landmark", "GraduationCap", "CalendarDays", "IceCreamCone", "Car"],
    );
    assert.deepEqual(
      HOME_CATEGORIES.map((category) => homeCategoryHref(category)),
      [
        "/mississauga/camps",
        "/mississauga/play-fun",
        "/mississauga/parks-nature",
        "/mississauga/animals-farms",
        "/mississauga/learning-culture",
        "/mississauga/classes-programs",
        "/mississauga/events",
        "/mississauga/food-treats",
        "/mississauga/day-trips-getaways",
      ],
    );
    assert.equal(homeCategoryHref(HOME_CATEGORIES[0], "oakville"), "/oakville/camps");
    assert.ok(HOME_CATEGORIES.every((category) => category.slug.length > 0));
    assert.equal(homeCategories(null).length, 9);
    assert.equal(homeCategories([]).length, 9);
    const fromDatabase = [HOME_CATEGORIES[0]];
    assert.equal(homeCategories(fromDatabase), fromDatabase);
  });

  it("keeps Shop out of the menu and in the footer until the flag is on", () => {
    assert.equal(SHOW_SHOP_IN_MAIN_MENU, false);
    assert.equal(mainMenuLinks().some((link) => link.label === "Shop"), false);
    assert.equal(mainMenuLinks(true).some((link) => link.label === "Shop"), true);
    assert.equal(UNBUILT_LINKS.find((link) => link.label === "Shop")?.href, "#");
  });

  it("keeps the camp-listing footer links unbuilt", () => {
    assert.deepEqual(
      UNBUILT_LINKS.map((link) => link.label),
      ["Shop", "List your camp for free", "Update your listing"],
    );
    assert.ok(UNBUILT_LINKS.every((link) => link.href === "#"));
  });

  it("puts launch cities before Ontario's tourism regions", () => {
    assert.equal(LOCATION_PICKER_LABEL, "City or region");
    assert.deepEqual(
      HEADER_CITIES.map((city) => city.label),
      ["Mississauga", "Oakville", "Brampton", "Toronto"],
    );
    assert.deepEqual(
      TOURISM_REGIONS.map((region) => ({ code: region.code, name: region.name })),
      locationData.regions,
    );
    assert.deepEqual(
      HOME_PLACES.map((place) => place.label),
      [...HEADER_CITIES.map((city) => city.label), ...HEADER_REGIONS.map((region) => region.label)],
    );
    assert.deepEqual(
      HEADER_REGIONS.map((region) => region.id),
      TOURISM_REGIONS.map((region) => `tourism-region:${region.code}`),
    );
    assert.equal(HEADER_CITIES.every((city) => city.whereId === city.id && city.kind === "city"), true);
    assert.equal(HEADER_REGIONS.every((region) => region.whereId === null && region.kind === "region"), true);
    assert.equal(headerCityId(null), "mississauga--r5");
    assert.equal(headerCityId("toronto--r5"), "toronto--r5");
    assert.equal(headerCityId("richmond--r10"), "mississauga--r5");
    assert.equal(headerCityId("tourism-region:13a"), "tourism-region:13a");
    assert.equal(linkSlugForPlace(null), DEFAULT_CITY_SLUG);
    assert.equal(linkSlugForPlace("toronto--r5"), "toronto");
    assert.equal(linkSlugForPlace("tourism-region:5"), "greater-toronto-area");
    assert.equal(linkSlugForPlace("tourism-region:13c"), "northwest-ontario");
    assert.equal(SHOW_WAITLIST_UNTIL_LAUNCH, true);
    assert.equal(SAVED_HREF, "/plan/saved");
    assert.match(LIST_YOUR_CAMP_HREF, /^mailto:hello@compassbyvavy\.ca\?/);
  });

  it("points each winter card at a real route", () => {
    assert.deepEqual(
      WINTER_CARDS.map((card) => [card.title, card.href]),
      [
        ["Winter break camps", "/camps?timing=winter_break"],
        ["PA day camps", "/camps?timing=pa_days"],
        ["Indoor play for cold days", "/discover/play"],
        ["Sledding and skating", "/discover/parks"],
      ],
    );
    assert.equal(parseListingHrefSearch("?timing=winter_break").filters.timingShortcut, "winter_break");
    assert.equal(parseListingHrefSearch("?timing=pa_days").filters.timingShortcut, "pa_days");
    assert.equal(getDiscoverCategory("play")?.href, "/discover/play");
    assert.equal(getDiscoverCategory("parks")?.href, "/discover/parks");
  });

  it("links From Learn to the published printable", () => {
    assert.deepEqual(
      HOME_LEARN_ITEMS.map((item) => item.href),
      ["/learn/space-mission-scavenger-hunt"],
    );
    assert.equal(HOME_LEARN_ITEMS[0].title, "Space Mission Scavenger Hunt");
  });

  it("uses the existing waitlist mailbox and rejects a blank email", () => {
    assert.equal(waitlistEmailError(""), "Enter an email address.");
    assert.equal(waitlistEmailError("parent@example.com"), null);
    assert.match(waitlistMailto("parent@example.com"), /^mailto:hello@compassbyvavy\.ca\?/);
    assert.match(decodeURIComponent(waitlistMailto("parent@example.com")), /early-access list/);
    assert.equal(FOUNDER_NOTE, "");
  });
});
