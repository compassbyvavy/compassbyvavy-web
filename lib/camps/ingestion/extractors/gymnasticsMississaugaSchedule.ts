/**
 * Gymnastics Mississauga week × attendance-format schedule parser.
 *
 * Grain (Prompt 9B-C2): one session per dated themed week × attendance format.
 * The official marketing page lists 10 Elementor toggle weeks. Each week body
 * has three Jackrabbit OpeningsJS embeds — Full-Day (`Cat2=Summcamp`),
 * Half-Day (`Cat2=SummcampHD`), and Before & After Care (`Cat2=ABcsc`).
 *
 * Full-day and half-day are separate purchasable catalogs (distinct Cat2 and
 * distinct headings). Care is a week-level add-on, not a third camp session.
 *
 * Theme is descriptive week content, not identity: Magical Disney appears on
 * two dated weeks, and dates uniquely identify a week. Theme is fingerprinted.
 *
 * Identity (stable semantic facts, not HTML order, not Jackrabbit tokens):
 *   gymnastics_mississauga:session:{YYYY-MM-DD}_{YYYY-MM-DD}:{full_day|half_day}
 * Example:
 *   gymnastics_mississauga:session:2026-07-06_2026-07-10:full_day
 *
 * Years come from the week titles only ("July 6 - 10, 2026"). WordPress
 * timestamps, image paths, capture date, and Jackrabbit URL parameters are
 * not a year.
 *
 * Jackrabbit OpeningsJS / Register Here / Members Portal hrefs are provenance
 * only. This parser never fetches them.
 */

import type { CampSessionScheduleFormat } from "@/data/camps/types";
import { decodeHtmlEntities } from "@/lib/camps/ingestion/html/cleanHtml";
import { normalizeDateRange } from "@/lib/camps/ingestion/normalize/dateRange";

export const GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY = "gymnastics_mississauga";

export const GYMNASTICS_MISSISSAUGA_REGISTER_HERE_URL =
  "https://app.jackrabbitclass.com/regv2.asp?id=537009";
export const GYMNASTICS_MISSISSAUGA_MEMBERS_PORTAL_URL =
  "https://app.jackrabbitclass.com/jr4.0/ParentPortal/Login?orgId=537009";

export type GymnasticsAttendanceFormat = Extract<
  CampSessionScheduleFormat,
  "full_day" | "half_day"
>;

export type JackrabbitOpeningsEmbed = {
  url: string;
  orgId: string | null;
  cat2: string | null;
  cat3: string | null;
  weekNumber: number | null;
  role: "full_day" | "half_day" | "care" | "unknown";
};

export type GymnasticsWeek = {
  weekNumber: number;
  listedTitle: string;
  listedDateWindow: string;
  themeTitle: string;
  themeTitleNormalized: string;
  startDate: string;
  endDate: string;
  weekIdentity: string;
  isShortWeek: boolean;
  dayCount: number | null;
  statedYear: number;
  fullDayOpeningsUrl: string | null;
  halfDayOpeningsUrl: string | null;
  careOpeningsUrl: string | null;
};

export type GymnasticsOffering = {
  weekNumber: number;
  weekIdentity: string;
  listedDateWindow: string;
  listedTitle: string;
  themeTitle: string;
  themeTitleNormalized: string;
  startDate: string;
  endDate: string;
  statedYear: number;
  isShortWeek: boolean;
  dayCount: number | null;
  attendanceFormat: GymnasticsAttendanceFormat;
  priceTierKey: GymnasticsAttendanceFormat;
  priceTierLabel: string;
  jackrabbitOpeningsUrl: string | null;
  jackrabbitCat2: string | null;
  sourceIdentity: string;
};

const TOGGLE_TITLE =
  /<a class="elementor-toggle-title"[^>]*>([\s\S]*?)<\/a>/gi;
const OPENINGS_SRC =
  /src="(https:\/\/app\.jackrabbitclass\.com\/jr3\.0\/Openings\/OpeningsJS[^"]+)"/gi;
const WEEK_TITLE =
  /^Week\s+(\d+)\s+(.+?),\s*(20\d{2})\s*\/\s*(.+)$/i;

export function gymnasticsWeekIdentity(startDate: string, endDate: string): string {
  return `${startDate}_${endDate}`;
}

export function gymnasticsSessionSourceIdentity(
  weekIdentity: string,
  attendanceFormat: GymnasticsAttendanceFormat,
): string {
  return `${GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY}:session:${weekIdentity}:${attendanceFormat}`;
}

export function gymnasticsVenueSourceIdentity(venueName: string): string {
  return `${GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY}:venue:${slugToken(venueName)}`;
}

export function normalizeGymnasticsThemeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bweek\b/g, " ")
    .replace(/\bcamp\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeJackrabbitUrl(rawHref: string): string {
  return decodeHtmlEntities(rawHref).replace(/&amp;/g, "&");
}

export function classifyJackrabbitCat2(
  cat2: string | null,
): JackrabbitOpeningsEmbed["role"] {
  if (cat2 === "SummcampHD") return "half_day";
  if (cat2 === "Summcamp") return "full_day";
  if (cat2 === "ABcsc") return "care";
  return "unknown";
}

export function parseJackrabbitOpeningsEmbeds(rawHtml: string): JackrabbitOpeningsEmbed[] {
  const embeds: JackrabbitOpeningsEmbed[] = [];
  for (const match of rawHtml.matchAll(OPENINGS_SRC)) {
    const url = decodeJackrabbitUrl(match[1]);
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      parsed = null;
    }
    const cat2 = parsed?.searchParams.get("Cat2") ?? null;
    const cat3 = parsed?.searchParams.get("Cat3") ?? null;
    const weekNumber = cat3 && /^W(\d+)$/i.test(cat3) ? Number(cat3.slice(1)) : null;
    embeds.push({
      url,
      orgId: parsed?.searchParams.get("OrgID") ?? null,
      cat2,
      cat3,
      weekNumber,
      role: classifyJackrabbitCat2(cat2),
    });
  }
  return embeds;
}

export function parseGymnasticsWeekTitle(rawTitle: string): {
  weekNumber: number;
  listedDateWindow: string;
  statedYear: number;
  themeTitle: string;
  themeTitleNormalized: string;
  isShortWeek: boolean;
  dayCount: number | null;
  startDate: string;
  endDate: string;
  weekIdentity: string;
} | null {
  const cleaned = decodeHtmlEntities(rawTitle).replace(/\s+/g, " ").trim();
  const match = WEEK_TITLE.exec(cleaned);
  if (!match) return null;

  const weekNumber = Number(match[1]);
  const datePart = match[2].trim();
  const statedYear = Number(match[3]);
  let themeTitle = match[4].trim();
  let dayCount: number | null = null;
  const short = /\s*-\s*(\d+)\s*days?\s*$/i.exec(themeTitle);
  if (short) {
    dayCount = Number(short[1]);
    themeTitle = themeTitle.slice(0, short.index).trim();
  }

  const dates = normalizeDateRange(`${datePart}, ${statedYear}`, { explicitYear: statedYear });
  if (!dates.value.startDate || !dates.value.endDate) return null;

  return {
    weekNumber,
    listedDateWindow: `${datePart}, ${statedYear}`,
    statedYear,
    themeTitle,
    themeTitleNormalized: normalizeGymnasticsThemeTitle(themeTitle),
    isShortWeek: dayCount != null && dayCount < 5,
    dayCount,
    startDate: dates.value.startDate,
    endDate: dates.value.endDate,
    weekIdentity: gymnasticsWeekIdentity(dates.value.startDate, dates.value.endDate),
  };
}

function openingsForWeek(
  embeds: readonly JackrabbitOpeningsEmbed[],
  weekNumber: number,
  role: JackrabbitOpeningsEmbed["role"],
): string | null {
  return embeds.find((embed) => embed.weekNumber === weekNumber && embed.role === role)?.url ?? null;
}

export type GymnasticsScheduleParse = {
  weeks: GymnasticsWeek[];
  offerings: GymnasticsOffering[];
  jackrabbitOpenings: JackrabbitOpeningsEmbed[];
  registerHereUrl: string | null;
  membersPortalUrl: string | null;
  warnings: string[];
};

/**
 * Read week × full/half-day offerings from the official marketing HTML.
 * Duplicate identities collapse; remaining rows are sorted by date then format
 * so accordion order cannot change identity.
 */
export function parseGymnasticsMississaugaSchedule(rawHtml: string): GymnasticsScheduleParse {
  const warnings: string[] = [];
  const jackrabbitOpenings = parseJackrabbitOpeningsEmbeds(rawHtml);
  const weeksByNumber = new Map<number, GymnasticsWeek>();

  for (const match of rawHtml.matchAll(TOGGLE_TITLE)) {
    const listedTitle = decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim();
    if (!/^Week\s+\d+/i.test(listedTitle)) continue;
    const parsed = parseGymnasticsWeekTitle(listedTitle);
    if (!parsed) {
      warnings.push(`week_title_unparsed:${listedTitle}`);
      continue;
    }
    weeksByNumber.set(parsed.weekNumber, {
      ...parsed,
      listedTitle,
      fullDayOpeningsUrl: openingsForWeek(jackrabbitOpenings, parsed.weekNumber, "full_day"),
      halfDayOpeningsUrl: openingsForWeek(jackrabbitOpenings, parsed.weekNumber, "half_day"),
      careOpeningsUrl: openingsForWeek(jackrabbitOpenings, parsed.weekNumber, "care"),
    });
  }

  const weeks = [...weeksByNumber.values()].sort((left, right) => {
    const date = left.startDate.localeCompare(right.startDate);
    if (date !== 0) return date;
    return left.weekNumber - right.weekNumber;
  });

  const offeringsByIdentity = new Map<string, GymnasticsOffering>();
  for (const week of weeks) {
    const formats: Array<{
      attendanceFormat: GymnasticsAttendanceFormat;
      openingsUrl: string | null;
      cat2: string;
      label: string;
    }> = [
      {
        attendanceFormat: "full_day",
        openingsUrl: week.fullDayOpeningsUrl,
        cat2: "Summcamp",
        label: "Full-Day Camp",
      },
      {
        attendanceFormat: "half_day",
        openingsUrl: week.halfDayOpeningsUrl,
        cat2: "SummcampHD",
        label: "Half-Day Camp",
      },
    ];
    for (const format of formats) {
      const sourceIdentity = gymnasticsSessionSourceIdentity(
        week.weekIdentity,
        format.attendanceFormat,
      );
      offeringsByIdentity.set(sourceIdentity, {
        weekNumber: week.weekNumber,
        weekIdentity: week.weekIdentity,
        listedDateWindow: week.listedDateWindow,
        listedTitle: week.listedTitle,
        themeTitle: week.themeTitle,
        themeTitleNormalized: week.themeTitleNormalized,
        startDate: week.startDate,
        endDate: week.endDate,
        statedYear: week.statedYear,
        isShortWeek: week.isShortWeek,
        dayCount: week.dayCount,
        attendanceFormat: format.attendanceFormat,
        priceTierKey: format.attendanceFormat,
        priceTierLabel: format.label,
        jackrabbitOpeningsUrl: format.openingsUrl,
        jackrabbitCat2: format.cat2,
        sourceIdentity,
      });
    }
  }

  const offerings = [...offeringsByIdentity.values()].sort((left, right) => {
    const date = left.startDate.localeCompare(right.startDate);
    if (date !== 0) return date;
    if (left.attendanceFormat !== right.attendanceFormat) {
      return left.attendanceFormat === "full_day" ? -1 : 1;
    }
    return left.weekNumber - right.weekNumber;
  });

  if (weeks.length === 0) warnings.push("themed_weeks_not_found");
  if (offerings.length === 0) warnings.push("week_format_offerings_not_found");

  const registerHereUrl = /https:\/\/app\.jackrabbitclass\.com\/regv2\.asp\?id=\d+/i.exec(rawHtml)?.[0] ?? null;
  const membersPortalUrl =
    /https:\/\/app\.jackrabbitclass\.com\/jr4\.0\/ParentPortal\/Login\?orgId=\d+/i.exec(rawHtml)?.[0] ??
    null;

  return {
    weeks,
    offerings,
    jackrabbitOpenings,
    registerHereUrl,
    membersPortalUrl,
    warnings,
  };
}

function slugToken(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "venue";
}
