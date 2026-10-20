/**
 * Fictional Play & Entertainment rows. Not real businesses.
 * Replace this module with a published-records read later.
 */

import { buildExampleListing } from "@/lib/discover/exampleListing";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";

export const PLAY_EXAMPLES: readonly DiscoverPlaceListing[] = [
  buildExampleListing({
    category: "play",
    id: "example-play-indoor-room",
    slug: "example-indoor-room",
    title: "Example Indoor Play Room",
    summary: "Example indoor play seed with waiver and socks marked yes.",
    providerName: "Example Harbour Play",
    city: "Example Harbour",
    neighbourhood: "Example West",
    addressLine: "Example 12 Play Street",
    hoursSummary: "Example hours: daytime blocks",
    providerUrl: "https://example.com/play/indoor-room",
    indoorOutdoor: "indoor",
    lastVerifiedOn: "2026-08-28",
    ageMin: 1,
    ageMax: 8,
    priceAmount: 18,
    priceUnit: "per child",
    currency: "CAD",
    accessibility: { sensoryRoom: "yes", elevatorAccess: "unknown", lowStepAccess: "no" },
    extension: {
      category: "play",
      placeKind: "indoor_play",
      waiverRequired: "yes",
      socksRequired: "yes",
      heightMinimumCm: 90,
    },
  }),
  buildExampleListing({
    category: "play",
    id: "example-play-bounce-hall",
    slug: "example-bounce-hall",
    title: "Example Bounce Hall",
    summary: "Example trampoline park. Sock rule is unknown in this seed.",
    providerName: "Example North Play",
    city: "Example North",
    neighbourhood: "Example Court",
    indoorOutdoor: "indoor",
    providerUrl: "https://example.com/play/bounce-hall",
    extension: {
      category: "play",
      placeKind: "trampoline",
      waiverRequired: "yes",
      socksRequired: "unknown",
      heightMinimumCm: null,
    },
  }),
  buildExampleListing({
    category: "play",
    id: "example-play-token-arcade",
    slug: "example-token-arcade",
    title: "Example Token Arcade",
    summary: "Example arcade. Waiver and socks are marked no in this seed.",
    providerName: "Example West Play",
    city: "Example West",
    indoorOutdoor: "indoor",
    costSummary: "Example seed: price not a single amount",
    extension: {
      category: "play",
      placeKind: "arcade",
      waiverRequired: "no",
      socksRequired: "no",
      heightMinimumCm: null,
    },
  }),
  buildExampleListing({
    category: "play",
    id: "example-play-rainy-loft",
    slug: "example-rainy-loft",
    title: "Example Rainy Loft",
    summary: "Example rainy-day fallback that is primarily indoor.",
    providerName: "Example Harbour Play",
    city: "Example Harbour",
    neighbourhood: "Example Loft",
    indoorOutdoor: "primarily_indoor",
    extension: {
      category: "play",
      placeKind: "rainy_day",
      waiverRequired: "unknown",
      socksRequired: "unknown",
      heightMinimumCm: null,
    },
  }),
];
