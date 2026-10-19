/**
 * Indoor Play listing types — Mississauga Play & Entertainment filter model.
 *
 * SOURCE OF TRUTH for filter behaviour: the Indoor Play filter spec (chips,
 * More filters, and combined shortcuts). These shapes hold raw venue facts
 * only. Derived values (age groups, price band, when-windows, mixed ages,
 * rainy weekday morning) live in lib/play and are never stored here.
 *
 * Hard rules baked into the model (same discipline as data/camps/types.ts):
 * - Unknown is preserved. null never means "no", "free", or "not suitable".
 * - Prices and hours always carry a checkedAt date. UI shows hours
 *   "as of [checked date]" — never "Open now".
 * - sourceUrl on a price or hours set is admin-only — never shown publicly.
 * - adminNotes is for researchers only and must never be rendered publicly.
 * - A missing venue-published fact is "Not published by the venue". A fact
 *   we have not confirmed is "Not recorded". Do not guess a price.
 * - status and publish decide inclusion. Filter tags are not inclusion.
 */

/** ISO 8601 weekday: 1 = Monday ... 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Public listing status. closed never appears. booking_only appears with a
 * "Booking only" label. needs_check is hidden unless publish is true.
 */
export type IndoorPlayStatus =
  | "open"
  | "needs_check"
  | "booking_only"
  | "closed";

/**
 * Stored age-group ids. Bands overlap at their edges on purpose
 * (a 3–5 venue matches both Toddlers and Preschool).
 */
export type IndoorPlayAgeGroup =
  | "babies"
  | "toddlers"
  | "preschool"
  | "kids"
  | "big_kids"
  | "tweens_teens";

export type IndoorPlayVisitMode =
  | "walk_in"
  | "book_ahead"
  | "private_booking_only";

/** Mississauga areas. City itself comes from the site header, not this field. */
export type IndoorPlayArea =
  | "city_centre"
  | "erin_mills_ridgeway"
  | "heartland_argentia"
  | "applewood_dixie"
  | "cooksville_hurontario"
  | "meadowvale"
  | "airport_corridor";

export type IndoorPlayActivity =
  | "soft_play"
  | "trampoline"
  | "climbing"
  | "ninja_course"
  | "laser_tag"
  | "arcade"
  | "vr"
  | "mini_golf"
  | "sensory_play";

export type IndoorPlaySessionType = "unlimited_day_pass" | "timed_session";

/**
 * A money fact with the date it was checked. amount null is "Call for price"
 * — never fill it in. isFree is a verified $0 fact, not a missing amount.
 */
export type IndoorPlayDatedPrice = {
  /** CAD, before tax. Null = unknown (Call for price). */
  amount: number | null;
  isFree: boolean;
  /** ISO date (YYYY-MM-DD). */
  checkedAt: string;
  /** Researcher source. Never shown on cards, filters, or preview pages. */
  sourceUrl: string | null;
};

export type IndoorPlayAdultPrice = IndoorPlayDatedPrice & {
  /** Venue says the adult enters on the child's ticket. */
  includedWithChild: boolean;
};

export type IndoorPlayHoursRow = {
  weekday: IsoWeekday;
  /** "HH:MM" 24-hour local time. */
  opensAt: string;
  /**
   * "HH:MM" 24-hour local time. Later than opensAt on the same calendar day
   * unless closesNextDay is true (GlowZone-style Fri/Sat 10:00–00:30).
   */
  closesAt: string;
  /**
   * True when closesAt is on the following calendar day. Required for
   * after-midnight closes; do not encode those as "26:00".
   */
  closesNextDay?: boolean;
};

/**
 * Weekly hours as a set. checkedAt is required — never imply live status.
 *
 * A weekday may have multiple rows (split sessions, e.g. 10:30–14:30 and
 * 15:30–20:00). Phase 2 derivers treat the venue as open for a window if
 * any row on that day covers it. Weekday mornings means any Mon–Fri row
 * with opensAt before 12:00; opening at exactly 12:00 is not a morning.
 */
export type IndoorPlayWeeklyHours = {
  rows: IndoorPlayHoursRow[];
  /** ISO date (YYYY-MM-DD) the hours were last verified. */
  checkedAt: string;
  /** Researcher source. Never shown on cards, filters, or preview pages. */
  sourceUrl: string | null;
};

/**
 * One indoor-play location. Filter chips are derived from these fields;
 * only the "Source: Manual" columns are stored as tags.
 */
export type IndoorPlayVenue = {
  /** Live-site research code, e.g. "PE-001". */
  code: string;
  name: string;
  slug: string;
  address: string;
  status: IndoorPlayStatus;
  /**
   * Inclusion override for needs_check rows. open / booking_only / closed
   * ignore this; needs_check is public only when publish is true.
   */
  publish: boolean;
  /** ISO date the venue record as a whole was last checked. */
  checkedAt: string;
  /**
   * Researcher-only. Never shown on cards, filters, or preview pages.
   */
  adminNotes: string | null;

  /** Inclusive lower age in whole months, when published. */
  ageMinMonths: number | null;
  /** Inclusive upper age in whole years, when published. */
  ageMaxYears: number | null;
  /** Extra floor in whole years (e.g. laser tag 6+). */
  hardMinimumAge: number | null;
  /**
   * Manual age groups when a height-only rule cannot be turned into ages
   * (e.g. "under 130 cm"). Null means derive from the age fields.
   */
  ageGroupsOverride: IndoorPlayAgeGroup[] | null;

  /** Standard weekday entry for one child, before tax. */
  weekdayChildPrice: IndoorPlayDatedPrice;
  adultPrice: IndoorPlayAdultPrice | null;

  weeklyHours: IndoorPlayWeeklyHours | null;
  /** Manual: hosts special PA-day / holiday hours. */
  paDayHours: boolean | null;

  visitMode: IndoorPlayVisitMode | null;
  area: IndoorPlayArea | null;
  activities: IndoorPlayActivity[];

  hasToddlerZone: boolean | null;
  hasToddlerTime: boolean | null;
  hasCafe: boolean | null;
  outsideFoodAllowed: boolean | null;
  gripSocksRequired: boolean | null;
  socksSoldOnSite: boolean | null;
  hostsParties: boolean | null;
  sessionType: IndoorPlaySessionType | null;
  sensoryFriendly: boolean | null;
};
