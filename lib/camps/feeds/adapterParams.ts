/**
 * Seed cells look like `OrgID=537009; category1=Winter Break Camp` or
 * `name starts 'PA day'`. Key=value pieces become fields. A piece with no
 * equals sign is kept as a filter so a note is not dropped.
 */

export type AdapterParams = {
  values: Record<string, string>;
  filters: string[];
};

export type StoredAdapterParams = Record<string, string | string[]>;

export function parseAdapterParams(raw: string | null | undefined): AdapterParams {
  const values: Record<string, string> = {};
  const filters: string[] = [];
  if (!raw) return { values, filters };
  for (const part of raw.split(";")) {
    const piece = part.trim();
    if (!piece) continue;
    const eq = piece.indexOf("=");
    if (eq === -1) {
      filters.push(piece);
      continue;
    }
    const key = piece.slice(0, eq).trim();
    if (!key || key === "filters") continue;
    values[key] = piece.slice(eq + 1).trim();
  }
  return { values, filters };
}

export function storedAdapterParams(raw: string | null | undefined): StoredAdapterParams {
  const parsed = parseAdapterParams(raw);
  return { ...parsed.values, filters: parsed.filters };
}

export function readAdapterParams(raw: unknown): AdapterParams {
  if (typeof raw === "string") return parseAdapterParams(raw);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { values: {}, filters: [] };
  const record = raw as Record<string, unknown>;
  const filters = Array.isArray(record.filters)
    ? record.filters.filter((item): item is string => typeof item === "string")
    : [];
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === "filters") continue;
    if (typeof value === "string" || typeof value === "number") values[key] = String(value);
  }
  return { values, filters };
}
