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
 * Persist as `version:algorithm:hex` (e.g. `camp-facts-v2:sha256:…`).
 *
 * Stored v1 hashes are never reinterpreted as v2. `compareFactFingerprints`
 * treats a version prefix change as `version_mismatch`, even when the hex
 * digest happens to match.
 */

import { createHash } from "node:crypto";
import type { CampExtractedRecord } from "@/data/camps/ingestion/types";

export const FACT_FINGERPRINT_VERSION_V1 = "camp-facts-v1";
export const FACT_FINGERPRINT_VERSION_V2 = "camp-facts-v2";
export const FACT_FINGERPRINT_VERSION = FACT_FINGERPRINT_VERSION_V2;
export const FACT_FINGERPRINT_ALGORITHM = "sha256";

export type FactFingerprintVersion =
  | typeof FACT_FINGERPRINT_VERSION_V1
  | typeof FACT_FINGERPRINT_VERSION_V2;

/** Older persisted versions that may be recomputed in place when raw is unchanged. */
export const FINGERPRINT_REBASELINE_FROM_VERSIONS = new Set<string>([
  FACT_FINGERPRINT_VERSION_V1,
  "legacy-unversioned",
]);

/** Parent-relevant program facts (marketing ages ≠ session eligibility). */
export const PROGRAM_FACT_KEYS_V1 = [
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
  /**
   * Deterministic negative/absence signals from the extractor (for example
   * `own_counsellor_background_screening_policy_not_stated`). Keep these in
   * the fingerprint. If known-gap detection semantics change because extraction
   * capability changed, bump {@link FACT_FINGERPRINT_VERSION} or explicitly
   * rebaseline — do not treat “extractor got better” as “provider changed facts.”
   */
  "knownGaps",
] as const;

/** v2 program projection is additive at the session layer; program keys stay v1. */
export const PROGRAM_FACT_KEYS_V2 = PROGRAM_FACT_KEYS_V1;

/** Parent-relevant session facts for week × theme × age offerings (camp-facts-v1). */
export const SESSION_FACT_KEYS_V1 = [
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

/**
 * camp-facts-v2 session keys: v1 plus structured facts that already exist on
 * the normalized contract (or are promoted from already-parsed structured
 * amounts/bands — never from observation bags).
 *
 * PROGRAM_POLICIES_BLOB_FINGERPRINTING: duplication with program.policies is
 * intentional and left in place. Riverwood SOLD OUT copy / enrolmentCapPerWeek
 * and Front Line playerPriceAmount / goaliePriceAmount already enter v1 via
 * the policies blob. Session keys make those facts independently visible.
 * Do not strip the blob in A1.
 */
export const SESSION_FACT_KEYS_V2 = [
  ...SESSION_FACT_KEYS_V1,
  "scheduleFormat",
  "gradeMin",
  "gradeMax",
  "ageBands",
  "seatAvailability",
  "registrationStatus",
  "enrolmentCapPerWeek",
  "beforeCare",
  "afterCare",
  "priceOptions",
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

export const FACT_FINGERPRINT_EXCLUDED_KEYS = EXCLUDED_ALWAYS;

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

export function isFactFingerprintVersion(value: string): value is FactFingerprintVersion {
  return value === FACT_FINGERPRINT_VERSION_V1 || value === FACT_FINGERPRINT_VERSION_V2;
}

/**
 * True when a stored fingerprint is an older known version and the current
 * algorithm may recompute/persist a new version without treating that as a
 * provider fact change. Unparseable values are never silently rebaselined.
 */
export function needsFingerprintRebaseline(
  stored: string | null | undefined,
  currentVersion: string = FACT_FINGERPRINT_VERSION,
): boolean {
  const parsed = parseSemanticFingerprint(stored);
  if (!parsed) return false;
  if (parsed.version === currentVersion && parsed.algorithm === FACT_FINGERPRINT_ALGORITHM) {
    return false;
  }
  return FINGERPRINT_REBASELINE_FROM_VERSIONS.has(parsed.version);
}

/**
 * Build the versioned fingerprint for a successful extraction's records.
 */
export function computeSemanticFingerprint(
  records: readonly CampExtractedRecord[],
  version: FactFingerprintVersion = FACT_FINGERPRINT_VERSION,
): SemanticFingerprint {
  const payload = buildFactFingerprintPayload(records, version);
  const canonical = stableStringify(payload);
  const hash = createHash(FACT_FINGERPRINT_ALGORITHM)
    .update(canonical, "utf8")
    .digest("hex");
  return {
    version,
    algorithm: FACT_FINGERPRINT_ALGORITHM,
    hash,
  };
}

/** Persistable string: `camp-facts-v2:sha256:<hex>`. */
export function formatSemanticFingerprint(fingerprint: SemanticFingerprint): string {
  return `${fingerprint.version}:${fingerprint.algorithm}:${fingerprint.hash}`;
}

export function parseSemanticFingerprint(
  value: string | null | undefined,
): SemanticFingerprint | null {
  if (!value) return null;
  const parts = value.split(":");
  // camp-facts-v1:sha256:<hex>  /  camp-facts-v2:sha256:<hex>
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
export function hashFactFingerprint(
  records: readonly CampExtractedRecord[],
  version: FactFingerprintVersion = FACT_FINGERPRINT_VERSION,
): string {
  return formatSemanticFingerprint(computeSemanticFingerprint(records, version));
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
  version: FactFingerprintVersion = FACT_FINGERPRINT_VERSION,
): FactFingerprintRecord[] {
  const payload = records.map((record) => {
    const fields = pickFactFields(record.recordType, record.normalizedFields, version);
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
  version: FactFingerprintVersion,
): Record<string, unknown> {
  const allow = allowlistFor(recordType, version);
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(normalized)) {
    if (EXCLUDED_ALWAYS.has(key)) continue;
    if (allow && !allow.has(key)) continue;
    if (value === undefined) continue;
    // Preserve null vs false vs 0 vs "" — UNKNOWN ≠ FALSE ≠ ZERO.
    fields[key] = canonicalizeValue(value, key);
  }
  return sortKeys(fields);
}

function allowlistFor(
  recordType: string,
  version: FactFingerprintVersion,
): Set<string> | null {
  switch (recordType) {
    case "program":
      return new Set(version === FACT_FINGERPRINT_VERSION_V1 ? PROGRAM_FACT_KEYS_V1 : PROGRAM_FACT_KEYS_V2);
    case "session":
      return new Set(version === FACT_FINGERPRINT_VERSION_V1 ? SESSION_FACT_KEYS_V1 : SESSION_FACT_KEYS_V2);
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

function canonicalizeValue(value: unknown, key?: string): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    if (key === "ageBands") return canonicalizeAgeBands(value);
    if (key === "priceOptions") return canonicalizePriceOptions(value);
    const mapped = value.map((entry) => canonicalizeValue(entry));
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
  for (const [nestedKey, nested] of Object.entries(object)) {
    if (EXCLUDED_ALWAYS.has(nestedKey)) continue;
    if (nested === undefined) continue;
    cleaned[nestedKey] = canonicalizeValue(nested);
  }
  return sortKeys(cleaned);
}

function canonicalizeAgeBands(values: unknown[]): unknown[] {
  const mapped = values.map((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return canonicalizeValue(entry);
    }
    const band = entry as Record<string, unknown>;
    return sortKeys({
      ageMin: band.ageMin ?? null,
      ageMax: band.ageMax ?? null,
      hoursStart: band.hoursStart ?? null,
      hoursEnd: band.hoursEnd ?? null,
      // Semantic label only — display `copy` chrome is not a fact.
      ...(band.label !== undefined ? { label: band.label } : {}),
    });
  });
  return [...mapped].sort((left, right) => ageBandSortKey(left).localeCompare(ageBandSortKey(right)));
}

function ageBandSortKey(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return stableStringify(value);
  }
  const band = value as Record<string, unknown>;
  return [
    String(band.ageMin ?? ""),
    String(band.ageMax ?? ""),
    String(band.hoursStart ?? ""),
    String(band.hoursEnd ?? ""),
    String(band.label ?? ""),
  ].join("|");
}

function canonicalizePriceOptions(values: unknown[]): unknown[] {
  const mapped = values.map((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return canonicalizeValue(entry);
    }
    const option = entry as Record<string, unknown>;
    return sortKeys({
      key: option.key ?? option.role ?? null,
      label: option.label ?? null,
      amount: option.amount ?? null,
      unit: option.unit ?? null,
      currency: option.currency ?? null,
    });
  });
  return [...mapped].sort((left, right) =>
    priceOptionSortKey(left).localeCompare(priceOptionSortKey(right)),
  );
}

function priceOptionSortKey(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return stableStringify(value);
  }
  const option = value as Record<string, unknown>;
  return [
    String(option.key ?? ""),
    String(option.label ?? ""),
    String(option.amount ?? ""),
    String(option.unit ?? ""),
    String(option.currency ?? ""),
  ].join("|");
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
