/**
 * Fictional Food & Treats rows. Not real restaurants.
 */

import { buildExampleListing } from "@/lib/discover/exampleListing";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";

export const FOOD_EXAMPLES: readonly DiscoverPlaceListing[] = [
  buildExampleListing({
    category: "food",
    id: "example-food-corner-table",
    slug: "example-corner-table",
    title: "Example Corner Table",
    summary: "Example family restaurant. Kids menu and high chairs are yes in this seed.",
    providerName: "Example Harbour Food",
    city: "Example Harbour",
    neighbourhood: "Example West",
    addressLine: "Example 4 Table Road",
    indoorOutdoor: "indoor",
    lastVerifiedOn: "2026-08-28",
    providerUrl: "https://example.com/food/corner-table",
    costSummary: "Example seed: bill size not listed",
    extension: {
      category: "food",
      placeKind: "restaurant",
      kidsMenu: "yes",
      highChairs: "yes",
    },
  }),
  buildExampleListing({
    category: "food",
    id: "example-food-scoop-window",
    slug: "example-scoop-window",
    title: "Example Scoop Window",
    summary: "Example ice cream stop. High chairs are no; a kids menu is unknown.",
    providerName: "Example North Food",
    city: "Example North",
    indoorOutdoor: "both",
    providerUrl: "https://example.com/food/scoop-window",
    extension: {
      category: "food",
      placeKind: "ice_cream",
      kidsMenu: "unknown",
      highChairs: "no",
    },
  }),
  buildExampleListing({
    category: "food",
    id: "example-food-kid-counter",
    slug: "example-kid-counter",
    title: "Example Kid Counter",
    summary: "Example kid-approved spot. No kids menu in this seed; high chairs are unknown.",
    providerName: null,
    city: "Example West",
    indoorOutdoor: "indoor",
    extension: {
      category: "food",
      placeKind: "kid_approved",
      kidsMenu: "no",
      highChairs: "unknown",
    },
  }),
];
