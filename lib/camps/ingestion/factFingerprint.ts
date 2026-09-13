/**
 * Semantic fact fingerprint — second gate after raw content hashing.
 *
 * RAW HASH answers: "did the source bytes change?"
 * FACT FINGERPRINT answers: "did meaningful normalized camp facts change?"
 *
 * Session *identity* (matcher) and fact *fingerprint* are different:
 * - identity: same week × theme × age band → same offering
 * - fingerprint: includes mutable facts such as price and add-ons
 *
 * A $350 → $365 change keeps identity and changes the fingerprint.
 *
 * Algorithm version: {@link FACT_FINGERPRINT_VERSION}
 * Persist as `version:algorithm:hex` (e.g. `camp-facts-v1:sha256:…`).
 */

import { createHash } from "node:crypto";
import type { CampExtractedRecord } from "@/data/camps/ingestion/types";

export const FACT_FINGERPRINT_VERSION = "camp-facts-v1";
export const FACT_FINGERPRINT_ALGORITHM = "sha256";

/** Parent-relevant program facts (marketing ages ≠ session eligibility). */
const PROGRAM_FACT_KEYS = [
  "name",
  "marketingAgeMin",
  "marketingAgeMax",
  "typicalAgeMin",
  "typicalAgeMax",
  "derivedAvailableAgeMin",
  "derivedAvailableAgeMax",
  "seasonStartDate",
  "seasonEndDate",
  "coreHoursStart",
  "coreHoursEnd",
  "registrationUrl",
  "registrationPlatform",
  "policies",
  "businessAddress",
  "knownGaps",
] as const;

/** Parent-relevant session facts for week × theme × age offerings. */
const SESSION_FACT_KEYS = [
  "startDate",
  "endDate",
  "weekIdentity",
  "weekNumber",
  "themeTitle",
  "themeTitleNormalized",
  "ageMin",
  "ageMax",
  "priceTierKey",
  "priceTierLabel",
  "priceAmount",
  "priceUnit",
  "currency",
  "shortWeekPriceAmount",
  "addOnFeeCad",
  "addOnLabel",
  "outingLabel",
  "coreHoursStart",
  "coreHoursEnd",
  "registrationUrl",
  "registrationPlatform",
] as const;

const VENUE_FACT_KEYS = [
  "name",
  "addressLine",
  "city",
  "province",
  "postalCode",
] as const;

const PROVIDER_FACT_KEYS = [
  "name",
  "websiteUrl",
  "registrationPlatform",
] as const;

/** Provenance / plumbing never enters the fingerprint. */
const EXCLUDED_ALWAYS = new Set([
  "observations",
  "factScope",
  "sharedObservationKey",
  "externalId",
  "providerId",
  "programId",
  "venueId",
  "sourceUrl",
  "sourceSnapshotId",
  "snapshotId",
  "extractionRunId",
  "observedAt",
  "extractionMethod",
  "rawValue",
  "confidence",
  "warnings",
]);

export type SemanticFingerprint = {
  version: string;
  algorithm: typeof FACT_FINGERPRINT_ALGORITHM;
  hash: string;
};

export type FactFingerprintRecord = {
  recordType: string;
  /** Stable semantic sort key — not a generated UUID. */
  sortKey: string;
  fields: Record<string, unknown>;
};

export type FactFingerprintComparison =
  | { kind: "baseline" }
  | { kind: "unchanged" }
  | { kind: "changed" }
  | {
      kind: "version_mismatch";
      previousVersion: string;
      nextVersion: string;
    };

/**
 * Build the versioned fingerprint for a successful extraction's records.
 */
export function computeSemanticFingerprint(
  records: readonly CampExtractedRecord[],
): SemanticFingerprint {
  const payload = buildFactFingerprintPayload(records);
  const canonical = stableStringify(payload);
  const hash = createHash(FACT_FINGERPRINT_ALGORITHM)
    .update(canonical, "utf8")
    .digest("hex");
  return {
    version: FACT_FINGERPRINT_VERSION,
    algorithm: FACT_FINGERPRINT_ALGORITHM,
    hash,
  };
}

/** Persistable string: `camp-facts-v1:sha256:<hex>`. */
export function formatSemanticFingerprint(fingerprint: SemanticFingerprint): string {
  return `${fingerprint.version}:${fingerprint.algorithm}:${fingerprint.hash}`;
}

export function parseSemanticFingerprint(
  value: string | null | undefined,
): SemanticFingerprint | null {
  if (!value) return null;
  const parts = value.split(":");
  // camp-facts-v1:sha256:<hex>
  if (parts.length === 3 && parts[2] && /^[0-9a-f]+$/i.test(parts[2])) {
    return {
      version: parts[0],
      algorithm: "sha256",
      hash: parts[2].toLowerCase(),
    };
  }
  // Legacy unversioned `sha256:<hex>` from Prompt 8A-era storage.
  if (parts.length === 2 && parts[0] === "sha256" && parts[1]) {
    return {
      version: "legacy-unversioned",
      algorithm: "sha256",
      hash: parts[1].toLowerCase(),
    };
  }
  return null;
}

/** Convenience: compute + format in one step (runner / tests). */
export function hashFactFingerprint(records: readonly CampExtractedRecord[]): string {
  return formatSemanticFingerprint(computeSemanticFingerprint(records));
}

/**
 * Compare previous vs next fingerprint strings.
 *
 * - No previous → baseline (first successful facts).
 * - Different algorithm versions → version_mismatch (never claim unchanged).
 * - Same version, same hash → unchanged.
 * - Same version, different hash → changed.
 */
export function compareFactFingerprints(
  previous: string | null | undefined,
  next: string | null | undefined,
): FactFingerprintComparison {
  if (!next) return { kind: "baseline" };
  if (!previous) return { kind: "baseline" };

  const prev = parseSemanticFingerprint(previous);
  const curr = parseSemanticFingerprint(next);
  if (!prev || !curr) {
    return {
      kind: "version_mismatch",
      previousVersion: prev?.version ?? "unparseable",
      nextVersion: curr?.version ?? "unparseable",
    };
  }
  if (prev.version !== curr.version || prev.algorithm !== curr.algorithm) {
    return {
      kind: "version_mismatch",
      previousVersion: prev.version,
      nextVersion: curr.version,
    };
  }
  return prev.hash === curr.hash ? { kind: "unchanged" } : { kind: "changed" };
}

/**
 * True only when both fingerprints exist, share a version, and match.
 * Missing previous is never unchanged (baseline must continue to candidates).
 */
export function factsUnchanged(
  previous: string | null | undefined,
  next: string | null | undefined,
): boolean {
  return compareFactFingerprints(previous, next).kind === "unchanged";
}

/**
 * Stable, order-independent payload of meaningful normalized facts.
 */
export function buildFactFingerprintPayload(
  records: readonly CampExtractedRecord[],
): FactFingerprintRecord[] {
  const payload = records.map((record) => {
    const fields = pickFactFields(record.recordType, record.normalizedFields);
    return {
      recordType: record.recordType,
      sortKey: semanticSortKey(record.recordType, fields, record.sourceIdentity),
      fields,
    };
  });

  return payload.sort((a, b) => {
    const byType = a.recordType.localeCompare(b.recordType);
    if (byType !== 0) return byType;
    return a.sortKey.localeCompare(b.sortKey);
  });
}

function pickFactFields(
  recordType: string,
  normalized: Record<string, unknown>,
): Record<string, unknown> {
  const allow = allowlistFor(recordType);
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(normalized)) {
    if (EXCLUDED_ALWAYS.has(key)) continue;
    if (allow && !allow.has(key)) continue;
    if (value === undefined) continue;
    // Preserve null vs false vs 0 vs "" — UNKNOWN ≠ FALSE ≠ ZERO.
    fields[key] = canonicalizeValue(value);
  }
  return sortKeys(fields);
}

function allowlistFor(recordType: string): Set<string> | null {
  switch (recordType) {
    case "program":
      return new Set(PROGRAM_FACT_KEYS);
    case "session":
      return new Set(SESSION_FACT_KEYS);
    case "venue":
      return new Set(VENUE_FACT_KEYS);
    case "provider":
      return new Set(PROVIDER_FACT_KEYS);
    default:
      // Unknown record types: include all non-excluded keys (forward compatible).
      return null;
  }
}

function semanticSortKey(
  recordType: string,
  fields: Record<string, unknown>,
  sourceIdentity: string,
): string {
  if (recordType === "session") {
    return [
      String(fields.startDate ?? ""),
      String(fields.endDate ?? ""),
      String(fields.themeTitleNormalized ?? fields.themeTitle ?? ""),
      String(fields.ageMin ?? ""),
      String(fields.ageMax ?? ""),
      String(fields.priceTierKey ?? ""),
      sourceIdentity,
    ].join("|");
  }
  return `${String(fields.name ?? "")}|${sourceIdentity}`;
}

function canonicalizeValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const mapped = value.map(canonicalizeValue);
    // Sort arrays of plain objects / primitives for order independence.
    return sortCanonicalArray(mapped);
  }
  const object = value as Record<string, unknown>;
  // FieldObservation bags: keep only the normalized `value`.
  if (
    "value" in object &&
    ("rawValue" in object || "observedAt" in object || "extractionMethod" in object)
  ) {
    return canonicalizeValue(object.value);
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(object)) {
    if (EXCLUDED_ALWAYS.has(key)) continue;
    if (nested === undefined) continue;
    cleaned[key] = canonicalizeValue(nested);
  }
  return sortKeys(cleaned);
}

function sortCanonicalArray(values: unknown[]): unknown[] {
  return [...values].sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
}

function sortKeys(object: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(object).sort()) {
    sorted[key] = object[key];
  }
  return sorted;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}
