/**
 * Riverwood Conservancy (Camp Riverwood) week-window schedule parser.
 *
 * Grain (Prompt 9B-B): one session per stated date window. The page lists eight
 * labelled weeks; Week 1 is two discontinuous windows ("June 29 – 30, July 2 – 3")
 * and is split the same way CKP splits a comma-separated date line. Theme is not
 * identity — the page does not name weekly themes. Price, SOLD OUT, and the
 * enrolment cap of 16 are attributes, never identity.
 *
 * Dates on the official HTML are month/day only. This parser records those
 * calendar tokens as `weekIdentity` and leaves ISO `startDate`/`endDate` null.
 * It never invents a year from the footer copyright, a PDF href, or asset paths.
 *
 * CKP `parseWeekDateWindows` is not used: it requires a calendar year and would
 * write ISO dates. Yearless month/day splitting uses the provider-neutral
 * `parseMonthDayWindows` helper so Week 1 stays two short windows instead of
 * one bridged week.
 *
 * Identity (stable semantic facts, not HTML order):
 *   riverwood_conservancy:session:{MM-DD}_{MM-DD}
 * Example:
 *   riverwood_conservancy:session:07-06_07-10
 *
 * KNOWN 9B-B LIMITATION — yearless annual collision:
 * A later season that restates the same month/day window, still without a year,
 * produces the same sourceIdentity. camp-facts-v1 also cannot distinguish those
 * seasons when every other fingerprinted fact is unchanged. Do not invent a
 * capture year to paper over this.
 */

import type { CampCurrency, PriceUnit } from "@/data/camps/ingestion/types";
import { normalizePriceCad } from "@/lib/camps/ingestion/normalize/price";
import {
  monthDayWindowIdentity,
  parseMonthDayWindows,
} from "@/lib/camps/ingestion/normalize/monthDayWindow";

export const RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY = "riverwood_conservancy";

export const RIVERWOOD_INFORMATION_GUIDE_PDF_HREF =
  "https://theriverwoodconservancy.org/wp-content/uploads/2026/06/2026-Camp-Riverwood-Summer-Day-Camp-Information-Guide.pdf";

const WEEK_LINE =
  /^Week\s+(\d+)\s*:\s*(.+?)\s*\|\s*(.+)$/i;

export type RiverwoodWeekWindow = {
  listedWeekNumber: number;
  listedDateWindow: string;
  weekIdentity: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  /** Always null until the source states a calendar year. */
  startDate: null;
  endDate: null;
  dayCount: number | null;
  isShortWeek: boolean;
};

export type RiverwoodOffering = RiverwoodWeekWindow & {
  weekNumber: number;
  listedWeekLine: string;
  priceAmount: number | null;
  priceUnit: PriceUnit | null;
  currency: CampCurrency;
  taxExtra: boolean;
  rawFee: string;
  soldOut: boolean;
  availabilityCopy: string | null;
  sourceIdentity: string;
};

export function riverwoodSessionSourceIdentity(weekIdentity: string): string {
  return `${RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY}:session:${weekIdentity}`;
}

/**
 * Inclusive day count for a same-month window. Cross-month spans stay unknown
 * rather than inventing month lengths.
 */
export function riverwoodWindowDayCount(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): number | null {
  if (startMonth !== endMonth) return null;
  const days = endDay - startDay + 1;
  return days > 0 ? days : null;
}

export function isRiverwoodShortWindow(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): boolean {
  const days = riverwoodWindowDayCount(startMonth, startDay, endMonth, endDay);
  return days !== null && days < 5;
}

export function parseRiverwoodGradeEligibility(line: string): {
  gradeMin: number;
  gradeMax: number;
  copy: string;
} | null {
  if (!/\bgrade/i.test(line)) return null;
  if (!/completed/i.test(line)) return null;
  const grades = [...line.matchAll(/\b(\d{1,2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12);
  if (grades.length === 0) return null;
  return {
    gradeMin: Math.min(...grades),
    gradeMax: Math.max(...grades),
    copy: line.replace(/\s+/g, " ").trim(),
  };
}

export type RiverwoodScheduleParse = {
  weeks: Array<{
    weekNumber: number;
    listedWeekNumber: number;
    weekIdentity: string;
    listedDateWindow: string;
    startDate: null;
    endDate: null;
    isShortWeek: boolean;
  }>;
  offerings: RiverwoodOffering[];
  warnings: string[];
};

function parseSoldOut(rawFeeSide: string): { soldOut: boolean; availabilityCopy: string | null; feeText: string } {
  const collapsed = rawFeeSide.replace(/\s+/g, " ").trim();
  const soldOut = /\bsold\s+out\b/i.test(collapsed);
  const feeText = collapsed
    .replace(/\s*[–—-]\s*SOLD OUT\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    soldOut,
    availabilityCopy: soldOut ? collapsed : null,
    feeText,
  };
}

/**
 * Read one offering per stated date window. Duplicate identities collapse;
 * remaining rows are sorted by weekIdentity so HTML order cannot change identity.
 */
export function parseRiverwoodSchedule(lines: readonly string[]): RiverwoodScheduleParse {
  const warnings: string[] = [];
  const offeringsByIdentity = new Map<string, RiverwoodOffering>();

  for (const line of lines) {
    const listedWeekLine = line.replace(/\s+/g, " ").trim();
    const match = WEEK_LINE.exec(listedWeekLine);
    if (!match) continue;
    const listedWeekNumber = Number(match[1]);
    const dateText = match[2] ?? "";
    const feeSide = match[3] ?? "";
    const windows = parseMonthDayWindows(dateText);
    if (windows.length === 0) {
      warnings.push(`week_${listedWeekNumber}_date_windows_unparsed`);
      continue;
    }
    const sold = parseSoldOut(feeSide);
    const price = normalizePriceCad(sold.feeText);
    if (price.value.amount === null) {
      warnings.push(`week_${listedWeekNumber}_price_not_found`);
    }
    const priceWarnings = price.warnings.filter(
      (warning) => warning !== "multiple_amounts_found_using_first",
    );
    /**
     * `normalizePriceCad` maps a bare `$` to CAD with
     * `currency_symbol_only_assumed_cad`. That is a generic Ontario-page
     * assumption. This HTML does not state CAD and has no Canadian geography,
     * so the amount is kept and currency stays unknown.
     */
    const assumedCad = priceWarnings.includes("currency_symbol_only_assumed_cad");
    warnings.push(
      ...priceWarnings.filter((warning) => warning !== "currency_symbol_only_assumed_cad"),
    );
    if (assumedCad) warnings.push("currency_not_stated");
    const currency = assumedCad ? "unknown" : price.value.currency;

    for (const window of windows) {
      const weekIdentity = monthDayWindowIdentity(
        window.startMonth,
        window.startDay,
        window.endMonth,
        window.endDay,
      );
      const sourceIdentity = riverwoodSessionSourceIdentity(weekIdentity);
      const dayCount = riverwoodWindowDayCount(
        window.startMonth,
        window.startDay,
        window.endMonth,
        window.endDay,
      );
      offeringsByIdentity.set(sourceIdentity, {
        listedWeekNumber,
        weekNumber: listedWeekNumber,
        listedWeekLine,
        listedDateWindow: window.listedDateWindow,
        weekIdentity,
        startMonth: window.startMonth,
        startDay: window.startDay,
        endMonth: window.endMonth,
        endDay: window.endDay,
        startDate: null,
        endDate: null,
        dayCount,
        isShortWeek: isRiverwoodShortWindow(
          window.startMonth,
          window.startDay,
          window.endMonth,
          window.endDay,
        ),
        priceAmount: price.value.amount,
        priceUnit: price.value.unit,
        currency,
        taxExtra: price.value.taxExtra,
        rawFee: sold.feeText,
        soldOut: sold.soldOut,
        availabilityCopy: sold.availabilityCopy,
        sourceIdentity,
      });
    }
  }

  const sortedOfferings = [...offeringsByIdentity.values()].sort((left, right) =>
    left.weekIdentity.localeCompare(right.weekIdentity),
  );

  if (sortedOfferings.length === 0) warnings.push("week_windows_not_found");

  return {
    weeks: sortedOfferings.map((offering) => ({
      weekNumber: offering.weekNumber,
      listedWeekNumber: offering.listedWeekNumber,
      weekIdentity: offering.weekIdentity,
      listedDateWindow: offering.listedDateWindow,
      startDate: null,
      endDate: null,
      isShortWeek: offering.isShortWeek,
    })),
    offerings: sortedOfferings,
    warnings,
  };
}
