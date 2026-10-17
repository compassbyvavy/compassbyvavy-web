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
  sourceUrl: string;
  conflict: string | null;
};

function meta(fact: Provenance): FactMeta {
  return {
    checked: formatCheckedDate(fact.sourceCheckedDate)!,
    sourceUrl: fact.sourceUrl,
    conflict:
      fact.verificationStatus === "conflicting" ? fact.conflictNote?.trim() || null : null,
  };
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
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
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

/** Shown beside Compass best-fit ages so they are not read as an operator rule. */
export const COMPASS_BEST_FIT_EXPLANATION =
  "Compass recommendation from verified age-band fit. It is not the operator's admission rule.";

export type SnapshotView = {
  /** Operator age range from the place record. Null when not confirmed. */
  officialAgeRange: string | null;
  /** Good-fit age bands only. Null when Compass has not confirmed a best fit. */
  bestFitAges: string | null;
  bestFitExplanation: string | null;
  ageBands: AgeBandView[];
  restrictions: RuleLine[];
  supervision: RuleLine[];
  activityLevel: ThemeView[];
  whoItSuits: ThemeView[];
  visitLength: { text: string; basis: string; checked: string } | null;
  rainyDay: string | null;
};

/** Official admission ages. `allAges` is a verified fact; missing bounds stay null. */
export function officialAgeLabel(place: {
  allAges: boolean;
  ageMin?: number | null;
  ageMax?: number | null;
}): string | null {
  if (place.allAges) return "All ages";
  return ageText(place.ageMin, place.ageMax);
}

/**
 * Compass best fit: public age bands marked "good", collapsed when they are
 * consecutive. "Some" and "limited" stay in the age table and are not folded
 * into the recommendation.
 */
export function compassBestFitLabel(record: VenueRecord): string | null {
  const good = new Set(
    record.ageBands.filter((band) => isPublicFact(band) && band.fit === "good").map((band) => band.band),
  );
  const selected = AGE_BANDS.filter((band) => good.has(band.band));
  if (!selected.length) return null;
  const groups: Array<Array<(typeof AGE_BANDS)[number]>> = [];
  for (const band of selected) {
    const current = groups[groups.length - 1];
    const previous = current?.[current.length - 1];
    if (previous && band.min === previous.max + 1) current.push(band);
    else groups.push([band]);
  }
  const parts = groups.map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    if (first.band === "adults") return "Adults";
    if (last.band === "adults") return `Ages ${first.min}–17 and adults`;
    if (first.min === last.max) return `Age ${first.min}`;
    return `Ages ${first.min}–${last.max}`;
  });
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function snapshot(record: VenueRecord, policies: VenuePolicy[], themes: ThemeView[]): SnapshotView {
  const p = record.place;
  const bands = record.ageBands.filter(isPublicFact);
  const placeChecked = formatCheckedDate(p.sourceCheckedDate);
  const rule = (kinds: VenuePolicyKind[]) =>
    policies.filter((x) => kinds.includes(x.kind)).map(ruleLine);
  const bestFitAges = compassBestFitLabel(record);
  return {
    officialAgeRange: officialAgeLabel(p),
    bestFitAges,
    bestFitExplanation: bestFitAges ? COMPASS_BEST_FIT_EXPLANATION : null,
    ageBands: AGE_BANDS.map(({ band, label }) => {
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
    supervision: rule(["supervision"]),
    activityLevel: themes.filter((t) => t.theme === "activity_level"),
    whoItSuits: themes.filter((t) => t.theme === "age_fit"),
    visitLength:
      typeof p.typicalVisitMinutes === "number" && p.typicalVisitMinutes > 0 && placeChecked
        ? {
            text: `About ${durationText(p.typicalVisitMinutes)}`,
            basis: "Compass estimate from the venue's published session lengths and activities — not a venue guarantee",
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
      statusLabel:
        status === "confirmed" ? "Confirmed" : status === "unavailable" ? "Not available" : "Not confirmed",
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
      statusLabel: a.status === "yes" ? "Confirmed" : "Not available",
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
  plusTax: boolean | null;
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
    price.plusTax === true ? "Plus tax" : null,
    price.notes?.trim() || null,
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
    plusTax: price.plusTax ?? null,
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
  childOptions: PriceLine[];
  adultOptions: PriceLine[];
  requiredAddons: PriceLine[];
  /** Assumptions shown beside the estimate. */
  assumptions: string[];
};

/**
 * Inputs for the family cost estimator, or null when the venue has no
 * verified child admission price to estimate from.
 */
export function costEstimatorModel(sections: PriceSection[]): CostEstimatorModel | null {
  const admission = sections.find((s) => s.kind === "admission")?.lines ?? [];
  const childOptions = admission.filter((l) => l.audience === "child" || l.audience === "infant");
  if (childOptions.length === 0) return null;
  const adultOptions = admission.filter((l) => l.audience === "adult" || l.audience === "non_participant");
  const requiredAddons = (sections.find((s) => s.kind === "addon")?.lines ?? []).filter((l) => l.requiredAddon);
  const assumptions = [
    "Uses the admission prices listed above for each person you add.",
    requiredAddons.length
      ? "Adds each required extra once per child."
      : "No required extras are listed for this venue.",
    adultOptions.length
      ? "Adults are charged only if you add them."
      : "No adult price is listed — check with the venue whether adults pay.",
    "Excludes optional extras, food, parking, memberships and offers.",
  ];
  if ([...childOptions, ...adultOptions, ...requiredAddons].some((l) => l.plusTax)) {
    assumptions.push("Some prices are before tax; the estimate does not add tax.");
  }
  return { childOptions, adultOptions, requiredAddons, assumptions };
}

/** Estimate for given counts and chosen price lines. Pure; used by the estimator. */
export function estimateFamilyCost(
  model: CostEstimatorModel,
  input: { childLineId: string | null; children: number; adultLineId: string | null; adults: number },
): number | null {
  const children = Math.max(0, Math.floor(input.children));
  const adults = Math.max(0, Math.floor(input.adults));
  const child = model.childOptions.find((l) => l.id === input.childLineId);
  if (children > 0 && !child) return null;
  const adult = model.adultOptions.find((l) => l.id === input.adultLineId);
  if (adults > 0 && !adult) return null;
  const addons = model.requiredAddons.reduce((sum, l) => sum + l.value, 0);
  const total = children * ((child?.value ?? 0) + addons) + adults * (adult?.value ?? 0);
  return Math.round(total * 100) / 100;
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
  const facts = record.experienceThemes.filter(isPublicFact);
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
      host = new URL(url).hostname.replace(/^www\./, "");
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
  for (const a of requiredAddons) items.push(`Budget for ${a.label.toLowerCase()} (${a.amount}) — required for each child.`);
  for (const p of has("arrival")) items.push(p.body.trim());
  for (const p of has("food_rule")) items.push(p.body.trim());
  return [...new Set(items.filter(Boolean))];
}

// ---------------------------------------------------------------------------
// Whole page
// ---------------------------------------------------------------------------

export type VenueDetailView = {
  overview: VenueOverview;
  snapshot: SnapshotView;
  activities: ActivityView[];
  notOffered: ActivityView[];
  programs: ProgramView[];
  gettingThere: GettingThereView;
  visit: VisitRulesView;
  prices: PriceSection[];
  costEstimator: CostEstimatorModel | null;
  amenities: AmenityView[];
  experience: ExperienceView;
  reviews: ReviewsView;
  beforeYouGo: string[];
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
    ...record.experienceThemes.filter(isPublicFact).map((f) => ({ label: "Parent experience", fact: f })),
    ...usableSources.map((f) => ({ label: `Reviews: ${f.sourceName}`, fact: f })),
  ];
  const { sources, conflicts } = sourcesView(record, visibleFacts);

  return {
    overview: overview(record),
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
    costEstimator: costEstimatorModel(prices),
    amenities,
    experience,
    reviews: reviewsView(usableSources, record.reviewSources.length - usableSources.length),
    beforeYouGo: beforeYouGo(policies, requiredAddons, bookingLinks),
    sources,
    conflicts,
    ageTool: {
      bands: snap.ageBands,
      activities: publicActivities
        .filter((a) => a.availability === "available")
        .map((a) => ({ name: a.name, ageMin: a.ageMin ?? null, ageMax: a.ageMax ?? null })),
    },
  };
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
