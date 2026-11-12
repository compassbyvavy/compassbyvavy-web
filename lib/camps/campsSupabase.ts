/**
 * Published camp catalog reads from Supabase (PostgREST).
 *
 * Uses the public anon key only — never the service role — so row-level
 * security still decides what is visible. The query repeats the published
 * filters, and the mapper drops anything that is not published.
 *
 * Server-only. The anon key is not sent to the browser. One read is cached
 * for five minutes: camps change when someone publishes, and cards carry
 * their own check dates.
 */

import type {
  CampAudience,
  CampAgeAssessmentRule,
  CampCurrency,
  CampDeliveryMode,
  CampPackingItem,
  CampProgram,
  CampRegistrationStatus,
  CampSession,
  CampSessionScheduleFormat,
  CampStayType,
  ConfirmedTriState,
  PriceUnit,
  Provider,
  SeatAvailabilityFact,
  Venue,
} from "@/data/camps/types";
import type {
  CampsCatalogBundle,
  CampsCatalogLoadResult,
} from "@/lib/camps/catalog";

export const CAMPS_CATALOG_REVALIDATE_SECONDS = 300;

export type PublicCampsSupabaseConfig = {
  url: string;
  anonKey: string;
  fetchImpl?: (input: string, init?: CampsFetchInit) => Promise<Response>;
  timeoutMs?: number;
};

export type CampsFetchInit = RequestInit & {
  next?: { revalidate?: number };
};

type Row = Record<string, unknown>;

export function readPublicCampsSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): PublicCampsSupabaseConfig | null {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const anonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

const PROGRAM_COLUMNS = [
  "id",
  "slug",
  "provider_id",
  "name",
  "description",
  "primary_category",
  "secondary_themes",
  "typical_age_min",
  "typical_age_max",
  "typical_age_min_inclusive",
  "typical_age_max_inclusive",
  "typical_age_assessed_at_date",
  "audience",
  "accessibility_support_tags",
  "experience_summary",
  "prerequisites",
  "support_info",
  "policies_summary",
  "preparation_notes",
  "notes",
  "publication_state",
  "published_at",
].join(",");

const PROVIDER_COLUMNS = [
  "id",
  "name",
  "website_url",
  "registration_info_url",
  "notes",
  "publication_state",
  "published_at",
].join(",");

const VENUE_COLUMNS = [
  "id",
  "name",
  "neighbourhood",
  "address_line",
  "postal_code",
  "latitude",
  "longitude",
  "notes",
  "wheelchair_accessible",
  "publication_state",
  "published_at",
  "cities(city_town,province_state)",
].join(",");

const SESSION_COLUMNS = [
  "id",
  "program_id",
  "venue_id",
  "start_date",
  "end_date",
  "timing_label",
  "schedule_format",
  "stay_type",
  "delivery_mode",
  "core_hours_start",
  "core_hours_end",
  "before_care_offered",
  "before_care_start_time",
  "before_care_end_time",
  "before_care_separate_booking",
  "after_care_offered",
  "after_care_start_time",
  "after_care_end_time",
  "after_care_separate_booking",
  "price_amount",
  "price_unit",
  "currency",
  "fee_notes",
  "registration_status",
  "registration_opens_on",
  "registration_deadline_on",
  "waitlist_url",
  "registration_url",
  "source_url",
  "source_checked_date",
  "provider_confirmed",
  "seat_availability",
  "age_min",
  "age_max",
  "age_min_inclusive",
  "age_max_inclusive",
  "age_assessed_at_date",
  "age_assessment_rule",
  "notes",
  "publication_state",
  "published_at",
  `venues(${VENUE_COLUMNS})`,
].join(",");

/** PostgREST URL for published programs and their published relations. */
export function publishedCampsQueryUrl(baseUrl: string): string {
  const root = baseUrl.replace(/\/$/, "");
  const select = [
    PROGRAM_COLUMNS,
    `providers(${PROVIDER_COLUMNS})`,
    `camp_sessions(${SESSION_COLUMNS})`,
    "camp_packing_items(body,kind,sort_order)",
  ].join(",");
  const params = new URLSearchParams({
    select,
    publication_state: "eq.published",
    published_at: "not.is.null",
  });
  return `${root}/rest/v1/camp_programs?${params.toString()}`;
}

/**
 * Total from a PostgREST Content-Range, such as 0-9/10 or star-slash-0.
 * Anything else is unparseable so a truncated page cannot look complete.
 */
export function contentRangeTotal(header: string | null): number | null {
  if (!header) return null;
  const match = /^(\*|\d+-\d+)\/(\d+)$/.exec(header.trim());
  if (!match) return null;
  return Number(match[2]);
}

const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

const num = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
};

const whole = (value: unknown): number | null => {
  const parsed = num(value);
  return parsed != null && Number.isInteger(parsed) ? parsed : null;
};

const bool = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

/** yes/no stay themselves. Null stays null. Any other value is unknown. */
function triOrNull(value: unknown): ConfirmedTriState | null {
  if (value == null) return null;
  if (value === "yes" || value === "no" || value === "unknown") return value;
  return "unknown";
}

/** Required tri-state columns: a missing value is unknown, never yes or no. */
function tri(value: unknown): ConfirmedTriState {
  return triOrNull(value) ?? "unknown";
}

function isoDate(value: unknown): string | null {
  const text = str(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}/.test(text)) return null;
  return text.slice(0, 10);
}

function clock(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const match = /^(\d{2}):(\d{2})/.exec(text);
  return match ? `${match[1]}:${match[2]}` : null;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isRow(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function embedOne(value: unknown): Row | null {
  if (Array.isArray(value)) return value.length > 0 && isRow(value[0]) ? value[0] : null;
  return isRow(value) ? value : null;
}

function embedMany(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(isRow) : [];
}

/**
 * Null stays null. A recognized value stays itself.
 * Anything else becomes the enum's unknown value — never a guessed member.
 */
function enumOrNull<T extends string>(
  value: unknown,
  allowed: readonly T[],
  unknownValue: T,
): T | null {
  if (value == null) return null;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return unknownValue;
}

const AUDIENCES = ["child_only", "parent_and_child", "family", "other", "unknown"] as const;
const SCHEDULES = [
  "full_day",
  "half_day",
  "short_session",
  "single_day",
  "weekly",
  "multiweek",
  "other",
  "unknown",
] as const;
const STAYS = ["day", "overnight", "unknown"] as const;
const DELIVERIES = ["in_person", "online", "unknown"] as const;
const PRICE_UNITS = ["per_day", "per_week", "full_program", "per_session", "other", "unknown"] as const;
const CURRENCIES = ["CAD", "USD", "unknown"] as const;
const REGISTRATION = [
  "registration_open",
  "registration_closed",
  "no_upcoming_dates",
  "waitlist",
  "not_yet_open",
  "availability_unknown",
] as const;
const SEATS = ["unknown", "confirmed_available", "confirmed_full"] as const;
const AGE_RULES = ["as_of_date", "as_of_session_start", "unknown"] as const;

function isPublished(row: Row): boolean {
  return row.publication_state === "published" && str(row.published_at) != null;
}

function mapProvider(row: Row): Provider | null {
  if (!isPublished(row)) return null;
  const id = str(row.id);
  const name = str(row.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    websiteUrl: str(row.website_url),
    registrationInfoUrl: str(row.registration_info_url),
    notes: str(row.notes),
  };
}

function mapVenue(row: Row): Venue | null {
  if (!isPublished(row)) return null;
  const id = str(row.id);
  const name = str(row.name);
  if (!id || !name) return null;
  const city = embedOne(row.cities);
  return {
    id,
    name,
    neighbourhood: str(row.neighbourhood),
    addressLine: str(row.address_line),
    city: city ? str(city.city_town) : null,
    province: city ? str(city.province_state) : null,
    postalCode: str(row.postal_code),
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    notes: str(row.notes),
    wheelchairAccessible: triOrNull(row.wheelchair_accessible),
  };
}

function mapPacking(value: unknown): CampPackingItem[] | null {
  const items = embedMany(value)
    .map((row) => ({
      sort: num(row.sort_order) ?? 0,
      text: str(row.body),
      kind: row.kind === "required" || row.kind === "suggested" ? row.kind : null,
    }))
    .filter((item): item is { sort: number; text: string; kind: "required" | "suggested" } =>
      item.text != null && item.kind != null,
    )
    .sort((a, b) => a.sort - b.sort)
    .map((item) => ({ text: item.text, kind: item.kind }));
  return items.length > 0 ? items : null;
}

function careWindow(row: Row, prefix: "before_care" | "after_care") {
  return {
    offered: tri(row[`${prefix}_offered`]),
    startTime: clock(row[`${prefix}_start_time`]),
    endTime: clock(row[`${prefix}_end_time`]),
    separateBookingRequired: tri(row[`${prefix}_separate_booking`]),
  };
}

function mapSession(row: Row, programId: string, venues: Map<string, Venue>): CampSession | null {
  if (!isPublished(row)) return null;
  const id = str(row.id);
  if (!id) return null;
  const venueRow = embedOne(row.venues);
  const venue = venueRow ? mapVenue(venueRow) : null;
  if (venue) venues.set(venue.id, venue);
  return {
    id,
    programId,
    venueId: venue?.id ?? null,
    startDate: isoDate(row.start_date),
    endDate: isoDate(row.end_date),
    timingLabel: str(row.timing_label),
    scheduleFormat: enumOrNull<CampSessionScheduleFormat>(row.schedule_format, SCHEDULES, "unknown"),
    stayType: enumOrNull<CampStayType>(row.stay_type, STAYS, "unknown"),
    deliveryMode: enumOrNull<CampDeliveryMode>(row.delivery_mode, DELIVERIES, "unknown"),
    coreHoursStart: clock(row.core_hours_start),
    coreHoursEnd: clock(row.core_hours_end),
    beforeCare: careWindow(row, "before_care"),
    afterCare: careWindow(row, "after_care"),
    priceAmount: num(row.price_amount),
    priceUnit: enumOrNull<PriceUnit>(row.price_unit, PRICE_UNITS, "unknown"),
    currency: enumOrNull<CampCurrency>(row.currency, CURRENCIES, "unknown"),
    feeNotes: str(row.fee_notes),
    registrationStatus:
      enumOrNull<CampRegistrationStatus>(
        row.registration_status,
        REGISTRATION,
        "availability_unknown",
      ) ?? "availability_unknown",
    registrationOpensOn: isoDate(row.registration_opens_on),
    registrationDeadlineOn: isoDate(row.registration_deadline_on),
    waitlistUrl: str(row.waitlist_url),
    registrationUrl: str(row.registration_url),
    sourceUrl: str(row.source_url),
    sourceCheckedDate: isoDate(row.source_checked_date),
    providerConfirmed: bool(row.provider_confirmed),
    seatAvailability: enumOrNull<SeatAvailabilityFact>(row.seat_availability, SEATS, "unknown"),
    ageMin: whole(row.age_min),
    ageMax: whole(row.age_max),
    ageMinInclusive: bool(row.age_min_inclusive),
    ageMaxInclusive: bool(row.age_max_inclusive),
    ageAssessedAtDate: isoDate(row.age_assessed_at_date),
    ageAssessmentRule: enumOrNull<CampAgeAssessmentRule>(row.age_assessment_rule, AGE_RULES, "unknown"),
    notes: str(row.notes),
  };
}

function mapProgram(
  row: Row,
  providers: Map<string, Provider>,
  venues: Map<string, Venue>,
  sessions: CampSession[],
): CampProgram | null {
  if (!isPublished(row)) return null;
  const providerRow = embedOne(row.providers);
  const provider = providerRow ? mapProvider(providerRow) : null;
  const id = str(row.id);
  const slug = str(row.slug);
  const name = str(row.name);
  if (!provider || !id || !slug || !name) return null;
  providers.set(provider.id, provider);
  for (const sessionRow of embedMany(row.camp_sessions)) {
    const session = mapSession(sessionRow, id, venues);
    if (session) sessions.push(session);
  }
  const prerequisites = strings(row.prerequisites);
  return {
    id,
    slug,
    providerId: provider.id,
    name,
    description: str(row.description),
    primaryCategory: str(row.primary_category),
    secondaryThemes: strings(row.secondary_themes),
    typicalAgeMin: whole(row.typical_age_min),
    typicalAgeMax: whole(row.typical_age_max),
    typicalAgeMinInclusive: bool(row.typical_age_min_inclusive),
    typicalAgeMaxInclusive: bool(row.typical_age_max_inclusive),
    typicalAgeAssessedAtDate: isoDate(row.typical_age_assessed_at_date),
    audience: enumOrNull<CampAudience>(row.audience, AUDIENCES, "unknown"),
    notes: str(row.notes),
    accessibilitySupportTags: strings(row.accessibility_support_tags),
    experienceSummary: str(row.experience_summary),
    prerequisites: prerequisites.length > 0 ? prerequisites : null,
    supportInfo: str(row.support_info),
    policiesSummary: str(row.policies_summary),
    preparationNotes: str(row.preparation_notes),
    packingItems: mapPacking(row.camp_packing_items),
  };
}

/** Map a published PostgREST payload. Draft rows are omitted. */
export function mapPublishedCampRows(rows: readonly unknown[]): CampsCatalogBundle {
  const providers = new Map<string, Provider>();
  const venues = new Map<string, Venue>();
  const sessions: CampSession[] = [];
  const programs: CampProgram[] = [];
  for (const row of rows) {
    if (!isRow(row)) continue;
    const program = mapProgram(row, providers, venues, sessions);
    if (program) programs.push(program);
  }
  return {
    providers: [...providers.values()],
    venues: [...venues.values()],
    programs,
    sessions,
    sourceLabel: "published",
    includesFictionalFixtures: false,
  };
}

/**
 * Published catalog, or empty when the read succeeded and nothing is public.
 * A failed request, a missing exact count, or a count that does not match
 * the rows returned is `failed` — never a shorter catalog.
 */
export async function fetchPublishedCampsCatalog(
  config: PublicCampsSupabaseConfig,
): Promise<CampsCatalogLoadResult> {
  if (typeof window !== "undefined") {
    return { status: "failed" };
  }
  const doFetch: (input: string, init?: CampsFetchInit) => Promise<Response> =
    config.fetchImpl ??
    ((input, init) => fetch(input, init as RequestInit));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 8000);
  try {
    const res = await doFetch(publishedCampsQueryUrl(config.url), {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: "application/json",
        Prefer: "count=exact",
      },
      signal: controller.signal,
      next: { revalidate: CAMPS_CATALOG_REVALIDATE_SECONDS },
    });
    if (!res.ok) return { status: "failed" };
    const total = contentRangeTotal(res.headers.get("content-range"));
    const body = (await res.json()) as unknown;
    if (!Array.isArray(body)) return { status: "failed" };
    if (total == null || total !== body.length) return { status: "failed" };
    const catalog = mapPublishedCampRows(body);
    if (catalog.programs.length === 0) return { status: "empty" };
    return { status: "ready", catalog };
  } catch {
    return { status: "failed" };
  } finally {
    clearTimeout(timer);
  }
}
