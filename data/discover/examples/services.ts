/**
 * Fictional Services directory rows.
 *
 * Directory facts only. These are not clinics, not recommendations, and not
 * quality judgments. Replace this module with a governed records read later.
 */

import { buildExampleListing } from "@/lib/discover/exampleListing";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";

export const SERVICES_EXAMPLES: readonly DiscoverPlaceListing[] = [
  buildExampleListing({
    category: "services",
    id: "example-services-harbour-pediatrics",
    slug: "example-harbour-pediatrics",
    title: "Example Harbour Pediatrics",
    summary: "Example pediatric directory row. Whether new patients are accepted is unknown.",
    providerName: "Example Harbour Services",
    city: "Example Harbour",
    neighbourhood: "Example West",
    addressLine: "Example 3 Clinic Lane",
    indoorOutdoor: "indoor",
    lastVerifiedOn: null,
    providerUrl: "https://example.com/services/harbour-pediatrics",
    extension: {
      category: "services",
      placeKind: "pediatrician",
      acceptingNewPatients: "unknown",
      languages: null,
    },
  }),
  buildExampleListing({
    category: "services",
    id: "example-services-north-dental",
    slug: "example-north-dental",
    title: "Example North Dental",
    summary: "Example dental directory row. New patients are marked yes in this seed.",
    providerName: "Example North Services",
    city: "Example North",
    indoorOutdoor: "indoor",
    lastVerifiedOn: "2026-08-28",
    providerUrl: "https://example.com/services/north-dental",
    extension: {
      category: "services",
      placeKind: "dentist",
      acceptingNewPatients: "yes",
      languages: "Example languages: English",
    },
  }),
  buildExampleListing({
    category: "services",
    id: "example-services-west-tutor",
    slug: "example-west-tutor",
    title: "Example West Tutor",
    summary: "Example tutoring directory row. New students are marked no in this seed.",
    providerName: "Example West Services",
    city: "Example West",
    indoorOutdoor: "indoor",
    extension: {
      category: "services",
      placeKind: "tutor",
      acceptingNewPatients: "no",
      languages: "Example languages: English and French",
    },
  }),
  buildExampleListing({
    category: "services",
    id: "example-services-harbour-childcare",
    slug: "example-harbour-childcare",
    title: "Example Harbour Childcare",
    summary: "Example childcare directory row. Languages are unknown.",
    providerName: "Example Harbour Services",
    city: "Example Harbour",
    neighbourhood: "Example Yard",
    indoorOutdoor: "both",
    providerUrl: "https://example.com/services/harbour-childcare",
    ageMin: 1,
    ageMax: 5,
    extension: {
      category: "services",
      placeKind: "childcare",
      acceptingNewPatients: "yes",
      languages: null,
    },
  }),
];
