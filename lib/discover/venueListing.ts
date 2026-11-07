/**
 * Turns a published venue record into a Discover listing card.
 *
 * Same rules as the venue page: only facts on the record are shown, unknown
 * stays unknown, and a price is only quoted when the venue publishes one.
 * The card links to the venue's own page, which carries every source.
 */

import type { VenuePrice, VenueRecord } from "@/data/discover/venueTypes";
import type { DiscoverCategoryId, DiscoverPlaceListing, PlayExtension } from "@/lib/listings/discoverPlace";
import {
  UNKNOWN_ACCESSIBILITY,
  settingFeaturesForIndoorOutdoor,
  type ListingIndoorOutdoor,
} from "@/lib/listings/types";

function playKind(placeType: string | null | undefined): PlayExtension["placeKind"] {
  const t = (placeType ?? "").toLowerCase();
  if (t.includes("trampoline")) return "trampoline";
  if (t.includes("arcade") || t.includes("entertainment centre")) return "arcade";
  if (t.includes("indoor play") || t.includes("playground") || t.includes("play centre")) return "indoor_play";
  return "rainy_day";
}

function indoorOutdoor(setting: string | null | undefined): ListingIndoorOutdoor {
  return setting === "indoor" || setting === "outdoor" || setting === "both" ? setting : "unknown";
}

function money(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/**
 * "From $24.95 a child": the lowest regular child admission the venue
 * publishes. Promotions, sibling rates and add-ons don't count. Null when
 * no child admission price is published.
 */
export function childPriceFrom(prices: readonly VenuePrice[]): string | null {
  const regular = prices.filter(
    (p) => p.kind === "admission" && p.audience === "child" && !p.siblingOnly,
  );
  const paid = regular
    .map((p) => p.amount)
    .filter((a): a is number => typeof a === "number" && a > 0);
  if (paid.length > 0) {
    const tax = regular.some((p) => p.plusTax === true) ? " + tax" : "";
    return `From ${money(Math.min(...paid))} a child${tax}`;
  }
  if (regular.length > 0 && regular.every((p) => p.isFree)) return "Free";
  return null;
}

/** Play & Entertainment is the only category with venue records so far. */
export function venueToDiscoverListing(
  record: VenueRecord,
  categorySlug: Extract<DiscoverCategoryId, "play">,
): DiscoverPlaceListing {
  const p = record.place;
  const primaryType = record.types.find((t) => t.isPrimary)?.placeType ?? p.placeType ?? null;
  const city = record.cityName ?? null;
  const area = p.neighbourhood && city ? `${p.neighbourhood}, ${city}` : (p.neighbourhood ?? city);
  const io = indoorOutdoor(p.setting);
  const title = p.branchName ? `${p.name}, ${p.branchName}` : p.name;
  const socks = record.amenities.find((a) => a.amenity === "grip_socks")?.status;

  return {
    id: p.id,
    category: categorySlug,
    slug: p.slug,
    title,
    href: `/discover/${categorySlug}/${p.slug}`,
    providerName: null,
    areaLabel: area,
    ageMin: p.ageMin ?? null,
    ageMax: p.ageMax ?? null,
    ageMinInclusive: p.ageMinInclusive ?? null,
    ageMaxInclusive: p.ageMaxInclusive ?? null,
    primaryCategory: primaryType,
    indoorOutdoor: io,
    settingFeatures: settingFeaturesForIndoorOutdoor(io),
    lastVerifiedOn: p.sourceCheckedDate ?? null,
    verification: "source_checked",
    exampleNote: null,
    accessibility: UNKNOWN_ACCESSIBILITY,
    transitAccess: null,
    priceAmount: null,
    priceUnit: null,
    currency: null,
    startDate: null,
    endDate: null,
    singleDay: null,
    packingItems: [],
    summary: p.description ?? null,
    city,
    neighbourhood: p.neighbourhood ?? null,
    addressLine: p.addressLine ?? null,
    hoursSummary: null,
    costSummary: childPriceFrom(record.prices),
    providerUrl: p.websiteUrl ?? null,
    extension: {
      category: "play",
      placeKind: playKind(primaryType),
      waiverRequired: "unknown",
      socksRequired: socks === "yes" ? "yes" : "unknown",
      heightMinimumCm: null,
    },
  };
}
