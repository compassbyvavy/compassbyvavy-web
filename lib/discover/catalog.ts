/**
 * Discover example catalog.
 *
 * Rows exist so preview can render. Public Discover pages stay coming_soon
 * and never read this file unless the Camps/Play-style dual gate is on
 * (local non-production, or COMPASS_DISCOVER_REVIEW_PREVIEW=true AND a
 * Cloudflare preview host). Services has no example set.
 */

import { CLASSES_EXAMPLES } from "@/data/discover/examples/classes";
import { EVENTS_EXAMPLES } from "@/data/discover/examples/events";
import { FOOD_EXAMPLES } from "@/data/discover/examples/food";
import { LEARNING_EXAMPLES } from "@/data/discover/examples/learning";
import { PARKS_EXAMPLES } from "@/data/discover/examples/parks";
import { PLAY_EXAMPLES } from "@/data/discover/examples/play";
import { SHOPPING_EXAMPLES } from "@/data/discover/examples/shopping";
import { TRAVEL_EXAMPLES } from "@/data/discover/examples/travel";
import {
  DISCOVER_REVIEW_PREVIEW_FLAG,
  isDiscoverReviewPreviewEnabled,
} from "@/lib/discover/reviewPreviewGate";
import {
  isDiscoverCategoryId,
  type DiscoverCategoryId,
  type DiscoverPlaceListing,
} from "@/lib/listings/discoverPlace";

const EXAMPLE_LISTINGS_BY_CATEGORY: Partial<
  Record<DiscoverCategoryId, readonly DiscoverPlaceListing[]>
> = {
  parks: PARKS_EXAMPLES,
  play: PLAY_EXAMPLES,
  learning: LEARNING_EXAMPLES,
  events: EVENTS_EXAMPLES,
  classes: CLASSES_EXAMPLES,
  food: FOOD_EXAMPLES,
  travel: TRAVEL_EXAMPLES,
  shopping: SHOPPING_EXAMPLES,
};

export type DiscoverExampleCatalog = {
  listings: DiscoverPlaceListing[];
};

export type DiscoverExampleLoadOptions = {
  allowReviewPreview?: boolean;
  hostname?: string | null;
  nodeEnv?: string;
  reviewFlag?: string | null;
};

export function registeredDiscoverCategories(): DiscoverCategoryId[] {
  return Object.keys(EXAMPLE_LISTINGS_BY_CATEGORY).filter(isDiscoverCategoryId);
}

export function listingsForCategory(
  slug: string,
): readonly DiscoverPlaceListing[] | null {
  if (!isDiscoverCategoryId(slug)) return null;
  const rows = EXAMPLE_LISTINGS_BY_CATEGORY[slug];
  if (!rows) return null;
  return rows;
}

export function allExampleListings(): DiscoverPlaceListing[] {
  return registeredDiscoverCategories().flatMap(
    (slug) => EXAMPLE_LISTINGS_BY_CATEGORY[slug] ?? [],
  );
}

export function getExampleListing(
  category: string,
  slug: string,
): DiscoverPlaceListing | null {
  const rows = listingsForCategory(category);
  if (!rows) return null;
  return rows.find((listing) => listing.slug === slug) ?? null;
}

function isProductionNodeEnv(nodeEnv?: string): boolean {
  return (nodeEnv ?? process.env.NODE_ENV) === "production";
}

/**
 * Soft gate: null in production unless the Cloudflare review-preview dual
 * gate is on. Local non-production returns the example catalog.
 */
export function loadDiscoverExampleCatalog(
  options: DiscoverExampleLoadOptions = {},
): DiscoverExampleCatalog | null {
  const reviewPreview =
    options.allowReviewPreview ??
    isDiscoverReviewPreviewEnabled({
      reviewFlag:
        options.reviewFlag !== undefined
          ? options.reviewFlag
          : process.env[DISCOVER_REVIEW_PREVIEW_FLAG],
      hostname: options.hostname,
    });
  if (isProductionNodeEnv(options.nodeEnv) && !reviewPreview) return null;
  return { listings: allExampleListings() };
}

export function listingsForCategoryFromCatalog(
  catalog: DiscoverExampleCatalog | null,
  slug: string,
): readonly DiscoverPlaceListing[] | null {
  if (!catalog) return null;
  const rows = listingsForCategory(slug);
  if (!rows) return null;
  return rows;
}
