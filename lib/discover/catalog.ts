/**
 * Discover example catalog.
 *
 * This is the only read path for category pages and the saved list.
 * To load real data later, replace `listingsForCategory` with a published
 * records read that still returns DiscoverPlaceListing. Do not mix
 * unpublished candidates into this function.
 */

import { PARKS_EXAMPLES } from "@/data/discover/examples/parks";
import {
  isDiscoverCategoryId,
  type DiscoverCategoryId,
  type DiscoverPlaceListing,
} from "@/lib/listings/discoverPlace";

const EXAMPLE_LISTINGS_BY_CATEGORY: Partial<
  Record<DiscoverCategoryId, readonly DiscoverPlaceListing[]>
> = {
  parks: PARKS_EXAMPLES,
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
