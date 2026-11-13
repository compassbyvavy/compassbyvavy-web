/**
 * Map pins for camp venues, from Natural Resources Canada's free Geolocation
 * service (Open Government Licence – Canada), so we may keep the coordinates.
 * Never from Google: Google's terms don't allow storing its coordinates.
 *
 * Used by scripts/camps/locate-venues.ts. A venue is only placed when the
 * service's answer starts with the same street number and falls inside
 * Mississauga; anything else is printed for a person to check, not guessed.
 */

export type SeedVenue = { id: string; name: string; addressLine: string; postalCode: string | null };

export type NrcanResult = {
  title?: string;
  qualifier?: string;
  geometry?: { type?: string; coordinates?: [number, number] };
};

export type LocatedVenue = SeedVenue & { lat: number; lng: number; matchedTitle: string; qualifier: string | null };

export const NRCAN_LOCATE_URL = "https://geogratis.gc.ca/services/geolocation/en/locate";

/** Mississauga, with a small margin. */
const BOX = { latMin: 43.47, latMax: 43.76, lngMin: -79.82, lngMax: -79.52 };

const VENUE_INSERT =
  /insert into public\.venues \(id, name, neighbourhood, address_line, postal_code, city_id\)\s*values \('((?:[^']|'')+)', '((?:[^']|'')+)', (?:'(?:[^']|'')*'|null), '((?:[^']|'')+)', (?:'((?:[^']|'')*)'|null),/gi;

const unquote = (s: string) => s.replace(/''/g, "'");

/** Venue rows from the generated camp seed files. */
export function venuesFromSeedSql(sql: string): SeedVenue[] {
  const out: SeedVenue[] = [];
  for (const m of sql.matchAll(VENUE_INSERT)) {
    out.push({
      id: unquote(m[1]),
      name: unquote(m[2]),
      addressLine: unquote(m[3]),
      postalCode: m[4] ? unquote(m[4]) : null,
    });
  }
  return out;
}

/** "6991 Millcreek Dr, Unit 8" → "6991 Millcreek Dr, Mississauga, ON" (units confuse street lookups). */
export function locateQuery(v: SeedVenue): string {
  const street = v.addressLine.split(",")[0].replace(/\s+(unit|units|suite|ste)\b.*$/i, "").trim();
  return `${street}, Mississauga, ON`;
}

/** The first answer that matches the street number and lies in Mississauga, or null. */
export function pickLocation(v: SeedVenue, results: unknown): LocatedVenue | null {
  if (!Array.isArray(results)) return null;
  const number = v.addressLine.match(/^\s*(\d+)/)?.[1] ?? null;
  for (const r of results as NrcanResult[]) {
    const title = typeof r?.title === "string" ? r.title : "";
    const c = r?.geometry?.coordinates;
    if (!Array.isArray(c) || c.length < 2) continue;
    const [lng, lat] = c;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < BOX.latMin || lat > BOX.latMax || lng < BOX.lngMin || lng > BOX.lngMax) continue;
    if (number && !title.trim().startsWith(`${number} `)) continue;
    if (!/mississauga/i.test(title)) continue;
    return {
      ...v,
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      matchedTitle: title,
      qualifier: typeof r.qualifier === "string" ? r.qualifier : null,
    };
  }
  return null;
}

const sqlText = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** An idempotent update file Vineeta runs in the Supabase SQL Editor. */
export function coordinatesSql(located: LocatedVenue[], checkedOn: string): string {
  const lines = [
    "-- Map pins for camp venues.",
    `-- Coordinates from Natural Resources Canada's Geolocation service, looked up ${checkedOn}.`,
    "-- Contains information licensed under the Open Government Licence – Canada.",
    "-- Built by scripts/camps/locate-venues.ts. Safe to run again. Changes only latitude and longitude.",
    "",
    "begin;",
    "",
  ];
  for (const v of located) {
    lines.push(`-- ${v.name}: matched "${v.matchedTitle}"${v.qualifier ? ` (${v.qualifier})` : ""}`);
    lines.push(
      `update public.venues set latitude = ${v.lat}, longitude = ${v.lng}, updated_at = timezone('utc', now()) where id = ${sqlText(v.id)};`,
    );
    lines.push("");
  }
  lines.push("commit;", "");
  return lines.join("\n");
}
