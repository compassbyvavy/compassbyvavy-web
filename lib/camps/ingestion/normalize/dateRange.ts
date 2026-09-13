/**
 * Date-range normalization to ISO `YYYY-MM-DD`.
 *
 * The hard rule: a year is only ever taken from the source. "July 6th - 10th"
 * with no year anywhere returns nulls and keeps the raw text, exactly like the
 * published catalog does for unverified windows — a camp week silently assigned
 * to the wrong year is worse than an unparsed string a reviewer can read.
 *
 * A year stated once for a range is shared across both endpoints (and rolled
 * back a year when the window crosses New Year), which is still the source's
 * year, reported as `yearInferred`.
 */

import {
  normalizationFailure,
  type NormalizationResult,
} from "@/lib/camps/ingestion/normalize/types";

export type NormalizedDateRange = {
  startDate: string | null;
  endDate: string | null;
  /** True when one endpoint's year came from elsewhere in the same source. */
  yearInferred: boolean;
};

export type NormalizeDateRangeOptions = {
  /**
   * A year stated elsewhere in the same document (e.g. an "Summer 2026"
   * heading). Only pass a year the source actually states.
   */
  explicitYear?: number | null;
};

const EMPTY: NormalizedDateRange = { startDate: null, endDate: null, yearInferred: false };

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const DAY = "(\\d{1,2})(?:st|nd|rd|th)?";
const YEAR = "(\\d{4})";
const SEPARATOR = "\\s*(?:-|–|—|to|through|until|thru)\\s*";

type PartialDate = { year: number | null; month: number; day: number };

export function normalizeDateRange(
  rawInput: string,
  options: NormalizeDateRangeOptions = {},
): NormalizationResult<NormalizedDateRange> {
  const raw = rawInput.trim();
  if (raw === "") return normalizationFailure(raw, EMPTY, "dates_not_stated");

  const text = raw.toLowerCase().replace(/\s+/g, " ").replace(/,/g, " ").replace(/\s+/g, " ");

  const parsed = parseIsoRange(text) ?? parseNamedMonthRange(text) ?? parseSingleDate(text);
  if (!parsed) {
    return normalizationFailure(raw, EMPTY, "date_range_not_recognized");
  }

  const warnings: string[] = [...parsed.warnings];
  let { start, end } = parsed;

  const startYearStated = start?.year !== null && start?.year !== undefined;
  const endYearStated = end?.year !== null && end?.year !== undefined;
  const statedYear = start?.year ?? end?.year ?? null;
  const contextYear = options.explicitYear ?? null;
  let yearInferred = false;

  if (start && start.year === null) {
    if (statedYear !== null) {
      start = { ...start, year: statedYear };
      yearInferred = true;
      warnings.push("start_year_shared_from_range");
    } else if (contextYear !== null) {
      start = { ...start, year: contextYear };
      yearInferred = true;
      warnings.push("year_from_document_context");
    }
  }
  if (end && end.year === null) {
    if (statedYear !== null) {
      end = { ...end, year: statedYear };
      yearInferred = true;
      warnings.push("end_year_shared_from_range");
    } else if (contextYear !== null) {
      end = { ...end, year: contextYear };
      yearInferred = true;
      warnings.push("year_from_document_context");
    }
  }

  if (!start?.year && !end?.year) {
    // Never assume "this year" — the published catalog keeps such windows raw.
    return {
      value: { ...EMPTY },
      raw,
      confidence: 0,
      warnings: [...new Set([...warnings, "year_not_stated"])],
    };
  }

  // A window whose start borrowed the end's year and runs "backwards" crosses
  // New Year (Dec 29 – Jan 2, 2027). Only applies to a borrowed year: when both
  // endpoints state their own year, a backwards range is an error, not December.
  if (start && end && !startYearStated && endYearStated && start.month > end.month) {
    start = { ...start, year: (start.year ?? 0) - 1 };
    warnings.push("range_crosses_year_boundary");
  }

  const startDate = start ? toIsoDate(start) : null;
  const endDate = end ? toIsoDate(end) : null;
  if ((start && !startDate) || (end && !endDate)) {
    return normalizationFailure(raw, EMPTY, "calendar_date_invalid");
  }
  if (startDate && endDate && endDate < startDate) {
    return normalizationFailure(raw, EMPTY, "date_range_reversed");
  }

  const explicitBoth = start?.year !== null && end?.year !== null && !yearInferred;
  return {
    value: { startDate, endDate, yearInferred },
    raw,
    confidence: endDate ? (explicitBoth ? 0.97 : 0.9) : 0.7,
    warnings: [...new Set(warnings)],
  };
}

type ParseOutcome = {
  start: PartialDate | null;
  end: PartialDate | null;
  warnings: string[];
};

/** `2026-06-29 to 2026-08-28` */
function parseIsoRange(text: string): ParseOutcome | null {
  const range = new RegExp(`${YEAR}-(\\d{2})-(\\d{2})${SEPARATOR}${YEAR}-(\\d{2})-(\\d{2})`).exec(
    text,
  );
  if (range) {
    return {
      start: { year: Number(range[1]), month: Number(range[2]), day: Number(range[3]) },
      end: { year: Number(range[4]), month: Number(range[5]), day: Number(range[6]) },
      warnings: [],
    };
  }
  const single = new RegExp(`^${YEAR}-(\\d{2})-(\\d{2})$`).exec(text.trim());
  if (single) {
    return {
      start: { year: Number(single[1]), month: Number(single[2]), day: Number(single[3]) },
      end: null,
      warnings: ["single_date_stated"],
    };
  }
  return null;
}

/**
 * Named-month ranges in the shapes camp pages actually use:
 * `June 29 – August 28, 2026`, `July 6 - 10`, `Aug 3, 2026 to Aug 7, 2026`,
 * `June 29 2026 – Aug 28 2026`.
 */
function parseNamedMonthRange(text: string): ParseOutcome | null {
  const monthDayMonthDay = new RegExp(
    `(${MONTH_NAMES})\\.?\\s+${DAY}(?:\\s+${YEAR})?${SEPARATOR}(${MONTH_NAMES})\\.?\\s+${DAY}(?:\\s+${YEAR})?`,
  ).exec(text);
  if (monthDayMonthDay) {
    return {
      start: {
        year: monthDayMonthDay[3] ? Number(monthDayMonthDay[3]) : null,
        month: MONTHS[monthDayMonthDay[1]],
        day: Number(monthDayMonthDay[2]),
      },
      end: {
        year: monthDayMonthDay[6] ? Number(monthDayMonthDay[6]) : null,
        month: MONTHS[monthDayMonthDay[4]],
        day: Number(monthDayMonthDay[5]),
      },
      warnings: [],
    };
  }

  // `July 6 - 10, 2026` — one month, two days.
  const monthDayDay = new RegExp(
    `(${MONTH_NAMES})\\.?\\s+${DAY}${SEPARATOR}${DAY}(?:\\s+${YEAR})?`,
  ).exec(text);
  if (monthDayDay) {
    const month = MONTHS[monthDayDay[1]];
    const year = monthDayDay[4] ? Number(monthDayDay[4]) : null;
    return {
      start: { year, month, day: Number(monthDayDay[2]) },
      end: { year, month, day: Number(monthDayDay[3]) },
      warnings: [],
    };
  }

  return null;
}

/** `July 6, 2026` on its own. */
function parseSingleDate(text: string): ParseOutcome | null {
  const single = new RegExp(`(${MONTH_NAMES})\\.?\\s+${DAY}(?:\\s+${YEAR})?`).exec(text);
  if (!single) return null;
  return {
    start: {
      year: single[3] ? Number(single[3]) : null,
      month: MONTHS[single[1]],
      day: Number(single[2]),
    },
    end: null,
    warnings: ["single_date_stated"],
  };
}

function toIsoDate(date: PartialDate): string | null {
  if (date.year === null) return null;
  if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > 31) return null;
  const iso = `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(
    date.day,
  ).padStart(2, "0")}`;
  // Reject calendar-invalid days (Feb 30) by round-tripping through UTC.
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === iso ? iso : null;
}
