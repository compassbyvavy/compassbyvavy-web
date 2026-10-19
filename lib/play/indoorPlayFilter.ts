/**
 * Indoor Play listing filters — derived facts and same-venue matching.
 *
 * Raw fields live on IndoorPlayVenue. Age groups, price band, when-windows,
 * mixed ages, and rainy-weekday-morning are computed here and never stored.
 *
 * Mirror of lib/camps/listingFilter.ts: EMPTY_* defaults, AND across filter
 * dimensions, OR within a multi-select, chip helpers, and URL sync.
 *
 * Hours are never "Open now". When-windows read weeklyHours rows only.
 */

import type {
  IndoorPlayActivity,
  IndoorPlayAgeGroup,
  IndoorPlayArea,
  IndoorPlayHoursRow,
  IndoorPlaySessionType,
  IndoorPlayStatus,
  IndoorPlayVenue,
  IndoorPlayVisitMode,
  IndoorPlayWeeklyHours,
  IsoWeekday,
} from "@/data/play/types";

/** Preview listing path — public Discover play stays coming_soon. */
export const INDOOR_PLAY_LISTING_PATH = "/discover/play/indoor/preview";

export type IndoorPlayPriceBand =
  | "free"
  | "under_15"
  | "15_25"
  | "25_35"
  | "35_plus"
  | "call_for_price";

export type IndoorPlayWhenWindow =
  | "weekday_mornings"
  | "after_school"
  | "weekends"
  | "evenings"
  | "pa_days";

export type IndoorPlayAdultsFact = "adult_free" | "adult_pays";

export type IndoorPlayFoodOption = "cafe" | "outside_food";

export type IndoorPlaySocksOption = "grip_required" | "sold_on_site";

/**
 * Applied browse filters. Empty / null / false means that dimension is off.
 * Multi-select arrays match any selected option. Single-choice fields match
 * the derived value exactly. Combined shortcuts are computed, not stored.
 */
export type IndoorPlayFilters = {
  ageGroups: IndoorPlayAgeGroup[];
  /** Single choice. */
  priceBand: IndoorPlayPriceBand | null;
  when: IndoorPlayWhenWindow[];
  /** Single choice. */
  visitMode: IndoorPlayVisitMode | null;
  /** Single choice. City itself comes from the site header. */
  area: IndoorPlayArea | null;
  activities: IndoorPlayActivity[];
  goodForToddlers: boolean;
  /** Single choice. */
  adults: IndoorPlayAdultsFact | null;
  food: IndoorPlayFoodOption[];
  socks: IndoorPlaySocksOption[];
  parties: boolean;
  /** Single choice. */
  sessionType: IndoorPlaySessionType | null;
  sensoryFriendly: boolean;
  mixedAges: boolean;
  rainyWeekdayMorning: boolean;
};

export const EMPTY_INDOOR_PLAY_FILTERS: IndoorPlayFilters = {
  ageGroups: [],
  priceBand: null,
  when: [],
  visitMode: null,
  area: null,
  activities: [],
  goodForToddlers: false,
  adults: null,
  food: [],
  socks: [],
  parties: false,
  sessionType: null,
  sensoryFriendly: false,
  mixedAges: false,
  rainyWeekdayMorning: false,
};

/** Weekday morning: any Mon–Fri row with opensAt strictly before this. */
export const WEEKDAY_MORNING_BEFORE = "12:00";
/** After school: weekday row overlaps this half-open window. */
export const AFTER_SCHOOL_START = "15:30";
export const AFTER_SCHOOL_END = "17:30";
/** Evenings: still open after this clock time, or closesNextDay. */
export const EVENING_AFTER = "19:00";

const WEEKDAYS: ReadonlySet<IsoWeekday> = new Set([1, 2, 3, 4, 5]);
const WEEKEND_DAYS: ReadonlySet<IsoWeekday> = new Set([6, 7]);

const AGE_BANDS: ReadonlyArray<{
  id: IndoorPlayAgeGroup;
  minYears: number;
  maxYears: number | null;
}> = [
  { id: "babies", minYears: 0, maxYears: 1 },
  { id: "toddlers", minYears: 1, maxYears: 3 },
  { id: "preschool", minYears: 3, maxYears: 5 },
  { id: "kids", minYears: 5, maxYears: 8 },
  { id: "big_kids", minYears: 8, maxYears: 12 },
  { id: "tweens_teens", minYears: 12, maxYears: null },
];

const MIXED_OLDER: ReadonlySet<IndoorPlayAgeGroup> = new Set([
  "kids",
  "big_kids",
  "tweens_teens",
]);

const AGE_GROUP_IDS: ReadonlySet<string> = new Set(
  AGE_BANDS.map((band) => band.id),
);

const PRICE_BAND_IDS: ReadonlySet<IndoorPlayPriceBand> = new Set([
  "free",
  "under_15",
  "15_25",
  "25_35",
  "35_plus",
  "call_for_price",
]);

const WHEN_IDS: ReadonlySet<IndoorPlayWhenWindow> = new Set([
  "weekday_mornings",
  "after_school",
  "weekends",
  "evenings",
  "pa_days",
]);

const VISIT_IDS: ReadonlySet<IndoorPlayVisitMode> = new Set([
  "walk_in",
  "book_ahead",
  "private_booking_only",
]);

const AREA_IDS: ReadonlySet<IndoorPlayArea> = new Set([
  "city_centre",
  "erin_mills_ridgeway",
  "heartland_argentia",
  "applewood_dixie",
  "cooksville_hurontario",
  "meadowvale",
  "airport_corridor",
]);

const ACTIVITY_IDS: ReadonlySet<IndoorPlayActivity> = new Set([
  "soft_play",
  "trampoline",
  "climbing",
  "ninja_course",
  "laser_tag",
  "arcade",
  "vr",
  "mini_golf",
  "sensory_play",
]);

const ADULTS_IDS: ReadonlySet<IndoorPlayAdultsFact> = new Set([
  "adult_free",
  "adult_pays",
]);

const FOOD_IDS: ReadonlySet<IndoorPlayFoodOption> = new Set([
  "cafe",
  "outside_food",
]);

const SOCKS_IDS: ReadonlySet<IndoorPlaySocksOption> = new Set([
  "grip_required",
  "sold_on_site",
]);

const SESSION_IDS: ReadonlySet<IndoorPlaySessionType> = new Set([
  "unlimited_day_pass",
  "timed_session",
]);

export const AGE_GROUP_CHIP_LABELS: Record<IndoorPlayAgeGroup, string> = {
  babies: "Babies (0–1)",
  toddlers: "Toddlers (1–3)",
  preschool: "Preschool (3–5)",
  kids: "Kids (5–8)",
  big_kids: "Big kids (8–12)",
  tweens_teens: "Tweens & teens (12+)",
};

export const PRICE_BAND_CHIP_LABELS: Record<IndoorPlayPriceBand, string> = {
  free: "Free",
  under_15: "Under $15",
  "15_25": "$15–25",
  "25_35": "$25–35",
  "35_plus": "$35+",
  call_for_price: "Call for price",
};

export const WHEN_CHIP_LABELS: Record<IndoorPlayWhenWindow, string> = {
  weekday_mornings: "Weekday mornings",
  after_school: "After school",
  weekends: "Weekends",
  evenings: "Evenings",
  pa_days: "PA days & holidays",
};

export const VISIT_CHIP_LABELS: Record<IndoorPlayVisitMode, string> = {
  walk_in: "Walk in",
  book_ahead: "Book ahead",
  private_booking_only: "Private booking only",
};

export const AREA_CHIP_LABELS: Record<IndoorPlayArea, string> = {
  city_centre: "City Centre",
  erin_mills_ridgeway: "Erin Mills/Ridgeway",
  heartland_argentia: "Heartland/Argentia",
  applewood_dixie: "Applewood/Dixie",
  cooksville_hurontario: "Cooksville/Hurontario",
  meadowvale: "Meadowvale",
  airport_corridor: "Airport corridor",
};

export const ACTIVITY_CHIP_LABELS: Record<IndoorPlayActivity, string> = {
  soft_play: "Soft play",
  trampoline: "Trampoline",
  climbing: "Climbing",
  ninja_course: "Ninja course",
  laser_tag: "Laser tag",
  arcade: "Arcade",
  vr: "VR",
  mini_golf: "Mini golf",
  sensory_play: "Sensory play",
};

export const ADULTS_CHIP_LABELS: Record<IndoorPlayAdultsFact, string> = {
  adult_free: "Adult enters free",
  adult_pays: "Adult pays",
};

export const FOOD_CHIP_LABELS: Record<IndoorPlayFoodOption, string> = {
  cafe: "Café on site",
  outside_food: "Outside food allowed",
};

export const SOCKS_CHIP_LABELS: Record<IndoorPlaySocksOption, string> = {
  grip_required: "Grip socks required",
  sold_on_site: "Sold on site",
};

export const SESSION_CHIP_LABELS: Record<IndoorPlaySessionType, string> = {
  unlimited_day_pass: "Unlimited day pass",
  timed_session: "Timed session",
};

function clockToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function rowSpanMinutes(
  row: IndoorPlayHoursRow,
): { open: number; close: number } | null {
  const open = clockToMinutes(row.opensAt);
  const close = clockToMinutes(row.closesAt);
  if (open == null || close == null) return null;
  const closeMinutes = row.closesNextDay ? close + 24 * 60 : close;
  return { open, close: closeMinutes };
}

function isWeekday(weekday: IsoWeekday): boolean {
  return WEEKDAYS.has(weekday);
}

/**
 * Half-open overlap: [open, close) vs [windowStart, windowEnd).
 * A row that only touches a boundary does not count.
 */
function rowOverlapsWindow(
  row: IndoorPlayHoursRow,
  windowStart: string,
  windowEnd: string,
): boolean {
  const span = rowSpanMinutes(row);
  const start = clockToMinutes(windowStart);
  const end = clockToMinutes(windowEnd);
  if (!span || start == null || end == null) return false;
  return span.open < end && span.close > start;
}

function hoursRows(hours: IndoorPlayWeeklyHours | null): IndoorPlayHoursRow[] {
  return hours?.rows ?? [];
}

/**
 * Height-only override wins. Otherwise overlap the published age range with
 * the overlapping bands (a 3–5 venue is both Toddlers and Preschool).
 * hardMinimumAge raises the floor in whole years after the published range.
 * Unknown ages stay empty — never invent a group.
 */
export function deriveAgeGroups(venue: IndoorPlayVenue): IndoorPlayAgeGroup[] {
  if (venue.ageGroupsOverride && venue.ageGroupsOverride.length > 0) {
    return [...venue.ageGroupsOverride];
  }

  const hasMin = venue.ageMinMonths != null;
  const hasMax = venue.ageMaxYears != null;
  if (!hasMin && !hasMax) return [];

  let minYears = hasMin ? venue.ageMinMonths! / 12 : 0;
  const maxYears = hasMax ? venue.ageMaxYears : null;
  if (venue.hardMinimumAge != null) {
    minYears = Math.max(minYears, venue.hardMinimumAge);
  }
  if (maxYears != null && minYears > maxYears) return [];

  return AGE_BANDS.filter((band) => {
    const bandMax = band.maxYears ?? Number.POSITIVE_INFINITY;
    const venueMax = maxYears ?? Number.POSITIVE_INFINITY;
    return minYears <= bandMax && venueMax >= band.minYears;
  }).map((band) => band.id);
}

/**
 * Free is only a verified isFree fact. Null amount (and not free) is
 * Call for price — never guessed. Band edges: <15, 15≤p<25, 25≤p<35, ≥35.
 */
export function derivePriceBand(venue: IndoorPlayVenue): IndoorPlayPriceBand {
  const price = venue.weekdayChildPrice;
  if (price.isFree) return "free";
  if (price.amount == null) return "call_for_price";
  if (price.amount < 15) return "under_15";
  if (price.amount < 25) return "15_25";
  if (price.amount < 35) return "25_35";
  return "35_plus";
}

function hasWeekdayMorning(rows: IndoorPlayHoursRow[]): boolean {
  const before = clockToMinutes(WEEKDAY_MORNING_BEFORE);
  if (before == null) return false;
  return rows.some((row) => {
    if (!isWeekday(row.weekday)) return false;
    const open = clockToMinutes(row.opensAt);
    return open != null && open < before;
  });
}

function hasAfterSchool(rows: IndoorPlayHoursRow[]): boolean {
  return rows.some(
    (row) =>
      isWeekday(row.weekday) &&
      rowOverlapsWindow(row, AFTER_SCHOOL_START, AFTER_SCHOOL_END),
  );
}

function hasWeekends(rows: IndoorPlayHoursRow[]): boolean {
  return rows.some((row) => WEEKEND_DAYS.has(row.weekday));
}

/**
 * Still open after 19:00 on any day — closesAt later than 19:00, or the
 * row crosses midnight. Opening at 19:00 or later is not the rule; a
 * 19:00–21:00 row still matches because it is open after 19:00.
 */
function hasEvenings(rows: IndoorPlayHoursRow[]): boolean {
  const after = clockToMinutes(EVENING_AFTER);
  if (after == null) return false;
  return rows.some((row) => {
    if (row.closesNextDay) return true;
    const close = clockToMinutes(row.closesAt);
    return close != null && close > after;
  });
}

/**
 * When-windows from weeklyHours rows (any covering row counts as open)
 * plus the manual PA-day flag. Missing hours stay empty for time windows.
 */
export function deriveWhen(venue: IndoorPlayVenue): IndoorPlayWhenWindow[] {
  const rows = hoursRows(venue.weeklyHours);
  const windows: IndoorPlayWhenWindow[] = [];
  if (hasWeekdayMorning(rows)) windows.push("weekday_mornings");
  if (hasAfterSchool(rows)) windows.push("after_school");
  if (hasWeekends(rows)) windows.push("weekends");
  if (hasEvenings(rows)) windows.push("evenings");
  if (venue.paDayHours === true) windows.push("pa_days");
  return windows;
}

/**
 * Adult enters free when the ticket is $0 or included with the child.
 * Unknown adultPrice does not become "pays".
 */
export function deriveAdults(
  venue: IndoorPlayVenue,
): IndoorPlayAdultsFact | null {
  const adult = venue.adultPrice;
  if (!adult) return null;
  if (adult.includedWithChild || adult.isFree || adult.amount === 0) {
    return "adult_free";
  }
  if (adult.amount != null && adult.amount > 0) return "adult_pays";
  return null;
}

/** Confirmed toddler zone or toddler time. Unknown is not "yes". */
export function deriveGoodForToddlers(venue: IndoorPlayVenue): boolean {
  return venue.hasToddlerZone === true || venue.hasToddlerTime === true;
}

/** Toddlers plus at least one older school-age band. */
export function deriveMixedAges(venue: IndoorPlayVenue): boolean {
  const groups = deriveAgeGroups(venue);
  return (
    groups.includes("toddlers") && groups.some((g) => MIXED_OLDER.has(g))
  );
}

/** Weekday mornings and a cheap (Free or Under $15) weekday child price. */
export function deriveRainyWeekdayMorning(venue: IndoorPlayVenue): boolean {
  if (!deriveWhen(venue).includes("weekday_mornings")) return false;
  const band = derivePriceBand(venue);
  return band === "free" || band === "under_15";
}

export function venueIsIncluded(venue: IndoorPlayVenue): boolean {
  if (venue.status === "closed") return false;
  if (venue.status === "needs_check") return venue.publish === true;
  return venue.status === "open" || venue.status === "booking_only";
}

export function bookingOnlyLabel(status: IndoorPlayStatus): string | null {
  return status === "booking_only" ? "Booking only" : null;
}

function anySelected<T>(selected: T[], actual: T[]): boolean {
  return selected.some((value) => actual.includes(value));
}

/**
 * True when every active filter passes on this venue. Multi-select is OR
 * within the dimension. Does not apply inclusion — use buildIndoorPlayResults.
 */
export function venueMatchesFilters(
  venue: IndoorPlayVenue,
  filters: IndoorPlayFilters,
): boolean {
  if (filters.ageGroups.length > 0) {
    if (!anySelected(filters.ageGroups, deriveAgeGroups(venue))) return false;
  }

  if (filters.priceBand && derivePriceBand(venue) !== filters.priceBand) {
    return false;
  }

  if (filters.when.length > 0) {
    if (!anySelected(filters.when, deriveWhen(venue))) return false;
  }

  if (filters.visitMode && venue.visitMode !== filters.visitMode) {
    return false;
  }

  if (filters.area && venue.area !== filters.area) {
    return false;
  }

  if (filters.activities.length > 0) {
    if (!anySelected(filters.activities, venue.activities)) return false;
  }

  if (filters.goodForToddlers && !deriveGoodForToddlers(venue)) {
    return false;
  }

  if (filters.adults && deriveAdults(venue) !== filters.adults) {
    return false;
  }

  if (filters.food.length > 0) {
    const facts: IndoorPlayFoodOption[] = [];
    if (venue.hasCafe === true) facts.push("cafe");
    if (venue.outsideFoodAllowed === true) facts.push("outside_food");
    if (!anySelected(filters.food, facts)) return false;
  }

  if (filters.socks.length > 0) {
    const facts: IndoorPlaySocksOption[] = [];
    if (venue.gripSocksRequired === true) facts.push("grip_required");
    if (venue.socksSoldOnSite === true) facts.push("sold_on_site");
    if (!anySelected(filters.socks, facts)) return false;
  }

  if (filters.parties && venue.hostsParties !== true) {
    return false;
  }

  if (filters.sessionType && venue.sessionType !== filters.sessionType) {
    return false;
  }

  if (filters.sensoryFriendly && venue.sensoryFriendly !== true) {
    return false;
  }

  if (filters.mixedAges && !deriveMixedAges(venue)) {
    return false;
  }

  if (filters.rainyWeekdayMorning && !deriveRainyWeekdayMorning(venue)) {
    return false;
  }

  return true;
}

export type IndoorPlayResultSet = {
  matches: IndoorPlayVenue[];
  count: number;
};

/**
 * Inclusion first (closed never; booking_only kept; needs_check only when
 * published), then filters. Stable name sort for a deterministic preview.
 */
export function buildIndoorPlayResults(
  venues: readonly IndoorPlayVenue[],
  filters: IndoorPlayFilters,
): IndoorPlayResultSet {
  const matches = venues
    .filter((venue) => venueIsIncluded(venue) && venueMatchesFilters(venue, filters))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  return { matches, count: matches.length };
}

export function formatIndoorPlayCounts(results: IndoorPlayResultSet): string {
  const word = results.count === 1 ? "place" : "places";
  return `${results.count} ${word}`;
}

export function countActiveFilters(filters: IndoorPlayFilters): number {
  let n = 0;
  if (filters.ageGroups.length) n += 1;
  if (filters.priceBand) n += 1;
  if (filters.when.length) n += 1;
  if (filters.visitMode) n += 1;
  if (filters.area) n += 1;
  if (filters.activities.length) n += 1;
  if (filters.goodForToddlers) n += 1;
  if (filters.adults) n += 1;
  if (filters.food.length) n += 1;
  if (filters.socks.length) n += 1;
  if (filters.parties) n += 1;
  if (filters.sessionType) n += 1;
  if (filters.sensoryFriendly) n += 1;
  if (filters.mixedAges) n += 1;
  if (filters.rainyWeekdayMorning) n += 1;
  return n;
}

export type IndoorPlayFilterChip = {
  id: string;
  label: string;
};

export function listActiveFilterChips(
  filters: IndoorPlayFilters,
): IndoorPlayFilterChip[] {
  const chips: IndoorPlayFilterChip[] = [];
  if (filters.mixedAges) {
    chips.push({ id: "mixed", label: "Mixed ages" });
  }
  if (filters.rainyWeekdayMorning) {
    chips.push({ id: "rainy", label: "Rainy weekday morning" });
  }
  for (const age of filters.ageGroups) {
    chips.push({ id: `age:${age}`, label: AGE_GROUP_CHIP_LABELS[age] ?? age });
  }
  if (filters.priceBand) {
    chips.push({
      id: "price",
      label: PRICE_BAND_CHIP_LABELS[filters.priceBand],
    });
  }
  for (const when of filters.when) {
    chips.push({
      id: `when:${when}`,
      label: WHEN_CHIP_LABELS[when] ?? when,
    });
  }
  if (filters.visitMode) {
    chips.push({
      id: "visit",
      label: VISIT_CHIP_LABELS[filters.visitMode],
    });
  }
  if (filters.area) {
    chips.push({ id: "area", label: AREA_CHIP_LABELS[filters.area] });
  }
  for (const activity of filters.activities) {
    chips.push({
      id: `act:${activity}`,
      label: ACTIVITY_CHIP_LABELS[activity] ?? activity,
    });
  }
  if (filters.goodForToddlers) {
    chips.push({ id: "toddlers", label: "Good for toddlers" });
  }
  if (filters.adults) {
    chips.push({ id: "adults", label: ADULTS_CHIP_LABELS[filters.adults] });
  }
  for (const food of filters.food) {
    chips.push({
      id: `food:${food}`,
      label: FOOD_CHIP_LABELS[food] ?? food,
    });
  }
  for (const socks of filters.socks) {
    chips.push({
      id: `socks:${socks}`,
      label: SOCKS_CHIP_LABELS[socks] ?? socks,
    });
  }
  if (filters.parties) {
    chips.push({ id: "parties", label: "Hosts birthday parties" });
  }
  if (filters.sessionType) {
    chips.push({
      id: "session",
      label: SESSION_CHIP_LABELS[filters.sessionType],
    });
  }
  if (filters.sensoryFriendly) {
    chips.push({ id: "sensory", label: "Sensory-friendly" });
  }
  return chips;
}

export function removeActiveFilterChip(
  filters: IndoorPlayFilters,
  chipId: string,
): IndoorPlayFilters {
  if (chipId === "price") return { ...filters, priceBand: null };
  if (chipId === "visit") return { ...filters, visitMode: null };
  if (chipId === "area") return { ...filters, area: null };
  if (chipId === "toddlers") return { ...filters, goodForToddlers: false };
  if (chipId === "adults") return { ...filters, adults: null };
  if (chipId === "parties") return { ...filters, parties: false };
  if (chipId === "session") return { ...filters, sessionType: null };
  if (chipId === "sensory") return { ...filters, sensoryFriendly: false };
  if (chipId === "mixed") return { ...filters, mixedAges: false };
  if (chipId === "rainy") return { ...filters, rainyWeekdayMorning: false };

  const split = chipId.indexOf(":");
  if (split === -1) return filters;
  const kind = chipId.slice(0, split);
  const value = chipId.slice(split + 1);

  if (kind === "age") {
    return {
      ...filters,
      ageGroups: filters.ageGroups.filter((id) => id !== value),
    };
  }
  if (kind === "when") {
    return { ...filters, when: filters.when.filter((id) => id !== value) };
  }
  if (kind === "act") {
    return {
      ...filters,
      activities: filters.activities.filter((id) => id !== value),
    };
  }
  if (kind === "food") {
    return { ...filters, food: filters.food.filter((id) => id !== value) };
  }
  if (kind === "socks") {
    return { ...filters, socks: filters.socks.filter((id) => id !== value) };
  }
  return filters;
}

export type IndoorPlayUrlState = {
  filters: IndoorPlayFilters;
};

function csv(values: string[]): string | null {
  return values.length ? values.join(",") : null;
}

function splitCsv(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickKnown<T extends string>(
  values: string[],
  allowed: ReadonlySet<T>,
): T[] {
  return values.filter((value): value is T => allowed.has(value as T));
}

/**
 * Serialize filters into the gated preview query string.
 * sourceUrl / adminNotes are never written to the URL.
 */
export function buildIndoorPlayHref(state: IndoorPlayUrlState): string {
  const p = new URLSearchParams();
  const f = state.filters;
  const ages = csv(f.ageGroups);
  if (ages) p.set("age", ages);
  if (f.priceBand) p.set("price", f.priceBand);
  const when = csv(f.when);
  if (when) p.set("when", when);
  if (f.visitMode) p.set("visit", f.visitMode);
  if (f.area) p.set("area", f.area);
  const act = csv(f.activities);
  if (act) p.set("act", act);
  if (f.goodForToddlers) p.set("toddlers", "1");
  if (f.adults) p.set("adults", f.adults);
  const food = csv(f.food);
  if (food) p.set("food", food);
  const socks = csv(f.socks);
  if (socks) p.set("socks", socks);
  if (f.parties) p.set("parties", "1");
  if (f.sessionType) p.set("session", f.sessionType);
  if (f.sensoryFriendly) p.set("sensory", "1");
  if (f.mixedAges) p.set("mixed", "1");
  if (f.rainyWeekdayMorning) p.set("rainy", "1");
  const qs = p.toString();
  return qs ? `${INDOOR_PLAY_LISTING_PATH}?${qs}` : INDOOR_PLAY_LISTING_PATH;
}

/**
 * Hydrate filters from the preview query. Unknown keys and invalid enums
 * are ignored so a stale URL cannot invent a filter.
 */
export function parseIndoorPlayHrefSearch(
  search: string | URLSearchParams,
): IndoorPlayUrlState {
  const p =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;

  const visitRaw = p.get("visit");
  const areaRaw = p.get("area");
  const priceRaw = p.get("price");
  const adultsRaw = p.get("adults");
  const sessionRaw = p.get("session");

  const filters: IndoorPlayFilters = {
    ...EMPTY_INDOOR_PLAY_FILTERS,
    ageGroups: pickKnown(splitCsv(p.get("age")), AGE_GROUP_IDS),
    priceBand:
      priceRaw && PRICE_BAND_IDS.has(priceRaw as IndoorPlayPriceBand)
        ? (priceRaw as IndoorPlayPriceBand)
        : null,
    when: pickKnown(splitCsv(p.get("when")), WHEN_IDS),
    visitMode:
      visitRaw && VISIT_IDS.has(visitRaw as IndoorPlayVisitMode)
        ? (visitRaw as IndoorPlayVisitMode)
        : null,
    area:
      areaRaw && AREA_IDS.has(areaRaw as IndoorPlayArea)
        ? (areaRaw as IndoorPlayArea)
        : null,
    activities: pickKnown(splitCsv(p.get("act")), ACTIVITY_IDS),
    goodForToddlers: p.get("toddlers") === "1",
    adults:
      adultsRaw && ADULTS_IDS.has(adultsRaw as IndoorPlayAdultsFact)
        ? (adultsRaw as IndoorPlayAdultsFact)
        : null,
    food: pickKnown(splitCsv(p.get("food")), FOOD_IDS),
    socks: pickKnown(splitCsv(p.get("socks")), SOCKS_IDS),
    parties: p.get("parties") === "1",
    sessionType:
      sessionRaw && SESSION_IDS.has(sessionRaw as IndoorPlaySessionType)
        ? (sessionRaw as IndoorPlaySessionType)
        : null,
    sensoryFriendly: p.get("sensory") === "1",
    mixedAges: p.get("mixed") === "1",
    rainyWeekdayMorning: p.get("rainy") === "1",
  };

  return { filters };
}
