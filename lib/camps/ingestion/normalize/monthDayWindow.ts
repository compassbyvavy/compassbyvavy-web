/**
 * Provider-neutral month/day window parsing.
 *
 * Reads calendar tokens such as "June 29 – 30, July 2 – 3" or
 * "July 6th - 10th" and returns inclusive month/day ranges. ISO years are
 * never assigned: a window without a stated year stays yearless.
 *
 * This is not CKP `parseWeekDateWindows`, which requires a year and writes
 * ISO dates. Extractors that need ISO dates must pass a source-stated year
 * through that CKP helper or `normalizeDateRange`, not this module.
 */

export type MonthDayWindow = {
  listedDateWindow: string;
  weekIdentity: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  /** Always null — this parser never invents a calendar year. */
  startDate: null;
  endDate: null;
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

export function padMonthDay(value: number): string {
  return String(value).padStart(2, "0");
}

export function monthDayWindowIdentity(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): string {
  return `${padMonthDay(startMonth)}-${padMonthDay(startDay)}_${padMonthDay(endMonth)}-${padMonthDay(endDay)}`;
}

function monthNumber(token: string): number | null {
  return MONTH_INDEX[token.toLowerCase().replace(/\./g, "")] ?? null;
}

/** Parse stated month/day windows. Never assigns a year. */
export function parseMonthDayWindows(rawInput: string): MonthDayWindow[] {
  const raw = rawInput.replace(/\s+/g, " ").trim();
  if (raw === "") return [];

  const windows: MonthDayWindow[] = [];
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
      weekIdentity: monthDayWindowIdentity(startMonth, startDay, endMonth, endDay),
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
