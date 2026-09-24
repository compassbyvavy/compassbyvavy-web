/**
 * Deterministic matchers: extracted record → existing catalog row.
 *
 * Matching is deliberately literal. It trusts identifiers first (catalog ids,
 * slugs, canonical URLs, exact date windows) and refuses to guess from names
 * alone. When more than one catalog row is equally plausible the matcher
 * returns no match plus an `ambiguous_*` reason, which the pipeline turns into
 * an `ambiguous_match` flag and a `needs_review` candidate.
 *
 * Session offering identity is extractor-declared grain, not hardcoded
 * provider knowledge in this file. A weaker fallback never overrides an
 * identity mismatch. No fuzzy string distance. A human resolves genuine
 * ambiguity.
 */

import type {
  CampExtractedRecord,
  GrainComparison,
  MatchResult,
  MatchResultKind,
  OfferingGrain,
  OfferingGrainDimension,
  ProgramMatcher,
  ProviderMatcher,
  SessionCatalogMatchRow,
  SessionMatcher,
  VenueMatcher,
} from "@/data/camps/ingestion/types";
import {
  sameCanonicalHost,
  sameCanonicalUrl,
} from "@/lib/camps/ingestion/canonicalizeUrl";

const NO_MATCH: MatchResult = {
  kind: "NO_MATCH",
  catalogId: null,
  confidence: 0,
  reasons: ["no_match"],
};

/** Confidence when a stated identifier lines up exactly. */
const CONFIDENCE = {
  catalogId: 1,
  slug: 0.97,
  sessionDates: 0.96,
  externalId: 0.99,
  offeringGrain: 0.97,
  providerScopedName: 0.93,
  websiteHost: 0.95,
  sourceUrlAndStart: 0.9,
  exactName: 0.9,
  addressOnly: 0.8,
  startDateOnly: 0.75,
  unscopedName: 0.7,
  identityChanged: 0.3,
  ambiguous: 0.3,
} as const;

export function normalizeMatchText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return normalized === "" ? null : normalized;
}

function readString(
  fields: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

function readNumber(
  fields: Record<string, unknown>,
  keys: readonly string[],
): number | null {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function asFieldRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function matchResult(
  kind: MatchResultKind,
  catalogId: string | null,
  confidence: number,
  reasons: readonly string[],
): MatchResult {
  return { kind, catalogId, confidence, reasons: [...reasons] };
}

function resolve(
  matches: ReadonlyArray<{ id: string }>,
  confidence: number,
  reason: string,
  uniqueKind: Exclude<MatchResultKind, "AMBIGUOUS" | "NO_MATCH" | "IDENTITY_CHANGED">,
): MatchResult | null {
  if (matches.length === 1) {
    return matchResult(uniqueKind, matches[0].id, confidence, [reason]);
  }
  if (matches.length > 1) {
    return matchResult("AMBIGUOUS", null, CONFIDENCE.ambiguous, [
      `ambiguous_${reason}`,
      `candidates_${matches.length}`,
    ]);
  }
  return null;
}

function matchCatalogId(
  fields: Record<string, unknown>,
  idKeys: readonly string[],
  catalog: ReadonlyArray<{ id: string }>,
): MatchResult | null {
  const stated = readString(fields, idKeys);
  if (!stated) return null;
  const hit = catalog.find((row) => row.id === stated);
  if (!hit) return null;
  return matchResult("EXACT_IDENTITY", hit.id, CONFIDENCE.catalogId, ["exact_catalog_id"]);
}

export const exactProviderMatcher: ProviderMatcher = {
  match(extracted, catalog) {
    const fields = extracted.normalizedFields;
    const byId = matchCatalogId(fields, ["catalogId", "providerId", "id"], catalog);
    if (byId) return byId;

    const websiteUrl = readString(fields, ["websiteUrl", "sourceUrl", "url"]);
    if (websiteUrl) {
      const hostMatches = catalog.filter((row) =>
        sameCanonicalHost(row.websiteUrl ?? null, websiteUrl),
      );
      const resolved = resolve(hostMatches, CONFIDENCE.websiteHost, "website_host", "SAFE_RECONCILIATION");
      if (resolved) return resolved;
    }

    const name = normalizeMatchText(readString(fields, ["name", "providerName", "title"]));
    if (name) {
      const nameMatches = catalog.filter((row) => normalizeMatchText(row.name) === name);
      const resolved = resolve(nameMatches, CONFIDENCE.exactName, "name_match", "SAFE_RECONCILIATION");
      if (resolved) return resolved;
    }

    return NO_MATCH;
  },
};

export const exactProgramMatcher: ProgramMatcher = {
  match(extracted, catalog) {
    const fields = extracted.normalizedFields;
    const byId = matchCatalogId(fields, ["catalogId", "programId", "id"], catalog);
    if (byId) return byId;

    const slug = readString(fields, ["slug"]);
    if (slug) {
      const slugMatches = catalog.filter((row) => row.slug === slug);
      const resolved = resolve(slugMatches, CONFIDENCE.slug, "slug_match", "SAFE_RECONCILIATION");
      if (resolved) return resolved;
    }

    const name = normalizeMatchText(readString(fields, ["name", "programName", "title"]));
    if (!name) return NO_MATCH;

    const providerId = readString(fields, ["providerId"]);
    if (providerId) {
      const scoped = catalog.filter(
        (row) => row.providerId === providerId && normalizeMatchText(row.name) === name,
      );
      const resolved = resolve(
        scoped,
        CONFIDENCE.providerScopedName,
        "provider_scoped_name",
        "SAFE_RECONCILIATION",
      );
      if (resolved) return resolved;
    }

    const unscoped = catalog.filter((row) => normalizeMatchText(row.name) === name);
    // A name that matches across providers is never enough on its own.
    const resolved = resolve(unscoped, CONFIDENCE.unscopedName, "unscoped_name", "SAFE_RECONCILIATION");
    if (resolved) return resolved;

    return NO_MATCH;
  },
};

function extractedSourceIdentity(extracted: CampExtractedRecord): string | null {
  if (typeof extracted.sourceIdentity === "string" && extracted.sourceIdentity.trim() !== "") {
    return extracted.sourceIdentity.trim();
  }
  return readString(extracted.normalizedFields, ["externalId", "sourceIdentity"]);
}

function catalogExternalId(row: SessionCatalogMatchRow): string | null {
  return typeof row.externalId === "string" && row.externalId.trim() !== ""
    ? row.externalId.trim()
    : null;
}

function sourceIdentitiesConflict(
  extracted: CampExtractedRecord,
  row: SessionCatalogMatchRow,
): boolean {
  const extractedId = extractedSourceIdentity(extracted);
  const catalogId = catalogExternalId(row);
  return Boolean(extractedId && catalogId && extractedId !== catalogId);
}

function rawFieldValue(fields: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (!(key in fields)) continue;
    const value = fields[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return null;
}

function canonicalizeComparable(value: unknown, compare: GrainComparison): string | number | null {
  if (value === null || value === undefined) return null;
  if (compare === "number") {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }
  if (compare === "normalized_text") {
    return normalizeMatchText(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  return null;
}

function readExtractedDimension(
  extracted: CampExtractedRecord,
  dimension: OfferingGrainDimension,
): string | number | null {
  const source =
    dimension.extracted.scope === "record"
      ? asFieldRecord(extracted)
      : extracted.normalizedFields;
  return canonicalizeComparable(
    rawFieldValue(source, dimension.extracted.fields),
    dimension.compare,
  );
}

function readCatalogDimension(
  row: SessionCatalogMatchRow,
  dimension: OfferingGrainDimension,
): string | number | null {
  return canonicalizeComparable(
    rawFieldValue(asFieldRecord(row), dimension.catalogFields),
    dimension.compare,
  );
}

type DimensionFilter = {
  dimension: OfferingGrainDimension;
  extractedValue: string | number;
};

function statedDimensions(
  extracted: CampExtractedRecord,
  dimensions: readonly OfferingGrainDimension[],
): { stated: DimensionFilter[]; missingExtracted: OfferingGrainDimension[] } {
  const stated: DimensionFilter[] = [];
  const missingExtracted: OfferingGrainDimension[] = [];
  for (const dimension of dimensions) {
    const extractedValue = readExtractedDimension(extracted, dimension);
    if (extractedValue === null) {
      missingExtracted.push(dimension);
      continue;
    }
    stated.push({ dimension, extractedValue });
  }
  return { stated, missingExtracted };
}

function rowMatchesStatedDimensions(
  row: SessionCatalogMatchRow,
  stated: readonly DimensionFilter[],
): boolean {
  for (const { dimension, extractedValue } of stated) {
    const catalogValue = readCatalogDimension(row, dimension);
    if (catalogValue === null) return false;
    if (catalogValue !== extractedValue) return false;
  }
  return true;
}

function compareIdentityDimensions(
  extracted: CampExtractedRecord,
  row: SessionCatalogMatchRow,
  identity: readonly OfferingGrainDimension[],
): { comparable: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  for (const dimension of identity) {
    const extractedValue = readExtractedDimension(extracted, dimension);
    const catalogValue = readCatalogDimension(row, dimension);
    if (extractedValue === null || catalogValue === null) {
      return { comparable: false, mismatches };
    }
    if (extractedValue !== catalogValue) {
      mismatches.push(dimension.name);
    }
  }
  return { comparable: true, mismatches };
}

function programScopedRows(
  extracted: CampExtractedRecord,
  catalog: ReadonlyArray<SessionCatalogMatchRow>,
): SessionCatalogMatchRow[] {
  const programId = readString(extracted.normalizedFields, ["programId"]);
  if (!programId) return [...catalog];
  return catalog.filter((row) => row.programId === programId);
}

function matchDeclaredGrain(
  extracted: CampExtractedRecord,
  catalog: ReadonlyArray<SessionCatalogMatchRow>,
  grain: OfferingGrain,
): MatchResult | null {
  const { stated, missingExtracted } = statedDimensions(extracted, grain.identity);
  if (missingExtracted.length > 0 || stated.length === 0) {
    return matchResult("NO_MATCH", null, 0, ["grain_identity_incomplete"]);
  }

  const scoped = programScopedRows(extracted, catalog);
  const hits = scoped.filter((row) => rowMatchesStatedDimensions(row, stated));
  return resolve(hits, CONFIDENCE.offeringGrain, "exact_declared_grain", "EXACT_IDENTITY");
}

function matchDeclaredReconciliation(
  extracted: CampExtractedRecord,
  catalog: ReadonlyArray<SessionCatalogMatchRow>,
  grain: OfferingGrain,
): MatchResult | null {
  const { stated, missingExtracted } = statedDimensions(extracted, grain.reconciliation);
  if (missingExtracted.length > 0 || stated.length === 0) {
    return null;
  }

  const scoped = programScopedRows(extracted, catalog);
  const hits = scoped.filter((row) => rowMatchesStatedDimensions(row, stated));
  if (hits.length === 0) return null;
  if (hits.length > 1) {
    return matchResult("AMBIGUOUS", null, CONFIDENCE.ambiguous, [
      "ambiguous_reconciliation",
      `candidates_${hits.length}`,
    ]);
  }

  const candidate = hits[0];
  const identity = compareIdentityDimensions(extracted, candidate, grain.identity);
  if (!identity.comparable) {
    return matchResult("NO_MATCH", null, 0, ["grain_identity_incomplete"]);
  }
  if (identity.mismatches.length === 0) {
    return matchResult("SAFE_RECONCILIATION", candidate.id, CONFIDENCE.offeringGrain, [
      "safe_reconciliation",
    ]);
  }
  return matchResult("IDENTITY_CHANGED", null, CONFIDENCE.identityChanged, [
    "identity_changed",
    ...identity.mismatches.map((name) => `identity_changed:${name}`),
  ]);
}

function withoutConflictingIdentities(
  extracted: CampExtractedRecord,
  rows: ReadonlyArray<SessionCatalogMatchRow>,
): SessionCatalogMatchRow[] {
  return rows.filter((row) => !sourceIdentitiesConflict(extracted, row));
}

function matchLegacyFallbacks(
  extracted: CampExtractedRecord,
  catalog: ReadonlyArray<SessionCatalogMatchRow>,
): MatchResult {
  const fields = extracted.normalizedFields;
  const programId = readString(fields, ["programId"]);
  const startDate = readString(fields, ["startDate"]);
  const endDate = readString(fields, ["endDate"]);
  const sourceUrl = readString(fields, ["sourceUrl", "registrationUrl", "url"]);

  if (programId && startDate && endDate) {
    const exact = withoutConflictingIdentities(
      extracted,
      catalog.filter(
        (row) =>
          row.programId === programId &&
          row.startDate === startDate &&
          row.endDate === endDate,
      ),
    );
    const resolved = resolve(
      exact,
      CONFIDENCE.sessionDates,
      "program_and_date_window",
      "SAFE_RECONCILIATION",
    );
    if (resolved) return resolved;
  }

  if (sourceUrl && startDate) {
    const byUrl = withoutConflictingIdentities(
      extracted,
      catalog.filter(
        (row) => sameCanonicalUrl(row.sourceUrl, sourceUrl) && row.startDate === startDate,
      ),
    );
    const resolved = resolve(
      byUrl,
      CONFIDENCE.sourceUrlAndStart,
      "legacy_source_url_and_start",
      "SAFE_RECONCILIATION",
    );
    if (resolved) return resolved;
  }

  if (programId && startDate) {
    const byStart = withoutConflictingIdentities(
      extracted,
      catalog.filter((row) => row.programId === programId && row.startDate === startDate),
    );
    const resolved = resolve(
      byStart,
      CONFIDENCE.startDateOnly,
      "program_and_start_date",
      "SAFE_RECONCILIATION",
    );
    if (resolved) return resolved;
  }

  return NO_MATCH;
}

export const exactSessionMatcher: SessionMatcher = {
  match(extracted, catalog, grain = null) {
    const fields = extracted.normalizedFields;
    const byId = matchCatalogId(fields, ["catalogId", "sessionId", "id"], catalog);
    if (byId) return byId;

    const externalId = extractedSourceIdentity(extracted);
    if (externalId) {
      const byExternal = catalog.filter(
        (row) => row.externalId === externalId || row.id === externalId,
      );
      const resolved = resolve(
        byExternal,
        CONFIDENCE.externalId,
        "exact_external_identity",
        "EXACT_IDENTITY",
      );
      if (resolved) return resolved;
    }

    if (grain) {
      const grainIdentity = matchDeclaredGrain(extracted, catalog, grain);
      if (grainIdentity && grainIdentity.kind !== "NO_MATCH") return grainIdentity;

      const reconciled = matchDeclaredReconciliation(extracted, catalog, grain);
      if (reconciled) return reconciled;

      if (grainIdentity?.reasons.includes("grain_identity_incomplete")) {
        return grainIdentity;
      }
      return NO_MATCH;
    }

    return matchLegacyFallbacks(extracted, catalog);
  },
};

export const exactVenueMatcher: VenueMatcher = {
  match(extracted, catalog) {
    const fields = extracted.normalizedFields;
    const byId = matchCatalogId(fields, ["catalogId", "venueId", "id"], catalog);
    if (byId) return byId;

    const name = normalizeMatchText(readString(fields, ["name", "venueName", "title"]));
    const addressLine = normalizeMatchText(readString(fields, ["addressLine", "address"]));

    if (name && addressLine) {
      const both = catalog.filter(
        (row) =>
          normalizeMatchText(row.name) === name &&
          normalizeMatchText(row.addressLine ?? null) === addressLine,
      );
      const resolved = resolve(both, CONFIDENCE.websiteHost, "name_and_address", "SAFE_RECONCILIATION");
      if (resolved) return resolved;
    }

    if (name) {
      const byName = catalog.filter((row) => normalizeMatchText(row.name) === name);
      const resolved = resolve(byName, CONFIDENCE.exactName, "name_match", "SAFE_RECONCILIATION");
      if (resolved) return resolved;
    }

    if (addressLine) {
      const byAddress = catalog.filter(
        (row) => normalizeMatchText(row.addressLine ?? null) === addressLine,
      );
      const resolved = resolve(byAddress, CONFIDENCE.addressOnly, "address_match", "SAFE_RECONCILIATION");
      if (resolved) return resolved;
    }

    return NO_MATCH;
  },
};

export type SessionCatalogRow = SessionCatalogMatchRow;

/**
 * True when an extracted session looks like a genuinely new catalog row: no
 * existing session matched, and the record carries enough identity (a program
 * plus a start date, or an external id) to be reviewable as an addition.
 *
 * A dateless, idless session block is not a new session — it is an incomplete
 * read of the page, and gets flagged rather than proposed.
 */
export function isNewSessionCandidate(
  extracted: CampExtractedRecord,
  catalog: ReadonlyArray<SessionCatalogRow>,
  grain: OfferingGrain | null = null,
): boolean {
  if (extracted.recordType !== "session") return false;
  const match = exactSessionMatcher.match(extracted, catalog, grain);
  if (match.catalogId) return false;
  if (match.kind === "AMBIGUOUS") return false;
  if (match.reasons.some((reason) => reason.startsWith("ambiguous"))) return false;

  const fields = extracted.normalizedFields;
  const hasProgram = Boolean(readString(fields, ["programId"]));
  const hasStart = Boolean(readString(fields, ["startDate"]));
  const hasExternalId = Boolean(extractedSourceIdentity(extracted));
  return (hasProgram && hasStart) || hasExternalId;
}
