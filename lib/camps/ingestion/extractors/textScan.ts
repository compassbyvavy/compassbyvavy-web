/**
 * Line-oriented scanning helpers shared by extractors.
 *
 * The cleaner turns each block element into its own line, which means a table
 * row like `<td>Full Week</td><td>$350 per week</td>` arrives as two adjacent
 * lines. Scanning therefore works on a small window around a label rather than
 * a single line, which handles both prose ("Full Week $350") and table layouts
 * without a DOM.
 */

import type { CleanSourceDocument } from "@/data/camps/ingestion/types";
import { normalizeAgeRange, type NormalizedAgeRange } from "@/lib/camps/ingestion/normalize/ageRange";
import {
  normalizeDateRange,
  type NormalizedDateRange,
} from "@/lib/camps/ingestion/normalize/dateRange";
import { normalizePriceCad, type NormalizedPrice } from "@/lib/camps/ingestion/normalize/price";
import {
  normalizeTimeRange,
  type NormalizedTimeRange,
} from "@/lib/camps/ingestion/normalize/timeRange";
import type { NormalizationResult } from "@/lib/camps/ingestion/normalize/types";

export type LineHit<T> = {
  lineIndex: number;
  line: string;
  result: NormalizationResult<T>;
};

export function documentLines(document: CleanSourceDocument): string[] {
  return document.text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** Text of `lines[index]` joined with the next `lookahead` lines. */
export function lineWindow(lines: readonly string[], index: number, lookahead = 2): string {
  return lines.slice(index, index + lookahead + 1).join(" ");
}

const AGE_HINT = /\bages?\b|\byears? old\b|\byrs?\b|\bgrades?\b|\bmonths?\b/i;
const TIME_HINT = /\d{1,2}:\d{2}|\b\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?)\b|\bnoon\b/i;
const PRICE_HINT = /\$|\bcad\b|\bfee\b|\bprice\b|\bcost\b|\btuition\b/i;
const MONTH_HINT =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\b|\b\d{4}-\d{2}-\d{2}\b/i;

/** First line that yields a usable age band. */
export function findAgeRange(lines: readonly string[]): LineHit<NormalizedAgeRange> | null {
  return findFirst(lines, AGE_HINT, normalizeAgeRange, (value) =>
    value.ageMin !== null || value.ageMax !== null,
  );
}

/** First line that yields a usable time window. */
export function findTimeRange(lines: readonly string[]): LineHit<NormalizedTimeRange> | null {
  return findFirst(lines, TIME_HINT, normalizeTimeRange, (value) => value.startTime !== null);
}

/** First line that yields a usable amount. */
export function findPrice(lines: readonly string[]): LineHit<NormalizedPrice> | null {
  return findFirst(lines, PRICE_HINT, normalizePriceCad, (value) => value.amount !== null);
}

/** Price stated on, or just after, a labelled line (table layouts). */
export function findPriceNear(
  lines: readonly string[],
  index: number,
  lookahead = 2,
): NormalizationResult<NormalizedPrice> | null {
  const window = lineWindow(lines, index, lookahead);
  if (!PRICE_HINT.test(window)) return null;
  const result = normalizePriceCad(window);
  return result.value.amount === null ? null : result;
}

export type FindDateRangeOptions = {
  /** A year stated elsewhere in the same document. */
  explicitYear?: number | null;
  /** Prefer the widest window found (a season) over the first one. */
  preferWidest?: boolean;
};

export type DateRangeScan = {
  hit: LineHit<NormalizedDateRange> | null;
  /**
   * Why date-looking lines were rejected (e.g. `year_not_stated`). Surfaced so a
   * page that mentions dates Compass cannot read is visible, not silent.
   */
  unparsedWarnings: string[];
};

/**
 * Date windows on a camp page are ambiguous: a season range and individual week
 * ranges look alike. `preferWidest` picks the season; the default takes the
 * first stated window.
 */
export function findDateRange(
  lines: readonly string[],
  options: FindDateRangeOptions = {},
): DateRangeScan {
  const hits: Array<LineHit<NormalizedDateRange>> = [];
  const unparsedWarnings: string[] = [];
  lines.forEach((line, lineIndex) => {
    if (!MONTH_HINT.test(line)) return;
    const result = normalizeDateRange(line, { explicitYear: options.explicitYear ?? null });
    if (result.value.startDate === null) {
      unparsedWarnings.push(...result.warnings);
      return;
    }
    hits.push({ lineIndex, line, result });
  });

  const hit =
    hits.length === 0
      ? null
      : options.preferWidest
        ? hits.reduce((widest, candidate) =>
            spanDays(candidate) > spanDays(widest) ? candidate : widest,
          )
        : hits[0];
  return { hit, unparsedWarnings: [...new Set(unparsedWarnings)] };
}

function spanDays(hit: LineHit<NormalizedDateRange>): number {
  const { startDate, endDate } = hit.result.value;
  if (!startDate || !endDate) return 0;
  return (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000;
}

/**
 * A four-digit year stated in the page title, headings, or metadata — the only
 * year a normalizer may borrow when a date range omits one.
 */
export function statedDocumentYear(document: CleanSourceDocument): number | null {
  const haystacks = [
    document.title ?? "",
    ...document.headings,
    document.metadata["og:title"] ?? "",
    document.metadata.description ?? "",
  ];
  for (const haystack of haystacks) {
    const match = /\b(20\d{2})\b/.exec(haystack);
    if (match) return Number(match[1]);
  }
  return null;
}

/** Canadian street address stated on the page, with the line it came from. */
export type ParsedAddress = {
  addressLine: string;
  city: string;
  province: string;
  postalCode: string | null;
};

const ADDRESS_PATTERN =
  /(\d{1,6}[^,\n]{3,60}?),\s*([A-Za-z][A-Za-z .'\-]{2,30}),\s*(ON|Ontario|QC|Quebec|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU)\b\.?,?\s*([A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)?/;

export function findAddress(
  lines: readonly string[],
): { lineIndex: number; line: string; address: ParsedAddress } | null {
  for (const [lineIndex, line] of lines.entries()) {
    const match = ADDRESS_PATTERN.exec(line);
    if (!match) continue;
    return {
      lineIndex,
      line,
      address: {
        addressLine: match[1].trim(),
        city: match[2].trim(),
        province: normalizeProvince(match[3]),
        postalCode: match[4] ? match[4].toUpperCase().replace(/\s+/g, " ") : null,
      },
    };
  }
  return null;
}

function normalizeProvince(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "ontario") return "ON";
  if (normalized === "quebec") return "QC";
  return value.trim().toUpperCase();
}

function findFirst<T>(
  lines: readonly string[],
  hint: RegExp,
  normalize: (raw: string) => NormalizationResult<T>,
  isUsable: (value: T) => boolean,
): LineHit<T> | null {
  for (const [lineIndex, line] of lines.entries()) {
    if (!hint.test(line)) continue;
    const result = normalize(line);
    if (!isUsable(result.value)) continue;
    return { lineIndex, line, result };
  }
  return null;
}
