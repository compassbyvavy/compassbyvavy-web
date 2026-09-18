/**
 * Nutty Scientists week × age-band schedule parser.
 *
 * Grain (Prompt 9B-A): one session per stated week window × age band.
 * Theme is not identity — the page does not name weekly themes.
 * Price tier is a semantic attribute, never identity.
 *
 * Dates on the official page are month/day only ("July 6th - 10th"). This
 * parser records those calendar tokens as `weekIdentity` and leaves ISO
 * `startDate`/`endDate` null. It never invents a year.
 *
 * Identity (stable semantic facts, not HTML order):
 *   nutty_scientists:session:{MM-DD}_{MM-DD}:{ageMin}-{ageMax}
 * Example:
 *   nutty_scientists:session:07-06_07-10:5-7
 *
 * KNOWN 9B-A LIMITATION — yearless annual collision:
 * A later season that restates the same month/day window and age band,
 * still without a year, produces the same sourceIdentity. camp-facts-v1
 * also cannot distinguish those seasons when every other fingerprinted
 * fact is unchanged (ISO dates stay null; weekIdentity has no year).
 * A genuinely new annual session can therefore appear as unchanged.
 * Do not invent a capture year to paper over this. Future reconciliation
 * belongs to a later prompt if the source starts stating a year.
 */

import { normalizeAgeRange } from "@/lib/camps/ingestion/normalize/ageRange";

export const NUTTY_SCIENTISTS_EXTRACTOR_KEY = "nutty_scientists";

export type NuttyWeekWindow = {
  listedDateWindow: string;
  weekIdentity: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  /** Always null until the source states a calendar year. */
  startDate: null;
  endDate: null;
};

export type NuttyOffering = {
  weekNumber: number;
  weekIdentity: string;
  listedDateWindow: string;
  startDate: null;
  endDate: null;
  ageMin: number;
  ageMax: number;
  ageRaw: string;
  registrationUrl: string | null;
  sourceIdentity: string;
};

export type NuttyRegistrationLink = {
  href: string;
  text: string;
};

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

const MONTH_TOKEN =
  "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DAY = "(\\d{1,2})(?:st|nd|rd|th)?";
const SEPARATOR = "\\s*(?:-|–|—|to)\\s*";
const WEEK_WINDOW = new RegExp(
  `${MONTH_TOKEN}\\.?\\s*${DAY}${SEPARATOR}(?:${MONTH_TOKEN}\\.?\\s*)?${DAY}`,
  "gi",
);

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function nuttyWeekIdentity(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): string {
  return `${pad2(startMonth)}-${pad2(startDay)}_${pad2(endMonth)}-${pad2(endDay)}`;
}

export function nuttySessionSourceIdentity(
  weekIdentity: string,
  ageMin: number,
  ageMax: number,
): string {
  return `${NUTTY_SCIENTISTS_EXTRACTOR_KEY}:session:${weekIdentity}:${ageMin}-${ageMax}`;
}

/**
 * Repair OCR/markup splits that break ordinals (`28t h` → `28th`) and
 * dotted clock times (`4.00 pm` → `4:00 pm`) so labelled parsers can read
 * the stated tokens. Does not invent missing facts.
 */
export function repairNuttySourceText(text: string): string {
  return text
    .replace(/(\d{1,2})t\s+h\b/gi, "$1th")
    .replace(/\b(\d{1,2})\.(\d{2})\s*(a\.?m\.?|p\.?m\.?)/gi, "$1:$2 $3");
}

function monthNumber(token: string): number | null {
  return MONTH_INDEX[token.toLowerCase().replace(/\./g, "")] ?? null;
}

/** Parse stated month/day windows. Never assigns a year. */
export function parseNuttyWeekWindows(rawInput: string): NuttyWeekWindow[] {
  const raw = repairNuttySourceText(rawInput).replace(/\s+/g, " ").trim();
  if (raw === "") return [];

  const windows: NuttyWeekWindow[] = [];
  for (const match of raw.matchAll(WEEK_WINDOW)) {
    const startMonth = monthNumber(match[1] ?? "");
    const startDay = Number(match[2]);
    const endMonth = monthNumber(match[3] ?? match[1] ?? "");
    const endDay = Number(match[4]);
    if (
      startMonth === null ||
      endMonth === null ||
      !Number.isInteger(startDay) ||
      !Number.isInteger(endDay) ||
      startDay < 1 ||
      startDay > 31 ||
      endDay < 1 ||
      endDay > 31
    ) {
      continue;
    }
    const listedDateWindow = match[0].replace(/\s+/g, " ").trim();
    windows.push({
      listedDateWindow,
      weekIdentity: nuttyWeekIdentity(startMonth, startDay, endMonth, endDay),
      startMonth,
      startDay,
      endMonth,
      endDay,
      startDate: null,
      endDate: null,
    });
  }
  return windows;
}

function registrationUrlForAge(
  ageMin: number,
  ageMax: number,
  links: readonly NuttyRegistrationLink[],
): string | null {
  const ageLabel = new RegExp(`\\b${ageMin}\\b[\\s\\S]{0,24}\\b${ageMax}\\b`);
  const match = links.find(
    (link) =>
      /forms\.gle|docs\.google\.com\/forms/i.test(link.href) && ageLabel.test(link.text),
  );
  return match?.href ?? null;
}

export type NuttyScheduleParse = {
  weeks: Array<{
    weekNumber: number;
    weekIdentity: string;
    listedDateWindow: string;
    startDate: null;
    endDate: null;
  }>;
  offerings: NuttyOffering[];
  derivedAvailableAgeMin: number | null;
  derivedAvailableAgeMax: number | null;
  warnings: string[];
};

/**
 * Read week × age-band offerings from cleaned lines. Duplicate identities
 * collapse; remaining rows are sorted by weekIdentity then age so HTML order
 * cannot change identity.
 */
export function parseNuttyScientistsSchedule(
  lines: readonly string[],
  options: { registrationLinks?: readonly NuttyRegistrationLink[] } = {},
): NuttyScheduleParse {
  const warnings: string[] = [];
  const offeringsByIdentity = new Map<string, NuttyOffering>();

  for (const line of lines) {
    const repaired = repairNuttySourceText(line);
    if (!/age\s*group/i.test(repaired)) continue;
    if (/\bregister\b/i.test(repaired) && parseNuttyWeekWindows(repaired).length === 0) {
      continue;
    }
    const age = normalizeAgeRange(repaired);
    if (age.value.ageMin === null || age.value.ageMax === null) continue;
    const windows = parseNuttyWeekWindows(repaired);
    if (windows.length === 0) continue;

    for (const window of windows) {
      const sourceIdentity = nuttySessionSourceIdentity(
        window.weekIdentity,
        age.value.ageMin,
        age.value.ageMax,
      );
      offeringsByIdentity.set(sourceIdentity, {
        weekNumber: 0,
        weekIdentity: window.weekIdentity,
        listedDateWindow: window.listedDateWindow,
        startDate: null,
        endDate: null,
        ageMin: age.value.ageMin,
        ageMax: age.value.ageMax,
        ageRaw: repaired,
        registrationUrl: registrationUrlForAge(
          age.value.ageMin,
          age.value.ageMax,
          options.registrationLinks ?? [],
        ),
        sourceIdentity,
      });
    }
  }

  const sortedOfferings = [...offeringsByIdentity.values()].sort((left, right) => {
    const week = left.weekIdentity.localeCompare(right.weekIdentity);
    if (week !== 0) return week;
    if (left.ageMin !== right.ageMin) return left.ageMin - right.ageMin;
    return left.ageMax - right.ageMax;
  });

  const weekOrder: string[] = [];
  for (const offering of sortedOfferings) {
    if (!weekOrder.includes(offering.weekIdentity)) weekOrder.push(offering.weekIdentity);
  }
  for (const offering of sortedOfferings) {
    offering.weekNumber = weekOrder.indexOf(offering.weekIdentity) + 1;
  }

  if (sortedOfferings.length === 0) warnings.push("week_age_offerings_not_found");

  const ages = sortedOfferings.flatMap((offering) => [offering.ageMin, offering.ageMax]);
  return {
    weeks: weekOrder.map((weekIdentity, index) => {
      const sample = sortedOfferings.find((offering) => offering.weekIdentity === weekIdentity)!;
      return {
        weekNumber: index + 1,
        weekIdentity,
        listedDateWindow: sample.listedDateWindow,
        startDate: null,
        endDate: null,
      };
    }),
    offerings: sortedOfferings,
    derivedAvailableAgeMin: ages.length > 0 ? Math.min(...ages) : null,
    derivedAvailableAgeMax: ages.length > 0 ? Math.max(...ages) : null,
    warnings,
  };
}
