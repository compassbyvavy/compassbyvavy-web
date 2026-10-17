/**
 * Parent-facing labels for Discover listings.
 * Missing facts render as "Unknown". Nothing here is a live status.
 */

import { placeKindLabel } from "@/lib/discover/categoryPages";
import type {
  DiscoverExtension,
  DiscoverPlaceListing,
} from "@/lib/listings/discoverPlace";
import type {
  ListingIndoorOutdoor,
  ListingTriState,
} from "@/lib/listings/types";

export const UNKNOWN_LABEL = "Unknown";

export type FactRow = {
  label: string;
  value: string;
};

export function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNKNOWN_LABEL;
}

export function displayTri(value: ListingTriState | null | undefined): string {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return UNKNOWN_LABEL;
}

export function latestVerifiedLabel(isoDate: string | null | undefined): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return "Latest verified Unknown";
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return "Latest verified Unknown";
  const formatted = new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return `Latest verified ${formatted}`;
}

const SETTING_LABELS: Record<ListingIndoorOutdoor, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  both: "Indoor and outdoor",
  primarily_indoor: "Primarily indoor",
  primarily_outdoor: "Primarily outdoor",
  virtual: "Virtual",
  unknown: UNKNOWN_LABEL,
};

export function displaySetting(value: ListingIndoorOutdoor): string {
  return SETTING_LABELS[value] ?? UNKNOWN_LABEL;
}

export function displayAgeRange(
  listing: Pick<
    DiscoverPlaceListing,
    "ageMin" | "ageMax" | "ageMinInclusive" | "ageMaxInclusive"
  >,
): string {
  if (listing.ageMin == null && listing.ageMax == null) return UNKNOWN_LABEL;
  const min =
    listing.ageMin == null
      ? UNKNOWN_LABEL
      : `${listing.ageMin}${listing.ageMinInclusive === false ? " (exclusive)" : listing.ageMinInclusive == null ? " (inclusivity Unknown)" : ""}`;
  const max =
    listing.ageMax == null
      ? UNKNOWN_LABEL
      : `${listing.ageMax}${listing.ageMaxInclusive === false ? " (exclusive)" : listing.ageMaxInclusive == null ? " (inclusivity Unknown)" : ""}`;
  return `${min}–${max} years`;
}

export function displayDateSpan(
  listing: Pick<DiscoverPlaceListing, "startDate" | "endDate">,
): string {
  const start = listing.startDate?.trim() || null;
  const end = listing.endDate?.trim() || null;
  if (!start && !end) return UNKNOWN_LABEL;
  if (start && end) return start === end ? start : `${start} – ${end}`;
  if (start) return `${start} – ${UNKNOWN_LABEL}`;
  return `${UNKNOWN_LABEL} – ${end}`;
}

export function displayCost(listing: DiscoverPlaceListing): string {
  if (
    listing.priceAmount != null &&
    listing.currency?.trim() &&
    listing.priceUnit?.trim()
  ) {
    return `${listing.currency.trim()} ${listing.priceAmount} (${listing.priceUnit.trim()})`;
  }
  if (listing.costSummary?.trim()) return listing.costSummary.trim();
  if (listing.priceAmount != null) {
    return `${listing.priceAmount} · currency ${displayText(listing.currency)} · unit ${displayText(listing.priceUnit)}`;
  }
  return UNKNOWN_LABEL;
}

export function displayProviderHref(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function numberOrUnknown(value: number | null, suffix: string): string {
  if (value == null || !Number.isFinite(value)) return UNKNOWN_LABEL;
  return `${value} ${suffix}`;
}

export function extensionFactRows(extension: DiscoverExtension): FactRow[] {
  switch (extension.category) {
    case "parks":
      return [
        { label: "Kind", value: placeKindLabel("parks", extension.placeKind) },
        { label: "Washrooms", value: displayTri(extension.washrooms) },
        { label: "Shade", value: displayTri(extension.shade) },
        { label: "Stroller friendly", value: displayTri(extension.strollerFriendly) },
        { label: "Parking", value: displayTri(extension.parking) },
      ];
    case "play":
      return [
        { label: "Kind", value: placeKindLabel("play", extension.placeKind) },
        { label: "Waiver required", value: displayTri(extension.waiverRequired) },
        { label: "Socks required", value: displayTri(extension.socksRequired) },
        {
          label: "Height minimum",
          value: numberOrUnknown(extension.heightMinimumCm, "cm"),
        },
      ];
    case "learning":
      return [
        { label: "Kind", value: placeKindLabel("learning", extension.placeKind) },
        { label: "Free admission", value: displayTri(extension.freeAdmission) },
        {
          label: "Library card required",
          value: displayTri(extension.libraryCardRequired),
        },
      ];
    case "events":
      return [
        { label: "Kind", value: placeKindLabel("events", extension.placeKind) },
        { label: "Free to attend", value: displayTri(extension.freeToAttend) },
        { label: "Ticket required", value: displayTri(extension.ticketRequired) },
      ];
    case "classes":
      return [
        { label: "Kind", value: placeKindLabel("classes", extension.placeKind) },
        { label: "Drop-in", value: displayTri(extension.dropIn) },
        {
          label: "Registration required",
          value: displayTri(extension.registrationRequired),
        },
      ];
    case "food":
      return [
        { label: "Kind", value: placeKindLabel("food", extension.placeKind) },
        { label: "Kids menu", value: displayTri(extension.kidsMenu) },
        { label: "High chairs", value: displayTri(extension.highChairs) },
      ];
    case "travel":
      return [
        { label: "Kind", value: placeKindLabel("travel", extension.placeKind) },
        {
          label: "Drive time",
          value: numberOrUnknown(extension.driveMinutes, "minutes"),
        },
        { label: "Overnight", value: displayTri(extension.overnight) },
      ];
    case "shopping":
      return [
        { label: "Kind", value: placeKindLabel("shopping", extension.placeKind) },
        {
          label: "Stroller friendly",
          value: displayTri(extension.strollerFriendly),
        },
      ];
    case "services":
      return [
        { label: "Kind", value: placeKindLabel("services", extension.placeKind) },
        {
          label: "Accepting new patients",
          value: displayTri(extension.acceptingNewPatients),
        },
        { label: "Languages", value: displayText(extension.languages) },
      ];
    default: {
      const _never: never = extension;
      return _never;
    }
  }
}

export function listingFactRows(listing: DiscoverPlaceListing): FactRow[] {
  return [
    { label: "Provider", value: displayText(listing.providerName) },
    { label: "City", value: displayText(listing.city) },
    { label: "Neighbourhood", value: displayText(listing.neighbourhood) },
    { label: "Address", value: displayText(listing.addressLine) },
    { label: "Hours", value: displayText(listing.hoursSummary) },
    { label: "Cost", value: displayCost(listing) },
    { label: "Ages", value: displayAgeRange(listing) },
    { label: "Setting", value: displaySetting(listing.indoorOutdoor) },
    { label: "Dates", value: displayDateSpan(listing) },
    { label: "Sensory room", value: displayTri(listing.accessibility.sensoryRoom) },
    {
      label: "Elevator access",
      value: displayTri(listing.accessibility.elevatorAccess),
    },
    {
      label: "Low-step access",
      value: displayTri(listing.accessibility.lowStepAccess),
    },
    { label: "Transit", value: displayText(listing.transitAccess) },
    ...extensionFactRows(listing.extension),
  ];
}
