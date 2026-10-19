/**
 * Shared listing contract for every Compass category.
 *
 * Shaped by the Camp Research Master workbook: Provider, Program, Session,
 * and Venue stay separate, and Lookup Guide values (primary category,
 * indoor/outdoor, accessibility & support) are the allowed vocabularies.
 * A row is verified only when the source says so. Example rows are never
 * verified. Nothing on a listing is a live badge — only lastVerifiedOn.
 */

export type ListingTriState = "yes" | "no" | "unknown";

/** Workbook research/publish states, collapsed for the public contract. */
export type ListingVerification =
  | "provider_confirmed"
  | "source_checked"
  | "unverified"
  | "example";

export type ListingCategory =
  | "camps"
  | "parks"
  | "play"
  | "learning"
  | "events"
  | "classes"
  | "food"
  | "travel"
  | "shopping"
  | "services";

/** Lookup Guide column "Indoor / Outdoor". */
export type ListingIndoorOutdoor =
  | "indoor"
  | "outdoor"
  | "both"
  | "primarily_indoor"
  | "primarily_outdoor"
  | "virtual"
  | "unknown";

/** Rainy-day pivot tags. Derived only from a known indoor/outdoor value. */
export type ListingSettingFeature = "outdoor" | "indoor" | "indoor-fallback";

export type ListingPackingItem = {
  text: string;
  kind: "required" | "suggested";
};

export type CompassListing = {
  id: string;
  category: ListingCategory;
  title: string;
  href: string;
  providerName: string | null;
  /** City or neighbourhood. Null means not verified, not "no place". */
  areaLabel: string | null;
  /**
   * Exact age bounds for this row (session bounds for camps).
   * Program "typical age" must never be copied into these fields.
   */
  ageMin: number | null;
  ageMax: number | null;
  ageMinInclusive: boolean | null;
  ageMaxInclusive: boolean | null;
  /** Lookup Guide primary category, when the source states one. */
  primaryCategory: string | null;
  indoorOutdoor: ListingIndoorOutdoor;
  settingFeatures: ListingSettingFeature[];
  /** ISO YYYY-MM-DD the operational facts were last editorially checked. */
  lastVerifiedOn: string | null;
  verification: ListingVerification;
  /** Required when verification is "example". */
  exampleNote: string | null;
  accessibility: {
    sensoryRoom: ListingTriState;
    elevatorAccess: ListingTriState;
    lowStepAccess: ListingTriState;
    /** Workbook "Accessibility & Support" tags already on the record. */
    supportTags: string[];
  };
  /** Venue transit note. Null means not verified. */
  transitAccess: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
  currency: string | null;
  startDate: string | null;
  endDate: string | null;
  singleDay: boolean | null;
  packingItems: ListingPackingItem[];
};

export const UNKNOWN_ACCESSIBILITY: CompassListing["accessibility"] = {
  sensoryRoom: "unknown",
  elevatorAccess: "unknown",
  lowStepAccess: "unknown",
  supportTags: [],
};

export function settingFeaturesForIndoorOutdoor(
  value: ListingIndoorOutdoor | null | undefined,
): ListingSettingFeature[] {
  switch (value) {
    case "indoor":
    case "virtual":
      return ["indoor"];
    case "primarily_indoor":
      return ["indoor", "indoor-fallback"];
    case "both":
      return ["indoor", "outdoor", "indoor-fallback"];
    case "outdoor":
    case "primarily_outdoor":
      return ["outdoor"];
    default:
      return [];
  }
}

/** Lookup Guide primary categories — vocabulary only, not a directory. */
export const LISTING_PRIMARY_CATEGORIES = [
  "Early Years & Toddler",
  "Traditional & Multi-Activity",
  "Sports & Fitness",
  "Skating & Winter Sports",
  "Aquatics & Water Sports",
  "Dance & Movement",
  "Visual Arts & Design",
  "Performing Arts",
  "Music",
  "STEM & Technology",
  "Academic & Learning",
  "Language & Culture",
  "Nature & Animals",
  "Outdoor Adventure",
  "Culinary",
  "Leadership & Life Skills",
  "Faith & Community",
  "Travel & Expedition",
] as const;
