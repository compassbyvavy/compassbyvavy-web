/**
 * Build a clearly fictional Discover row on the shared listing contract.
 * Replace call sites with a published-records loader when real data exists.
 */

import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";
import {
  UNKNOWN_ACCESSIBILITY,
  settingFeaturesForIndoorOutdoor,
  type CompassListing,
  type ListingIndoorOutdoor,
} from "@/lib/listings/types";

export const EXAMPLE_LISTING_NOTE =
  "Example only — fictional seed so this page can render. Not a verified listing and not a real business.";

export type ExampleListingInput = {
  category: DiscoverPlaceListing["category"];
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  providerName?: string | null;
  city?: string | null;
  neighbourhood?: string | null;
  areaLabel?: string | null;
  addressLine?: string | null;
  hoursSummary?: string | null;
  costSummary?: string | null;
  providerUrl?: string | null;
  indoorOutdoor?: ListingIndoorOutdoor;
  lastVerifiedOn?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  ageMinInclusive?: boolean | null;
  ageMaxInclusive?: boolean | null;
  primaryCategory?: string | null;
  accessibility?: Partial<CompassListing["accessibility"]>;
  transitAccess?: string | null;
  priceAmount?: number | null;
  priceUnit?: string | null;
  currency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  singleDay?: boolean | null;
  extension: DiscoverPlaceListing["extension"];
};

function assertExampleLabel(label: string, value: string | null | undefined) {
  if (value == null || value.trim() === "") return;
  if (!value.trim().startsWith("Example")) {
    throw new Error(`${label} must start with "Example" or be empty: ${value}`);
  }
}

function assertExampleUrl(url: string | null | undefined) {
  if (url == null || url === "") return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Provider URL must be https://example.com/... : ${url}`);
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "example.com") {
    throw new Error(`Provider URL must be https://example.com/... : ${url}`);
  }
}

export function buildExampleListing(
  input: ExampleListingInput,
): DiscoverPlaceListing {
  if (input.extension.category !== input.category) {
    throw new Error(
      `Extension category ${input.extension.category} does not match ${input.category}`,
    );
  }
  if (!input.title.startsWith("Example ")) {
    throw new Error(`Example title must start with "Example ": ${input.title}`);
  }
  if (!input.id.startsWith(`example-${input.category}-`)) {
    throw new Error(`Example id must start with example-${input.category}-`);
  }
  assertExampleLabel("providerName", input.providerName);
  assertExampleLabel("city", input.city);
  assertExampleLabel("neighbourhood", input.neighbourhood);
  assertExampleLabel("areaLabel", input.areaLabel);
  assertExampleLabel("addressLine", input.addressLine);
  assertExampleLabel("summary", input.summary);
  assertExampleLabel("hoursSummary", input.hoursSummary);
  assertExampleLabel("costSummary", input.costSummary);
  assertExampleLabel("transitAccess", input.transitAccess);
  assertExampleUrl(input.providerUrl);
  if (
    input.lastVerifiedOn != null &&
    !/^\d{4}-\d{2}-\d{2}$/.test(input.lastVerifiedOn)
  ) {
    throw new Error(`lastVerifiedOn must be YYYY-MM-DD or null`);
  }

  const indoorOutdoor = input.indoorOutdoor ?? "unknown";
  const city = input.city ?? null;
  const neighbourhood = input.neighbourhood ?? null;
  const areaLabel =
    input.areaLabel ??
    (neighbourhood && city
      ? `${neighbourhood}, ${city}`
      : neighbourhood || city || null);

  return {
    id: input.id,
    category: input.category,
    slug: input.slug,
    title: input.title,
    href: `/discover/${input.category}/${input.slug}`,
    providerName: input.providerName ?? null,
    areaLabel,
    summary: input.summary ?? null,
    city,
    neighbourhood,
    addressLine: input.addressLine ?? null,
    hoursSummary: input.hoursSummary ?? null,
    costSummary: input.costSummary ?? null,
    providerUrl: input.providerUrl ?? null,
    ageMin: input.ageMin ?? null,
    ageMax: input.ageMax ?? null,
    ageMinInclusive:
      input.ageMin == null ? null : input.ageMinInclusive ?? true,
    ageMaxInclusive:
      input.ageMax == null ? null : input.ageMaxInclusive ?? true,
    primaryCategory: input.primaryCategory ?? null,
    indoorOutdoor,
    settingFeatures: settingFeaturesForIndoorOutdoor(indoorOutdoor),
    lastVerifiedOn: input.lastVerifiedOn ?? null,
    verification: "example",
    exampleNote: EXAMPLE_LISTING_NOTE,
    accessibility: {
      ...UNKNOWN_ACCESSIBILITY,
      ...input.accessibility,
      supportTags: [...(input.accessibility?.supportTags ?? [])],
    },
    transitAccess: input.transitAccess ?? null,
    priceAmount: input.priceAmount ?? null,
    priceUnit: input.priceUnit ?? null,
    currency: input.currency ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    singleDay: input.singleDay ?? null,
    packingItems: [],
    extension: input.extension,
  };
}
