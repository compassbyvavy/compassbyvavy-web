/**
 * Ontario location search for the site-wide location field.
 *
 * Data: data/discover/ontario-location-data.json — every locality and
 * community in the provincial Tourism regions list (exact duplicates removed),
 * keyed by name + tourism region. These are searchable places, not Compass
 * `cities` rows: appearing here says nothing about listing coverage.
 *
 * Rules:
 * - Same-name places in different regions stay separate results.
 * - Nothing is resolved by name alone when the name is ambiguous.
 * - Pure functions over a dataset argument, so the 2,000-entry file can be
 *   loaded lazily on the client and passed in.
 */

export type TourismRegionCode =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13a"
  | "13b"
  | "13c";

export type TourismRegion = { code: TourismRegionCode; name: string };

/** Workbook review flags carried over from the region lookup. */
export type OntarioLocationFlag = "ambiguous" | "split" | "review";

export type OntarioLocation = {
  /** Stable id: `<slug>--r<region>`, e.g. "mississauga--r5", "richmond--r10". */
  id: string;
  name: string;
  region: TourismRegionCode;
  flag?: OntarioLocationFlag;
  note?: string;
};

export type OntarioLocationData = {
  source: string;
  exactDuplicatesRemoved: number;
  regions: TourismRegion[];
  locations: OntarioLocation[];
};

/** Starting suggestions for an empty field (no popular-location pattern exists yet). */
export const STARTER_LOCATION_IDS: readonly string[] = [
  "mississauga--r5",
  "oakville--r3",
  "brampton--r5",
];

export const DEFAULT_SUGGESTION_LIMIT = 12;

export type LocationSuggestion = {
  location: OntarioLocation;
  /** "Region 5 · Greater Toronto Area" */
  subtitle: string;
  /** True when another place in a different region shares this name. */
  ambiguous: boolean;
  /** Lower ranks first. 0 name prefix · 1 word prefix · 2 region match · 3 contains. */
  rank: number;
};

export type LocationIndex = {
  data: OntarioLocationData;
  byId: Map<string, OntarioLocation>;
  regionsByCode: Map<string, TourismRegion>;
  /** Normalized name → number of distinct regions using it. */
  nameCounts: Map<string, number>;
  entries: Array<{
    location: OntarioLocation;
    name: string;
    words: string[];
    region: string;
    regionWords: string[];
  }>;
};

/**
 * Lowercase, strip accents, and collapse punctuation to single spaces so
 * "Niagara-On-The-Lake", "niagara on the lake" and "Chute-à-Blondeau"
 * compare as users type them.
 */
export function normalizeLocationText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildLocationIndex(data: OntarioLocationData): LocationIndex {
  const regionsByCode = new Map(data.regions.map((r) => [r.code, r]));
  const byId = new Map<string, OntarioLocation>();
  const regionSets = new Map<string, Set<string>>();
  const entries: LocationIndex["entries"] = [];
  const seenNameRegion = new Set<string>();

  for (const location of data.locations) {
    const name = normalizeLocationText(location.name);
    const key = `${name}|${location.region}`;
    // Exact duplicates (same name, same region) collapse to one entry.
    if (seenNameRegion.has(key) || byId.has(location.id)) continue;
    seenNameRegion.add(key);
    byId.set(location.id, location);

    const set = regionSets.get(name) ?? new Set<string>();
    set.add(location.region);
    regionSets.set(name, set);

    const regionName = normalizeLocationText(
      regionsByCode.get(location.region)?.name ?? "",
    );
    entries.push({
      location,
      name,
      words: name.split(" ").filter(Boolean),
      region: regionName,
      regionWords: regionName.split(" ").filter(Boolean),
    });
  }

  const nameCounts = new Map(
    [...regionSets].map(([name, set]) => [name, set.size]),
  );
  return { data, byId, regionsByCode, nameCounts, entries };
}

export function regionSubtitle(
  index: LocationIndex,
  region: TourismRegionCode,
): string {
  const name = index.regionsByCode.get(region)?.name;
  return name ? `Region ${region} · ${name}` : `Region ${region}`;
}

export function isAmbiguousLocationName(
  index: LocationIndex,
  name: string,
): boolean {
  return (index.nameCounts.get(normalizeLocationText(name)) ?? 0) > 1;
}

function toSuggestion(
  index: LocationIndex,
  location: OntarioLocation,
  rank: number,
): LocationSuggestion {
  return {
    location,
    subtitle: regionSubtitle(index, location.region),
    ambiguous: isAmbiguousLocationName(index, location.name),
    rank,
  };
}

function regionCodeOrder(code: string): number {
  const n = Number.parseInt(code, 10);
  const suffix = code.replace(/^\d+/, "");
  return n * 10 + (suffix ? suffix.charCodeAt(0) - 96 : 0);
}

function rankEntry(
  entry: LocationIndex["entries"][number],
  q: string,
  qWords: string[],
): number | null {
  if (entry.name.startsWith(q)) return 0;
  // Every query word must prefix some word of the name, in order of typing.
  if (
    qWords.length > 0 &&
    qWords.every((w) => entry.words.some((nw) => nw.startsWith(w)))
  ) {
    return 1;
  }
  if (
    entry.region.startsWith(q) ||
    (qWords.length > 0 &&
      qWords.every((w) => entry.regionWords.some((rw) => rw.startsWith(w)))) ||
    // Region code: "region 5", "r5", "5", "13a"
    q === `region ${entry.location.region}` ||
    q === `r${entry.location.region}` ||
    q === entry.location.region
  ) {
    return 2;
  }
  if (q.length >= 3 && entry.name.includes(q)) return 3;
  return null;
}

/**
 * Suggestions for what the user typed. Prefix matches on the place name come
 * first, then word-prefix matches, then places in a matching region, then
 * mid-word matches. Empty input returns the starter suggestions.
 */
export function searchLocations(
  index: LocationIndex,
  query: string,
  limit: number = DEFAULT_SUGGESTION_LIMIT,
): LocationSuggestion[] {
  const q = normalizeLocationText(query);
  if (!q) return starterSuggestions(index);

  const qWords = q.split(" ").filter(Boolean);
  const hits: LocationSuggestion[] = [];
  for (const entry of index.entries) {
    const rank = rankEntry(entry, q, qWords);
    if (rank !== null) hits.push(toSuggestion(index, entry.location, rank));
  }

  hits.sort(
    (a, b) =>
      a.rank - b.rank ||
      // Exact name before longer names that share the prefix.
      Number(normalizeLocationText(b.location.name) === q) -
        Number(normalizeLocationText(a.location.name) === q) ||
      a.location.name.length - b.location.name.length ||
      a.location.name.localeCompare(b.location.name) ||
      regionCodeOrder(a.location.region) - regionCodeOrder(b.location.region),
  );
  return hits.slice(0, Math.max(0, limit));
}

export function starterSuggestions(index: LocationIndex): LocationSuggestion[] {
  return STARTER_LOCATION_IDS.map((id) => index.byId.get(id))
    .filter((l): l is OntarioLocation => Boolean(l))
    .map((l) => toSuggestion(index, l, 0));
}

/**
 * The option to pre-highlight while typing, or null.
 *
 * Only an exact, unambiguous name match is pre-highlighted, so Enter never
 * picks one of several same-name places by name alone.
 */
export function autoHighlightIndex(
  index: LocationIndex,
  query: string,
  suggestions: LocationSuggestion[],
): number | null {
  const q = normalizeLocationText(query);
  if (!q || suggestions.length === 0) return null;
  const exact = suggestions.filter(
    (s) => normalizeLocationText(s.location.name) === q,
  );
  if (exact.length !== 1 || exact[0].ambiguous) return null;
  return suggestions.indexOf(exact[0]);
}

export function getLocationById(
  index: LocationIndex,
  id: string | null | undefined,
): OntarioLocation | null {
  if (!id) return null;
  return index.byId.get(id) ?? null;
}

/** Short label for a selected place: "Mississauga" or "Richmond (Region 10)". */
export function locationLabel(
  index: LocationIndex,
  location: OntarioLocation,
): string {
  return isAmbiguousLocationName(index, location.name)
    ? `${location.name} (Region ${location.region})`
    : location.name;
}

/** Display name for a location id before the dataset has loaded. */
export function nameFromLocationId(id: string): string {
  const slugPart = id.split("--r")[0] ?? id;
  return slugPart
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

let cachedIndex: Promise<LocationIndex> | null = null;

/**
 * Lazily load the dataset (code-split JSON) and build the index once per
 * page. Callers in the browser use this; tests build their own index.
 */
export function loadOntarioLocationIndex(): Promise<LocationIndex> {
  if (!cachedIndex) {
    cachedIndex = import("@/data/discover/ontario-location-data.json").then(
      (mod) =>
        buildLocationIndex(
          ((mod as { default?: unknown }).default ?? mod) as OntarioLocationData,
        ),
    );
  }
  return cachedIndex;
}
