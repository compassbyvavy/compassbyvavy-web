/**
 * Indoor playgrounds browse — Mississauga, Oakville, and Brampton.
 *
 * Uses VenueRecord (the Discover venue model). A place is listed only when it
 * is publicly viewable and a verified type is an indoor-play type. Trampoline
 * parks, climbing gyms, arcades, and family entertainment centres stay out
 * unless that same record is also tagged as an indoor playground.
 *
 * PE-001 Sky Zone stays in data/play/venues.ts with its original verification
 * state. It is trampoline-park research, so this directory does not list it
 * and does not assign it a new id.
 */

import type { PlayVenue } from "@/data/play/types";
import { PLAY_VENUES } from "@/data/play/venues";
import type { VenuePrice, VenueRecord } from "@/data/discover/venueTypes";
import {
  compassBestFitLabel,
  isPublicFact,
  isVenuePubliclyViewable,
  officialAgeLabel,
  venueHref,
} from "@/lib/discover/venueDetail";
import { VENUE_DEV_BANNER, loadVenueCatalog } from "@/lib/discover/venuesCatalog";

export const INDOOR_PLAY_CITIES = [
  { id: "mississauga", name: "Mississauga" },
  { id: "oakville", name: "Oakville" },
  { id: "brampton", name: "Brampton" },
] as const;

export type IndoorPlayCityId = (typeof INDOOR_PLAY_CITIES)[number]["id"];

/** Verified place_type labels that put a venue in this directory. */
export const INDOOR_PLAYGROUND_TYPES = [
  "Indoor Playground",
  "Soft Play",
  "Toddler Play",
  "Toddler Play Area",
  "Adventure Play",
  "Multi-level Play",
] as const;

/**
 * Play-style filters. A filter is advertised only when a listed venue has
 * that verified type — the directory does not offer a control the data
 * cannot answer.
 */
export const PLAY_STYLE_FILTERS = [
  { id: "soft-play", label: "Soft play", types: ["Soft Play"] },
  { id: "toddler-play", label: "Toddler play", types: ["Toddler Play", "Toddler Play Area"] },
  { id: "adventure-play", label: "Adventure play", types: ["Adventure Play"] },
  { id: "multi-level", label: "Multi-level play", types: ["Multi-level Play"] },
] as const;

export type PlayStyleId = (typeof PLAY_STYLE_FILTERS)[number]["id"];

const INDOOR_TYPE_KEYS = new Set(INDOOR_PLAYGROUND_TYPES.map(normalizeType));

export function normalizeType(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isIndoorPlayType(value: string | null | undefined): boolean {
  return typeof value === "string" && INDOOR_TYPE_KEYS.has(normalizeType(value));
}

export function publicIndoorPlayTypes(record: VenueRecord): string[] {
  const labels = record.types
    .filter((type) => isPublicFact(type) && isIndoorPlayType(type.placeType))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .map((type) => type.placeType.trim());
  return [...new Set(labels)];
}

function mentionsIndoorPlay(record: VenueRecord): boolean {
  if (isIndoorPlayType(record.place.placeType)) return true;
  return record.types.some((type) => isIndoorPlayType(type.placeType));
}

function cityId(record: VenueRecord): IndoorPlayCityId | null {
  const id = record.place.cityId?.trim().toLowerCase();
  return INDOOR_PLAY_CITIES.some((city) => city.id === id) ? (id as IndoorPlayCityId) : null;
}

export type IndoorPlayReviewReason =
  | "duplicate"
  | "draft"
  | "closed"
  | "needs_review"
  | "out_of_city"
  | "unresolved_duplicate";

export type IndoorPlayReviewItem = {
  id: string;
  slug: string;
  name: string;
  reason: IndoorPlayReviewReason;
};

export type IndoorPlayRoster = {
  listed: VenueRecord[];
  review: IndoorPlayReviewItem[];
};

function reviewItem(record: VenueRecord, reason: IndoorPlayReviewReason): IndoorPlayReviewItem {
  return {
    id: record.place.id,
    slug: record.place.slug,
    name: record.place.name,
    reason,
  };
}

function branchKey(record: VenueRecord): string {
  const name = record.place.name.trim().toLowerCase();
  const branch = (record.place.branchName ?? "").trim().toLowerCase();
  const address = (record.place.addressLine ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const city = (record.place.cityId ?? "").trim().toLowerCase();
  return `${name}|${branch}|${address}|${city}`;
}

/**
 * Public indoor-playground roster. Needs-review, draft, closed, unknown
 * operating status, out-of-city, and non-indoor records never land in
 * `listed`. Unresolved same-day duplicates stay in review instead of
 * picking a winner.
 */
export function indoorPlaygroundRoster(records: VenueRecord[]): IndoorPlayRoster {
  const review: IndoorPlayReviewItem[] = [];
  const candidates: VenueRecord[] = [];

  for (const record of records) {
    if (!mentionsIndoorPlay(record)) continue;
    const status = record.place.operatingStatus;
    if (status === "permanently_closed" || status === "temporarily_closed") {
      review.push(reviewItem(record, "closed"));
      continue;
    }
    if (status === "unknown" || record.place.publicationState !== "published" || !record.place.publishedAt) {
      review.push(reviewItem(record, record.place.publicationState === "draft" ? "draft" : "needs_review"));
      continue;
    }
    if (!isVenuePubliclyViewable(record) || publicIndoorPlayTypes(record).length === 0) {
      review.push(reviewItem(record, "needs_review"));
      continue;
    }
    if (!cityId(record)) {
      review.push(reviewItem(record, "out_of_city"));
      continue;
    }
    candidates.push(record);
  }

  const byId = new Map<string, VenueRecord>();
  for (const record of candidates) {
    const previous = byId.get(record.place.id);
    if (!previous) {
      byId.set(record.place.id, record);
      continue;
    }
    const keepNewer = (record.place.sourceCheckedDate ?? "") > (previous.place.sourceCheckedDate ?? "");
    review.push(reviewItem(keepNewer ? previous : record, "duplicate"));
    if (keepNewer) byId.set(record.place.id, record);
  }

  const byBranch = new Map<string, VenueRecord>();
  const tied = new Set<string>();
  for (const record of byId.values()) {
    const key = branchKey(record);
    const previous = byBranch.get(key);
    if (!previous) {
      byBranch.set(key, record);
      continue;
    }
    const previousDate = previous.place.sourceCheckedDate ?? "";
    const nextDate = record.place.sourceCheckedDate ?? "";
    if (previousDate === nextDate) {
      tied.add(key);
      review.push(reviewItem(record, "unresolved_duplicate"));
      continue;
    }
    if (nextDate > previousDate) {
      review.push(reviewItem(previous, "duplicate"));
      byBranch.set(key, record);
    } else {
      review.push(reviewItem(record, "duplicate"));
    }
  }

  const listed: VenueRecord[] = [];
  for (const [key, record] of byBranch) {
    if (tied.has(key)) {
      review.push(reviewItem(record, "unresolved_duplicate"));
      continue;
    }
    listed.push(record);
  }

  listed.sort((a, b) => {
    const city = (a.place.cityId ?? "").localeCompare(b.place.cityId ?? "");
    if (city !== 0) return city;
    return a.place.name.localeCompare(b.place.name) || a.place.slug.localeCompare(b.place.slug);
  });

  return { listed, review };
}

export type IndoorPlayQuery = {
  city: "all" | IndoorPlayCityId;
  age: number | null;
  /** Set when the request included an age that was not a whole number 0–17. */
  ageRejected: boolean;
  toddler: boolean;
  styles: PlayStyleId[];
};

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

export function parseIndoorPlayQuery(
  searchParams: Record<string, string | string[] | undefined>,
): IndoorPlayQuery {
  const cityRaw = firstParam(searchParams.city).toLowerCase();
  const city = INDOOR_PLAY_CITIES.some((item) => item.id === cityRaw)
    ? (cityRaw as IndoorPlayCityId)
    : "all";
  const ageRaw = firstParam(searchParams.age);
  let age: number | null = null;
  let ageRejected = false;
  if (ageRaw !== "") {
    if (/^\d{1,2}$/.test(ageRaw)) {
      const parsed = Number(ageRaw);
      if (parsed >= 0 && parsed <= 17) age = parsed;
      else ageRejected = true;
    } else {
      ageRejected = true;
    }
  }
  const requested = new Set(
    (Array.isArray(searchParams.style) ? searchParams.style : searchParams.style ? [searchParams.style] : [])
      .map((value) => value.trim()),
  );
  const styles = PLAY_STYLE_FILTERS.map((style) => style.id).filter((id) => requested.has(id));
  return {
    city,
    age,
    ageRejected,
    toddler: firstParam(searchParams.toddler) === "1",
    styles,
  };
}

function ageEvidence(record: VenueRecord): boolean {
  if (record.place.allAges) return true;
  if (record.place.ageMin != null || record.place.ageMax != null) return true;
  return record.ageBands.some((band) => isPublicFact(band));
}

function matchesAge(record: VenueRecord, age: number): boolean {
  if (record.place.allAges) return true;
  const min = record.place.ageMin;
  const max = record.place.ageMax;
  if (min != null || max != null) {
    if (min != null && age < min) return false;
    if (max != null && age > max) return false;
    return true;
  }
  return record.ageBands.some((band) => {
    if (!isPublicFact(band) || (band.fit !== "good" && band.fit !== "some")) return false;
    const range = [
      { band: "0_2", min: 0, max: 2 },
      { band: "3_5", min: 3, max: 5 },
      { band: "6_9", min: 6, max: 9 },
      { band: "10_12", min: 10, max: 12 },
      { band: "13_17", min: 13, max: 17 },
    ].find((item) => item.band === band.band);
    return range ? age >= range.min && age <= range.max : false;
  });
}

function matchesStyle(record: VenueRecord, styleId: PlayStyleId): boolean {
  const style = PLAY_STYLE_FILTERS.find((item) => item.id === styleId);
  if (!style) return false;
  const keys = new Set(style.types.map(normalizeType));
  return publicIndoorPlayTypes(record).some((type) => keys.has(normalizeType(type)));
}

export type AdvertisedIndoorFilters = {
  age: boolean;
  toddler: boolean;
  styles: PlayStyleId[];
};

/** Filters the current listed set can actually answer. */
export function advertisedIndoorFilters(listed: VenueRecord[]): AdvertisedIndoorFilters {
  return {
    age: listed.some(ageEvidence),
    toddler: listed.some((record) => record.place.toddlerFriendly === "yes"),
    styles: PLAY_STYLE_FILTERS.filter((style) => listed.some((record) => matchesStyle(record, style.id))).map(
      (style) => style.id,
    ),
  };
}

export function filterIndoorPlaygrounds(
  listed: VenueRecord[],
  query: IndoorPlayQuery,
  advertised: AdvertisedIndoorFilters,
): VenueRecord[] {
  const styles = query.styles.filter((style) => advertised.styles.includes(style));
  return listed.filter((record) => {
    if (query.city !== "all" && record.place.cityId !== query.city) return false;
    if (advertised.age && query.age != null && !matchesAge(record, query.age)) return false;
    if (advertised.toddler && query.toddler && record.place.toddlerFriendly !== "yes") return false;
    if (styles.some((style) => !matchesStyle(record, style))) return false;
    return true;
  });
}

export type IndoorPlayCard = {
  id: string;
  href: string;
  name: string;
  branchName: string | null;
  cityName: string;
  neighbourhood: string | null;
  bestFit: string | null;
  officialAges: string | null;
  playStyles: string[];
  price: string | null;
  description: string | null;
};

function money(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function indicativePrice(record: VenueRecord): string | null {
  const admissions = record.prices.filter(
    (price): price is VenuePrice & { amount: number } =>
      isPublicFact(price) &&
      price.kind === "admission" &&
      !price.isFree &&
      typeof price.amount === "number",
  );
  if (!admissions.length) {
    const free = record.prices.some(
      (price) => isPublicFact(price) && price.kind === "admission" && price.isFree,
    );
    return free ? "Free admission" : null;
  }
  const lowest = admissions.reduce((best, price) => (price.amount < best.amount ? price : best));
  const tax = lowest.plusTax === true ? " plus tax" : "";
  return `From ${money(lowest.amount)}${tax}`;
}

export function indoorPlayCard(record: VenueRecord): IndoorPlayCard {
  const city = INDOOR_PLAY_CITIES.find((item) => item.id === record.place.cityId);
  return {
    id: record.place.id,
    href: venueHref(record) ?? `/discover/play/${record.place.slug}`,
    name: record.place.name,
    branchName: record.place.branchName?.trim() || null,
    cityName: record.cityName?.trim() || city?.name || "Not confirmed",
    neighbourhood: record.place.neighbourhood?.trim() || null,
    bestFit: compassBestFitLabel(record),
    officialAges: officialAgeLabel(record.place),
    playStyles: publicIndoorPlayTypes(record),
    price: indicativePrice(record),
    description: record.place.description?.trim() || null,
  };
}

export function indoorPlayCountsByCity(listed: VenueRecord[]): Record<IndoorPlayCityId, number> {
  return {
    mississauga: listed.filter((record) => record.place.cityId === "mississauga").length,
    oakville: listed.filter((record) => record.place.cityId === "oakville").length,
    brampton: listed.filter((record) => record.place.cityId === "brampton").length,
  };
}

export type CanonicalPlayAuditRow = {
  id: string;
  name: string;
  city: string;
  address: string;
  status: PlayVenue["status"];
  taxonomy: string[];
  sources: Array<{ id: string; url: string; capturedAt: string }>;
  disposition: "listed_indoor_playground" | "excluded_other_taxonomy" | "needs_review";
};

const CANONICAL_INDOOR = new Set([
  "indoor playground",
  "soft play",
  "toddler play",
  "toddler play area",
  "adventure play",
  "multi-level play",
]);

/**
 * Coverage audit of data/play/venues.ts — the only canonical play research
 * in the repo. Does not invent venues and does not change PE-001.
 */
export function auditCanonicalPlayResearch(
  venues: readonly PlayVenue[] = PLAY_VENUES,
): CanonicalPlayAuditRow[] {
  return venues.map((venue) => {
    const taxonomy = [venue.primaryCategory, ...venue.additionalCategories];
    const indoor = taxonomy.some((type) => CANONICAL_INDOOR.has(normalizeType(type)));
    const disposition = !indoor
      ? "excluded_other_taxonomy"
      : venue.status === "verified"
        ? "listed_indoor_playground"
        : "needs_review";
    return {
      id: venue.id,
      name: venue.name,
      city: venue.address.city,
      address: `${venue.address.street}, ${venue.address.city}, ${venue.address.province} ${venue.address.postalCode}`,
      status: venue.status,
      taxonomy,
      sources: venue.sources.map((source) => ({
        id: source.id,
        url: source.url,
        capturedAt: source.capturedAt,
      })),
      disposition,
    };
  });
}

export const UNRESOLVED_INDOOR_PLAY_ROSTER = [
  {
    id: "indoor-play-roster-gap",
    summary:
      "No indoor-playground candidate roster for Mississauga, Oakville, or Brampton is in the repository. PE-001 Sky Zone remains verified trampoline-park research and is not retagged. No venues were added to fill the gap.",
  },
] as const;

/** Next PE id after the canonical roster. Not assigned unless a distinct venue is confirmed. */
export function nextPlayVenueId(ids: readonly string[]): `PE-${string}` {
  const numbers = ids.flatMap((id) => {
    const match = /^PE-(\d+)$/.exec(id);
    return match ? [Number(match[1])] : [];
  });
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `PE-${String(next).padStart(3, "0")}`;
}

export type IndoorPlayBrowse = {
  preview: boolean;
  banner: string | null;
  listed: VenueRecord[];
  review: IndoorPlayReviewItem[];
  filters: AdvertisedIndoorFilters;
};

export async function loadIndoorPlaygroundBrowse(
  options: { nodeEnv?: string } = {},
): Promise<IndoorPlayBrowse> {
  const catalog = await loadVenueCatalog(options);
  const roster = indoorPlaygroundRoster(catalog?.records ?? []);
  const preview = catalog?.sourceLabel === "dev_fixtures";
  return {
    preview,
    banner: preview ? VENUE_DEV_BANNER : null,
    listed: roster.listed,
    review: roster.review,
    filters: advertisedIndoorFilters(roster.listed),
  };
}
