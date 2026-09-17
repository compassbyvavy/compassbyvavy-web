/**
 * Age band normalization — whole years only.
 *
 * `CampSession` eligibility needs both bounds in whole years, so anything else
 * (grades, months, "school age") returns nulls with a warning rather than a
 * guess. A half-open band ("Ages 4+") is reported honestly as a min with no max.
 */

import {
  normalizationFailure,
  type NormalizationResult,
} from "@/lib/camps/ingestion/normalize/types";

export type NormalizedAgeRange = {
  ageMin: number | null;
  ageMax: number | null;
};

const EMPTY: NormalizedAgeRange = { ageMin: null, ageMax: null };

/** Camp ages beyond this are almost certainly a misparse (a price, a year). */
const MAX_PLAUSIBLE_AGE = 21;

const DASH = "[-–—‒~/]|to|through|until|until age|and|&";

export function normalizeAgeRange(rawInput: string): NormalizationResult<NormalizedAgeRange> {
  const raw = rawInput.trim();
  if (raw === "") return normalizationFailure(raw, EMPTY, "age_not_stated");

  const text = raw.toLowerCase().replace(/\s+/g, " ");

  if (/\bgrade[s]?\b|\bjk\b|\bsk\b|\bkindergarten\b/.test(text)) {
    return normalizationFailure(raw, EMPTY, "grade_band_not_age");
  }
  if (/\bmonths?\b|\bmos\b|\bweeks? old\b/.test(text)) {
    return normalizationFailure(raw, EMPTY, "age_unit_not_years");
  }

  const range = new RegExp(`(\\d{1,2})\\s*(?:${DASH})\\s*(\\d{1,2})`).exec(text);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    if (!inRange(low) || !inRange(high)) {
      return normalizationFailure(raw, EMPTY, "age_out_of_plausible_range");
    }
    if (low > high) {
      return normalizationFailure(raw, EMPTY, "age_range_reversed");
    }
    return { value: { ageMin: low, ageMax: high }, raw, confidence: 0.95, warnings: [] };
  }

  const openEnded = /(\d{1,2})\s*(?:\+|plus\b|and (?:up|older|over)\b|and older\b)/.exec(text);
  if (openEnded && inRange(Number(openEnded[1]))) {
    return {
      value: { ageMin: Number(openEnded[1]), ageMax: null },
      raw,
      confidence: 0.8,
      warnings: ["open_ended_upper_bound"],
    };
  }

  const upperOnly = /(?:under|below|up to|younger than|max(?:imum)? age(?: of)?)\s*(\d{1,2})/.exec(
    text,
  );
  if (upperOnly && inRange(Number(upperOnly[1]))) {
    const stated = Number(upperOnly[1]);
    const exclusive = /under|below|younger than/.test(upperOnly[0]);
    return {
      value: { ageMin: null, ageMax: exclusive ? stated - 1 : stated },
      raw,
      confidence: 0.75,
      warnings: exclusive ? ["upper_bound_only", "exclusive_bound_converted"] : ["upper_bound_only"],
    };
  }

  const single = /(?:ages?|yrs?|years?)\D{0,4}(\d{1,2})|(\d{1,2})\s*(?:yrs?|years? old)/.exec(text);
  if (single) {
    const stated = Number(single[1] ?? single[2]);
    if (inRange(stated)) {
      return {
        value: { ageMin: stated, ageMax: stated },
        raw,
        confidence: 0.6,
        warnings: ["single_age_stated"],
      };
    }
  }

  return normalizationFailure(raw, EMPTY, "age_not_recognized");
}

function inRange(age: number): boolean {
  return Number.isInteger(age) && age >= 0 && age <= MAX_PLAUSIBLE_AGE;
}
