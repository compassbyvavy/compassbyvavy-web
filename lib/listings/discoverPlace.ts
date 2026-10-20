/**
 * Category extensions on the shared Compass listing contract.
 *
 * Camps stay on the camp workbook (program / session / venue). Every other
 * Discover category is a place-or-program row that still parses as a
 * CompassListing, plus the fields that category actually needs.
 * Null and "unknown" mean the fact is not on file. Do not guess.
 */

import type {
  CompassListing,
  ListingCategory,
  ListingTriState,
} from "@/lib/listings/types";

export type DiscoverCategoryId = Exclude<ListingCategory, "camps">;

export type ParksExtension = {
  category: "parks";
  placeKind: "playground" | "splash_pad" | "trail" | "conservation" | "beach";
  washrooms: ListingTriState;
  shade: ListingTriState;
  strollerFriendly: ListingTriState;
  parking: ListingTriState;
};

export type PlayExtension = {
  category: "play";
  placeKind: "indoor_play" | "trampoline" | "arcade" | "rainy_day";
  waiverRequired: ListingTriState;
  socksRequired: ListingTriState;
  heightMinimumCm: number | null;
};

export type LearningExtension = {
  category: "learning";
  placeKind: "museum" | "library" | "gallery" | "science_centre" | "heritage";
  freeAdmission: ListingTriState;
  libraryCardRequired: ListingTriState;
};

export type EventsExtension = {
  category: "events";
  placeKind: "festival" | "seasonal" | "free_community_day";
  freeToAttend: ListingTriState;
  ticketRequired: ListingTriState;
};

export type ClassesExtension = {
  category: "classes";
  placeKind: "swim" | "dance" | "music" | "art" | "sports" | "tutoring";
  dropIn: ListingTriState;
  registrationRequired: ListingTriState;
};

export type FoodExtension = {
  category: "food";
  placeKind: "restaurant" | "ice_cream" | "kid_approved";
  kidsMenu: ListingTriState;
  highChairs: ListingTriState;
};

export type TravelExtension = {
  category: "travel";
  placeKind: "day_trip" | "worth_the_drive" | "weekend_escape";
  driveMinutes: number | null;
  overnight: ListingTriState;
};

export type ShoppingExtension = {
  category: "shopping";
  placeKind: "toy_store" | "consignment" | "family_retail";
  strollerFriendly: ListingTriState;
};

/**
 * Directory facts only. No quality score, ranking, or clinical recommendation
 * belongs on this extension.
 */
export type ServicesExtension = {
  category: "services";
  placeKind: "pediatrician" | "dentist" | "tutor" | "childcare";
  acceptingNewPatients: ListingTriState;
  languages: string | null;
};

export type DiscoverExtension =
  | ParksExtension
  | PlayExtension
  | LearningExtension
  | EventsExtension
  | ClassesExtension
  | FoodExtension
  | TravelExtension
  | ShoppingExtension
  | ServicesExtension;

export type DiscoverPlaceListing = CompassListing & {
  category: DiscoverCategoryId;
  slug: string;
  /** One sentence a parent can scan. Null renders as Unknown. */
  summary: string | null;
  city: string | null;
  neighbourhood: string | null;
  addressLine: string | null;
  hoursSummary: string | null;
  /**
   * Parent-facing cost note when a single price amount is not the right shape.
   * Null is Unknown, not free.
   */
  costSummary: string | null;
  /** https link for the next step. Compass never processes the transaction. */
  providerUrl: string | null;
  extension: DiscoverExtension;
};

export function isDiscoverCategoryId(
  slug: string,
): slug is DiscoverCategoryId {
  return (
    slug === "parks" ||
    slug === "play" ||
    slug === "learning" ||
    slug === "events" ||
    slug === "classes" ||
    slug === "food" ||
    slug === "travel" ||
    slug === "shopping" ||
    slug === "services"
  );
}
