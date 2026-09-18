/**
 * Exact session age eligibility — matching sessions only.
 *
 * Age unit: whole years (non-negative integers). Fractional ages are unsupported
 * and yield "unknown". Do not invent birthdays or DOB storage.
 *
 * A published age-band label on a card is not the same fact as confirmed
 * eligibility for a particular child — use childMatchesSessionAge for the latter.
 *
 * Program-level ages are never consulted.
 */

import type { CampAgeAssessmentRule, CampSession } from "@/data/camps/types";

export type SessionAgeMatchResult = "match" | "no_match" | "unknown";

export type ChildAgeStatement = {
  /**
   * Child's age in whole years as of `asOfDate`.
   * Must be a finite non-negative integer; otherwise the result is unknown.
   */
  ageYears: number;
  /**
   * ISO YYYY-MM-DD the ageYears statement is true for.
   * Must equal the session's assessment date to evaluate — ages are not projected.
   */
  asOfDate: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDateString(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function isWholeYear(age: number): boolean {
  return Number.isInteger(age) && Number.isFinite(age) && age >= 0;
}

/**
 * Resolve the provider assessment calendar date for this session.
 * Returns null when the rule/date cannot be determined (evaluate → unknown).
 */
export function resolveSessionAssessmentDate(
  session: CampSession,
): string | null {
  const rule: CampAgeAssessmentRule =
    session.ageAssessmentRule ?? "unknown";

  if (rule === "unknown") return null;

  if (rule === "as_of_date") {
    return isIsoDateString(session.ageAssessedAtDate)
      ? session.ageAssessedAtDate
      : null;
  }

  if (rule === "as_of_session_start") {
    return isIsoDateString(session.startDate) ? session.startDate : null;
  }

  return null;
}

/**
 * Whether the session publishes a fully known age band (for card labels).
 * Does not prove a particular child matches.
 */
export function sessionAgeBandIsKnown(session: CampSession): boolean {
  const hasMin = session.ageMin != null;
  const hasMax = session.ageMax != null;
  if (!hasMin && !hasMax) return false;
  if (hasMin && session.ageMinInclusive == null) return false;
  if (hasMax && session.ageMaxInclusive == null) return false;
  if (typeof session.ageMin === "number" && !Number.isFinite(session.ageMin)) {
    return false;
  }
  if (typeof session.ageMax === "number" && !Number.isFinite(session.ageMax)) {
    return false;
  }
  if (
    typeof session.ageMin === "number" &&
    typeof session.ageMax === "number" &&
    session.ageMin > session.ageMax
  ) {
    return false;
  }
  // Exclusive bounds that empty the range (e.g. min=5 exclusive and max=5 inclusive)
  if (
    typeof session.ageMin === "number" &&
    typeof session.ageMax === "number" &&
    session.ageMin === session.ageMax &&
    (session.ageMinInclusive === false || session.ageMaxInclusive === false)
  ) {
    return false;
  }
  return true;
}

/** Human-readable band for a known session; null if unknown/invalid. */
export function formatSessionAgeBand(session: CampSession): string | null {
  if (!sessionAgeBandIsKnown(session)) return null;

  const min = session.ageMin;
  const max = session.ageMax;
  const minInc = session.ageMinInclusive === true;
  const maxInc = session.ageMaxInclusive === true;

  if (min != null && max != null) {
    if (minInc && maxInc) return `Ages ${min}–${max}`;
    if (minInc && !maxInc) return `Ages ${min}–<${max}`;
    if (!minInc && maxInc) return `Ages >${min}–${max}`;
    return `Ages >${min}–<${max}`;
  }
  if (min != null) {
    return minInc ? `Ages ${min}+` : `Ages >${min}`;
  }
  if (max != null) {
    return maxInc ? `Ages up to ${max}` : `Ages <${max}`;
  }
  return null;
}

function passesMin(age: number, min: number, inclusive: boolean): boolean {
  return inclusive ? age >= min : age > min;
}

function passesMax(age: number, max: number, inclusive: boolean): boolean {
  return inclusive ? age <= max : age < max;
}

/**
 * Evaluate whether a child's stated whole-year age matches this session.
 *
 * `child.asOfDate` must equal the session assessment date — we never project
 * age forward/backward from "today" or invent a birthday.
 */
export function childMatchesSessionAge(
  session: CampSession,
  child: ChildAgeStatement,
): SessionAgeMatchResult {
  if (!isWholeYear(child.ageYears) || !isIsoDateString(child.asOfDate)) {
    return "unknown";
  }

  const assessmentDate = resolveSessionAssessmentDate(session);
  if (!assessmentDate) return "unknown";
  if (child.asOfDate !== assessmentDate) return "unknown";

  if (!sessionAgeBandIsKnown(session)) return "unknown";

  const age = child.ageYears;
  const min = session.ageMin;
  const max = session.ageMax;

  if (min != null) {
    if (!passesMin(age, min, session.ageMinInclusive === true)) {
      return "no_match";
    }
  }
  if (max != null) {
    if (!passesMax(age, max, session.ageMaxInclusive === true)) {
      return "no_match";
    }
  }

  return "match";
}

export type MatchingSessionAgeSummary =
  | { kind: "unknown"; label: null }
  | { kind: "known"; label: string; bands: string[] }
  | {
      kind: "mixed";
      /** Includes known bands and a qualification for unknown sessions. */
      label: string;
      knownBands: string[];
      unknownCount: number;
    };

/**
 * Card/listing age copy from matching sessions only.
 * Never merges disjoint bands into one continuous range.
 * Never uses program-level ages.
 */
export function summarizeMatchingSessionAges(
  matchingSessions: CampSession[],
): MatchingSessionAgeSummary {
  if (matchingSessions.length === 0) {
    return { kind: "unknown", label: null };
  }

  const knownBands: string[] = [];
  let unknownCount = 0;

  for (const session of matchingSessions) {
    const band = formatSessionAgeBand(session);
    if (!band) {
      unknownCount += 1;
      continue;
    }
    if (!knownBands.includes(band)) knownBands.push(band);
  }

  if (knownBands.length === 0) {
    return { kind: "unknown", label: null };
  }

  if (unknownCount === 0) {
    return {
      kind: "known",
      label: knownBands.join(" · "),
      bands: knownBands,
    };
  }

  const knownPart = knownBands.join(" · ");
  const label = `${knownPart} · some session ages to confirm`;
  return {
    kind: "mixed",
    label,
    knownBands,
    unknownCount,
  };
}
