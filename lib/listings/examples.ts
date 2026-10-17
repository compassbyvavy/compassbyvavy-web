/**
 * Clearly labelled example rows so the overlap matrix can show more than
 * camps. These are not directory listings and must not be treated as verified.
 */

import {
  UNKNOWN_ACCESSIBILITY,
  type CompassListing,
} from "@/lib/listings/types";

export const EXAMPLE_LISTING_NOTE =
  "Example only — not a verified listing and not from the camp research workbook.";

export const EXAMPLE_OVERLAP_LISTINGS: CompassListing[] = [
  {
    id: "example-play-indoor",
    category: "play",
    title: "Example indoor play room",
    href: "/discover/play",
    providerName: null,
    areaLabel: null,
    ageMin: 2,
    ageMax: 8,
    ageMinInclusive: true,
    ageMaxInclusive: true,
    primaryCategory: null,
    indoorOutdoor: "indoor",
    settingFeatures: ["indoor"],
    lastVerifiedOn: null,
    verification: "example",
    exampleNote: EXAMPLE_LISTING_NOTE,
    accessibility: { ...UNKNOWN_ACCESSIBILITY },
    transitAccess: null,
    priceAmount: null,
    priceUnit: null,
    currency: null,
    startDate: null,
    endDate: null,
    singleDay: null,
    packingItems: [],
  },
  {
    id: "example-park-unknown-age",
    category: "parks",
    title: "Example park visit",
    href: "/discover/parks",
    providerName: null,
    areaLabel: null,
    ageMin: null,
    ageMax: null,
    ageMinInclusive: null,
    ageMaxInclusive: null,
    primaryCategory: null,
    indoorOutdoor: "outdoor",
    settingFeatures: ["outdoor"],
    lastVerifiedOn: null,
    verification: "example",
    exampleNote: EXAMPLE_LISTING_NOTE,
    accessibility: { ...UNKNOWN_ACCESSIBILITY },
    transitAccess: null,
    priceAmount: null,
    priceUnit: null,
    currency: null,
    startDate: null,
    endDate: null,
    singleDay: null,
    packingItems: [],
  },
];
