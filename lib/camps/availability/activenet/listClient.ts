import { assertSafeHttpUrl } from "@/lib/camps/ingestion/security/ssrf";
import { COMPASS_ACTIVENET_USER_AGENT } from "@/lib/camps/availability/activenet/config";
import type { FetchLike } from "@/lib/camps/availability/activenet/fetchDetail";
import {
  ACTIVENET_HOST,
  ACTIVENET_ORIGIN,
  ACTIVENET_TENANT,
  type ParsedSpaceStatus,
} from "@/lib/camps/availability/activenet/types";
import { parseActiveNetTimeRange } from "@/lib/camps/availability/activenet/parseTimeRange";

/**
 * ActiveNet search list: `POST /{tenant}/rest/activities/list`.
 *
 * One call returns many activities, each with internal `id`, public `number`,
 * `total_open` (capacity; -1 = uncapped) and `already_enrolled`. Compass uses it
 * to (1) match the public activity numbers in City documents to internal IDs and
 * (2) refresh availability for many sessions per request.
 *
 * Unlike the detail GET, the list POST expects the csrfToken embedded in the
 * public search page plus that page's session cookie. No login is involved.
 * Request/response shape follows what ActiveNet's own search UI sends (observed
 * on activemississauga for Winter Fun: total_open 36, already_enrolled 3).
 *
 * Activities closed to registration can be missing from the default list, so a
 * missing activity means "check the detail endpoint", never "zero openings".
 */

const TENANT_BASE = `${ACTIVENET_ORIGIN}/${ACTIVENET_TENANT}`;

export function activeNetSearchPageUrl(keyword: string): string {
  const q = encodeURIComponent(keyword);
  return `${TENANT_BASE}/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=${q}&viewMode=list&locale=en-US`;
}

export function activeNetListApiUrl(): string {
  return `${TENANT_BASE}/rest/activities/list?locale=en-US`;
}

/** The csrfToken the search page embeds for its own API calls. */
export function extractCsrfToken(html: string): string | null {
  const match = html.match(/csrfToken\s*[=:]\s*["']([0-9a-fA-F-]{36})["']/);
  return match ? match[1] : null;
}

/**
 * Turn Set-Cookie headers into a Cookie request header (name=value pairs only).
 * Accepts the array from Headers.getSetCookie() or a single comma-joined string.
 */
export function cookieHeaderFromSetCookie(setCookie: string[] | string | null): string {
  if (!setCookie) return "";
  const parts = Array.isArray(setCookie)
    ? setCookie
    : setCookie.split(/,(?=\s*[A-Za-z0-9_.-]+=)/);
  const pairs: string[] = [];
  for (const raw of parts) {
    const pair = raw.split(";")[0]?.trim();
    if (pair && /^[A-Za-z0-9_.-]+=/.test(pair)) pairs.push(pair);
  }
  return pairs.join("; ");
}

function readSetCookie(headers: Headers): string[] | string | null {
  const withGetter = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetter.getSetCookie === "function") return withGetter.getSetCookie();
  return headers.get("set-cookie");
}

export type ActiveNetListSearch = {
  keyword: string;
  seasonIds?: number[];
};

export function buildListSearchBody(search: ActiveNetListSearch): unknown {
  return {
    activity_search_pattern: {
      skills: [],
      time_after_str: "",
      days_of_week: null,
      activity_select_param: 2,
      center_ids: [],
      time_before_str: "",
      open_spots: null,
      activity_id: null,
      activity_category_ids: [],
      date_before: "",
      min_age: null,
      date_after: "",
      activity_type_ids: [],
      site_ids: [],
      for_map: false,
      geographic_area_ids: [],
      season_ids: search.seasonIds ?? [],
      activity_department_ids: [],
      activity_other_category_ids: [],
      child_season_ids: [],
      activity_keyword: search.keyword,
      instructor_ids: [],
      max_age: null,
      custom_price_from: "",
      custom_price_to: "",
    },
    activity_transfer_pattern: {},
  };
}

/** One row from body.activity_items, reduced to what Compass uses. */
export type ActiveNetListItem = {
  /** Internal activity_id: REST paths and booking URLs. */
  activityId: number;
  /** Public activity number shown to parents and in City documents. */
  activityNumber: string;
  name: string;
  dateRangeStart: string | null;
  locationLabel: string | null;
  /** Capacity. -1 means uncapped. */
  totalOpen: number;
  alreadyEnrolled: number;
  statusDescription: string;
  dateRangeEnd: string | null;
  /** 24-hour HH:MM from list `time_range`, e.g. "09:00". */
  dailyStart: string | null;
  dailyEnd: string | null;
  timeRangeRaw: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function readInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function readText(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readLabel(value: unknown): string | null {
  if (isRecord(value)) return readText(value.label);
  return readText(value);
}

/** Null when a row lacks the IDs or counts Compass needs; such rows are skipped. */
export function parseActiveNetListItem(raw: unknown): ActiveNetListItem | null {
  if (!isRecord(raw)) return null;
  const activityId = readInt(raw.id);
  const activityNumber = readText(raw.number);
  const totalOpen = readInt(raw.total_open);
  const alreadyEnrolled = readInt(raw.already_enrolled);
  if (activityId == null || activityId <= 0 || activityNumber == null) return null;
  if (totalOpen == null || alreadyEnrolled == null || alreadyEnrolled < 0) return null;
  const urgent = isRecord(raw.urgent_message) ? raw.urgent_message : null;
  const timeRangeRaw =
    readText(raw.time_range) ?? readText(raw.time_range_landing_page);
  const hours = parseActiveNetTimeRange(timeRangeRaw);
  return {
    activityId,
    activityNumber,
    name: readText(raw.name) ?? "",
    dateRangeStart: readText(raw.date_range_start),
    dateRangeEnd: readText(raw.date_range_end),
    locationLabel: readLabel(raw.location),
    totalOpen,
    alreadyEnrolled,
    statusDescription: readText(urgent?.status_description) ?? "",
    dailyStart: hours.start,
    dailyEnd: hours.end,
    timeRangeRaw,
  };
}

const WAITLIST = /\bwait(?:ing)?\s*list\b/i;
const CLOSED = /\b(closed|ended|cancel+ed|in progress)\b/i;

/**
 * Availability from a list row, in the same shape the detail parser returns.
 * Waitlist and Closed keep their status and never become zero openings.
 * No remaining seats maps to kind "full" (seat_availability confirmed_full),
 * never "unknown" and never a numeric 0.
 */
export function availabilityFromListItem(item: ActiveNetListItem): ParsedSpaceStatus {
  const status = item.statusDescription;
  if (status && WAITLIST.test(status)) {
    return { kind: "waitlist", openingsRemaining: null, raw: status };
  }
  if (status && CLOSED.test(status)) {
    return { kind: "closed", openingsRemaining: null, raw: status };
  }
  if (item.totalOpen === -1) {
    return { kind: "available", openingsRemaining: null, raw: status || "Openings available" };
  }
  const remaining = Math.max(item.totalOpen - item.alreadyEnrolled, 0);
  if (remaining > 0) {
    const raw = remaining === 1 ? "1 opening remaining" : `${remaining} openings remaining`;
    return { kind: "available", openingsRemaining: remaining, raw };
  }
  return { kind: "full", openingsRemaining: null, raw: status || "Full" };
}

export type ActiveNetListResult =
  | { ok: true; items: ActiveNetListItem[]; skippedRows: number; pages: number }
  | { ok: false; error: "no_csrf_token" | "provider_failure" | "malformed_response" | "timeout" };

async function withTimeout<T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function assertActiveNetUrl(url: string): void {
  const parsed = assertSafeHttpUrl(url);
  if (parsed.hostname !== ACTIVENET_HOST) throw new Error("not_activenet_host");
}

/**
 * Bootstrap once (search page for csrfToken and cookie), then page through the
 * list. Pages are requested one at a time, never in parallel.
 */
export async function fetchActiveNetActivityList(options: {
  search: ActiveNetListSearch;
  fetchImpl?: FetchLike;
  timeoutMs: number;
  perPage?: number;
  maxPages?: number;
}): Promise<ActiveNetListResult> {
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const perPage = options.perPage ?? 50;
  const maxPages = options.maxPages ?? 10;
  const searchUrl = activeNetSearchPageUrl(options.search.keyword);
  const listUrl = activeNetListApiUrl();
  assertActiveNetUrl(searchUrl);
  assertActiveNetUrl(listUrl);

  try {
    const page = await withTimeout(options.timeoutMs, (signal) =>
      fetchImpl(searchUrl, {
        method: "GET",
        signal,
        headers: { Accept: "text/html", "User-Agent": COMPASS_ACTIVENET_USER_AGENT },
        cache: "no-store",
        redirect: "error",
      }),
    );
    if (!page.ok) return { ok: false, error: "provider_failure" };
    const csrf = extractCsrfToken(await page.text());
    if (!csrf) return { ok: false, error: "no_csrf_token" };
    const cookie = cookieHeaderFromSetCookie(readSetCookie(page.headers));

    const items: ActiveNetListItem[] = [];
    let skippedRows = 0;
    let pageNumber = 1;
    let pages = 0;
    for (;;) {
      const response = await withTimeout(options.timeoutMs, (signal) =>
        fetchImpl(listUrl, {
          method: "POST",
          signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": COMPASS_ACTIVENET_USER_AGENT,
            "X-CSRF-Token": csrf,
            Referer: searchUrl,
            Origin: ACTIVENET_ORIGIN,
            ...(cookie ? { Cookie: cookie } : {}),
            page_info: JSON.stringify({
              order_by: "",
              page_number: pageNumber,
              total_records_per_page: perPage,
            }),
          },
          body: JSON.stringify(buildListSearchBody(options.search)),
          cache: "no-store",
          redirect: "error",
        }),
      );
      if (!response.ok) return { ok: false, error: "provider_failure" };
      let doc: unknown;
      try {
        doc = await response.json();
      } catch {
        return { ok: false, error: "malformed_response" };
      }
      if (!isRecord(doc)) return { ok: false, error: "malformed_response" };
      const headers = isRecord(doc.headers) ? doc.headers : null;
      const code = typeof headers?.response_code === "string" ? headers.response_code : null;
      if (code && code !== "0000") return { ok: false, error: "provider_failure" };
      const body = isRecord(doc.body) ? doc.body : null;
      if (!body || !Array.isArray(body.activity_items)) {
        return { ok: false, error: "malformed_response" };
      }
      for (const row of body.activity_items) {
        const item = parseActiveNetListItem(row);
        if (item) items.push(item);
        else skippedRows += 1;
      }
      pages += 1;
      const pageInfo = headers && isRecord(headers.page_info) ? headers.page_info : null;
      const totalPages = readInt(pageInfo?.total_page) ?? 1;
      if (pageNumber >= totalPages || pageNumber >= maxPages) break;
      pageNumber += 1;
    }
    return { ok: true, items, skippedRows, pages };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") return { ok: false, error: "timeout" };
    return { ok: false, error: "provider_failure" };
  }
}
