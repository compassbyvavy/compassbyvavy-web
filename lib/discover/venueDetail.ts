/**
 * Venue detail view model — turns a VenueRecord into the sections of a venue
 * page, with honest empty states.
 *
 * Pure functions only: the page renders what this returns, and tests check it
 * without a browser. Section order follows the venue research checklist
 * (docs/discover/venue-detail.md).
 *
 * Rules:
 * - Only published, verified, currently open locations get a public page.
 * - Only facts marked verified (or conflicting, shown with the conflict) are
 *   used. needs_follow_up facts never reach the page.
 * - Unknown stays unknown: nothing verified → "Not confirmed", never a guess
 *   and never an empty label.
 * - Venue-published facts, reviewer-reported themes and first-hand visit
 *   notes stay separate. Review coverage is called partial, and a Google
 *   Places set is never presented as all Google reviews.
 */

import type { PlaceSetting } from "@/data/discover/types";
import type {
  AgeBand,
  AgeBandFit,
  ExperienceTheme,
  Provenance,
  ProviderAttribution,
  VenueActivity,
  VenueAmenity,
  VenueAmenityKind,
  VenueExperienceTheme,
  VenueLink,
  VenuePolicy,
  VenuePolicyKind,
  PriceChargeBasis,
  PriceDayType,
  VenuePrice,
  VenuePriceAudience,
  VenuePriceKind,
  VenueProgram,
  VenueRecord,
  VenueReviewSource,
} from "@/data/discover/venueTypes";
import {
  dbCategoriesFor,
  discoverCategoryForDb,
} from "@/lib/discover/categories";

/**
 * Automated review retrieval (Google Places, review summaries) is off: the
 * project has no approved Google Maps Platform integration or server key.
 * Review sources are entered by hand after a permitted manual check.
 */
export const AUTOMATED_REVIEW_RETRIEVAL_ENABLED = false;

/** Google Places returns at most five individual reviews per place. */
export const GOOGLE_PLACES_MAX_REVIEWS = 5;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-10-01" → "Oct 1, 2026". Invalid input returns null, never a guess. */
export function formatCheckedDate(iso: string | null | undefined): string | null {
  const m = typeof iso === "string" ? ISO_DATE.exec(iso) : null;
  if (!m) return null;
  const month = MONTHS[Number(m[2]) - 1];
  const day = Number(m[3]);
  const probe = new Date(`${iso}T00:00:00Z`);
  if (!month || Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== iso) {
    return null;
  }
  return `${month} ${day}, ${m[1]}`;
}

function isIsoDate(value: string | null | undefined): value is string {
  return formatCheckedDate(value) !== null;
}

function latestDate(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter(isIsoDate).sort();
  return valid.length ? valid[valid.length - 1] : null;
}

function isHttps(url: string | null | undefined): url is string {
  return typeof url === "string" && /^https:\/\/[^\s]+$/i.test(url);
}

/** A fact may appear publicly only when verified (or conflicting, with its note). */
export function isPublicFact(fact: Provenance): boolean {
  if (!isHttps(fact.sourceUrl) || !isIsoDate(fact.sourceCheckedDate)) return false;
  if (fact.verificationStatus === "verified") return true;
  return fact.verificationStatus === "conflicting" && Boolean(fact.conflictNote?.trim());
}

/** What every displayed fact carries so the page can show where it came from. */
export type FactMeta = {
  checked: string;
  /** Null only for first-hand visit notes. */
  sourceUrl: string | null;
  conflict: string | null;
  /**
   * True when the fact was checked on the same date as the page's own check
   * and has no conflict: the page then says the date once instead of on
   * every line, and the source stays in "How we verified this page".
   */
  routine?: boolean;
};

function meta(fact: Omit<Provenance, "sourceUrl"> & { sourceUrl?: string | null }): FactMeta {
  return {
    checked: formatCheckedDate(fact.sourceCheckedDate)!,
    sourceUrl: isHttps(fact.sourceUrl) ? fact.sourceUrl : null,
    conflict:
      fact.verificationStatus === "conflicting" ? fact.conflictNote?.trim() || null : null,
  };
}

/** Themes follow isPublicFact, except a first-hand visit note needs no web source. */
export function isPublicTheme(t: VenueExperienceTheme): boolean {
  if (t.basis === "first_hand_visit") {
    if (!isIsoDate(t.sourceCheckedDate)) return false;
    if (t.verificationStatus === "verified") return true;
    return t.verificationStatus === "conflicting" && Boolean(t.conflictNote?.trim());
  }
  if (t.basis === "reviewer_reported" && !t.reviewSourceId) return false;
  return isPublicFact({ ...t, sourceUrl: t.sourceUrl ?? "" });
}

// ---------------------------------------------------------------------------
// Publication gate and lookup
// ---------------------------------------------------------------------------

/**
 * True only for a published, verified, currently open location. Drafts,
 * archived rows, closed or unknown-status locations, and rows without a
 * source and checked date stay off public pages.
 */
export function isVenuePubliclyViewable(record: VenueRecord): boolean {
  const p = record.place;
  return (
    p.publicationState === "published" &&
    Boolean(p.publishedAt) &&
    p.operatingStatus === "open" &&
    isHttps(p.sourceUrl) &&
    isIsoDate(p.sourceCheckedDate)
  );
}

/**
 * Find the public venue for `/discover/<categorySlug>/<venueSlug>`. Returns
 * null for an unknown slug, a venue filed under another category, or any
 * venue that fails the publication gate — callers show the not-found page.
 * Never substitutes another branch.
 */
export function resolvePublicVenue(
  records: VenueRecord[],
  categorySlug: string,
  venueSlug: string,
): VenueRecord | null {
  const allowed = dbCategoriesFor(categorySlug);
  if (allowed.length === 0) return null;
  const record = records.find((r) => r.place.slug === venueSlug);
  if (!record) return null;
  if (!allowed.includes(record.place.category)) return null;
  return isVenuePubliclyViewable(record) ? record : null;
}

export function venueHref(record: VenueRecord): string | null {
  const category = discoverCategoryForDb(record.place.category);
  return category ? `/discover/${category.slug}/${record.place.slug}` : null;
}

// ---------------------------------------------------------------------------
// Shared formatting
// ---------------------------------------------------------------------------

function ageText(min?: number | null, max?: number | null): string | null {
  if (min != null && max != null) return min === max ? `Age ${min}` : `Ages ${min}–${max}`;
  if (min != null) return `Ages ${min}+`;
  if (max != null) return `Up to age ${max}`;
  return null;
}

function durationText(minutes?: number | null): string | null {
  if (minutes == null) return null;
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  if (minutes > 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${minutes} minutes`;
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function money(amount: number, currency: VenuePrice["currency"]): string {
  const text = amount.toLocaleString("en-CA", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency === "USD" ? `US$${text}` : `$${text}`;
}

// ---------------------------------------------------------------------------
// 1. Overview (identity)
// ---------------------------------------------------------------------------

const SETTING_LABELS: Record<Exclude<PlaceSetting, "unknown">, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  both: "Indoor and outdoor",
};

export type VenueOverview = {
  name: string;
  branchName: string | null;
  aliases: string[];
  categoryTitle: string | null;
  categoryHref: string | null;
  /** Primary type first. */
  types: Array<{ label: string; meta: FactMeta }>;
  cityName: string | null;
  address: string | null;
  setting: string | null;
  intro: string | null;
  /** Compass's own verdict, from the venue's published information. */
  compassTake: string | null;
  meta: FactMeta;
};

function overview(record: VenueRecord): VenueOverview {
  const p = record.place;
  const types = record.types
    .filter((t) => isPublicFact(t) && t.placeType.trim() !== "")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .filter((t, i, all) => all.findIndex((x) => x.placeType === t.placeType) === i)
    .map((t) => ({ label: t.placeType.trim(), meta: meta(t) }));
  const cityLine = [record.cityName?.trim(), "ON", p.postalCode?.trim()]
    .filter((v): v is string => Boolean(v))
    .join(" ");
  const address =
    p.addressLine?.trim() && record.cityName?.trim()
      ? `${p.addressLine.trim()}, ${cityLine}`
      : null;
  const category = discoverCategoryForDb(p.category);
  return {
    name: p.name,
    branchName: p.branchName?.trim() || null,
    aliases: (p.aliases ?? []).map((a) => a.trim()).filter(Boolean),
    categoryTitle: category?.title ?? null,
    categoryHref: category?.href ?? null,
    types,
    cityName: record.cityName?.trim() || null,
    address,
    setting: p.setting === "unknown" ? null : SETTING_LABELS[p.setting],
    intro: p.description?.trim() || null,
    compassTake: p.compassTake?.trim() || null,
    meta: {
      checked: formatCheckedDate(p.sourceCheckedDate)!,
      sourceUrl: p.sourceUrl!,
      conflict: null,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Parent decision snapshot
// ---------------------------------------------------------------------------

export const AGE_BANDS: ReadonlyArray<{ band: AgeBand; label: string; min: number; max: number }> = [
  { band: "0_2", label: "0–2", min: 0, max: 2 },
  { band: "3_5", label: "3–5", min: 3, max: 5 },
  { band: "6_9", label: "6–9", min: 6, max: 9 },
  { band: "10_12", label: "10–12", min: 10, max: 12 },
  { band: "13_17", label: "13–17", min: 13, max: 17 },
  { band: "adults", label: "Adults", min: 18, max: 120 },
];

const FIT_LABELS: Record<AgeBandFit, string> = {
  good: "Good fit",
  some: "Some things to do",
  limited: "Limited",
  not_suitable: "Not suitable",
};

export type AgeBandView = {
  band: AgeBand;
  label: string;
  fit: AgeBandFit | null;
  fitLabel: string;
  note: string | null;
  meta: FactMeta | null;
};

export type SnapshotView = {
  bestFitAges: string | null;
  ageBands: AgeBandView[];
  restrictions: RuleLine[];
  /** "Age guidance" unless the venue publishes height, weight or other limits. */
  restrictionsHeading: string;
  supervision: RuleLine[];
  activityLevel: ThemeView[];
  whoItSuits: ThemeView[];
  visitLength: { text: string; basis: string; checked: string } | null;
  rainyDay: string | null;
};

function snapshot(record: VenueRecord, policies: VenuePolicy[], themes: ThemeView[]): SnapshotView {
  const p = record.place;
  const bands = record.ageBands.filter(isPublicFact);
  const placeChecked = formatCheckedDate(p.sourceCheckedDate);
  const rule = (kinds: VenuePolicyKind[]) =>
    policies.filter((x) => kinds.includes(x.kind)).map(ruleLine);
  return {
    bestFitAges: p.allAges
      ? "All ages"
      : ageText(p.ageMin, p.ageMax),
    // Adults are listed only when the venue says something about them.
    ageBands: AGE_BANDS.filter(({ band }) => band !== "adults" || bands.some((b) => b.band === "adults")).map(({ band, label }) => {
      const hit = bands.find((b) => b.band === band);
      return {
        band,
        label,
        fit: hit?.fit ?? null,
        fitLabel: hit ? FIT_LABELS[hit.fit] : "Not confirmed",
        note: hit?.note?.trim() || null,
        meta: hit ? meta(hit) : null,
      };
    }),
    restrictions: rule(["age_guidance", "height_limit", "weight_limit", "restriction"]),
    restrictionsHeading: policies.some((x) => ["height_limit", "weight_limit", "restriction"].includes(x.kind))
      ? "Age, height and weight limits"
      : "Age guidance",
    supervision: rule(["supervision"]),
    activityLevel: themes.filter((t) => t.theme === "activity_level"),
    whoItSuits: themes.filter((t) => t.theme === "age_fit"),
    visitLength:
      typeof p.typicalVisitMinutes === "number" && p.typicalVisitMinutes > 0 && placeChecked
        ? {
            text: `About ${durationText(p.typicalVisitMinutes)}`,
            basis: p.typicalVisitNote?.trim()
              ? `${p.typicalVisitNote.trim()} — a Compass estimate, not a venue guarantee`
              : "Compass estimate from the venue's published session lengths and activities — not a venue guarantee",
            checked: placeChecked,
          }
        : null,
    rainyDay:
      p.setting === "indoor"
        ? "Works on a rainy day — the venue is indoors."
        : p.setting === "outdoor"
          ? "Weather-dependent — the venue is outdoors."
          : p.setting === "both"
            ? "Partly indoors — check which activities are outside before a rainy-day visit."
            : null,
  };
}

// ---------------------------------------------------------------------------
// 3. Activities, programs and amenities
// ---------------------------------------------------------------------------

export type ActivityView = {
  name: string;
  description: string | null;
  limits: string[];
  cost: string | null;
  schedule: string | null;
  meta: FactMeta;
};

function activityView(a: VenueActivity): ActivityView {
  const limits = [
    ageText(a.ageMin, a.ageMax),
    a.minHeightCm != null ? `At least ${a.minHeightCm} cm tall` : null,
    a.maxHeightCm != null ? `Up to ${a.maxHeightCm} cm tall` : null,
    a.maxWeightKg != null ? `Up to ${a.maxWeightKg} kg` : null,
    a.safetyNote?.trim() || null,
  ].filter((x): x is string => Boolean(x));
  const cost =
    a.includedInAdmission === "yes"
      ? "Included in admission"
      : a.includedInAdmission === "no"
        ? `Costs extra${a.extraCostNote?.trim() ? ` — ${a.extraCostNote.trim()}` : ""}`
        : null;
  const schedule =
    a.schedule === "always"
      ? "Available whenever the venue is open"
      : a.schedule === "scheduled"
        ? `Scheduled${a.scheduleNote?.trim() ? ` — ${a.scheduleNote.trim()}` : ""}`
        : null;
  return {
    name: a.name,
    description: a.description?.trim() || null,
    limits,
    cost,
    schedule,
    meta: meta(a),
  };
}

export type ProgramView = {
  name: string;
  description: string | null;
  when: string | null;
  ages: string | null;
  price: string | null;
  registrationUrl: string | null;
  meta: FactMeta;
};

function programView(p: VenueProgram, today: string): ProgramView | null {
  // A dated program that has ended is history, not a plan.
  if (p.cadence === "dated" && isIsoDate(p.endsOn) && p.endsOn < today) return null;
  const range =
    isIsoDate(p.startsOn) || isIsoDate(p.endsOn)
      ? [formatCheckedDate(p.startsOn), formatCheckedDate(p.endsOn)].filter(Boolean).join(" to ")
      : null;
  const cadence =
    p.cadence === "ongoing" ? "Ongoing" : p.cadence === "seasonal" ? "Seasonal" : "Specific dates";
  return {
    name: p.name,
    description: p.description?.trim() || null,
    when: [cadence, range, p.scheduleNote?.trim() || null].filter(Boolean).join(" · ") || null,
    ages: ageText(p.ageMin, p.ageMax),
    price: p.priceNote?.trim() || null,
    registrationUrl: isHttps(p.registrationUrl) ? p.registrationUrl : null,
    meta: meta(p),
  };
}

const AMENITY_LABELS: Record<VenueAmenityKind, string> = {
  washrooms: "Washrooms",
  change_table: "Baby changing",
  parent_seating: "Parent seating",
  viewing_area: "Viewing area",
  stroller_access: "Stroller access",
  stroller_storage: "Stroller storage",
  food_onsite: "Food and drinks on site",
  outside_food: "Outside food allowed",
  allergy_info: "Allergy information",
  lockers: "Lockers or storage",
  wheelchair_access: "Wheelchair access",
  accessible_parking: "Accessible parking",
  accessible_entrance: "Accessible entrance",
  parking: "Parking",
  sensory_supports: "Sensory supports",
  quiet_sessions: "Quiet or sensory-friendly sessions",
  grip_socks: "Grip socks",
  party_rooms: "Party rooms",
  wifi: "Wi-Fi",
  other: "Other",
};

/** The amenity checklist every venue page reports on, in display order. */
export const AMENITY_CHECKLIST: readonly VenueAmenityKind[] = [
  "washrooms",
  "change_table",
  "parent_seating",
  "viewing_area",
  "stroller_access",
  "stroller_storage",
  "food_onsite",
  "outside_food",
  "allergy_info",
  "lockers",
  "wheelchair_access",
  "accessible_entrance",
  "parking",
  "accessible_parking",
  "sensory_supports",
  "quiet_sessions",
  "wifi",
];

export type AmenityStatus = "confirmed" | "unavailable" | "not_confirmed";

export type AmenityView = {
  kind: VenueAmenityKind;
  label: string;
  status: AmenityStatus;
  statusLabel: string;
  note: string | null;
  meta: FactMeta | null;
};

function amenityViews(amenities: VenueAmenity[]): AmenityView[] {
  const facts = amenities.filter(isPublicFact);
  const listed: AmenityView[] = AMENITY_CHECKLIST.map((kind) => {
    const hit = facts.find((a) => a.amenity === kind);
    const status: AmenityStatus = !hit ? "not_confirmed" : hit.status === "yes" ? "confirmed" : "unavailable";
    return {
      kind,
      label: AMENITY_LABELS[kind],
      status,
      statusLabel: status === "confirmed" ? "Yes" : status === "unavailable" ? "No" : "Not confirmed",
      note: hit?.note?.trim() || null,
      meta: hit ? meta(hit) : null,
    };
  });
  // Extra verified amenities outside the checklist (party rooms, grip socks, labelled "other").
  const extras = facts
    .filter((a) => !AMENITY_CHECKLIST.includes(a.amenity))
    .filter((a) => a.amenity !== "other" || a.note?.trim())
    .map((a): AmenityView => ({
      kind: a.amenity,
      label: a.amenity === "other" ? a.note!.trim() : AMENITY_LABELS[a.amenity],
      status: a.status === "yes" ? "confirmed" : "unavailable",
      statusLabel: a.status === "yes" ? "Yes" : "No",
      note: a.amenity === "other" ? null : a.note?.trim() || null,
      meta: meta(a),
    }));
  return [...listed, ...extras];
}

// ---------------------------------------------------------------------------
// 4–5. Getting there, hours, booking and visit rules
// ---------------------------------------------------------------------------

export type RuleLine = { text: string; meta: FactMeta };

function ruleLine(p: VenuePolicy): RuleLine {
  return { text: p.body.trim(), meta: meta(p) };
}

const WEEKDAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

export type HoursRow = { day: string; ranges: string[] };

export type VenueHoursView =
  | { kind: "weekly"; rows: HoursRow[]; seasonal: string[]; checked: string | null }
  | { kind: "statement"; text: string; checked: string | null }
  | { kind: "unknown" };

function hoursView(record: VenueRecord): VenueHoursView {
  const p = record.place;
  const placeChecked = formatCheckedDate(p.sourceCheckedDate);
  switch (p.hoursKind) {
    case "dawn_to_dusk":
      return { kind: "statement", text: "Open dawn to dusk", checked: placeChecked };
    case "always_open":
      return { kind: "statement", text: "Open 24 hours", checked: placeChecked };
    case "varies":
      return {
        kind: "statement",
        text: "Hours change often — check the venue's website before you go",
        checked: placeChecked,
      };
    case "fixed": {
      const hours = record.hours.filter(
        (h) => h.weekday >= 1 && h.weekday <= 7 && h.opensAt < h.closesAt,
      );
      if (hours.length === 0) return { kind: "unknown" };
      const yearRound = hours.filter((h) => !h.validFrom && !h.validTo);
      const rows = WEEKDAYS.map((day, i) => ({
        day,
        ranges: yearRound
          .filter((h) => h.weekday === i + 1)
          .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
          .map((h) => `${formatTime(h.opensAt)} – ${formatTime(h.closesAt)}`),
      }));
      const seasonal = hours
        .filter((h) => h.validFrom || h.validTo)
        .map((h) => {
          const from = formatCheckedDate(h.validFrom) ?? "start not confirmed";
          const to = formatCheckedDate(h.validTo) ?? "end not confirmed";
          return `${WEEKDAYS[h.weekday - 1]} ${formatTime(h.opensAt)} – ${formatTime(h.closesAt)} (${from} to ${to})${h.notes ? ` · ${h.notes}` : ""}`;
        });
      return {
        kind: "weekly",
        rows,
        seasonal,
        checked: formatCheckedDate(latestDate(hours.map((h) => h.sourceCheckedDate)) ?? p.sourceCheckedDate),
      };
    }
    default:
      return { kind: "unknown" };
  }
}

export type LinkView = { label: string; href: string; display: string; meta: FactMeta };

const BOOKING_KINDS = ["booking", "tickets", "reservation", "registration"] as const;
const BOOKING_LABELS: Record<(typeof BOOKING_KINDS)[number], string> = {
  booking: "Book a visit",
  tickets: "Buy tickets",
  reservation: "Make a reservation",
  registration: "Register",
};

function linkView(link: VenueLink): LinkView | null {
  if (link.kind === "phone") {
    const digits = link.value.replace(/[^\d+]/g, "");
    if (digits.replace(/\D/g, "").length < 7) return null;
    return { label: link.label || "Phone", href: `tel:${digits}`, display: link.value, meta: meta(link) };
  }
  if (!isHttps(link.value)) return null;
  let display: string;
  try {
    display = new URL(link.value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const label =
    link.label ||
    (link.kind === "website" ? "Official website" : BOOKING_LABELS[link.kind as (typeof BOOKING_KINDS)[number]]);
  return { label, href: link.value, display, meta: meta(link) };
}

/** A maps search link from the verified address or coordinates; null if neither. */
export function directionsUrl(record: VenueRecord): string | null {
  const p = record.place;
  if (p.addressLine?.trim() && record.cityName?.trim()) {
    const q = [p.name, p.addressLine.trim(), record.cityName.trim(), "ON", p.postalCode?.trim()]
      .filter(Boolean)
      .join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  if (typeof p.latitude === "number" && typeof p.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`;
  }
  return null;
}

export type GettingThereView = {
  address: string | null;
  directionsUrl: string | null;
  parking: AmenityView[];
  transit: RuleLine[];
  locationNotes: RuleLine[];
};

export type VisitRulesView = {
  hours: VenueHoursView;
  hoursNotes: RuleLine[];
  bookingLinks: LinkView[];
  bookingRules: RuleLine[];
  waiver: RuleLine[];
  arrival: RuleLine[];
  dress: RuleLine[];
  food: RuleLine[];
  cancellation: RuleLine[];
  other: RuleLine[];
  website: LinkView | null;
  phone: LinkView | null;
};

// ---------------------------------------------------------------------------
// 6. Prices and offers
// ---------------------------------------------------------------------------

const AUDIENCE_LABELS: Record<VenuePriceAudience, string> = {
  child: "Child",
  adult: "Adult",
  infant: "Baby or toddler",
  non_participant: "Non-participating adult",
  family: "Family",
  group: "Group",
  other: "",
};

export type PriceLine = {
  id: string;
  label: string;
  audience: VenuePriceAudience;
  audienceLabel: string;
  amount: string;
  /** Numeric amount for the cost estimator; 0 when free. */
  value: number;
  details: string[];
  requiredAddon: boolean;
  chargeBasis: PriceChargeBasis;
  plusTax: boolean | null;
  kind: VenuePriceKind;
  isFree: boolean;
  ageMin: number | null;
  ageMax: number | null;
  /** Days the price applies to; null = any day. */
  dayType: PriceDayType | null;
  /** Adults admitted with this ticket at no extra cost; null = not stated. */
  adultsIncluded: number | null;
  /** The venue's notes, as published (also folded into details). */
  notes: string | null;
  meta: FactMeta;
};

export type PriceSection = { heading: string; kind: VenuePriceKind; lines: PriceLine[] };

const PRICE_SECTIONS: Array<{ kind: VenuePriceKind; heading: string }> = [
  { kind: "admission", heading: "Admission" },
  { kind: "addon", heading: "Extras" },
  { kind: "membership", heading: "Memberships" },
  { kind: "package", heading: "Packages" },
  { kind: "party", heading: "Birthday parties" },
  { kind: "group", heading: "Groups" },
  { kind: "promotion", heading: "Current offers" },
  { kind: "fee", heading: "Fees and taxes" },
];

function priceLine(price: VenuePrice): PriceLine | null {
  const value = price.isFree ? 0 : typeof price.amount === "number" && price.amount > 0 ? price.amount : null;
  if (value === null) return null;
  const details = [
    ageText(price.ageMin, price.ageMax),
    durationText(price.durationMinutes),
    price.includesNote?.trim() ? `Includes ${price.includesNote.trim()}` : null,
    price.eligibility?.trim() || null,
    price.kind === "promotion" && isIsoDate(price.validTo) ? `Ends ${formatCheckedDate(price.validTo)}` : null,
    price.notes?.trim() || null,
    price.plusTax === true ? "Plus tax" : null,
  ].filter((d): d is string => Boolean(d));
  return {
    id: price.id,
    label: price.label,
    audience: price.audience,
    audienceLabel: AUDIENCE_LABELS[price.audience],
    amount: price.isFree ? "Free" : money(value, price.currency),
    value,
    details,
    requiredAddon: price.requiredAddon,
    chargeBasis: price.chargeBasis ?? "unknown",
    plusTax: price.plusTax ?? null,
    kind: price.kind,
    isFree: price.isFree,
    ageMin: price.ageMin ?? null,
    ageMax: price.ageMax ?? null,
    dayType: price.dayType ?? null,
    adultsIncluded: typeof price.adultsIncluded === "number" ? price.adultsIncluded : null,
    notes: price.notes?.trim() || null,
    meta: meta(price),
  };
}

function priceSections(prices: VenuePrice[], today: string): PriceSection[] {
  const live = prices.filter(isPublicFact).filter(
    // Expired or undated promotions never show.
    (p) => p.kind !== "promotion" || (isIsoDate(p.validTo) && p.validTo >= today),
  );
  return PRICE_SECTIONS.map(({ kind, heading }) => ({
    heading,
    kind,
    lines: live
      .filter((p) => p.kind === kind)
      .map(priceLine)
      .filter((l): l is PriceLine => l !== null),
  })).filter((s) => s.lines.length > 0);
}

export type CostEstimatorModel = {
  /** Admission lines a child can use (child, baby/toddler, or any-participant tickets). */
  childOptions: PriceLine[];
  /** Admission lines an adult who takes part can use (adult or any-participant tickets). */
  participatingAdultOptions: PriceLine[];
  /** Admission lines for adults who only watch. */
  watchingAdultOptions: PriceLine[];
  /** Required extras with a stated charging rule — included in the estimate. */
  requiredAddons: PriceLine[];
  /** Required extras whose charging rule is not stated — left out, and named. */
  unpricedAddons: PriceLine[];
  /** Requirements with no recorded price (e.g. "SkySocks required") — left out, and named. */
  unpricedRequirements: string[];
  /** Assumptions shown beside the estimate. */
  assumptions: string[];
};

const BASIS_TEXT: Record<Exclude<PriceChargeBasis, "unknown">, string> = {
  per_child: "once per child",
  per_participant: "once per person taking part, adults who join in included",
  per_person: "once per person in your group, watchers included",
  per_booking: "once per visit",
};

function addonRuleText(l: Pick<PriceLine, "audience" | "chargeBasis">): string {
  const base = BASIS_TEXT[l.chargeBasis as Exclude<PriceChargeBasis, "unknown">];
  if (l.chargeBasis === "per_booking" || l.chargeBasis === "per_child") return base;
  if (l.audience === "child" || l.audience === "infant") return "once per child";
  if (l.audience === "adult") {
    return l.chargeBasis === "per_participant" ? "once per adult taking part" : "once per adult, watchers included";
  }
  if (l.audience === "non_participant") return "once per adult who only watches";
  return base;
}

/**
 * Inputs for the family cost estimator, or null when there is no verified
 * admission price a child could use.
 */
export function costEstimatorModel(
  sections: PriceSection[],
  unpricedRequirements: string[] = [],
): CostEstimatorModel | null {
  const admission = sections.find((s) => s.kind === "admission")?.lines ?? [];
  const childOptions = admission.filter((l) => ["child", "infant", "other"].includes(l.audience));
  if (childOptions.length === 0) return null;
  const participatingAdultOptions = admission.filter((l) => l.audience === "adult" || l.audience === "other");
  const watchingAdultOptions = admission.filter((l) => l.audience === "non_participant");
  const required = (sections.find((s) => s.kind === "addon")?.lines ?? []).filter((l) => l.requiredAddon);
  const requiredAddons = required.filter((l) => l.chargeBasis !== "unknown");
  const unpricedAddons = required.filter((l) => l.chargeBasis === "unknown");
  const used = [...childOptions, ...participatingAdultOptions, ...watchingAdultOptions, ...requiredAddons];
  const assumptions = [
    "Uses only the verified prices listed above, for the people you add.",
    ...requiredAddons.map((l) => `Adds ${l.label.toLowerCase()} (${l.amount}) ${addonRuleText(l)}, as the venue states.`),
    ...unpricedAddons.map(
      (l) => `Leaves out ${l.label.toLowerCase()} (${l.amount}): required, but the venue doesn't say who it's charged for.`,
    ),
    ...unpricedRequirements.map((r) => `Leaves out a required item whose price isn't recorded — ${r}.`),
    watchingAdultOptions.length
      ? "Adults who only watch are charged the watching-adult price listed."
      : "No price is recorded for adults who only watch, so they are left out — check with the venue.",
    "Excludes optional extras, food, parking, memberships and offers.",
  ];
  if (used.some((l) => l.plusTax === true)) {
    assumptions.push("Prices marked \"plus tax\" are before tax; the estimate does not add tax.");
  }
  if (used.some((l) => l.plusTax === null)) {
    assumptions.push("The venue doesn't say whether some prices include tax.");
  }
  return {
    childOptions,
    participatingAdultOptions,
    watchingAdultOptions,
    requiredAddons,
    unpricedAddons,
    unpricedRequirements,
    assumptions,
  };
}

export type CostEstimateInput = {
  children: number;
  childLineId: string | null;
  participatingAdults: number;
  participatingAdultLineId: string | null;
  watchingAdults: number;
  watchingAdultLineId: string | null;
};

export type CostEstimate = {
  total: number;
  /** Which prices were used, line by line. */
  lines: Array<{ label: string; quantity: number; unit: string; subtotal: number }>;
  /** People or items left out because no verified price applies. */
  excluded: string[];
};

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * How many of a required extra a group needs, from the extra's audience and
 * charging rule. The audience narrows who it applies to (a child-only extra is
 * never charged to adults; an adult extra never to children); the charging
 * rule says whether watchers count and whether it is once per visit.
 */
export function requiredAddonQuantity(
  addon: Pick<PriceLine, "audience" | "chargeBasis">,
  group: { children: number; playingAdults: number; watchers: number; people: number },
): number {
  const { children, playingAdults, watchers, people } = group;
  const childOnly = addon.audience === "child" || addon.audience === "infant";
  switch (addon.chargeBasis) {
    case "per_child":
      return children;
    case "per_participant":
      if (childOnly) return children;
      if (addon.audience === "adult") return playingAdults;
      if (addon.audience === "non_participant") return 0;
      return children + playingAdults;
    case "per_person":
      if (childOnly) return children;
      if (addon.audience === "adult") return playingAdults + watchers;
      if (addon.audience === "non_participant") return watchers;
      return people;
    case "per_booking":
      return people > 0 ? 1 : 0;
    default:
      return 0;
  }
}

/** Estimate a family's cost. Returns null when a chosen price line is not valid for its group. */
export function estimateFamilyCost(model: CostEstimatorModel, input: CostEstimateInput): CostEstimate | null {
  const count = (n: number) => Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  const children = count(input.children);
  const playingAdults = count(input.participatingAdults);
  const watchers = count(input.watchingAdults);
  const lines: CostEstimate["lines"] = [];
  const excluded: string[] = [];

  const admit = (qty: number, options: PriceLine[], id: string | null, who: string): boolean => {
    if (qty === 0) return true;
    if (options.length === 0) {
      excluded.push(`${qty} ${who}: no verified price`);
      return true;
    }
    const line = options.find((l) => l.id === id);
    if (!line) return false;
    lines.push({ label: `${line.label} (${who})`, quantity: qty, unit: line.amount, subtotal: roundCents(qty * line.value) });
    return true;
  };
  if (!admit(children, model.childOptions, input.childLineId, children === 1 ? "child" : "children")) return null;
  if (!admit(playingAdults, model.participatingAdultOptions, input.participatingAdultLineId, playingAdults === 1 ? "adult taking part" : "adults taking part")) return null;
  if (!admit(watchers, model.watchingAdultOptions, input.watchingAdultLineId, watchers === 1 ? "adult watching" : "adults watching")) return null;

  const people = children + playingAdults + watchers;
  for (const addon of model.requiredAddons) {
    const qty = requiredAddonQuantity(addon, { children, playingAdults, watchers, people });
    if (qty > 0) {
      lines.push({ label: addon.label, quantity: qty, unit: addon.amount, subtotal: roundCents(qty * addon.value) });
    }
  }
  for (const a of model.unpricedAddons) excluded.push(`${a.label}: charging rule not stated`);
  for (const r of model.unpricedRequirements) excluded.push(`a required item with no recorded price (${r.replace(/\.$/, "")})`);

  return { total: roundCents(lines.reduce((sum, l) => sum + l.subtotal, 0)), lines, excluded };
}

// ---------------------------------------------------------------------------
// 9. Parent experience and review sources
// ---------------------------------------------------------------------------

const THEME_LABELS: Record<ExperienceTheme, string> = {
  age_fit: "Who it suits",
  activity_level: "How active it is",
  parent_seating: "Parent seating",
  supervision: "Supervision",
  busy_times: "Busy times",
  cleanliness: "Cleanliness",
  staff: "Staff",
  value: "Value",
  friction: "Things to know",
  other: "Also mentioned",
};

export type ThemeView = {
  theme: ExperienceTheme;
  heading: string;
  summary: string;
  mixed: boolean;
  sourceName: string | null;
  meta: FactMeta;
};

function themeView(t: VenueExperienceTheme, sources: Map<string, VenueReviewSource>): ThemeView | null {
  const summary = t.summary.trim();
  if (!summary || summary.length > 400) return null;
  return {
    theme: t.theme,
    heading: THEME_LABELS[t.theme],
    summary,
    mixed: t.agreement === "mixed",
    sourceName: t.reviewSourceId ? sources.get(t.reviewSourceId)?.sourceName ?? null : null,
    meta: meta(t),
  };
}

export type ExperienceView = {
  /** limited: too little, too thin or conflicting evidence to summarise with confidence. */
  status: "available" | "limited";
  liked: ThemeView[];
  concerns: ThemeView[];
  otherReported: ThemeView[];
  venuePublished: ThemeView[];
  firstHand: ThemeView[];
  hasDisagreement: boolean;
};

/** A full summary needs at least two reviewer themes drawn from two or more sources. */
const MIN_REVIEWER_THEMES = 2;
const MIN_REVIEWER_SOURCES = 2;

function experienceView(record: VenueRecord, usableSources: VenueReviewSource[]): ExperienceView {
  const sources = new Map(usableSources.map((s) => [s.id, s]));
  const facts = record.experienceThemes.filter(isPublicTheme);
  const reviewerFacts = facts.filter(
    (t) => t.basis === "reviewer_reported" && t.reviewSourceId && sources.has(t.reviewSourceId),
  );
  const views = (list: VenueExperienceTheme[]) =>
    list.map((t) => themeView(t, sources)).filter((v): v is ThemeView => v !== null);
  const reviewer = reviewerFacts.map((t) => ({ t, v: themeView(t, sources) })).filter((x) => x.v);
  const liked = reviewer.filter((x) => x.t.sentiment === "liked").map((x) => x.v!);
  const concerns = reviewer.filter((x) => x.t.sentiment === "concern").map((x) => x.v!);
  const otherReported = reviewer.filter((x) => x.t.sentiment === "neutral").map((x) => x.v!);
  const venuePublished = views(facts.filter((t) => t.basis === "venue_published"));
  const firstHand = views(facts.filter((t) => t.basis === "first_hand_visit"));
  const hasDisagreement =
    reviewer.some((x) => x.v!.mixed) || venuePublished.some((t) => t.mixed);
  const reviewerSourceCount = new Set(reviewerFacts.map((t) => t.reviewSourceId)).size;
  const enough =
    reviewer.length >= MIN_REVIEWER_THEMES &&
    reviewerSourceCount >= MIN_REVIEWER_SOURCES &&
    !hasDisagreement;
  return {
    status: enough ? "available" : "limited",
    liked,
    concerns,
    otherReported,
    venuePublished,
    firstHand,
    hasDisagreement,
  };
}

export type ReviewSourceView = {
  name: string;
  href: string;
  kindLabel: string;
  accessed: string;
  coverageNote: string;
  selectionMethod: string | null;
  sample: string | null;
  period: string | null;
  statedRating: string | null;
  disclosure: string | null;
  attributions: ProviderAttribution[];
};

export type ReviewsView = {
  customer: ReviewSourceView[];
  editorial: ReviewSourceView[];
  /** Plain statement of how complete the review coverage is. */
  coverage: string;
  lastChecked: string | null;
  automatedRetrieval: boolean;
  /** Sources withheld because provider attribution requirements were not met. */
  withheldCount: number;
};

function validAttributions(list: ProviderAttribution[] | null | undefined): ProviderAttribution[] {
  return (list ?? []).filter((a) => a && a.name?.trim() && isHttps(a.uri));
}

/**
 * Whether a review source may be shown. Google sources need provider
 * attributions with links (and a review summary needs Google's exact
 * disclosure); individual Google reviews are capped at five.
 */
export function reviewSourceDisplayable(s: VenueReviewSource): boolean {
  if (!isPublicFact(s) || !s.coverageNote.trim()) return false;
  if ((s.kind === "editorial") !== (s.platform === "blog_or_guide")) return false;
  if (s.kind === "editorial" && (s.statedRating != null || s.statedRatingCount != null)) return false;
  if (s.platform === "google_places_reviews") {
    if (validAttributions(s.providerAttributions).length === 0) return false;
    if (s.itemsReviewed != null && s.itemsReviewed > GOOGLE_PLACES_MAX_REVIEWS) return false;
  }
  if (s.platform === "google_review_summary") {
    if (!s.providerDisclosure?.trim()) return false;
    if (validAttributions(s.providerAttributions).length === 0) return false;
  }
  return true;
}

function reviewSourceView(s: VenueReviewSource): ReviewSourceView {
  const rating =
    s.kind === "customer_reviews" && typeof s.statedRating === "number" && typeof s.ratingScale === "number"
      ? `${s.statedRating} out of ${s.ratingScale} as shown by ${s.sourceName} on ${formatCheckedDate(s.sourceCheckedDate)}${
          typeof s.statedRatingCount === "number" ? `, from ${s.statedRatingCount} ratings` : ""
        }`
      : null;
  const sample =
    typeof s.itemsReviewed === "number"
      ? s.platform === "google_places_reviews"
        ? `${s.itemsReviewed} reviews returned by Google Places (it returns at most ${GOOGLE_PLACES_MAX_REVIEWS}) — not all Google reviews`
        : s.kind === "editorial"
          ? `${s.itemsReviewed} ${s.itemsReviewed === 1 ? "article" : "articles"} read`
          : `${s.itemsReviewed} ${s.itemsReviewed === 1 ? "review" : "reviews"} read`
      : null;
  const period =
    isIsoDate(s.periodFrom) || isIsoDate(s.periodTo)
      ? `Covers ${formatCheckedDate(s.periodFrom) ?? "an unknown start"} to ${formatCheckedDate(s.periodTo) ?? "an unknown end"}`
      : null;
  return {
    name: s.sourceName,
    href: s.sourceUrl,
    kindLabel: s.kind === "editorial" ? "Editorial" : "Customer reviews",
    accessed: formatCheckedDate(s.sourceCheckedDate)!,
    coverageNote: s.coverageNote.trim(),
    selectionMethod: s.selectionMethod?.trim() || null,
    sample,
    period,
    statedRating: rating,
    disclosure: s.providerDisclosure?.trim() || null,
    attributions: validAttributions(s.providerAttributions),
  };
}

function reviewsView(usable: VenueReviewSource[], withheldCount: number): ReviewsView {
  const customer = usable.filter((s) => s.kind === "customer_reviews").map(reviewSourceView);
  const editorial = usable.filter((s) => s.kind === "editorial").map(reviewSourceView);
  let coverage: string;
  if (usable.length === 0) {
    coverage = "No permitted review or editorial sources have been checked for this location yet.";
  } else {
    const parts = [
      customer.length
        ? `${customer.length} customer-review ${customer.length === 1 ? "source" : "sources"}`
        : "no customer-review sources",
      editorial.length
        ? `${editorial.length} editorial ${editorial.length === 1 ? "source" : "sources"}`
        : "no editorial sources",
    ];
    coverage = `Partial coverage: ${parts.join(" and ")}. These are samples, not every review of this venue.`;
  }
  return {
    customer,
    editorial,
    coverage,
    lastChecked: formatCheckedDate(latestDate(usable.map((s) => s.sourceCheckedDate))),
    automatedRetrieval: AUTOMATED_REVIEW_RETRIEVAL_ENABLED,
    withheldCount,
  };
}

// ---------------------------------------------------------------------------
// 10. Sources and freshness
// ---------------------------------------------------------------------------

export type SourceRow = {
  url: string;
  host: string;
  supports: string[];
  lastChecked: string;
};

export type ConflictRow = { fact: string; note: string };

function sourcesView(record: VenueRecord, visible: Array<{ label: string; fact: Provenance }>): {
  sources: SourceRow[];
  conflicts: ConflictRow[];
} {
  const rows = new Map<string, { supports: Set<string>; dates: string[] }>();
  const add = (url: string, date: string, label: string) => {
    const row = rows.get(url) ?? { supports: new Set<string>(), dates: [] };
    row.supports.add(label);
    row.dates.push(date);
    rows.set(url, row);
  };
  add(record.place.sourceUrl!, record.place.sourceCheckedDate!, "Venue details");
  for (const { label, fact } of visible) add(fact.sourceUrl, fact.sourceCheckedDate, label);
  const sources = [...rows].map(([url, row]) => {
    let host = url;
    try {
      const u = new URL(url);
      host = `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
    } catch {
      /* keep url */
    }
    return {
      url,
      host,
      supports: [...row.supports],
      lastChecked: formatCheckedDate(latestDate(row.dates))!,
    };
  });
  const conflicts = visible
    .filter(({ fact }) => fact.verificationStatus === "conflicting")
    .map(({ label, fact }) => ({ fact: label, note: fact.conflictNote!.trim() }));
  return { sources, conflicts };
}

// ---------------------------------------------------------------------------
// Prices by day (weekday vs weekend) and the family price preview
// ---------------------------------------------------------------------------

export const DAY_LABELS: Record<PriceDayType, string> = {
  weekday: "Weekdays",
  weekend_holiday: "Weekends and holidays",
};

/** One row of a weekday / weekend price table. */
export type DayPriceRow = {
  label: string;
  weekday: PriceLine | null;
  weekend: PriceLine | null;
  /** A price that applies any day (shown in both columns). */
  anyDay: PriceLine | null;
  /** Notes: shared ones once, day-specific ones prefixed with the day. */
  details: string[];
};

const noteParts = (l: PriceLine | null): string[] =>
  l?.notes ? l.notes.split(" · ").map((x) => x.trim()).filter(Boolean) : [];

/**
 * Group price lines into weekday / weekend rows by label and age range.
 * Returns null when no line is tied to a day (show a plain list instead).
 */
export function dayPriceRows(lines: PriceLine[]): DayPriceRow[] | null {
  if (!lines.some((l) => l.dayType)) return null;
  const rows: DayPriceRow[] = [];
  const keyOf = (l: PriceLine) => `${l.label}|${l.audience}|${l.ageMin ?? ""}|${l.ageMax ?? ""}`;
  const index = new Map<string, DayPriceRow>();
  for (const l of lines) {
    const key = keyOf(l);
    let row = index.get(key);
    if (!row) {
      row = { label: l.label, weekday: null, weekend: null, anyDay: null, details: [] };
      index.set(key, row);
      rows.push(row);
    }
    if (l.dayType === "weekday") row.weekday = l;
    else if (l.dayType === "weekend_holiday") row.weekend = l;
    else row.anyDay = l;
  }
  for (const row of rows) {
    if (row.anyDay) {
      row.details = noteParts(row.anyDay);
      continue;
    }
    const a = noteParts(row.weekday);
    const b = noteParts(row.weekend);
    row.details = [
      ...a.filter((x) => b.includes(x)),
      ...a.filter((x) => !b.includes(x)).map((x) => `Weekdays: ${x}`),
      ...b.filter((x) => !a.includes(x)).map((x) => `Weekends: ${x}`),
    ];
  }
  return rows;
}

/** Ontario HST, used only for the "about … with tax" line beside a plus-tax total. */
export const ONTARIO_HST_RATE = 0.13;

export type FamilyPriceModel = {
  /** Admission tickets a child can use, each tied to an age range. */
  tickets: PriceLine[];
  extraAdult: PriceLine | null;
  /** Days with their own prices, in display order. */
  days: PriceDayType[];
  packages: PriceLine[];
  /** Grip socks sold on site, when the venue publishes a price. */
  socks: PriceLine | null;
  /** Age-band fit, to tell parents how each child will find it. */
  bands: AgeBandView[];
  adultsNote: string | null;
};

/**
 * The age-based family price preview, or null when the venue's admission
 * prices aren't tied to ages and days (the general cost estimator is used then).
 */
export function familyPriceModel(sections: PriceSection[]): FamilyPriceModel | null {
  const admission = sections.find((s) => s.kind === "admission")?.lines ?? [];
  const tickets = admission.filter(
    (l) => ["child", "infant"].includes(l.audience) && (l.ageMin !== null || l.ageMax !== null),
  );
  const days = (["weekday", "weekend_holiday"] as const).filter((d) => tickets.some((t) => t.dayType === d));
  if (tickets.length === 0 || days.length === 0) return null;
  const extraAdult = admission.find((l) => l.audience === "adult" && !l.dayType) ?? null;
  return {
    tickets,
    extraAdult,
    days: [...days],
    packages: (sections.find((s) => s.kind === "package")?.lines ?? []).filter(
      (l) => l.audience === "family",
    ),
    socks: (sections.find((s) => s.kind === "addon")?.lines ?? []).find((l) => /socks/i.test(l.label)) ?? null,
    bands: [],
    adultsNote: tickets.filter((t) => !t.isFree).every((t) => t.adultsIncluded === 1)
      ? [
          "One adult is included with each paid child ticket.",
          tickets.some((t) => t.isFree) && extraAdult
            ? `Adults with only a free baby pay ${extraAdult.amount}.`
            : null,
        ]
          .filter(Boolean)
          .join(" ")
      : null,
  };
}

export type FamilyPriceInput = {
  ages: number[];
  adults: number;
  day: PriceDayType;
  /** Buying grip socks on site for each child with a paid ticket. */
  /** Pairs of grip socks to buy on site (some children may bring their own). */
  socks?: number;
};

export type FamilyPrice = {
  lines: Array<{ label: string; quantity: number; unit: string; subtotal: number }>;
  total: number;
  /** Total with Ontario HST, when every price used is "plus tax"; else null. */
  withTax: number | null;
  adultsIncluded: number;
  extraAdults: number;
  /** Ages with no published ticket for that day. */
  unmatchedAges: number[];
  notes: string[];
  /** Family packages for that day worth comparing. */
  packages: PriceLine[];
  /** A family package that covers this group for less, with the saving. */
  better: { label: string; amount: string; total: number; saving: number; includes: string | null } | null;
  /** Grip socks bought on site, when chosen. */
  socksSubtotal: number;
  socksPairs: number;
  /** The cheapest way in (package or tickets) plus socks, before tax. */
  bestTotal: number;
  /** bestTotal with Ontario HST when every price used is plus tax; else null. */
  bestWithTax: number | null;
  /** How each child is likely to find it, from the venue's age guidance. */
  fit: Array<{ age: number; fitLabel: string; note: string | null }>;
};

/** "3 children and 2 adults" → { children: 3, adults: 2 }. */
function packageSize(l: PriceLine): { children: number; adults: number } | null {
  const text = l.details.find((d) => d.startsWith("Includes")) ?? "";
  const m = /(\d+)\s+child(?:ren)?\s+and\s+(\d+)\s+adults?/i.exec(text);
  return m ? { children: Number(m[1]), adults: Number(m[2]) } : null;
}

/** The ticket for one child: the narrowest published age range that fits, for that day. */
export function ticketForAge(model: FamilyPriceModel, age: number, day: PriceDayType): PriceLine | null {
  const whole = Math.floor(age);
  const fits = model.tickets.filter(
    (t) =>
      (t.dayType === day || t.dayType === null) &&
      whole >= (t.ageMin ?? 0) &&
      whole <= (t.ageMax ?? 120),
  );
  if (fits.length === 0) return null;
  const width = (t: PriceLine) => (t.ageMax ?? 120) - (t.ageMin ?? 0);
  return fits.sort((a, b) => width(a) - width(b) || a.value - b.value)[0];
}

export function familyPrice(model: FamilyPriceModel, input: FamilyPriceInput): FamilyPrice {
  const ages = input.ages.filter((a) => Number.isFinite(a) && a >= 0 && a < 18).map(Math.floor);
  const adults = Math.max(0, Math.floor(Number.isFinite(input.adults) ? input.adults : 0));
  const counts = new Map<string, { line: PriceLine; qty: number }>();
  const unmatchedAges: number[] = [];
  for (const age of ages) {
    const t = ticketForAge(model, age, input.day);
    if (!t) {
      unmatchedAges.push(age);
      continue;
    }
    const c = counts.get(t.id) ?? { line: t, qty: 0 };
    c.qty += 1;
    counts.set(t.id, c);
  }
  const lines: FamilyPrice["lines"] = [];
  let adultsIncluded = 0;
  for (const { line, qty } of counts.values()) {
    adultsIncluded += (line.adultsIncluded ?? 0) * qty;
    lines.push({ label: line.label, quantity: qty, unit: line.amount, subtotal: roundCents(qty * line.value) });
  }
  const extraAdults = Math.max(0, adults - adultsIncluded);
  const notes: string[] = [];
  const used = [...counts.values()].map((c) => c.line);
  if (extraAdults > 0) {
    if (model.extraAdult) {
      lines.push({
        label: model.extraAdult.label,
        quantity: extraAdults,
        unit: model.extraAdult.amount,
        subtotal: roundCents(extraAdults * model.extraAdult.value),
      });
      used.push(model.extraAdult);
    } else {
      notes.push(`No price is recorded for ${extraAdults === 1 ? "the extra adult" : `${extraAdults} extra adults`} — check with the venue.`);
    }
  }
  if (adultsIncluded > 0 && adults > 0) {
    const covered = Math.min(adults, adultsIncluded);
    notes.push(
      covered === adults
        ? `${adults === 1 ? "Your adult is" : `All ${adults} adults are`} covered by the children's tickets.`
        : `${covered} ${covered === 1 ? "adult is" : "adults are"} covered by the children's tickets.`,
    );
  }
  const paidChildren = [...counts.values()].filter((c) => !c.line.isFree).reduce((n, c) => n + c.qty, 0);
  const pairs = Math.max(0, Math.min(10, Math.floor(Number.isFinite(input.socks ?? 0) ? input.socks ?? 0 : 0)));
  const socksSubtotal = model.socks && pairs > 0 ? roundCents(pairs * model.socks.value) : 0;
  if (socksSubtotal > 0 && model.socks) {
    lines.push({
      label: model.socks.label,
      quantity: pairs,
      unit: model.socks.amount,
      subtotal: socksSubtotal,
    });
  }
  const total = roundCents(lines.reduce((sum, l) => sum + l.subtotal, 0));
  const allPlusTax = used.length > 0 && used.filter((l) => !l.isFree).every((l) => l.plusTax === true);
  // A family package that covers the same group for less.
  let better: FamilyPrice["better"] = null;
  const ticketsTotal = roundCents(
    [...counts.values()].reduce((sum, c) => sum + c.qty * c.line.value, 0) +
      (model.extraAdult ? extraAdults * model.extraAdult.value : 0),
  );
  for (const pkg of model.packages.filter((p) => p.dayType === input.day || p.dayType === null)) {
    const size = packageSize(pkg);
    if (!size || paidChildren === 0 || paidChildren > size.children || unmatchedAges.length) continue;
    const extra = Math.max(0, adults - size.adults);
    if (extra > 0 && !model.extraAdult) continue;
    const pkgTotal = roundCents(pkg.value + extra * (model.extraAdult?.value ?? 0));
    if (pkgTotal < ticketsTotal && (!better || pkgTotal < better.total)) {
      better = {
        label: pkg.label,
        amount: pkg.amount,
        total: pkgTotal,
        saving: roundCents(ticketsTotal - pkgTotal),
        includes: pkg.details.find((d) => d.startsWith("Includes"))?.replace(/^Includes /, "") ?? null,
      };
    }
  }
  const bestTotal = better ? roundCents(better.total + socksSubtotal) : total;
  const fit = ages.map((age) => {
    const def = AGE_BANDS.find((b) => age >= b.min && age <= b.max);
    const band = def ? model.bands.find((b) => b.band === def.band) : undefined;
    let note = band?.fit ? band.note : null;
    // A band note about free entry is wrong for a child in that band who pays
    // (a 2-year-old in the 0–2 band buys the Ages 2–3 ticket): name the ticket instead.
    const ticket = ticketForAge(model, age, input.day);
    if (note && /\bfree\b/i.test(note) && ticket && !ticket.isFree) note = `Uses the ${ticket.label} ticket`;
    return { age, fitLabel: band?.fit ? band.fitLabel : "Not confirmed", note };
  });
  return {
    lines,
    total,
    withTax: allPlusTax && total > 0 ? roundCents(total * (1 + ONTARIO_HST_RATE)) : null,
    adultsIncluded,
    extraAdults,
    unmatchedAges,
    notes,
    packages: ages.length >= 2 ? model.packages.filter((p) => p.dayType === input.day || p.dayType === null) : [],
    better,
    fit,
    socksSubtotal,
    socksPairs: socksSubtotal > 0 ? pairs : 0,
    bestTotal,
    bestWithTax: allPlusTax && bestTotal > 0 ? roundCents(bestTotal * (1 + ONTARIO_HST_RATE)) : null,
  };
}

// ---------------------------------------------------------------------------
// "Good to know" strip and "Check with the venue" (derived only from verified facts)
// ---------------------------------------------------------------------------

function money0(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export type QuickFact = { label: string; value: string };

/** "$34.95–$39.95" for the everyday child ticket across days, or one amount. */
function everydayChildPrice(admission: PriceLine[]): { label: string; value: string } | null {
  const paid = admission.filter((l) => l.audience === "child" && !l.isFree);
  if (!paid.length) return null;
  const width = (l: PriceLine) => (l.ageMax ?? 17) - (l.ageMin ?? 0);
  const widest = paid.slice().sort((a, b) => width(b) - width(a))[0];
  const same = paid.filter((l) => l.label === widest.label);
  const lo = Math.min(...same.map((l) => l.value));
  const hi = Math.max(...same.map((l) => l.value));
  return { label: widest.label, value: lo === hi ? widest.amount : `${money(lo, "CAD")}–${money(hi, "CAD")}` };
}

/** The four facts a parent decides on, each from verified data only. */
export function quickFacts(record: VenueRecord, sections: PriceSection[]): { facts: QuickFact[]; note: string | null } {
  const p = record.place;
  const facts: QuickFact[] = [];
  if (p.allAges) facts.push({ label: "Ages", value: "All ages" });
  else if (typeof p.ageMin === "number" && typeof p.ageMax === "number") {
    facts.push({ label: "Best ages", value: `${p.ageMin}–${p.ageMax}` });
  }
  const admission = sections.find((s) => s.kind === "admission")?.lines ?? [];
  const freeBaby = admission.find((l) => l.isFree && l.audience === "infant");
  if (freeBaby) {
    facts.push({
      label: "Babies",
      value: typeof freeBaby.ageMax === "number" ? `Under ${freeBaby.ageMax + 1} free` : "Free",
    });
  }
  const timed = admission.find((l) => !l.isFree && l.audience === "child" && l.details.some((d) => /hour|minute/.test(d)));
  const duration = timed?.details.find((d) => /hour|minute/.test(d));
  if (duration) facts.push({ label: "Visit length", value: duration });
  const price = everydayChildPrice(admission);
  if (price) facts.push({ label: price.label, value: price.value });
  if (p.setting === "indoor" && facts.length < 4) facts.push({ label: "Rainy day", value: "Indoors" });
  const paidChild = admission.filter((l) => l.audience === "child" && !l.isFree);
  const note =
    paidChild.length && paidChild.every((l) => l.adultsIncluded === 1)
      ? "One adult included per paid child."
      : null;
  return { facts: facts.slice(0, 4), note };
}

/** Everyday details parents ask about that aren't confirmed yet. */
const CHECK_WITH_VENUE: readonly VenueAmenityKind[] = ["parking", "washrooms", "change_table"];

function checkWithVenue(amenities: AmenityView[]): string[] {
  return CHECK_WITH_VENUE.filter((k) =>
    amenities.some((a) => a.kind === k && a.status === "not_confirmed"),
  ).map((k) => AMENITY_LABELS[k]);
}

// ---------------------------------------------------------------------------
// Before-you-go checklist (derived only from verified facts)

// ---------------------------------------------------------------------------

function beforeYouGo(
  policies: VenuePolicy[],
  requiredAddons: PriceLine[],
  bookingLinks: LinkView[],
): string[] {
  const items: string[] = [];
  const has = (kind: VenuePolicyKind) => policies.filter((p) => p.kind === kind);
  for (const p of has("booking_rule")) items.push(p.body.trim());
  if (!has("booking_rule").length && bookingLinks.length) items.push("Check availability with the booking link before you go.");
  for (const p of has("waiver")) items.push(p.body.trim());
  for (const p of has("dress_socks")) items.push(p.body.trim());
  for (const p of has("supervision")) items.push(p.body.trim());
  // Payment rules the venue states (e.g. cashless) matter at the door.
  for (const p of has("other").filter((x) => /\bcash/i.test(x.body))) items.push(p.body.trim());
  const who: Record<PriceChargeBasis, string> = {
    per_child: "required for each child",
    per_participant: "required for each person taking part",
    per_person: "required for each person",
    per_booking: "required once per visit",
    unknown: "required; check with the venue who needs it",
  };
  for (const a of requiredAddons) {
    items.push(`Budget for ${a.label.toLowerCase()} (${a.amount}) — ${who[a.chargeBasis]}.`);
  }
  for (const p of has("arrival")) items.push(p.body.trim());
  for (const p of has("food_rule")) items.push(p.body.trim());
  return [...new Set(items.filter(Boolean))];
}

// ---------------------------------------------------------------------------
// Whole page
// ---------------------------------------------------------------------------

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** A video link the venue publishes: YouTube (embedded privacy-enhanced) or an https video file. */
function videoFrom(links: VenueLink[]): VenueDetailView["video"] {
  const v = links.find((l) => l.kind === "video" && isHttps(l.value));
  if (!v) return null;
  const title = v.label?.trim() || "Venue video";
  try {
    const url = new URL(v.value);
    const host = url.hostname.replace(/^www\./, "");
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : host === "youtube.com" || host === "m.youtube.com"
          ? url.searchParams.get("v") ?? url.pathname.replace(/^\/(shorts|embed)\//, "")
          : null;
    if (id && YOUTUBE_ID.test(id)) return { kind: "youtube", id, title };
    if (/\.(mp4|webm)$/i.test(url.pathname)) return { kind: "file", src: v.value, title };
  } catch {
    return null;
  }
  return null;
}

/** The before-you-go list split into what to do at home and what to expect at the door. */
export type BeforeYouGoGroups = { home: string[]; atVenue: string[] };

function beforeYouGoGroups(
  policies: VenuePolicy[],
  requiredAddons: PriceLine[],
  bookingLinks: LinkView[],
  socks: PriceLine | null,
): BeforeYouGoGroups {
  // Things a parent can finish before leaving home get tick boxes; venue rules
  // are listed plainly so they're never "ticked off".
  const all = beforeYouGo(policies, requiredAddons, bookingLinks);
  const bodies = (kinds: VenuePolicyKind[]) =>
    new Set(policies.filter((p) => kinds.includes(p.kind)).map((p) => p.body.trim()));
  const taskKinds: VenuePolicyKind[] = socks ? ["booking_rule", "waiver"] : ["booking_rule", "waiver", "dress_socks"];
  const taskBodies = bodies(taskKinds);
  const home = all.filter((i) => taskBodies.has(i) || i.startsWith("Budget for") || i.startsWith("Check availability"));
  if (socks && !requiredAddons.length) {
    home.push(`Pack grip socks for each child, or buy them there (${socks.amount} a pair).`);
  }
  return { home, atVenue: all.filter((i) => !home.includes(i)) };
}

export type VenueDetailView = {
  overview: VenueOverview;
  snapshot: SnapshotView;
  activities: ActivityView[];
  notOffered: ActivityView[];
  programs: ProgramView[];
  gettingThere: GettingThereView;
  visit: VisitRulesView;
  prices: PriceSection[];
  /** Admission as a weekday / weekend table, or null when prices aren't tied to days. */
  admissionRows: DayPriceRow[] | null;
  /** Price sections other than admission and parties (extras, passes, memberships…). */
  otherPrices: PriceSection[];
  /** Age-based family price preview; null when prices aren't tied to ages and days. */
  familyPrice: FamilyPriceModel | null;
  parties: { rows: DayPriceRow[] | null; lines: PriceLine[]; rules: RuleLine[] };
  quickFacts: QuickFact[];
  quickNote: string | null;
  /** Everyday child ticket price, for the booking bar and card. */
  priceFrom: string | null;
  /** Every listed activity is included in admission. */
  activitiesAllIncluded: boolean;
  /** An official video: a YouTube embed or a video file the venue supplied. */
  video: { kind: "youtube"; id: string; title: string } | { kind: "file"; src: string; title: string } | null;
  checkWithVenue: string[];
  /** Year-round weekly hours (ISO weekday, "HH:MM"), for "usual hours today". */
  weeklyHours: Array<{ weekday: number; opensAt: string; closesAt: string }>;
  /** The first booking or tickets link, for the header button. */
  primaryBooking: LinkView | null;
  primaryType: string | null;
  costEstimator: CostEstimatorModel | null;
  amenities: AmenityView[];
  experience: ExperienceView;
  reviews: ReviewsView;
  beforeYouGo: string[];
  beforeYouGoGroups: BeforeYouGoGroups;
  /** For "How we verified this page". */
  verification: { facts: number; lastChecked: string; conflicts: number };
  sources: SourceRow[];
  conflicts: ConflictRow[];
  /** Ages for the "Will this work for my kids?" tool. */
  ageTool: {
    bands: AgeBandView[];
    activities: Array<{ name: string; ageMin: number | null; ageMax: number | null }>;
  };
};

export type BuildVenueOptions = {
  /** ISO date used to hide expired offers and finished programs. */
  today: string;
};

/** Build the page model. Call only for records that passed isVenuePubliclyViewable. */
export function buildVenueDetailView(record: VenueRecord, options: BuildVenueOptions): VenueDetailView {
  if (!isVenuePubliclyViewable(record)) {
    throw new Error("buildVenueDetailView called for a venue that is not publicly viewable");
  }
  const today = isIsoDate(options.today) ? options.today : "9999-12-31";
  const policies = record.policies.filter((p) => isPublicFact(p) && p.body.trim() !== "");
  const usableSources = record.reviewSources.filter(reviewSourceDisplayable);
  const experience = experienceView(record, usableSources);
  const allThemes = [
    ...experience.venuePublished,
    ...experience.liked,
    ...experience.concerns,
    ...experience.otherReported,
  ];
  const publicActivities = record.activities.filter(isPublicFact);
  const links = record.links.filter(isPublicFact);
  const linkViews = links.map((l) => ({ kind: l.kind, view: linkView(l) }));
  const pick = (kind: VenueLink["kind"]) => linkViews.find((l) => l.kind === kind && l.view)?.view ?? null;
  const bookingLinks = linkViews
    .filter((l) => (BOOKING_KINDS as readonly string[]).includes(l.kind) && l.view)
    .map((l) => l.view!);
  const prices = priceSections(record.prices, today);
  const amenities = amenityViews(record.amenities);
  const programs = record.programs
    .filter(isPublicFact)
    .map((p) => programView(p, today))
    .filter((p): p is ProgramView => p !== null);
  const rules = (kinds: VenuePolicyKind[]) => policies.filter((p) => kinds.includes(p.kind)).map(ruleLine);
  const snap = snapshot(record, policies, allThemes);
  const requiredAddons = (prices.find((s) => s.kind === "addon")?.lines ?? []).filter((l) => l.requiredAddon);

  const visibleFacts: Array<{ label: string; fact: Provenance }> = [
    ...record.types.filter(isPublicFact).map((f) => ({ label: `Type: ${f.placeType}`, fact: f })),
    ...record.ageBands.filter(isPublicFact).map((f) => ({ label: "Age suitability", fact: f })),
    ...publicActivities.map((f) => ({ label: `Activity: ${f.name}`, fact: f })),
    ...record.prices.filter(isPublicFact).map((f) => ({ label: `Price: ${f.label}`, fact: f })),
    ...record.programs.filter(isPublicFact).map((f) => ({ label: `Program: ${f.name}`, fact: f })),
    ...record.amenities.filter(isPublicFact).map((f) => ({ label: `Amenity: ${AMENITY_LABELS[f.amenity]}`, fact: f })),
    ...policies.map((f) => ({ label: "Visit rules", fact: f })),
    ...links.map((f) => ({ label: "Links and contact", fact: f })),
    ...record.experienceThemes
      .filter((t) => isPublicTheme(t) && isHttps(t.sourceUrl))
      .map((f) => ({ label: "Parent experience", fact: { ...f, sourceUrl: f.sourceUrl! } })),
    ...usableSources.map((f) => ({ label: `Reviews: ${f.sourceName}`, fact: f })),
  ];
  const { sources, conflicts } = sourcesView(record, visibleFacts);

  const admissionLines = prices.find((s) => s.kind === "admission")?.lines ?? [];
  const partyLines = prices.find((s) => s.kind === "party")?.lines ?? [];
  const familyModel = familyPriceModel(prices);
  const ov = overview(record);

  const view: VenueDetailView = {
    overview: ov,
    admissionRows: dayPriceRows(admissionLines),
    otherPrices: prices.filter((s) => s.kind !== "admission" && s.kind !== "party"),
    familyPrice: familyModel,
    parties: { rows: dayPriceRows(partyLines), lines: partyLines, rules: rules(["party"]) },
    ...(() => {
      const q = quickFacts(record, prices);
      return { quickFacts: q.facts, quickNote: q.note };
    })(),
    priceFrom: everydayChildPrice(admissionLines)?.value ?? null,
    activitiesAllIncluded:
      publicActivities.filter((a) => a.availability === "available").length > 1 &&
      publicActivities.filter((a) => a.availability === "available").every((a) => a.includedInAdmission === "yes"),
    video: videoFrom(links),
    checkWithVenue: checkWithVenue(amenities),
    primaryBooking: bookingLinks[0] ?? null,
    weeklyHours:
      record.place.hoursKind === "fixed"
        ? record.hours
            .filter((h) => !h.validFrom && !h.validTo && h.opensAt < h.closesAt)
            .map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt }))
        : [],
    primaryType: ov.types[0]?.label ?? null,
    snapshot: snap,
    activities: publicActivities.filter((a) => a.availability === "available").map(activityView),
    notOffered: publicActivities.filter((a) => a.availability === "not_offered").map(activityView),
    programs,
    gettingThere: {
      address: overview(record).address,
      directionsUrl: directionsUrl(record),
      parking: amenities.filter(
        (a) => (a.kind === "parking" || a.kind === "accessible_parking") && a.status !== "not_confirmed",
      ),
      transit: rules(["transit"]),
      locationNotes: rules(["location_note"]),
    },
    visit: {
      hours: hoursView(record),
      hoursNotes: rules(["hours_note"]),
      bookingLinks,
      bookingRules: rules(["booking_rule"]),
      waiver: rules(["waiver"]),
      arrival: rules(["arrival"]),
      dress: rules(["dress_socks"]),
      food: rules(["food_rule"]),
      cancellation: rules(["cancellation"]),
      other: rules(["other"]),
      website: pick("website"),
      phone: pick("phone"),
    },
    prices,
    costEstimator: costEstimatorModel(
      prices,
      // A required item the venue sells but whose price isn't recorded (e.g. grip socks).
      requiredAddons.length === 0
        ? policies.filter((p) => p.kind === "dress_socks" && /required|must/i.test(p.body)).map((p) => p.body.trim().replace(/\.$/, ""))
        : [],
    ),
    amenities,
    experience,
    reviews: reviewsView(usableSources, record.reviewSources.length - usableSources.length),
    beforeYouGo: beforeYouGo(policies, requiredAddons, bookingLinks),
    beforeYouGoGroups: beforeYouGoGroups(
      policies,
      requiredAddons,
      bookingLinks,
      (prices.find((s) => s.kind === "addon")?.lines ?? []).find((l) => /socks/i.test(l.label)) ?? null,
    ),
    verification: {
      facts: visibleFacts.length,
      lastChecked: formatCheckedDate(latestDate([record.place.sourceCheckedDate, ...visibleFacts.map((f) => f.fact.sourceCheckedDate)]))!,
      conflicts: conflicts.length,
    },
    sources,
    conflicts,
    ageTool: {
      bands: snap.ageBands,
      activities: publicActivities
        .filter((a) => a.availability === "available")
        .map((a) => ({ name: a.name, ageMin: a.ageMin ?? null, ageMax: a.ageMax ?? null })),
    },
  };
  if (view.familyPrice) view.familyPrice.bands = snap.ageBands;
  markRoutine(view, ov.meta.checked);
  return view;
}

/** Mark every fact checked on the page's own check date (and undisputed) as routine. */
function markRoutine(node: unknown, pageChecked: string, seen = new Set<object>()): void {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const x of node) markRoutine(x, pageChecked, seen);
    return;
  }
  const o = node as Record<string, unknown>;
  if (typeof o.checked === "string" && "sourceUrl" in o && "conflict" in o) {
    o.routine = o.checked === pageChecked && !o.conflict;
    return;
  }
  for (const v of Object.values(o)) markRoutine(v, pageChecked, seen);
}

/** "Will this work for my kids?" — per child, which listed activities fit their age. */
export function ageCheck(
  tool: VenueDetailView["ageTool"],
  age: number,
): { band: AgeBandView | null; fits: string[]; tooYoung: string[]; tooOld: string[]; noAgeInfo: string[] } {
  const whole = Math.floor(age);
  const bandDef = AGE_BANDS.find((b) => whole >= b.min && whole <= b.max) ?? null;
  const band = bandDef ? tool.bands.find((b) => b.band === bandDef.band) ?? null : null;
  const fits: string[] = [];
  const tooYoung: string[] = [];
  const tooOld: string[] = [];
  const noAgeInfo: string[] = [];
  for (const a of tool.activities) {
    if (a.ageMin == null && a.ageMax == null) noAgeInfo.push(a.name);
    else if (a.ageMin != null && whole < a.ageMin) tooYoung.push(a.name);
    else if (a.ageMax != null && whole > a.ageMax) tooOld.push(a.name);
    else fits.push(a.name);
  }
  return { band, fits, tooYoung, tooOld, noAgeInfo };
}
