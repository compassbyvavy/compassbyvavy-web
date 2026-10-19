/**
 * The browse location: which Ontario place the family chose in the header,
 * how it is remembered, and whether Compass has published listings there.
 *
 * Conventions (matching the rest of the app):
 * - URL is the source of truth on listing pages: `/camps?where=<location id>`.
 * - localStorage remembers the last choice across pages and visits.
 * - A window event tells an open listing that the header changed it, like
 *   `compass:open-command-palette` for the command palette.
 *
 * Coverage comes only from published listing data passed in by the caller.
 * A place being in the Ontario list never implies Compass has listings there,
 * and a place is never mapped to a "nearby" city by guesswork.
 */

import type { CampSession, Venue } from "@/data/camps/types";
import {
  getLocationById,
  isAmbiguousLocationName,
  normalizeLocationText,
  type LocationIndex,
  type OntarioLocation,
} from "@/lib/location/ontarioLocations";

export const BROWSE_LOCATION_PARAM = "where";
export const BROWSE_LOCATION_STORAGE_KEY = "compass.browseLocation.v1";
export const BROWSE_LOCATION_EVENT = "compass:browse-location-change";

export type BrowseLocationEventDetail = { id: string | null };

const LOCATION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*--r(?:1[0-2]|[1-9]|13[abc])$/;

/** Shape check only — whether the id exists is checked against the dataset. */
export function isValidLocationId(value: unknown): value is string {
  return typeof value === "string" && LOCATION_ID_PATTERN.test(value);
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readStoredBrowseLocation(
  storage: StorageLike | null | undefined,
): string | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(BROWSE_LOCATION_STORAGE_KEY);
    return isValidLocationId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredBrowseLocation(
  storage: StorageLike | null | undefined,
  id: string | null,
): void {
  if (!storage) return;
  try {
    if (id && isValidLocationId(id)) {
      storage.setItem(BROWSE_LOCATION_STORAGE_KEY, id);
    } else {
      storage.removeItem(BROWSE_LOCATION_STORAGE_KEY);
    }
  } catch {
    /* storage can be blocked (private mode); the URL still carries the choice */
  }
}

/** Safe accessor: localStorage can throw when blocked. */
export function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Coverage from published listings
// ---------------------------------------------------------------------------

export type ListingCoverage = {
  /** Normalized venue city label → venue ids with at least one listed session. */
  byCity: Map<string, Set<string>>;
  /** Normalized venue neighbourhood label → venue ids with at least one listed session. */
  byNeighbourhood: Map<string, Set<string>>;
};

function isOntarioOrUnstated(province: string | null | undefined): boolean {
  if (!province) return true;
  const p = normalizeLocationText(province);
  return p === "on" || p === "ontario";
}

/**
 * Index the published camps catalog by venue city and neighbourhood. Only
 * venues that host at least one listed session count as coverage.
 */
export function buildCampsCoverage(
  sessions: Pick<CampSession, "venueId">[],
  venues: Venue[],
): ListingCoverage {
  const listedVenueIds = new Set(
    sessions.map((s) => s.venueId).filter((id): id is string => Boolean(id)),
  );
  const byCity = new Map<string, Set<string>>();
  const byNeighbourhood = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, label: string, id: string) => {
    const key = normalizeLocationText(label);
    if (!key) return;
    const set = map.get(key) ?? new Set<string>();
    set.add(id);
    map.set(key, set);
  };
  for (const venue of venues) {
    if (!listedVenueIds.has(venue.id)) continue;
    if (!isOntarioOrUnstated(venue.province)) continue;
    if (venue.city) add(byCity, venue.city, venue.id);
    if (venue.neighbourhood) add(byNeighbourhood, venue.neighbourhood, venue.id);
  }
  return { byCity, byNeighbourhood };
}

export type BrowseLocationResolution =
  | { status: "none" }
  /** The id is not in the Ontario location list. */
  | { status: "unknown_location"; id: string }
  /**
   * Listings use this place name, but other Ontario places share it and
   * venues do not record a region, so the match cannot be confirmed.
   */
  | { status: "unconfirmed"; location: OntarioLocation }
  /** A real place with no published listings under its name. */
  | { status: "no_listings"; location: OntarioLocation }
  | {
      status: "covered";
      location: OntarioLocation;
      matchedBy: "city" | "neighbourhood";
      venueIds: Set<string>;
    };

/**
 * Map a chosen location to published listings. Matches only the place's own
 * name against a listed venue's city or neighbourhood — never a nearby city,
 * a region, or a centroid.
 */
export function resolveBrowseLocation(
  index: LocationIndex,
  id: string | null | undefined,
  coverage: ListingCoverage,
): BrowseLocationResolution {
  if (!id) return { status: "none" };
  const location = getLocationById(index, id);
  if (!location) return { status: "unknown_location", id };

  const key = normalizeLocationText(location.name);
  const cityVenues = coverage.byCity.get(key);
  const hoodVenues = coverage.byNeighbourhood.get(key);
  if (!cityVenues && !hoodVenues) return { status: "no_listings", location };

  if (isAmbiguousLocationName(index, location.name)) {
    return { status: "unconfirmed", location };
  }
  if (cityVenues) {
    return { status: "covered", location, matchedBy: "city", venueIds: cityVenues };
  }
  return {
    status: "covered",
    location,
    matchedBy: "neighbourhood",
    venueIds: hoodVenues!,
  };
}

/**
 * Venue constraint for listing results: null applies none (no place chosen);
 * an empty set matches nothing (a place without confirmed listings).
 */
export function browseVenueIdsFor(
  resolution: BrowseLocationResolution,
): ReadonlySet<string> | null {
  if (resolution.status === "none") return null;
  if (resolution.status === "covered") return resolution.venueIds;
  return new Set<string>();
}

/** Parent-facing explanation when a chosen place has nothing to show. */
export function browseLocationEmptyMessage(
  resolution: BrowseLocationResolution,
  label: string,
): { title: string; body: string } | null {
  switch (resolution.status) {
    case "no_listings":
      return {
        title: `No camp listings for ${label} yet`,
        body: `We haven't published verified camps in ${label}. We won't swap in a nearby city — choose another place or clear the location to see everything we list.`,
      };
    case "unconfirmed":
      return {
        title: `We can't confirm listings for ${label}`,
        body: `More than one Ontario place is called ${resolution.location.name}, and our listings don't yet record which one. We won't guess — choose another place or clear the location.`,
      };
    case "unknown_location":
      return {
        title: "We don't recognise that location",
        body: "Choose a place from the location list, or clear the location to see everything we list.",
      };
    default:
      return null;
  }
}
