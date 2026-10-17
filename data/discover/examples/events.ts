/**
 * Fictional Events rows. Not real festivals or community days.
 */

import { buildExampleListing } from "@/lib/discover/exampleListing";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";

export const EVENTS_EXAMPLES: readonly DiscoverPlaceListing[] = [
  buildExampleListing({
    category: "events",
    id: "example-events-harbour-festival",
    slug: "example-harbour-festival",
    title: "Example Harbour Festival",
    summary: "Example festival over two seed dates. A ticket is required.",
    providerName: "Example Harbour Events",
    city: "Example Harbour",
    neighbourhood: "Example Square",
    indoorOutdoor: "outdoor",
    lastVerifiedOn: "2026-08-28",
    startDate: "2026-07-18",
    endDate: "2026-07-19",
    singleDay: false,
    priceAmount: 10,
    priceUnit: "per person",
    currency: "CAD",
    providerUrl: "https://example.com/events/harbour-festival",
    extension: {
      category: "events",
      placeKind: "festival",
      freeToAttend: "no",
      ticketRequired: "yes",
    },
  }),
  buildExampleListing({
    category: "events",
    id: "example-events-lantern-evening",
    slug: "example-lantern-evening",
    title: "Example Lantern Evening",
    summary: "Example seasonal happening. Cost and tickets are unknown.",
    providerName: "Example North Events",
    city: "Example North",
    indoorOutdoor: "both",
    startDate: "2026-11-07",
    endDate: null,
    extension: {
      category: "events",
      placeKind: "seasonal",
      freeToAttend: "unknown",
      ticketRequired: "unknown",
    },
  }),
  buildExampleListing({
    category: "events",
    id: "example-events-community-day",
    slug: "example-community-day",
    title: "Example Community Day",
    summary: "Example free community day. No ticket in this seed.",
    providerName: "Example West Events",
    city: "Example West",
    indoorOutdoor: "outdoor",
    startDate: "2026-09-12",
    endDate: "2026-09-12",
    singleDay: true,
    costSummary: "Example seed: no fee",
    providerUrl: "https://example.com/events/community-day",
    extension: {
      category: "events",
      placeKind: "free_community_day",
      freeToAttend: "yes",
      ticketRequired: "no",
    },
  }),
];
