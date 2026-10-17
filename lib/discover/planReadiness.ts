/**
 * Plan readiness — does a Discover place have every fact the Plan tool needs?
 *
 * Plan answers questions like "rainy, two kids aged 2 and 7, free this
 * afternoon" with hard database filters (age fits every child, indoor if it
 * rains, open now, within drive time). A place missing any of those facts
 * cannot be filtered honestly, so it is not Plan-ready.
 *
 * This check is a research checklist and a pre-publish gate. It never fills a
 * gap: unknown stays unknown, and a missing fact is reported, not assumed.
 */

import type { ConfirmedTriState } from "@/data/camps/types";
import type {
  DiscoverPlace,
  PlaceVenueFacts,
} from "@/data/discover/types";

export type PlanField =
  | "ages"
  | "setting"
  | "hours"
  | "costTier"
  | "visitLength"
  | "toddlerFriendly"
  | "strollerFriendly"
  | "location"
  | "verification";

/** Parent-neutral labels for research checklists and admin views. */
export const PLAN_FIELD_LABELS: Record<PlanField, string> = {
  ages: "Age range",
  setting: "Indoor / outdoor",
  hours: "Opening hours",
  costTier: "Cost tier",
  visitLength: "Typical visit length",
  toddlerFriendly: "Toddler-friendly",
  strollerFriendly: "Stroller-friendly",
  location: "Map location",
  verification: "Source and verified date",
};

/** Order fields are reported in, matching the research checklist. */
export const PLAN_FIELDS: readonly PlanField[] = [
  "ages",
  "setting",
  "hours",
  "costTier",
  "visitLength",
  "toddlerFriendly",
  "strollerFriendly",
  "location",
  "verification",
];

export type PlanReadinessGap = {
  field: PlanField;
  label: string;
  /** Why the field is not ready, in plain words. */
  reason: string;
};

export type PlanReadiness = {
  ready: boolean;
  gaps: PlanReadinessGap[];
};

export type Coordinates = { latitude: number; longitude: number };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isWholeYears(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidCoordinatePair(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isIsoDate(value: string | null | undefined): boolean {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/**
 * The place's own coordinates when verified, else the venue's.
 * Returns null when neither has a valid pair — never a guessed point.
 */
export function effectiveCoordinates(
  place: Pick<DiscoverPlace, "latitude" | "longitude">,
  venue?: PlaceVenueFacts | null,
): Coordinates | null {
  if (isValidCoordinatePair(place.latitude, place.longitude)) {
    return { latitude: place.latitude!, longitude: place.longitude! };
  }
  if (venue && isValidCoordinatePair(venue.latitude, venue.longitude)) {
    return { latitude: venue.latitude!, longitude: venue.longitude! };
  }
  return null;
}

/**
 * The place's stroller fact, falling back to the venue only when the place's
 * own fact is unknown. A place-level "no" is never overridden by the venue.
 */
export function effectiveStrollerFriendly(
  place: Pick<DiscoverPlace, "strollerFriendly">,
  venue?: PlaceVenueFacts | null,
): ConfirmedTriState {
  if (place.strollerFriendly !== "unknown") return place.strollerFriendly;
  return venue?.strollerFriendly ?? "unknown";
}

function agesGap(place: DiscoverPlace): string | null {
  if (place.allAges) {
    return place.ageMax == null
      ? null
      : "Marked all ages but also has an upper age limit";
  }
  const hasMin = isWholeYears(place.ageMin);
  const hasMax = isWholeYears(place.ageMax);
  if (!hasMin && !hasMax) return "No age range recorded";
  if (!hasMin) return "Minimum age not recorded";
  if (!hasMax) return "Maximum age not recorded (mark all ages if verified)";
  if (place.ageMin! > place.ageMax!) return "Minimum age is above maximum age";
  return null;
}

function hoursGap(place: DiscoverPlace): string | null {
  switch (place.hoursKind) {
    case "unknown":
      return "How hours are known is not recorded";
    case "fixed":
      return place.hours && place.hours.length > 0
        ? null
        : "Hours marked fixed but no weekly hours recorded";
    default:
      return null;
  }
}

function verificationGap(place: DiscoverPlace): string | null {
  const hasUrl =
    typeof place.sourceUrl === "string" && place.sourceUrl.trim() !== "";
  const hasDate = isIsoDate(place.sourceCheckedDate);
  if (!hasUrl && !hasDate) return "No source or verified date";
  if (!hasUrl) return "Verified date recorded without a source";
  if (!hasDate) return "Source recorded without a valid verified date";
  return null;
}

/**
 * Check every Plan fact on a place. `venue` supplies fallbacks for
 * coordinates and stroller access when the place links to one.
 */
export function planReadiness(
  place: DiscoverPlace,
  venue?: PlaceVenueFacts | null,
): PlanReadiness {
  const reasons: Record<PlanField, string | null> = {
    ages: agesGap(place),
    setting:
      place.setting === "unknown" ? "Indoor or outdoor not recorded" : null,
    hours: hoursGap(place),
    costTier: place.costTier === "unknown" ? "Cost tier not recorded" : null,
    visitLength:
      typeof place.typicalVisitMinutes === "number" &&
      Number.isInteger(place.typicalVisitMinutes) &&
      place.typicalVisitMinutes > 0 &&
      place.typicalVisitMinutes <= 1440
        ? null
        : "Typical visit length not recorded",
    toddlerFriendly:
      place.toddlerFriendly === "unknown"
        ? "Toddler suitability not verified"
        : null,
    strollerFriendly:
      effectiveStrollerFriendly(place, venue) === "unknown"
        ? "Stroller access not verified (on the place or its venue)"
        : null,
    location:
      effectiveCoordinates(place, venue) === null
        ? "No verified coordinates (on the place or its venue)"
        : null,
    verification: verificationGap(place),
  };

  const gaps: PlanReadinessGap[] = [];
  for (const field of PLAN_FIELDS) {
    const reason = reasons[field];
    if (reason) {
      gaps.push({ field, label: PLAN_FIELD_LABELS[field], reason });
    }
  }
  return { ready: gaps.length === 0, gaps };
}

export function isPlanReady(
  place: DiscoverPlace,
  venue?: PlaceVenueFacts | null,
): boolean {
  return planReadiness(place, venue).ready;
}
