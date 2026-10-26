/**
 * Published venue reads from Supabase (PostgREST), for production pages.
 *
 * Uses the public anon key only — never the service role — so row-level
 * security still decides what is visible: published, open places, and child
 * facts that are not awaiting follow-up. The query repeats those filters, and
 * the mapper drops any follow-up facts as a second line of defence.
 *
 * Same fetch-not-SDK approach as lib/camps/ingestion/repositories/supabaseStore.ts.
 * Server-only: no key is ever sent to the browser.
 */

import type { ConfirmedTriState } from "@/data/camps/types";
import type { DiscoverDbCategory, IsoWeekday } from "@/data/discover/types";
import type {
  FactVerification,
  VenueRecord,
} from "@/data/discover/venueTypes";

export type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number;
};

export function readPublicSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): PublicSupabaseConfig | null {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const anonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

const CHILD_TABLES = [
  "place_hours",
  "place_types",
  "place_age_bands",
  "place_activities",
  "place_prices",
  "place_programs",
  "place_amenities",
  "place_policies",
  "place_links",
  "place_review_sources",
  "place_experience_themes",
] as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** PostgREST URL for one published, open venue by slug. Exported for tests. */
export function publishedVenueQueryUrl(baseUrl: string, slug: string): string {
  const select = ["*", "cities(city_town)", ...CHILD_TABLES.map((t) => `${t}(*)`)].join(",");
  const params = new URLSearchParams({
    select,
    slug: `eq.${slug}`,
    publication_state: "eq.published",
    published_at: "not.is.null",
    operating_status: "eq.open",
    limit: "1",
  });
  return `${baseUrl}/rest/v1/places?${params.toString()}`;
}

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const tri = (v: unknown): ConfirmedTriState => (v === "yes" || v === "no" ? v : "unknown");
const time = (v: unknown): string => (typeof v === "string" ? v.slice(0, 5) : "");

function rows(row: Row, key: string): Row[] {
  const v = row[key];
  return Array.isArray(v)
    ? (v as Row[]).slice().sort((a, b) => (num(a.sort_order) ?? 0) - (num(b.sort_order) ?? 0))
    : [];
}

/** Child facts that are not awaiting follow-up (RLS already enforces this). */
function publicRows(row: Row, key: string): Row[] {
  return rows(row, key).filter((r) => r.verification_status !== "needs_follow_up");
}

function prov(r: Row) {
  return {
    sourceUrl: str(r.source_url) ?? "",
    sourceCheckedDate: str(r.source_checked_date) ?? "",
    verificationStatus: (str(r.verification_status) ?? "needs_follow_up") as FactVerification,
    conflictNote: str(r.conflict_note),
  };
}

/** Map a PostgREST places row (with embedded child tables) to a VenueRecord. */
export function mapVenueRow(row: Row): VenueRecord {
  const city = row.cities as Row | null | undefined;
  return {
    place: {
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      description: str(row.description),
      category: row.category as DiscoverDbCategory,
      placeType: str(row.place_type),
      cityId: str(row.city_id),
      venueId: str(row.venue_id),
      addressLine: str(row.address_line),
      neighbourhood: str(row.neighbourhood),
      websiteUrl: str(row.website_url),
      ageMin: num(row.age_min),
      ageMax: num(row.age_max),
      ageMinInclusive: bool(row.age_min_inclusive),
      ageMaxInclusive: bool(row.age_max_inclusive),
      allAges: row.all_ages === true,
      setting: (str(row.setting) ?? "unknown") as VenueRecord["place"]["setting"],
      costTier: (str(row.cost_tier) ?? "unknown") as VenueRecord["place"]["costTier"],
      typicalVisitMinutes: num(row.typical_visit_minutes),
      typicalVisitNote: str(row.typical_visit_note),
      compassTake: str(row.compass_take),
      toddlerFriendly: tri(row.toddler_friendly),
      strollerFriendly: tri(row.stroller_friendly),
      hoursKind: (str(row.hours_kind) ?? "unknown") as VenueRecord["place"]["hoursKind"],
      latitude: num(row.latitude),
      longitude: num(row.longitude),
      sourceUrl: str(row.source_url),
      sourceCheckedDate: str(row.source_checked_date),
      publicationState: (str(row.publication_state) ?? "draft") as VenueRecord["place"]["publicationState"],
      publishedAt: str(row.published_at),
      operatingStatus: (str(row.operating_status) ?? "unknown") as VenueRecord["place"]["operatingStatus"],
      branchName: str(row.branch_name),
      aliases: Array.isArray(row.aliases) ? (row.aliases as unknown[]).filter((a): a is string => typeof a === "string") : [],
      postalCode: str(row.postal_code),
    },
    cityName: city ? str(city.city_town) : null,
    hours: rows(row, "place_hours").map((r) => ({
      weekday: (num(r.weekday) ?? 0) as IsoWeekday,
      opensAt: time(r.opens_at),
      closesAt: time(r.closes_at),
      validFrom: str(r.valid_from),
      validTo: str(r.valid_to),
      notes: str(r.notes),
      sourceUrl: str(r.source_url) ?? undefined,
      sourceCheckedDate: str(r.source_checked_date) ?? undefined,
    })),
    types: publicRows(row, "place_types").map((r) => ({
      ...prov(r),
      placeType: String(r.place_type),
      isPrimary: r.is_primary === true,
    })),
    ageBands: publicRows(row, "place_age_bands").map((r) => ({
      ...prov(r),
      band: r.band as VenueRecord["ageBands"][number]["band"],
      fit: r.fit as VenueRecord["ageBands"][number]["fit"],
      note: str(r.note),
    })),
    activities: publicRows(row, "place_activities").map((r) => ({
      ...prov(r),
      id: String(r.id),
      name: String(r.name),
      description: str(r.description),
      availability: r.availability === "not_offered" ? "not_offered" : "available",
      includedInAdmission: tri(r.included_in_admission),
      extraCostNote: str(r.extra_cost_note),
      schedule: r.schedule === "always" || r.schedule === "scheduled" ? r.schedule : "unknown",
      scheduleNote: str(r.schedule_note),
      ageMin: num(r.age_min),
      ageMax: num(r.age_max),
      minHeightCm: num(r.min_height_cm),
      maxHeightCm: num(r.max_height_cm),
      maxWeightKg: num(r.max_weight_kg),
      safetyNote: str(r.safety_note),
    })),
    prices: publicRows(row, "place_prices").map((r) => ({
      ...prov(r),
      id: String(r.id),
      kind: r.kind as VenueRecord["prices"][number]["kind"],
      label: String(r.label),
      audience: r.audience as VenueRecord["prices"][number]["audience"],
      ageMin: num(r.age_min),
      ageMax: num(r.age_max),
      durationMinutes: num(r.duration_minutes),
      includesNote: str(r.includes_note),
      amount: num(r.amount),
      isFree: r.is_free === true,
      currency: r.currency === "USD" ? "USD" : "CAD",
      requiredAddon: r.required_addon === true,
      chargeBasis: (str(r.charge_basis) ?? "unknown") as VenueRecord["prices"][number]["chargeBasis"],
      plusTax: bool(r.plus_tax),
      dayType: r.day_type === "weekday" || r.day_type === "weekend_holiday" ? r.day_type : null,
      adultsIncluded: num(r.adults_included),
      eligibility: str(r.eligibility),
      sessionName: str(r.session_name),
      siblingOnly: r.sibling_only === true,
      validTo: str(r.valid_to),
      notes: str(r.notes),
    })),
    programs: publicRows(row, "place_programs").map((r) => ({
      ...prov(r),
      id: String(r.id),
      name: String(r.name),
      description: str(r.description),
      attendance: r.attendance === "with_parent" || r.attendance === "drop_off" ? r.attendance : null,
      cadence: r.cadence as VenueRecord["programs"][number]["cadence"],
      scheduleNote: str(r.schedule_note),
      startsOn: str(r.starts_on),
      endsOn: str(r.ends_on),
      ageMin: num(r.age_min),
      ageMax: num(r.age_max),
      priceNote: str(r.price_note),
      registrationUrl: str(r.registration_url),
    })),
    amenities: publicRows(row, "place_amenities")
      .filter((r) => r.status === "yes" || r.status === "no")
      .map((r) => ({
        ...prov(r),
        amenity: r.amenity as VenueRecord["amenities"][number]["amenity"],
        status: r.status as "yes" | "no",
        note: str(r.note),
      })),
    policies: publicRows(row, "place_policies").map((r) => ({
      ...prov(r),
      kind: r.kind as VenueRecord["policies"][number]["kind"],
      body: String(r.body),
    })),
    links: publicRows(row, "place_links").map((r) => ({
      ...prov(r),
      kind: r.kind as VenueRecord["links"][number]["kind"],
      value: String(r.value),
      label: str(r.label),
    })),
    reviewSources: publicRows(row, "place_review_sources").map((r) => ({
      ...prov(r),
      id: String(r.id),
      kind: r.kind === "editorial" ? "editorial" : "customer_reviews",
      platform: r.platform as VenueRecord["reviewSources"][number]["platform"],
      sourceName: String(r.source_name),
      coverageNote: String(r.coverage_note),
      selectionMethod: str(r.selection_method),
      itemsReviewed: num(r.items_reviewed),
      periodFrom: str(r.period_from),
      periodTo: str(r.period_to),
      statedRating: num(r.stated_rating),
      statedRatingCount: num(r.stated_rating_count),
      ratingScale: num(r.rating_scale),
      providerDisclosure: str(r.provider_disclosure),
      providerAttributions: Array.isArray(r.provider_attributions)
        ? (r.provider_attributions as Row[]).map((a) => ({ name: String(a.name ?? ""), uri: String(a.uri ?? "") }))
        : null,
    })),
    experienceThemes: publicRows(row, "place_experience_themes").map((r) => ({
      ...prov(r),
      sourceUrl: str(r.source_url),
      theme: r.theme as VenueRecord["experienceThemes"][number]["theme"],
      summary: String(r.summary),
      basis: r.basis as VenueRecord["experienceThemes"][number]["basis"],
      sentiment: (str(r.sentiment) ?? "neutral") as VenueRecord["experienceThemes"][number]["sentiment"],
      agreement: r.agreement === "mixed" ? "mixed" : "consistent",
      reviewSourceId: str(r.review_source_id),
    })),
  };
}

/**
 * One published, open venue by slug, or null (not found, not published,
 * bad slug, or the request failed). Never throws into the page.
 */
export async function fetchPublishedVenue(
  config: PublicSupabaseConfig,
  slug: string,
): Promise<VenueRecord | null> {
  if (!SLUG_PATTERN.test(slug) || slug.length > 120) return null;
  const doFetch = config.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 8000);
  try {
    const res = await doFetch(publishedVenueQueryUrl(config.url, slug), {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as unknown;
    if (!Array.isArray(body) || body.length === 0) return null;
    return mapVenueRow(body[0] as Row);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
