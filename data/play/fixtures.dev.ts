/**
 * DEV ONLY — fictional Indoor Play venues for filter previews and tests.
 *
 * Every name, address and price here is invented (example.org). Load only
 * through a gated preview catalog — never from a public Discover page.
 * Codes sit in the PE-9xx range so they cannot be confused with live PE-001
 * numbering (Amazing Fun Park and other researched venues).
 */

import type { IndoorPlayVenue } from "@/data/play/types";

export const DEV_ONLY_INDOOR_PLAY_FIXTURES = true as const;

const HOURS_CHECKED = "2026-10-12";
const PRICE_CHECKED = "2026-10-12";
const SRC = "https://example.org/indoor-play/dev";

/**
 * Mon–Thu 10–18 (weekday morning: 10:00 opens before 12:00). Friday is split
 * 10:30–14:30 and 15:30–20:00 — morning (10:30), after school (second row
 * overlaps 15:30–17:30), and evenings (Friday closes at 20:00, after 19:00).
 * Weekend 09–17. The only morning miss is a weekday open at 12:00 exactly.
 */
const daytimeHours = {
  checkedAt: HOURS_CHECKED,
  sourceUrl: SRC,
  rows: [
    ...([1, 2, 3, 4] as const).map((weekday) => ({
      weekday,
      opensAt: "10:00",
      closesAt: "18:00",
    })),
    // Split Friday: two rows; derivers treat either as open.
    { weekday: 5 as const, opensAt: "10:30", closesAt: "14:30" },
    { weekday: 5 as const, opensAt: "15:30", closesAt: "20:00" },
    { weekday: 6 as const, opensAt: "09:00", closesAt: "17:00" },
    { weekday: 7 as const, opensAt: "09:00", closesAt: "17:00" },
  ],
};

/**
 * Opens 09:00 every day (weekday morning) and stays to 20:00 (evenings).
 * Saturday closes after midnight.
 */
const earlyAndLateHours = {
  checkedAt: HOURS_CHECKED,
  sourceUrl: SRC,
  rows: [
    ...([1, 2, 3, 4, 5, 7] as const).map((weekday) => ({
      weekday,
      opensAt: "09:00",
      closesAt: "20:00",
    })),
    {
      weekday: 6 as const,
      opensAt: "10:00",
      closesAt: "00:30",
      closesNextDay: true,
    },
  ],
};

function price(
  amount: number | null,
  isFree: boolean,
): IndoorPlayVenue["weekdayChildPrice"] {
  return { amount, isFree, checkedAt: PRICE_CHECKED, sourceUrl: SRC };
}

const unsetManuals = {
  hasToddlerZone: null,
  hasToddlerTime: null,
  hasCafe: null,
  outsideFoodAllowed: null,
  gripSocksRequired: null,
  socksSoldOnSite: null,
  hostsParties: null,
  sessionType: null,
  sensoryFriendly: null,
  paDayHours: null,
  adultPrice: null,
  visitMode: null,
  area: null,
  hardMinimumAge: null,
  ageGroupsOverride: null,
  weeklyHours: null,
  ageMinMonths: null,
  ageMaxYears: null,
} satisfies Partial<IndoorPlayVenue>;

/** Free walk-in soft play with a published toddler range. */
const cedarNook: IndoorPlayVenue = {
  ...unsetManuals,
  code: "PE-901",
  name: "Cedar Nook Soft Play (dev)",
  slug: "cedar-nook-soft-play-dev",
  address: "10 Example Crescent, Mississauga ON",
  status: "open",
  publish: false,
  checkedAt: "2026-10-12",
  adminNotes: "DEV fixture — free venue. Do not publish.",
  ageMinMonths: 6,
  ageMaxYears: 5,
  weekdayChildPrice: price(0, true),
  weeklyHours: earlyAndLateHours,
  visitMode: "walk_in",
  area: "city_centre",
  activities: ["soft_play", "sensory_play"],
  hasToddlerZone: true,
  hasToddlerTime: true,
  sessionType: "timed_session",
};

/** Open venue whose weekday child price was not published — Call for price. */
const northQuay: IndoorPlayVenue = {
  ...unsetManuals,
  code: "PE-902",
  name: "North Quay Trampoline (dev)",
  slug: "north-quay-trampoline-dev",
  address: "200 Example Parkway, Mississauga ON",
  status: "open",
  publish: false,
  checkedAt: "2026-10-11",
  adminNotes: "DEV fixture — null price. Do not publish.",
  ageMinMonths: 36,
  ageMaxYears: 12,
  hardMinimumAge: 6,
  weekdayChildPrice: price(null, false),
  weeklyHours: daytimeHours,
  visitMode: "book_ahead",
  area: "meadowvale",
  activities: ["trampoline", "arcade"],
  gripSocksRequired: true,
  socksSoldOnSite: true,
  sessionType: "timed_session",
};

/** Booking-only loft — listed with a label, not hidden. */
const privateLoft: IndoorPlayVenue = {
  ...unsetManuals,
  code: "PE-903",
  name: "Private Loft Bookings (dev)",
  slug: "private-loft-bookings-dev",
  address: "88 Example Avenue, Unit 2, Mississauga ON",
  status: "booking_only",
  publish: false,
  checkedAt: "2026-10-10",
  adminNotes: "DEV fixture — booking_only. Do not publish.",
  ageMinMonths: 12,
  ageMaxYears: 10,
  weekdayChildPrice: price(29, false),
  weeklyHours: daytimeHours,
  visitMode: "private_booking_only",
  area: "heartland_argentia",
  activities: ["soft_play", "climbing"],
  hostsParties: true,
  sessionType: "unlimited_day_pass",
};

/**
 * Height-only rule ("under 130 cm") cannot become ages — override the groups.
 * Age min/max stay null so a deriver cannot invent a range.
 */
const heightGate: IndoorPlayVenue = {
  ...unsetManuals,
  code: "PE-904",
  name: "Height Gate Climb (dev)",
  slug: "height-gate-climb-dev",
  address: "55 Example Road, Mississauga ON",
  status: "open",
  publish: false,
  checkedAt: "2026-10-09",
  adminNotes: "DEV fixture — height-only age override. Do not publish.",
  ageGroupsOverride: ["kids", "big_kids"],
  weekdayChildPrice: price(22, false),
  weeklyHours: earlyAndLateHours,
  visitMode: "walk_in",
  area: "erin_mills_ridgeway",
  activities: ["climbing", "ninja_course"],
  sessionType: "timed_session",
};

export const indoorPlayDevVenues: IndoorPlayVenue[] = [
  cedarNook,
  northQuay,
  privateLoft,
  heightGate,
];
