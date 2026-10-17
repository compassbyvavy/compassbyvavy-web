/**
 * Fictional Travel & Getaways rows. Not real destinations.
 */

import { buildExampleListing } from "@/lib/discover/exampleListing";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";

export const TRAVEL_EXAMPLES: readonly DiscoverPlaceListing[] = [
  buildExampleListing({
    category: "travel",
    id: "example-travel-river-day",
    slug: "example-river-day",
    title: "Example River Day",
    summary: "Example day trip. Drive time is a seed number, not a measured route.",
    providerName: "Example Harbour Travel",
    city: "Example Harbour",
    neighbourhood: "Example Bend",
    indoorOutdoor: "outdoor",
    lastVerifiedOn: "2026-08-01",
    providerUrl: "https://example.com/travel/river-day",
    extension: {
      category: "travel",
      placeKind: "day_trip",
      driveMinutes: 45,
      overnight: "no",
    },
  }),
  buildExampleListing({
    category: "travel",
    id: "example-travel-far-lookout",
    slug: "example-far-lookout",
    title: "Example Far Lookout",
    summary: "Example worth-the-drive stop. Drive time is unknown.",
    providerName: "Example North Travel",
    city: "Example North",
    indoorOutdoor: "primarily_outdoor",
    extension: {
      category: "travel",
      placeKind: "worth_the_drive",
      driveMinutes: null,
      overnight: "no",
    },
  }),
  buildExampleListing({
    category: "travel",
    id: "example-travel-weekend-cabin",
    slug: "example-weekend-cabin",
    title: "Example Weekend Cabin",
    summary: "Example weekend escape. Overnight is yes in this seed.",
    providerName: "Example West Travel",
    city: "Example West",
    indoorOutdoor: "both",
    providerUrl: "https://example.com/travel/weekend-cabin",
    priceAmount: 240,
    priceUnit: "per night",
    currency: "CAD",
    extension: {
      category: "travel",
      placeKind: "weekend_escape",
      driveMinutes: 120,
      overnight: "yes",
    },
  }),
];
