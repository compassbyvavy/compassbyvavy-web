/**
 * Jackrabbit OpeningsJson, the feed the Camp Watcher reads.
 * Confirmed in a browser on Nov 15, 2026. The spots checker does not call this.
 */

import type { AdapterParams } from "./adapterParams";

export const JACKRABBIT_OPENINGS_URL = "https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsJson";

export type JackrabbitClass = {
  id: string;
  name: string;
  category1: string | null;
  category2: string | null;
  category3: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  minAge: string | null;
  maxAge: string | null;
  spots: number | null;
  price: number | null;
  regStartDate: string | null;
  registerUrl: string | null;
};

export function jackrabbitOpeningsUrl(params: AdapterParams): string {
  const orgId = params.values.OrgID ?? params.values.orgId ?? "";
  if (!orgId) return "";
  const url = new URL(JACKRABBIT_OPENINGS_URL);
  url.searchParams.set("OrgID", orgId);
  const session = params.values.session ?? params.values.Session;
  if (session) url.searchParams.set("Session", session);
  return url.toString();
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function wholeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function classFromRow(row: Record<string, unknown>): JackrabbitClass | null {
  if (row.id == null) return null;
  const openings = row.openings;
  const tuition = row.tuition;
  const spots =
    openings && typeof openings === "object"
      ? wholeNumber((openings as { calculated_openings?: unknown }).calculated_openings)
      : null;
  const price =
    tuition && typeof tuition === "object" ? wholeNumber((tuition as { fee?: unknown }).fee) : null;
  return {
    id: String(row.id),
    name: text(row.name) ?? "",
    category1: text(row.category1),
    category2: text(row.category2),
    category3: text(row.category3),
    startDate: text(row.start_date),
    endDate: text(row.end_date),
    startTime: text(row.start_time),
    endTime: text(row.end_time),
    minAge: text(row.min_age),
    maxAge: text(row.max_age),
    spots,
    price,
    regStartDate: text(row.reg_start_date),
    registerUrl: text(row.online_reg_link),
  };
}

export function parseJackrabbitOpeningsJson(
  body: string,
): { ok: true; classes: JackrabbitClass[] } | { ok: false; error: string } {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return { ok: false, error: "jackrabbit response was not json" };
  }
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { rows?: unknown }).rows)
      ? (payload as { rows: unknown[] }).rows
      : null;
  if (!rows) return { ok: false, error: "jackrabbit response had no rows" };
  const classes: JackrabbitClass[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const parsed = classFromRow(row as Record<string, unknown>);
    if (parsed) classes.push(parsed);
  }
  return { ok: true, classes };
}

/**
 * Exact filters only. `category1` matches that field. `name starts '…'` matches
 * the class name. A "watch for …" note does not hide rows.
 */
export function filterJackrabbitClasses(classes: JackrabbitClass[], params: AdapterParams): JackrabbitClass[] {
  let rows = classes;
  const category1 = params.values.category1;
  if (category1) rows = rows.filter((row) => row.category1 === category1);
  for (const filter of params.filters) {
    const starts = /^name starts '(.*)'$/i.exec(filter);
    if (!starts) continue;
    const prefix = starts[1].toLowerCase();
    rows = rows.filter((row) => row.name.toLowerCase().startsWith(prefix));
  }
  return rows;
}
