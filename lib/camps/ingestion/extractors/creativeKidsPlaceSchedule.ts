/**
 * Creative Kids Place weekly schedule parser.
 *
 * Parent-facing offering grain: week × theme × age band.
 * Price tier is an attribute of an offering, never its identity.
 *
 * Parses the weekly schedule block only — never treats the master options
 * list as proof that a theme runs every week.
 */

import { normalizeMatchText } from "@/lib/camps/ingestion/matchers";
import { normalizeDateRange } from "@/lib/camps/ingestion/normalize/dateRange";

export type CreativeKidsPlacePriceTierKey =
  | "full_week"
  | "short_week"
  | "creator_camp"
  | "on_the_go";

export type CreativeKidsPlaceWeekFact = {
  weekNumber: number;
  weekIdentity: string;
  heading: string;
  startDate: string | null;
  endDate: string | null;
  outingLabel: string | null;
  outingRaw: string | null;
  addOnFeeCad: number | null;
  addOnLabel: string | null;
  addOnRaw: string | null;
  /** Shared provenance key for week-scoped outing / add-on facts. */
  sharedObservationKey: string;
  isShortWeek: boolean;
};

export type CreativeKidsPlaceOffering = {
  weekNumber: number;
  weekIdentity: string;
  startDate: string | null;
  endDate: string | null;
  themeTitle: string;
  themeTitleNormalized: string;
  rawLabel: string;
  ageMin: number;
  ageMax: number;
  priceTierKey: CreativeKidsPlacePriceTierKey;
  priceTierLabel: string;
  priceAmount: number | null;
  priceUnit: "per_week";
  currency: "CAD";
  shortWeekPriceAmount: number | null;
  outingLabel: string | null;
  addOnFeeCad: number | null;
  addOnLabel: string | null;
  sharedObservationKey: string;
  sourceIdentity: string;
};

export type CreativeKidsPlaceScheduleParse = {
  weeks: CreativeKidsPlaceWeekFact[];
  offerings: CreativeKidsPlaceOffering[];
  derivedAvailableAgeMin: number | null;
  derivedAvailableAgeMax: number | null;
  warnings: string[];
};

export type SchedulePriceTable = {
  fullWeek: number | null;
  shortWeek: number | null;
  creatorCamp: number | null;
  creatorShortWeek: number | null;
  onTheGo: number | null;
};

const DEFAULT_PRICES: SchedulePriceTable = {
  fullWeek: 350,
  shortWeek: 280,
  creatorCamp: 370,
  creatorShortWeek: 295,
  onTheGo: 390,
};

const WEEK_HEADING = /^Week\s+(\d+)\s*[–—-]\s*(.+)$/i;
const THEME_LINE =
  /^(.+?)\s*\((\d{1,2})\s*[–—-]\s*(\d{1,2})\)\s*(?:[-–—]\s*.+)?$/i;
const OUTING_LINE = /^Outing:\s*(.+)$/i;

const MONTH_TOKEN =
  "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const MONTH_DAY_SEGMENT = new RegExp(
  `${MONTH_TOKEN}\\.?\\s+(\\d{1,2})(?:\\s*[–—-]\\s*(\\d{1,2}))?`,
  "gi",
);

const MONTH_INDEX: Record<string, number> = {
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

type WeekAddOn = {
  matchStartDate: string;
  matchEndDate: string;
  addOnFeeCad: number;
  addOnLabel: string;
  raw: string;
};

/**
 * Parse week-scoped surcharges stated once in the fee prose.
 * Fans out later to every offering in the matching week.
 */
export function parseWeekAddOns(lines: readonly string[]): WeekAddOn[] {
  const joined = lines.join("\n");
  const results: WeekAddOn[] = [];

  const safari =
    /African Lion Safari Week:[\s\S]*?\$\s*(\d+(?:\.\d+)?)[\s\S]*?week of\s+(Jul(?:y)?\.?\s*\d{1,2}\s*(?:to|[–—-])\s*\d{1,2}(?:th)?)/i.exec(
      joined,
    );
  if (safari) {
    const window = normalizeDateRange(cleanLooseDateText(safari[2]), { explicitYear: 2026 });
    if (window.value.startDate && window.value.endDate) {
      results.push({
        matchStartDate: window.value.startDate,
        matchEndDate: window.value.endDate,
        addOnFeeCad: Number(safari[1]),
        addOnLabel: "African Lion Safari",
        raw: safari[0].replace(/\s+/g, " ").trim(),
      });
    }
  }

  const movie =
    /Movie Theater Week:[\s\S]*?\$\s*(\d+(?:\.\d+)?)[\s\S]*?week of\s+(Aug(?:ust)?\.?\s*\d{1,2}(?:st|nd|rd|th)?\s*(?:to|[–—-])\s*\d{1,2}(?:st|nd|rd|th)?)/i.exec(
      joined,
    );
  if (movie) {
    const window = normalizeDateRange(cleanLooseDateText(movie[2]), { explicitYear: 2026 });
    if (window.value.startDate && window.value.endDate) {
      results.push({
        matchStartDate: window.value.startDate,
        matchEndDate: window.value.endDate,
        addOnFeeCad: Number(movie[1]),
        addOnLabel: "Movie Theater",
        raw: movie[0].replace(/\s+/g, " ").trim(),
      });
    }
  }

  return results;
}

export type WeekDateWindow = {
  startDate: string;
  endDate: string;
};

/**
 * Parse week heading date text into one or more session windows.
 *
 * Short-week segment invariant:
 * - Each contiguous scheduled date segment is its own session window.
 * - Non-contiguous ranges must never be collapsed into one continuous span.
 *
 * Examples that stay separate:
 * - "June 29-30, July 2-3" → Jun 29–30 and Jul 2–3 (not Jun 29–Jul 3)
 * - "Aug. 4-7" → Aug 4–7
 * - never invent Jun 29–Aug 7 unless the schedule explicitly runs continuously
 *
 * Continuous single segments stay one window:
 * - "July 6-10" → Jul 6–10
 */
export function parseWeekDateWindows(
  dateText: string,
  year: number,
): WeekDateWindow[] {
  const segments: Array<{ month: number; dayStart: number; dayEnd: number }> = [];
  for (const match of dateText.matchAll(MONTH_DAY_SEGMENT)) {
    const monthKey = match[1].toLowerCase().replace(/\./g, "");
    const month = MONTH_INDEX[monthKey];
    if (!month) continue;
    const dayStart = Number(match[2]);
    const dayEnd = match[3] ? Number(match[3]) : dayStart;
    segments.push({ month, dayStart, dayEnd });
  }
  if (segments.length === 0) {
    const fallback = normalizeDateRange(dateText, { explicitYear: year });
    if (fallback.value.startDate && fallback.value.endDate) {
      return [
        {
          startDate: fallback.value.startDate,
          endDate: fallback.value.endDate,
        },
      ];
    }
    return [];
  }
  return segments.map((segment) => ({
    startDate: isoDate(year, segment.month, segment.dayStart),
    endDate: isoDate(year, segment.month, segment.dayEnd),
  }));
}

function cleanLooseDateText(raw: string): string {
  return raw
    .replace(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\./gi, "$1 ")
    .replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function stripThemeAgeSuffix(rawTitle: string): string {
  return rawTitle
    .replace(/\s*[-–—]\s*New!?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function themeSlug(themeTitle: string): string {
  const normalized = normalizeMatchText(themeTitle) ?? "theme";
  return normalized.replace(/\s+/g, "-");
}

export function classifyPriceTier(themeTitle: string): {
  key: CreativeKidsPlacePriceTierKey;
  label: string;
} {
  if (/\bon the go excursions?\b/i.test(themeTitle)) {
    return { key: "on_the_go", label: "On the Go Excursions" };
  }
  if (/\bcreator camp\b/i.test(themeTitle)) {
    return { key: "creator_camp", label: "Creator Camp" };
  }
  return { key: "full_week", label: "Full Week" };
}

function resolvePrice(
  tierKey: CreativeKidsPlacePriceTierKey,
  isShortWeek: boolean,
  prices: SchedulePriceTable,
): {
  priceAmount: number | null;
  shortWeekPriceAmount: number | null;
  effectiveTierKey: CreativeKidsPlacePriceTierKey;
} {
  if (tierKey === "on_the_go") {
    return {
      priceAmount: prices.onTheGo,
      shortWeekPriceAmount: null,
      effectiveTierKey: "on_the_go",
    };
  }
  if (tierKey === "creator_camp") {
    return {
      priceAmount: isShortWeek
        ? (prices.creatorShortWeek ?? prices.creatorCamp)
        : prices.creatorCamp,
      shortWeekPriceAmount: prices.creatorShortWeek,
      effectiveTierKey: "creator_camp",
    };
  }
  if (isShortWeek) {
    return {
      priceAmount: prices.shortWeek ?? prices.fullWeek,
      shortWeekPriceAmount: prices.shortWeek,
      effectiveTierKey: "short_week",
    };
  }
  return {
    priceAmount: prices.fullWeek,
    shortWeekPriceAmount: prices.shortWeek,
    effectiveTierKey: "full_week",
  };
}

/** Inclusive calendar-day length of a date window. */
export function sessionWindowDayCount(
  startDate: string | null,
  endDate: string | null,
): number | null {
  if (!startDate || !endDate) return null;
  const startMs = Date.parse(`${startDate}T12:00:00.000Z`);
  const endMs = Date.parse(`${endDate}T12:00:00.000Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }
  return Math.round((endMs - startMs) / 86_400_000) + 1;
}

/**
 * Short-week pricing when the session window is under a standard 5-day camp week.
 * Jun 29–30, Jul 2–3, and Aug 4–7 all qualify by duration — not by hardcoded dates.
 */
export function isShortSessionWindow(
  startDate: string | null,
  endDate: string | null,
): boolean {
  const days = sessionWindowDayCount(startDate, endDate);
  return days !== null && days > 0 && days < 5;
}

function addOnForWeek(
  startDate: string | null,
  endDate: string | null,
  addOns: readonly WeekAddOn[],
): WeekAddOn | null {
  if (!startDate || !endDate) return null;
  for (const addOn of addOns) {
    if (startDate <= addOn.matchEndDate && endDate >= addOn.matchStartDate) {
      return addOn;
    }
  }
  return null;
}

/**
 * Locate the weekly schedule block and parse week × theme × age offerings.
 *
 * A marketing week heading may list multiple discontinuous session windows
 * (e.g. "Week 1 – June 29-30, July 2-3"). Each window is its own short-week
 * session envelope; themes under that heading fan out to every window.
 */
export function parseCreativeKidsPlaceSchedule(
  lines: readonly string[],
  options: {
    year?: number;
    prices?: Partial<SchedulePriceTable>;
  } = {},
): CreativeKidsPlaceScheduleParse {
  const year = options.year ?? 2026;
  const prices: SchedulePriceTable = { ...DEFAULT_PRICES, ...options.prices };
  const warnings: string[] = [];
  const addOns = parseWeekAddOns(lines);

  const firstWeek = lines.findIndex((line) => WEEK_HEADING.test(line));
  if (firstWeek === -1) {
    return {
      weeks: [],
      offerings: [],
      derivedAvailableAgeMin: null,
      derivedAvailableAgeMax: null,
      warnings: ["weekly_schedule_not_found"],
    };
  }

  const weeks: CreativeKidsPlaceWeekFact[] = [];
  const offerings: CreativeKidsPlaceOffering[] = [];
  /** Active session windows for the current marketing week heading. */
  let currentWindows: CreativeKidsPlaceWeekFact[] = [];

  for (let i = firstWeek; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? "";
    if (line === "") continue;

    if (
      currentWindows.length > 0 &&
      !WEEK_HEADING.test(line) &&
      !THEME_LINE.test(line) &&
      !OUTING_LINE.test(line) &&
      /^(To Register|What to bring|Staff|FAQ|Camp Options|Home|ABOUT|LOCATIONS)/i.test(
        line,
      )
    ) {
      break;
    }

    const weekMatch = WEEK_HEADING.exec(line);
    if (weekMatch) {
      const weekNumber = Number(weekMatch[1]);
      const dateText = weekMatch[2].trim();
      const windows = parseWeekDateWindows(dateText, year);
      if (windows.length === 0) warnings.push(`week_${weekNumber}_dates_unparsed`);

      const marketingSharedKey = `creative_kids_place:week-fact:week-${weekNumber}`;
      currentWindows = [];

      for (const window of windows) {
        const startDate = window.startDate;
        const endDate = window.endDate;
        const short = isShortSessionWindow(startDate, endDate);
        const matchedAddOn = addOnForWeek(startDate, endDate, addOns);
        const weekIdentity =
          windows.length > 1
            ? `week-${weekNumber}:${startDate}`
            : `week-${weekNumber}`;
        const weekFact: CreativeKidsPlaceWeekFact = {
          weekNumber,
          weekIdentity,
          heading: line,
          startDate,
          endDate,
          outingLabel: null,
          outingRaw: null,
          addOnFeeCad: matchedAddOn?.addOnFeeCad ?? null,
          addOnLabel: matchedAddOn?.addOnLabel ?? null,
          addOnRaw: matchedAddOn?.raw ?? null,
          sharedObservationKey: marketingSharedKey,
          isShortWeek: short,
        };
        currentWindows.push(weekFact);
        weeks.push(weekFact);
      }
      continue;
    }

    if (currentWindows.length === 0) continue;

    const outingMatch = OUTING_LINE.exec(line);
    if (outingMatch) {
      const outingLabel = outingMatch[1].trim();
      for (const weekFact of currentWindows) {
        weekFact.outingLabel = outingLabel;
        weekFact.outingRaw = line;
      }
      const activeIds = new Set(currentWindows.map((week) => week.weekIdentity));
      for (const offering of offerings) {
        if (activeIds.has(offering.weekIdentity)) {
          offering.outingLabel = outingLabel;
        }
      }
      continue;
    }

    const themeMatch = THEME_LINE.exec(line);
    if (!themeMatch) continue;

    const rawTitle = stripThemeAgeSuffix(themeMatch[1]);
    const ageMin = Number(themeMatch[2]);
    const ageMax = Number(themeMatch[3]);
    if (ageMin > ageMax || ageMin < 1 || ageMax > 18) {
      warnings.push(`theme_age_invalid:${line}`);
      continue;
    }

    const tier = classifyPriceTier(rawTitle);
    const themeTitleNormalized =
      normalizeMatchText(rawTitle) ?? rawTitle.toLowerCase();
    const slug = themeSlug(rawTitle);

    for (const weekFact of currentWindows) {
      const priced = resolvePrice(tier.key, weekFact.isShortWeek, prices);
      const dateKey = weekFact.startDate ?? weekFact.weekIdentity;
      const sourceIdentity = `creative_kids_place:session:${dateKey}:${slug}:${ageMin}-${ageMax}`;

      offerings.push({
        weekNumber: weekFact.weekNumber,
        weekIdentity: weekFact.weekIdentity,
        startDate: weekFact.startDate,
        endDate: weekFact.endDate,
        themeTitle: rawTitle,
        themeTitleNormalized,
        rawLabel: line,
        ageMin,
        ageMax,
        priceTierKey: priced.effectiveTierKey,
        priceTierLabel:
          priced.effectiveTierKey === "short_week" ? "Short Week" : tier.label,
        priceAmount: priced.priceAmount,
        priceUnit: "per_week",
        currency: "CAD",
        shortWeekPriceAmount: priced.shortWeekPriceAmount,
        outingLabel: weekFact.outingLabel,
        addOnFeeCad: weekFact.addOnFeeCad,
        addOnLabel: weekFact.addOnLabel,
        sharedObservationKey: weekFact.sharedObservationKey,
        sourceIdentity,
      });
    }
  }

  let derivedAvailableAgeMin: number | null = null;
  let derivedAvailableAgeMax: number | null = null;
  for (const offering of offerings) {
    derivedAvailableAgeMin =
      derivedAvailableAgeMin === null
        ? offering.ageMin
        : Math.min(derivedAvailableAgeMin, offering.ageMin);
    derivedAvailableAgeMax =
      derivedAvailableAgeMax === null
        ? offering.ageMax
        : Math.max(derivedAvailableAgeMax, offering.ageMax);
  }

  if (offerings.length === 0) warnings.push("weekly_theme_offerings_not_found");

  return {
    weeks,
    offerings,
    derivedAvailableAgeMin,
    derivedAvailableAgeMax,
    warnings,
  };
}
