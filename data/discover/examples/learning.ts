/**
 * Fictional Learning & Culture rows. Not real institutions.
 */

import { buildExampleListing } from "@/lib/discover/exampleListing";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";

export const LEARNING_EXAMPLES: readonly DiscoverPlaceListing[] = [
  buildExampleListing({
    category: "learning",
    id: "example-learning-small-museum",
    slug: "example-small-museum",
    title: "Example Small Museum",
    summary: "Example museum. Admission is not free in this seed.",
    providerName: "Example Harbour Learning",
    city: "Example Harbour",
    neighbourhood: "Example Square",
    indoorOutdoor: "indoor",
    lastVerifiedOn: "2026-08-20",
    providerUrl: "https://example.com/learning/small-museum",
    priceAmount: 12,
    priceUnit: "per person",
    currency: "CAD",
    extension: {
      category: "learning",
      placeKind: "museum",
      freeAdmission: "no",
      libraryCardRequired: "no",
    },
  }),
  buildExampleListing({
    category: "learning",
    id: "example-learning-branch-library",
    slug: "example-branch-library",
    title: "Example Branch Library",
    summary: "Example library. A card is required in this seed; admission is free.",
    providerName: "Example North Learning",
    city: "Example North",
    indoorOutdoor: "indoor",
    costSummary: "Example seed: no admission fee",
    providerUrl: "https://example.com/learning/branch-library",
    extension: {
      category: "learning",
      placeKind: "library",
      freeAdmission: "yes",
      libraryCardRequired: "yes",
    },
  }),
  buildExampleListing({
    category: "learning",
    id: "example-learning-quiet-gallery",
    slug: "example-quiet-gallery",
    title: "Example Quiet Gallery",
    summary: "Example gallery. Whether admission is free is unknown.",
    providerName: "Example West Learning",
    city: "Example West",
    indoorOutdoor: "indoor",
    extension: {
      category: "learning",
      placeKind: "gallery",
      freeAdmission: "unknown",
      libraryCardRequired: "no",
    },
  }),
  buildExampleListing({
    category: "learning",
    id: "example-learning-science-hall",
    slug: "example-science-hall",
    title: "Example Science Hall",
    summary: "Example science centre with indoor exhibits and an outdoor yard in the seed.",
    providerName: "Example Harbour Learning",
    city: "Example Harbour",
    neighbourhood: "Example Yard",
    indoorOutdoor: "both",
    providerUrl: "https://example.com/learning/science-hall",
    extension: {
      category: "learning",
      placeKind: "science_centre",
      freeAdmission: "no",
      libraryCardRequired: "unknown",
    },
  }),
  buildExampleListing({
    category: "learning",
    id: "example-learning-heritage-house",
    slug: "example-heritage-house",
    title: "Example Heritage House",
    summary: "Example heritage site. Admission is free in this seed.",
    providerName: null,
    city: "Example West",
    indoorOutdoor: "primarily_outdoor",
    extension: {
      category: "learning",
      placeKind: "heritage",
      freeAdmission: "yes",
      libraryCardRequired: "no",
    },
  }),
];
