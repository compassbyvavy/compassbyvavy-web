/**
 * Venue detail records — the facts a Discover venue page shows.
 *
 * Mirrors migration 20261017030000_discover_venue_detail.sql and the venue
 * research checklist in docs/discover/venue-detail.md. A venue is one
 * DiscoverPlace (one location / branch) plus child facts, each carrying its
 * own source, checked date and verification status.
 *
 * Rules:
 * - No row means "not confirmed". A row saying no / not_offered means
 *   "verified unavailable". Never fill a gap with a guess.
 * - Activities and programs are per location. A chain-wide list is not
 *   evidence for a branch.
 * - Review sources describe what was read; review text is never stored.
 */

import type { CampCurrency, ConfirmedTriState } from "@/data/camps/types";
import type { DiscoverPlace, PlaceHours } from "@/data/discover/types";

export type FactVerification = "verified" | "conflicting" | "needs_follow_up";

/** Where a fact came from, when it was last checked, and how sure we are. */
export type Provenance = {
  sourceUrl: string;
  /** ISO date (YYYY-MM-DD). */
  sourceCheckedDate: string;
  /** Rows start as needs_follow_up and never show publicly in that state. */
  verificationStatus: FactVerification;
  /** Required when sources disagree; shown next to the fact. */
  conflictNote?: string | null;
};

export type PlaceOperatingStatus =
  | "open"
  | "temporarily_closed"
  | "permanently_closed"
  | "unknown";

export type VenuePlace = DiscoverPlace & {
  operatingStatus: PlaceOperatingStatus;
  branchName?: string | null;
  /** Former names and aliases. */
  aliases?: string[];
  postalCode?: string | null;
};

export type VenueHours = PlaceHours & Partial<Pick<Provenance, "sourceUrl" | "sourceCheckedDate">>;

export type VenueTypeAssignment = Provenance & {
  placeType: string;
  isPrimary: boolean;
};

export type AgeBand = "0_2" | "3_5" | "6_9" | "10_12" | "13_17" | "adults";
export type AgeBandFit = "good" | "some" | "limited" | "not_suitable";

export type VenueAgeBand = Provenance & {
  band: AgeBand;
  fit: AgeBandFit;
  note?: string | null;
};

export type VenueActivity = Provenance & {
  id: string;
  name: string;
  description?: string | null;
  availability: "available" | "not_offered";
  includedInAdmission: ConfirmedTriState;
  extraCostNote?: string | null;
  schedule: "always" | "scheduled" | "unknown";
  scheduleNote?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  minHeightCm?: number | null;
  maxHeightCm?: number | null;
  maxWeightKg?: number | null;
  safetyNote?: string | null;
};

export type VenuePriceAudience =
  | "child"
  | "adult"
  | "infant"
  | "non_participant"
  | "family"
  | "group"
  | "other";

export type VenuePriceKind =
  | "admission"
  | "addon"
  | "membership"
  | "package"
  | "party"
  | "group"
  | "promotion"
  | "fee";

export type VenuePrice = Provenance & {
  id: string;
  kind: VenuePriceKind;
  label: string;
  audience: VenuePriceAudience;
  ageMin?: number | null;
  ageMax?: number | null;
  durationMinutes?: number | null;
  /** What admission includes, as published. */
  includesNote?: string | null;
  /** Required unless isFree. */
  amount?: number | null;
  isFree: boolean;
  currency: CampCurrency;
  /** An extra every participant must buy (e.g. grip socks). */
  requiredAddon: boolean;
  /** True when the venue says tax is added; null when not stated. */
  plusTax?: boolean | null;
  eligibility?: string | null;
  /** ISO date; required for promotions. */
  validTo?: string | null;
  notes?: string | null;
};

export type VenueProgram = Provenance & {
  id: string;
  name: string;
  description?: string | null;
  cadence: "ongoing" | "seasonal" | "dated";
  scheduleNote?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  priceNote?: string | null;
  registrationUrl?: string | null;
};

export type VenueAmenityKind =
  | "washrooms"
  | "change_table"
  | "parent_seating"
  | "viewing_area"
  | "stroller_access"
  | "stroller_storage"
  | "food_onsite"
  | "outside_food"
  | "allergy_info"
  | "lockers"
  | "wheelchair_access"
  | "accessible_parking"
  | "accessible_entrance"
  | "parking"
  | "sensory_supports"
  | "quiet_sessions"
  | "grip_socks"
  | "party_rooms"
  | "wifi"
  | "other";

export type VenueAmenity = Provenance & {
  amenity: VenueAmenityKind;
  /** Verified only — an unconfirmed amenity has no row. */
  status: Exclude<ConfirmedTriState, "unknown">;
  note?: string | null;
};

export type VenuePolicyKind =
  | "age_guidance"
  | "supervision"
  | "height_limit"
  | "weight_limit"
  | "restriction"
  | "waiver"
  | "dress_socks"
  | "booking_rule"
  | "arrival"
  | "food_rule"
  | "cancellation"
  | "hours_note"
  | "transit"
  | "location_note"
  | "other";

export type VenuePolicy = Provenance & {
  kind: VenuePolicyKind;
  body: string;
};

export type VenueLinkKind =
  | "website"
  | "phone"
  | "booking"
  | "tickets"
  | "reservation"
  | "registration";

export type VenueLink = Provenance & {
  kind: VenueLinkKind;
  /** https URL, or a phone number for kind "phone". */
  value: string;
  label?: string | null;
};

export type ReviewSourcePlatform =
  | "google_places_reviews"
  | "google_review_summary"
  | "other_review_platform"
  | "blog_or_guide";

export type ProviderAttribution = { name: string; uri: string };

export type VenueReviewSource = Provenance & {
  id: string;
  kind: "customer_reviews" | "editorial";
  platform: ReviewSourcePlatform;
  sourceName: string;
  /** What was reviewed, e.g. "The five reviews Google Places returned". */
  coverageNote: string;
  /** How items were ordered or chosen, when the source decides. */
  selectionMethod?: string | null;
  /** How many reviews or articles were read. */
  itemsReviewed?: number | null;
  /** ISO dates of the oldest and newest item read. */
  periodFrom?: string | null;
  periodTo?: string | null;
  /** Only as the source states it; never for editorial sources. */
  statedRating?: number | null;
  statedRatingCount?: number | null;
  ratingScale?: number | null;
  /** Exact provider-required disclosure, shown verbatim. */
  providerDisclosure?: string | null;
  providerAttributions?: ProviderAttribution[] | null;
};

export type ExperienceTheme =
  | "age_fit"
  | "activity_level"
  | "parent_seating"
  | "supervision"
  | "busy_times"
  | "cleanliness"
  | "staff"
  | "value"
  | "friction"
  | "other";

export type VenueExperienceTheme = Provenance & {
  theme: ExperienceTheme;
  /** Compass's own words, no long quotations (max 400 characters). */
  summary: string;
  basis: "venue_published" | "reviewer_reported" | "first_hand_visit";
  sentiment: "liked" | "concern" | "neutral";
  agreement: "consistent" | "mixed";
  /** Required for reviewer_reported themes. */
  reviewSourceId?: string | null;
};

export type VenueRecord = {
  place: VenuePlace;
  /** City display name from the cities table. */
  cityName?: string | null;
  types: VenueTypeAssignment[];
  ageBands: VenueAgeBand[];
  hours: VenueHours[];
  activities: VenueActivity[];
  prices: VenuePrice[];
  programs: VenueProgram[];
  amenities: VenueAmenity[];
  policies: VenuePolicy[];
  links: VenueLink[];
  reviewSources: VenueReviewSource[];
  experienceThemes: VenueExperienceTheme[];
};
