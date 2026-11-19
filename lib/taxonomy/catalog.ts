import data from "@/data/taxonomy/discover.json";

export type CategoryStatus = "live" | "coming_soon" | "parked";
export type DiscoverStatus = "Live" | "Parked" | "Merged";
export type ChipRow = "when" | "type" | null;

export type DiscoverCategory = {
  id: string;
  sortOrder: number;
  name: string;
  slug: string;
  cardCopy: string;
  status: CategoryStatus;
  icon: string;
  pageTitle: string;
  editorial: string;
};

export type DiscoverSubcategory = {
  id: string;
  categoryId: string;
  sortOrder: number;
  name: string;
  slug: string;
  description: string;
  isNew: boolean;
  chipRow: ChipRow;
  inSeasonMonths: string;
  seasonalOnly: boolean;
  pageTitle: string;
};

export type DiscoverPlaceType = {
  id: string;
  name: string;
  categoryId: string | null;
  subcategoryId: string | null;
  discoverStatus: DiscoverStatus;
  mergedInto: string | null;
  sourceCategory: string | null;
  sourceSubcategory: string | null;
  indoorOutdoor: string | null;
  permanentSeasonal: string | null;
  primaryAgeGroup: string | null;
};

export type LocationOption = {
  slug: string;
  name: string;
  group: "all" | "city" | "region";
};

const EDITORIAL: Record<string, string> = {
  "CAT-006": "School breaks, sorted",
  "CAT-002": "Rainy-day favourites",
  "CAT-001": "Get outside together",
  "CAT-011": "Meet the animals",
  "CAT-003": "Curious minds welcome",
  "CAT-005": "Lessons they'll love",
  "CAT-004": "What's on this week",
  "CAT-007": "Where kids eat happily",
  "CAT-008": "Worth the drive",
};

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

type RawCategory = {
  id: string;
  sortOrder: number;
  name: string;
  slug: string | null;
  cardCopy: string | null;
  status: CategoryStatus;
  icon: string | null;
  pageTitle: string | null;
};

function parkedSlug(row: RawCategory): string {
  if (row.slug) return row.slug;
  if (row.id === "CAT-009") return "shopping";
  if (row.id === "CAT-010") return "services";
  return row.id.toLowerCase();
}

const categories: DiscoverCategory[] = (data.categories as RawCategory[])
  .map((row) => ({
    id: row.id,
    sortOrder: row.sortOrder,
    name: row.name,
    slug: parkedSlug(row),
    cardCopy: row.cardCopy ?? "",
    status: row.status,
    icon: row.icon ?? "",
    pageTitle: row.pageTitle ?? row.name,
    editorial: EDITORIAL[row.id] ?? "",
  }))
  .sort((a, b) => a.sortOrder - b.sortOrder);

const subcategories: DiscoverSubcategory[] = data.subcategories.map((row) => ({
  id: row.id,
  categoryId: row.categoryId,
  sortOrder: row.sortOrder,
  name: row.name,
  slug: row.slug,
  description: row.description ?? "",
  isNew: row.isNew,
  chipRow: row.chipRow === "when" || row.chipRow === "type" ? row.chipRow : null,
  inSeasonMonths: row.inSeasonMonths ?? "",
  seasonalOnly: row.seasonalOnly,
  pageTitle: row.pageTitle ?? "",
}));

const placeTypes: DiscoverPlaceType[] = data.placeTypes.map((row) => ({
  id: row.id,
  name: row.name,
  categoryId: row.categoryId,
  subcategoryId: row.subcategoryId,
  discoverStatus: row.discoverStatus as DiscoverStatus,
  mergedInto: row.mergedInto,
  sourceCategory: row.sourceCategory,
  sourceSubcategory: row.sourceSubcategory,
  indoorOutdoor: row.indoorOutdoor,
  permanentSeasonal: row.permanentSeasonal,
  primaryAgeGroup: row.primaryAgeGroup,
}));

export const ONTARIO = { slug: "ontario", name: "Ontario" };

export function publicCategories(): DiscoverCategory[] {
  return categories.filter((category) => category.status !== "parked");
}

export function allCategories(): DiscoverCategory[] {
  return categories;
}

export function categoryBySlug(slug: string): DiscoverCategory | undefined {
  return publicCategories().find((category) => category.slug === slug);
}

export function subcategoriesFor(categoryId: string): DiscoverSubcategory[] {
  return subcategories
    .filter((row) => row.categoryId === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function subcategoryBySlug(
  categoryId: string,
  slug: string,
): DiscoverSubcategory | undefined {
  return subcategoriesFor(categoryId).find((row) => row.slug === slug);
}

export function livePlaceTypesFor(subcategoryId: string): DiscoverPlaceType[] {
  return placeTypes.filter(
    (row) => row.subcategoryId === subcategoryId && row.discoverStatus === "Live",
  );
}

export function livePlaceTypesForCategory(categoryId: string): DiscoverPlaceType[] {
  const ids = new Set(subcategoriesFor(categoryId).map((row) => row.id));
  return placeTypes.filter(
    (row) => row.subcategoryId && ids.has(row.subcategoryId) && row.discoverStatus === "Live",
  );
}

export function torontoMonth(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      month: "numeric",
    }).format(date),
  );
}

export function isInSeason(months: string, month = torontoMonth()): boolean {
  if (!months.trim()) return true;
  const parts = months
    .split(/[–—-]/)
    .map((part) => part.trim().slice(0, 3).toLowerCase());
  if (parts.length !== 2) return true;
  const start = MONTHS[parts[0]];
  const end = MONTHS[parts[1]];
  if (!start || !end) return true;
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

export function orderForSeason<T extends { sortOrder: number; inSeasonMonths: string }>(
  rows: T[],
  month = torontoMonth(),
): T[] {
  return [...rows].sort((a, b) => {
    const aIn = isInSeason(a.inSeasonMonths, month) ? 0 : 1;
    const bIn = isInSeason(b.inSeasonMonths, month) ? 0 : 1;
    if (aIn !== bIn) return aIn - bIn;
    return a.sortOrder - b.sortOrder;
  });
}

export function fillCity(pattern: string, cityName: string): string {
  return pattern.replaceAll("{city}", cityName);
}

const locations: LocationOption[] = [
  { slug: ONTARIO.slug, name: "All of Ontario", group: "all" },
  ...data.cities.map((city) => ({ slug: city.slug, name: city.name, group: "city" as const })),
  ...data.regions.map((region) => ({
    slug: region.slug,
    name: region.name,
    group: "region" as const,
  })),
];

const locationBySlug = new Map(locations.map((location) => [location.slug, location]));

export function locationOptions(): LocationOption[] {
  return locations;
}

export function isLocationSlug(slug: string): boolean {
  return slug === ONTARIO.slug || locationBySlug.has(slug);
}

export function locationName(slug: string): string {
  if (slug === ONTARIO.slug) return ONTARIO.name;
  return locationBySlug.get(slug)?.name ?? ONTARIO.name;
}

export function taxonomyCounts() {
  return {
    categories: categories.length,
    publicCategories: publicCategories().length,
    subcategories: subcategories.length,
    placeTypes: placeTypes.length,
    livePlaceTypes: placeTypes.filter((row) => row.discoverStatus === "Live").length,
    parkedPlaceTypes: placeTypes.filter((row) => row.discoverStatus === "Parked").length,
    mergedPlaceTypes: placeTypes.filter((row) => row.discoverStatus === "Merged").length,
    cities: data.cities.length,
    regions: data.regions.length,
  };
}
