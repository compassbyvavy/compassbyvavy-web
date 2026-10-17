/**
 * Discover place types — Plan-ready facts.
 *
 * Mirrors public.places and public.place_hours as of migration
 * 20261017020000_discover_places_plan_fields.sql. Field names are camelCase
 * versions of the columns.
 *
 * Hard rules baked into the model (same discipline as data/camps/types.ts):
 * - Unknown is preserved. "unknown" or null never means "no", "free", or
 *   "not suitable". Plan treats unknown as "can't confirm", never as a match.
 * - Venue and Place stay distinct records. A place may borrow coordinates or
 *   stroller access from its venue, but never writes them back.
 * - Nothing here is a publication claim. publicationState and publishedAt
 *   decide what parents see.
 */

import type { ConfirmedTriState } from "@/data/camps/types";

/** Values of the public.discover_category enum. */
export type DiscoverDbCategory =
  | "parks_nature"
  | "play_entertainment"
  | "splash_pads"
  | "indoor_play"
  | "learning_culture"
  | "events"
  | "classes"
  | "camps"
  | "food_treats"
  | "getaways"
  | "shopping"
  | "other";

export type PlaceSetting = "indoor" | "outdoor" | "both" | "unknown";

/**
 * Provisional per-visit cost tier for a family.
 * Thresholds are documented in docs/discover/README.md and still need a
 * product decision. "unknown" is not "free".
 */
export type PlaceCostTier =
  | "free"
  | "budget"
  | "moderate"
  | "premium"
  | "unknown";

/**
 * How a place's opening hours are known.
 * - fixed: weekly hours recorded as PlaceHours rows
 * - dawn_to_dusk: parks and trails with no gate times
 * - always_open: genuinely 24/7 (rare; verify)
 * - varies: too changeable to record; Plan shows "check hours"
 */
export type PlaceHoursKind =
  | "fixed"
  | "dawn_to_dusk"
  | "always_open"
  | "varies"
  | "unknown";

export type PublicationState = "draft" | "published" | "archived";

/** ISO 8601 weekday: 1 = Monday ... 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type PlaceHours = {
  weekday: IsoWeekday;
  /** "HH:MM" 24-hour local time. */
  opensAt: string;
  /** "HH:MM" 24-hour local time; later than opensAt. */
  closesAt: string;
  /** ISO date (YYYY-MM-DD). Omit for year-round hours. */
  validFrom?: string | null;
  validTo?: string | null;
  notes?: string | null;
};

/** The venue facts a place may fall back on. */
export type PlaceVenueFacts = {
  latitude?: number | null;
  longitude?: number | null;
  strollerFriendly?: ConfirmedTriState;
};

export type DiscoverPlace = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  category: DiscoverDbCategory;
  /** Place type from the Discover taxonomy, e.g. "Splash Pad". */
  placeType?: string | null;
  cityId?: string | null;
  venueId?: string | null;
  addressLine?: string | null;
  neighbourhood?: string | null;
  websiteUrl?: string | null;

  /** Whole years. */
  ageMin?: number | null;
  ageMax?: number | null;
  ageMinInclusive?: boolean | null;
  ageMaxInclusive?: boolean | null;
  /** Verified suitable at any age. False means "use ageMin/ageMax", not "not all ages". */
  allAges: boolean;

  setting: PlaceSetting;
  costTier: PlaceCostTier;
  /** Typical family visit length in minutes. */
  typicalVisitMinutes?: number | null;
  toddlerFriendly: ConfirmedTriState;
  strollerFriendly: ConfirmedTriState;
  hoursKind: PlaceHoursKind;
  hours?: PlaceHours[];

  latitude?: number | null;
  longitude?: number | null;

  sourceUrl?: string | null;
  /** ISO date the facts were last verified. Shown as "latest verified [date]". */
  sourceCheckedDate?: string | null;

  publicationState: PublicationState;
  publishedAt?: string | null;
};
