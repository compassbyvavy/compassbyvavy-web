/**
 * Deterministic matchers: extracted record → existing catalog row.
 *
 * Matching is deliberately literal. It trusts identifiers first (catalog ids,
 * slugs, canonical URLs, exact date windows) and refuses to guess from names
 * alone. When more than one catalog row is equally plausible the matcher
 * returns no match plus an `ambiguous_*` reason, which the pipeline turns into
 * an `ambiguous_match` flag and a `needs_review` candidate.
 *
 * No fuzzy string distance. A human resolves genuine ambiguity.
 */

import type {
  CampExtractedRecord,
  MatchResult,
  ProgramMatcher,
  ProviderMatcher,
  SessionMatcher,
  VenueMatcher,
} from "@/data/camps/ingestion/types";
import {
  sameCanonicalHost,
  sameCanonicalUrl,
} from "@/lib/camps/ingestion/canonicalizeUrl";

const NO_MATCH: MatchResult = { catalogId: null, confidence: 0, reasons: ["no_match"] };

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


function resolve(
  matches: ReadonlyArray<{ id: string }>,
  confidence: number,
  reason: string,
): MatchResult | null {
  if (matches.length === 1) {
    return { catalogId: matches[0].id, confidence, reasons: [reason] };
  }
  if (matches.length > 1) {
    return {
      catalogId: null,
      confidence: CONFIDENCE.ambiguous,
      reasons: [`ambiguous_${reason}`, `candidates_${matches.length}`],
    };
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
  return { catalogId: hit.id, confidence: CONFIDENCE.catalogId, reasons: ["exact_catalog_id"] };
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
      const resolved = resolve(hostMatches, CONFIDENCE.websiteHost, "website_host");
      if (resolved) return resolved;
    }

    const name = normalizeMatchText(readString(fields, ["name", "providerName", "title"]));
    if (name) {
      const nameMatches = catalog.filter((row) => normalizeMatchText(row.name) === name);
      const resolved = resolve(nameMatches, CONFIDENCE.exactName, "name_match");
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
      const resolved = resolve(slugMatches, CONFIDENCE.slug, "slug_match");
      if (resolved) return resolved;
    }

    const name = normalizeMatchText(readString(fields, ["name", "programName", "title"]));
    if (!name) return NO_MATCH;

    const providerId = readString(fields, ["providerId"]);
    if (providerId) {
      const scoped = catalog.filter(
        (row) => row.providerId === providerId && normalizeMatchText(row.name) === name,
      );
      const resolved = resolve(scoped, CONFIDENCE.providerScopedName, "provider_scoped_name");
      if (resolved) return resolved;
    }

    const unscoped = catalog.filter((row) => normalizeMatchText(row.name) === name);
    // A name that matches across providers is never enough on its own.
    const resolved = resolve(unscoped, CONFIDENCE.unscopedName, "unscoped_name");
    if (resolved) return resolved;

    return NO_MATCH;
  },
};

export const exactSessionMatcher: SessionMatcher = {
  match(extracted, catalog) {
    const fields = extracted.normalizedFields;
    const byId = matchCatalogId(fields, ["catalogId", "sessionId", "id"], catalog);
    if (byId) return byId;

    const externalId = readString(fields, ["externalId", "sourceIdentity"]);
    if (externalId) {
      const byExternal = catalog.filter(
        (row) => row.externalId === externalId || row.id === externalId,
      );
      const resolved = resolve(byExternal, CONFIDENCE.externalId, "external_id");
      if (resolved) return resolved;
    }

    const programId = readString(fields, ["programId"]);
    const startDate = readString(fields, ["startDate"]);
    const endDate = readString(fields, ["endDate"]);
    const sourceUrl = readString(fields, ["sourceUrl", "registrationUrl", "url"]);
    const ageMin = readNumber(fields, ["ageMin"]);
    const ageMax = readNumber(fields, ["ageMax"]);
    const themeNormalized =
      normalizeMatchText(readString(fields, ["themeTitleNormalized", "themeTitle"])) ??
      null;

    // Prompt 8B grain: week × theme × age band are identity.
    // When the extract states all three, only an exact grain hit may match.
    // Falling through to date-only matchers would silently merge 8–13 into 9–13.
    if (
      programId &&
      startDate &&
      endDate &&
      ageMin !== null &&
      ageMax !== null &&
      themeNormalized
    ) {
      const offerings = catalog.filter(
        (row) =>
          row.programId === programId &&
          row.startDate === startDate &&
          row.endDate === endDate &&
          row.ageMin === ageMin &&
          row.ageMax === ageMax &&
          normalizeMatchText(row.themeTitleNormalized ?? row.themeTitle ?? null) ===
            themeNormalized,
      );
      const resolved = resolve(offerings, CONFIDENCE.offeringGrain, "program_date_theme_age");
      if (resolved) return resolved;
      return NO_MATCH;
    }

    // Weaker fallbacks only when age/theme identity was not fully stated.
    if (programId && startDate && endDate) {
      const exact = catalog.filter(
        (row) =>
          row.programId === programId &&
          row.startDate === startDate &&
          row.endDate === endDate,
      );
      const resolved = resolve(exact, CONFIDENCE.sessionDates, "program_and_date_window");
      if (resolved) return resolved;
    }

    if (sourceUrl && startDate) {
      const byUrl = catalog.filter(
        (row) => sameCanonicalUrl(row.sourceUrl, sourceUrl) && row.startDate === startDate,
      );
      const resolved = resolve(byUrl, CONFIDENCE.sourceUrlAndStart, "source_url_and_start");
      if (resolved) return resolved;
    }

    if (programId && startDate) {
      const byStart = catalog.filter(
        (row) => row.programId === programId && row.startDate === startDate,
      );
      const resolved = resolve(byStart, CONFIDENCE.startDateOnly, "program_and_start_date");
      if (resolved) return resolved;
    }

    return NO_MATCH;
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
      const resolved = resolve(both, CONFIDENCE.websiteHost, "name_and_address");
      if (resolved) return resolved;
    }

    if (name) {
      const byName = catalog.filter((row) => normalizeMatchText(row.name) === name);
      const resolved = resolve(byName, CONFIDENCE.exactName, "name_match");
      if (resolved) return resolved;
    }

    if (addressLine) {
      const byAddress = catalog.filter(
        (row) => normalizeMatchText(row.addressLine ?? null) === addressLine,
      );
      const resolved = resolve(byAddress, CONFIDENCE.addressOnly, "address_match");
      if (resolved) return resolved;
    }

    return NO_MATCH;
  },
};

export type SessionCatalogRow = {
  id: string;
  programId: string;
  startDate?: string | null;
  endDate?: string | null;
  sourceUrl?: string | null;
  externalId?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  themeTitle?: string | null;
  themeTitleNormalized?: string | null;
};

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
): boolean {
  if (extracted.recordType !== "session") return false;
  const match = exactSessionMatcher.match(extracted, catalog);
  if (match.catalogId) return false;
  if (match.reasons.some((reason) => reason.startsWith("ambiguous"))) return false;

  const fields = extracted.normalizedFields;
  const hasProgram = Boolean(readString(fields, ["programId"]));
  const hasStart = Boolean(readString(fields, ["startDate"]));
  const hasExternalId = Boolean(readString(fields, ["externalId", "sourceIdentity"]));
  return (hasProgram && hasStart) || hasExternalId;
}
