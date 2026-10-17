/**
 * Discover information architecture — public browse categories.
 *
 * Camps links to the existing camp listing. Other categories stay coming soon
 * until a labelled example catalog is registered for them. Example rows are
 * not a verified directory.
 */

import type { DiscoverDbCategory } from "@/data/discover/types";

export type DiscoverCategoryStatus = "available" | "coming_soon";

export type DiscoverCategory = {
  slug: string;
  title: string;
  icon: string;
  /** One-line parent-facing description — no citywide completeness claim. */
  blurb: string;
  status: DiscoverCategoryStatus;
  href: string;
  cta: string;
  /**
   * Honest grouping note when the UI card combines several real-world kinds.
   * Shown on the placeholder page; never used to invent coverage.
   */
  groupingNote?: string;
  /** Set when the category page is example seed data, not a verified directory. */
  dataLabel?: string;
};

export const DISCOVER_CATEGORIES: readonly DiscoverCategory[] = [
  {
    slug: "parks",
    title: "Parks & Nature",
    icon: "🌳",
    blurb: "Playgrounds, splash pads, trails, conservation areas, and beaches.",
    status: "available",
    href: "/discover/parks",
    cta: "Browse",
    dataLabel: "Example data",
  },
  {
    slug: "play",
    title: "Play & Entertainment",
    icon: "🎠",
    blurb: "Indoor play, splash pads, and rainy-day fun.",
    status: "coming_soon",
    href: "/discover/play",
    cta: "Coming soon",
    groupingNote:
      "This card groups indoor play and other entertainment. Splash pads are listed with Parks. Play listings are not published yet — nothing here is a directory.",
  },
  {
    slug: "learning",
    title: "Learning & Culture",
    icon: "🏛️",
    blurb: "Museums, libraries, and cultural outings.",
    status: "coming_soon",
    href: "/discover/learning",
    cta: "Coming soon",
  },
  {
    slug: "events",
    title: "Events",
    icon: "🎉",
    blurb: "Festivals, weekend events, and seasonal celebrations.",
    status: "coming_soon",
    href: "/discover/events",
    cta: "Coming soon",
  },
  {
    slug: "classes",
    title: "Classes & Programs",
    icon: "🎨",
    blurb: "Sports, arts, STEM, and ongoing programs — separate from camps.",
    status: "coming_soon",
    href: "/discover/classes",
    cta: "Coming soon",
  },
  {
    slug: "camps",
    title: "Camps",
    icon: "🏕️",
    blurb: "Mississauga sessions you can check by dates, age, hours, and cost.",
    status: "available",
    href: "/camps",
    cta: "Browse camps",
  },
  {
    slug: "food",
    title: "Food & Treats",
    icon: "🍦",
    blurb: "Family-friendly restaurants and sweet stops.",
    status: "coming_soon",
    href: "/discover/food",
    cta: "Coming soon",
  },
  {
    slug: "travel",
    title: "Travel & Getaways",
    icon: "🚗",
    blurb: "Day trips and unhurried family weekends.",
    status: "coming_soon",
    href: "/discover/travel",
    cta: "Coming soon",
  },
  {
    slug: "shopping",
    title: "Shopping",
    icon: "🛍️",
    blurb: "Kid-friendly shops and markets worth knowing about.",
    status: "coming_soon",
    href: "/discover/shopping",
    cta: "Coming soon",
  },
  {
    slug: "services",
    title: "Services",
    icon: "🧭",
    blurb: "A services directory is not part of this release.",
    status: "coming_soon",
    href: "/discover/services",
    cta: "Coming soon",
    groupingNote:
      "Services (and Community) stay out of scope for now. This page is a placeholder only — not a provider directory.",
  },
] as const;

/**
 * Which public.discover_category values each UI card browses.
 *
 * Play & Entertainment groups the legacy splash_pads and indoor_play values
 * with play_entertainment. Services has no places category: it stays out of
 * scope as a separately governed directory. "other" belongs to no card, so a
 * row filed as other never appears under a category by accident.
 */
export const DB_CATEGORIES_BY_SLUG: Readonly<
  Record<string, readonly DiscoverDbCategory[]>
> = {
  parks: ["parks_nature"],
  play: ["play_entertainment", "splash_pads", "indoor_play"],
  learning: ["learning_culture"],
  events: ["events"],
  classes: ["classes"],
  camps: ["camps"],
  food: ["food_treats"],
  travel: ["getaways"],
  shopping: ["shopping"],
  services: [],
};

/** Database categories a UI card browses; empty for unknown slugs. */
export function dbCategoriesFor(slug: string): readonly DiscoverDbCategory[] {
  return DB_CATEGORIES_BY_SLUG[slug] ?? [];
}

/** The UI card a database category belongs to, or undefined for "other". */
export function discoverCategoryForDb(
  dbCategory: DiscoverDbCategory,
): DiscoverCategory | undefined {
  const slug = Object.keys(DB_CATEGORIES_BY_SLUG).find((s) =>
    DB_CATEGORIES_BY_SLUG[s].includes(dbCategory),
  );
  return slug ? getDiscoverCategory(slug) : undefined;
}

export function getDiscoverCategory(
  slug: string,
): DiscoverCategory | undefined {
  return DISCOVER_CATEGORIES.find((c) => c.slug === slug);
}

export function liveDiscoverCategories(): DiscoverCategory[] {
  return DISCOVER_CATEGORIES.filter((c) => c.status === "available");
}
