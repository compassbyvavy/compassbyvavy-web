/**
 * Discover information architecture — public browse categories.
 *
 * Camps is the only live directory in this increment. Every other category is
 * an honest coming-soon placeholder. Do not attach fake listings.
 */

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
};

export const DISCOVER_CATEGORIES: readonly DiscoverCategory[] = [
  {
    slug: "parks",
    title: "Parks & Nature",
    icon: "🌳",
    blurb: "Playgrounds, trails, beaches, and outdoor time.",
    status: "coming_soon",
    href: "/discover/parks",
    cta: "Coming soon",
  },
  {
    slug: "play",
    title: "Play & Entertainment",
    icon: "🎠",
    blurb: "Verified indoor play, active attractions, arcades and family entertainment.",
    status: "available",
    href: "/play",
    cta: "Browse play venues",
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

export function getDiscoverCategory(
  slug: string,
): DiscoverCategory | undefined {
  return DISCOVER_CATEGORIES.find((c) => c.slug === slug);
}

export function liveDiscoverCategories(): DiscoverCategory[] {
  return DISCOVER_CATEGORIES.filter((c) => c.status === "available");
}
