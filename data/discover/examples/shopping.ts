/**
 * Fictional Shopping rows. Not real stores.
 */

import { buildExampleListing } from "@/lib/discover/exampleListing";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";

export const SHOPPING_EXAMPLES: readonly DiscoverPlaceListing[] = [
  buildExampleListing({
    category: "shopping",
    id: "example-shopping-toy-shelf",
    slug: "example-toy-shelf",
    title: "Example Toy Shelf",
    summary: "Example toy store. Stroller access is yes in this seed.",
    providerName: "Example Harbour Shopping",
    city: "Example Harbour",
    neighbourhood: "Example West",
    addressLine: "Example 8 Shelf Lane",
    indoorOutdoor: "indoor",
    lastVerifiedOn: "2026-08-28",
    providerUrl: "https://example.com/shopping/toy-shelf",
    extension: {
      category: "shopping",
      placeKind: "toy_store",
      strollerFriendly: "yes",
    },
  }),
  buildExampleListing({
    category: "shopping",
    id: "example-shopping-pass-along",
    slug: "example-pass-along",
    title: "Example Pass Along",
    summary: "Example kids consignment shop. Stroller access is unknown.",
    providerName: "Example North Shopping",
    city: "Example North",
    indoorOutdoor: "indoor",
    providerUrl: "https://example.com/shopping/pass-along",
    extension: {
      category: "shopping",
      placeKind: "consignment",
      strollerFriendly: "unknown",
    },
  }),
  buildExampleListing({
    category: "shopping",
    id: "example-shopping-family-aisle",
    slug: "example-family-aisle",
    title: "Example Family Aisle",
    summary: "Example family retail stop. Stroller access is no in this seed.",
    providerName: "Example West Shopping",
    city: "Example West",
    indoorOutdoor: "indoor",
    extension: {
      category: "shopping",
      placeKind: "family_retail",
      strollerFriendly: "no",
    },
  }),
];
