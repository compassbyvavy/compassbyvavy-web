/**
 * Front Line Hockey School WooCommerce product parser (Prompt 9B-C1).
 *
 * Grain: one official product page is one camp offering. Player vs Goalie is a
 * pricing variant on that same product (WooCommerce attribute `pa_player-type`),
 * not a second source identity. Price, inventory counts, and SOLD OUT copy are
 * never identity.
 *
 * Identity (stable semantic facts, not HTML order, product URL, or slug):
 *   front_line_hockey:session:{camp-token}:{date-token}
 *
 * camp-token is the classified camp/program type from the product title
 * (half_day, girls_only_half_day, full_day, …). WooCommerce slugs such as
 * `july-hockey-camp-2` are source-location only and stay in provenance.
 *
 * date-token is `{YYYY-MM-DD}_{YYYY-MM-DD}` when the product states a window
 * and a year. TBD stays `YYYY:dates_tbd`. Missing dates stay
 * `YYYY:dates_not_stated` (or `dates_not_stated` when the title also omits a
 * year). SKU tokens such as `april2023` / `july2024` / image-path 2016 are not
 * years.
 *
 * Currency: product copy says "$" and sometimes "plus HST". It does not say
 * CAD. Amounts are kept; currency stays unknown. Generic `$`→CAD is not adopted.
 */

import type { CampCurrency } from "@/data/camps/ingestion/types";
import { normalizeDateRange } from "@/lib/camps/ingestion/normalize/dateRange";
import { normalizePriceCad } from "@/lib/camps/ingestion/normalize/price";
import { normalizeTimeRange } from "@/lib/camps/ingestion/normalize/timeRange";

export const FRONT_LINE_HOCKEY_EXTRACTOR_KEY = "front_line_hockey";
export const FRONT_LINE_HOCKEY_PROVIDER_NAME = "Front Line Hockey School";
export const FRONT_LINE_HOCKEY_HOST = "frontlinehockeyschool.ca";
export const FRONT_LINE_HOCKEY_HOSTS = [
  "frontlinehockeyschool.ca",
  "www.frontlinehockeyschool.ca",
] as const;
export const FRONT_LINE_HOCKEY_VENUE_NAME = "Vic Johnston Arena";

const MONTH_INDEX: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  sept: 9,
  october: 10,
  november: 11,
  december: 12,
};

export type FrontLinePlayerType = "player" | "goalie";

export type FrontLineAgeBand = {
  ageMin: number;
  ageMax: number;
  hoursStart: string | null;
  hoursEnd: string | null;
  copy: string;
};

export type FrontLineWooVariation = {
  playerType: FrontLinePlayerType | null;
  displayPrice: number | null;
  availabilityHtml: string | null;
  description: string | null;
  inStock: boolean | null;
};

export type FrontLineOffering = {
  productSlug: string;
  productTitle: string;
  productUrl: string;
  weekIdentity: string;
  listedDateWindow: string | null;
  startDate: string | null;
  endDate: string | null;
  datesTbd: boolean;
  statedYear: number | null;
  ageMin: number | null;
  ageMax: number | null;
  ageBands: FrontLineAgeBand[];
  eligibilityCopy: string | null;
  campToken: string;
  rawGoalieVariantAmount: number | null;
  coreHoursStart: string | null;
  coreHoursEnd: string | null;
  hoursCopy: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueNeighbourhood: string | null;
  venueCopy: string | null;
  playerPriceAmount: number | null;
  goaliePriceAmount: number | null;
  playerPriceCopy: string | null;
  goaliePriceCopy: string | null;
  currency: CampCurrency;
  taxExtra: boolean;
  girlsOnly: boolean;
  campType: string | null;
  availabilityCopy: string | null;
  soldOut: boolean;
  registrationUrl: string;
  sourceIdentity: string;
};

export function frontLineCampToken(title: string, campType: string | null): string {
  if (campType) return campType;
  const slug = title
    .toLowerCase()
    .replace(/\b20\d{2}\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "camp";
}

export function frontLineSessionSourceIdentity(campToken: string, dateToken: string): string {
  return `${FRONT_LINE_HOCKEY_EXTRACTOR_KEY}:session:${campToken}:${dateToken}`;
}

export function frontLineProductSlugFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = /\/product\/([^/]+)\/?/i.exec(parsed.pathname);
    return match ? decodeURIComponent(match[1]).toLowerCase() : null;
  } catch {
    const match = /\/product\/([^/?#]+)\/?/i.exec(url);
    return match ? decodeURIComponent(match[1]).toLowerCase() : null;
  }
}

export function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function parseFrontLineWooVariations(rawHtml: string): FrontLineWooVariation[] {
  const match = /data-product_variations="([^"]*)"/i.exec(rawHtml);
  if (!match) return [];
  try {
    const parsed = JSON.parse(decodeHtmlAttr(match[1])) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => {
      const attributes = (row.attributes ?? {}) as Record<string, string>;
      const typeRaw = attributes.attribute_pa_player_type ?? attributes["attribute_pa_player-type"] ?? "";
      const playerType =
        typeRaw.toLowerCase() === "goalie"
          ? "goalie"
          : typeRaw.toLowerCase() === "player"
            ? "player"
            : null;
      const displayPrice =
        typeof row.display_price === "number"
          ? row.display_price
          : typeof row.display_price === "string"
            ? Number(row.display_price)
            : null;
      const availabilityHtml =
        typeof row.availability_html === "string" ? stripTags(row.availability_html) : null;
      const description =
        typeof row.variation_description === "string" ? stripTags(row.variation_description) : null;
      const inStock = typeof row.is_in_stock === "boolean" ? row.is_in_stock : null;
      return {
        playerType,
        displayPrice: Number.isFinite(displayPrice) ? displayPrice : null,
        availabilityHtml,
        description,
        inStock,
      };
    });
  } catch {
    return [];
  }
}

export function parseFrontLineProductTitle(rawHtml: string, documentTitle: string | null): string {
  const productTitle =
    /<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([^<]+)<\/h1>/i.exec(rawHtml) ??
    /<h1>([^<]+)<\/h1>/i.exec(rawHtml);
  const fromHtml = productTitle?.[1]?.replace(/\s+/g, " ").trim();
  if (fromHtml) return decodeHtmlAttr(fromHtml);
  const fromDocument = documentTitle?.replace(/\s*\|\s*Front Line Hockey School.*$/i, "").trim();
  return fromDocument && fromDocument !== "" ? fromDocument : "Front Line Hockey School camp";
}

export function parseFrontLineStatedYear(title: string, headings: readonly string[]): number | null {
  for (const haystack of [title, ...headings]) {
    const match = /\b(20\d{2})\b/.exec(haystack);
    if (match) return Number(match[1]);
  }
  return null;
}

export function parseFrontLineEligibility(
  lines: readonly string[],
): {
  ageMin: number | null;
  ageMax: number | null;
  bands: FrontLineAgeBand[];
  copy: string | null;
} {
  const timedBands: FrontLineAgeBand[] = [];
  const timedPattern =
    /(\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)\s*[-–—]\s*\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?))\s*:\s*ages?\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})/gi;
  for (const line of lines) {
    for (const timed of line.matchAll(timedPattern)) {
      const hours = normalizeTimeRange(timed[1]);
      timedBands.push({
        ageMin: Number(timed[2]),
        ageMax: Number(timed[3]),
        hoursStart: hours.value.startTime,
        hoursEnd: hours.value.endTime,
        copy: collapse(timed[0]),
      });
    }
  }
  if (timedBands.length >= 2) {
    return {
      ageMin: Math.min(...timedBands.map((band) => band.ageMin)),
      ageMax: Math.max(...timedBands.map((band) => band.ageMax)),
      bands: timedBands,
      copy: timedBands.map((band) => band.copy).join(" | "),
    };
  }

  const groupsLine = lines.find((line) => /two available age groups/i.test(line) && /ages?\s+\d/i.test(line));
  if (groupsLine) {
    const parsed = [...groupsLine.matchAll(/(\d{1,2})\s*[-–—]\s*(\d{1,2})/g)].map((match) => ({
      ageMin: Number(match[1]),
      ageMax: Number(match[2]),
      hoursStart: null as string | null,
      hoursEnd: null as string | null,
      copy: `${match[1]}–${match[2]}`,
    }));
    if (parsed.length >= 2) {
      return {
        ageMin: Math.min(...parsed.map((band) => band.ageMin)),
        ageMax: Math.max(...parsed.map((band) => band.ageMax)),
        bands: parsed,
        copy: collapse(groupsLine),
      };
    }
  }

  const agesLine =
    lines.find((line) => /\(ages?\s+\d/i.test(line)) ??
    lines.find((line) => /\bages?\s+\d{1,2}\s*[-–—]\s*\d{1,2}/i.test(line)) ??
    null;
  if (!agesLine) return { ageMin: null, ageMax: null, bands: [], copy: null };

  const range = /\bages?\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})/i.exec(agesLine);
  if (!range) return { ageMin: null, ageMax: null, bands: [], copy: collapse(agesLine) };
  const ageMin = Number(range[1]);
  const ageMax = Number(range[2]);
  return {
    ageMin,
    ageMax,
    bands: [{ ageMin, ageMax, hoursStart: null, hoursEnd: null, copy: collapse(agesLine) }],
    copy: collapse(agesLine),
  };
}

export function parseFrontLineVenue(
  lines: readonly string[],
): {
  name: string;
  city: string | null;
  neighbourhood: string | null;
  copy: string;
} | null {
  const line =
    lines.find((candidate) => /vic johnston arena/i.test(candidate)) ??
    lines.find(
      (candidate) =>
        /location:/i.test(candidate) &&
        /mississauga|streetsville|\barena\b|\bcentre\b|\bcenter\b/i.test(candidate),
    );
  if (!line) return null;
  const payload = collapse((/location:\s*(.+)/i.exec(line)?.[1] ?? line).replace(/details:.*/i, ""));
  const parts = payload
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const name = /vic johnston arena/i.test(payload)
    ? FRONT_LINE_HOCKEY_VENUE_NAME
    : (parts[0] ?? FRONT_LINE_HOCKEY_VENUE_NAME);
  const city = parts.some((part) => /mississauga/i.test(part)) ? "Mississauga" : null;
  const neighbourhood = parts.some((part) => /streetsville/i.test(part)) ? "Streetsville" : null;
  return {
    name,
    city,
    neighbourhood,
    copy: collapse(line),
  };
}

export function frontLineVenueSourceIdentity(venueName: string): string {
  const slug = venueName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${FRONT_LINE_HOCKEY_EXTRACTOR_KEY}:venue:${slug || "unspecified"}`;
}

export function parseFrontLineDateWindow(
  lines: readonly string[],
  statedYear: number | null,
): {
  listedDateWindow: string | null;
  startDate: string | null;
  endDate: string | null;
  datesTbd: boolean;
  dateToken: string;
} {
  const dateLines: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/\bdates?\b/i.test(line) || /^week\s+\d/i.test(line)) {
      dateLines.push(line);
      const selfHasFact = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|tbd)\b/i.test(line);
      if (!selfHasFact) {
        if (lines[index + 1]) dateLines.push(lines[index + 1]);
        if (lines[index + 2] && !/\b(times?|location|details)\b/i.test(lines[index + 2])) {
          dateLines.push(lines[index + 2]);
        }
      }
    }
  }
  const listedDateWindow = dateLines.length > 0 ? collapse(dateLines.join(" | ")) : null;
  const blob = dateLines.join(" ");

  if (listedDateWindow && /\bTBD\b/i.test(blob)) {
    return {
      listedDateWindow,
      startDate: null,
      endDate: null,
      datesTbd: true,
      dateToken: statedYear != null ? `${statedYear}:dates_tbd` : "dates_tbd",
    };
  }

  if (!listedDateWindow) {
    return {
      listedDateWindow: null,
      startDate: null,
      endDate: null,
      datesTbd: false,
      dateToken: statedYear != null ? `${statedYear}:dates_not_stated` : "dates_not_stated",
    };
  }

  const dayHits = collectMonthDays(blob);
  if (dayHits.length >= 2 && statedYear != null) {
    const start = dayHits[0];
    const end = dayHits[dayHits.length - 1];
    const startDate = isoDate(statedYear, start.month, start.day);
    const endDate = isoDate(statedYear, end.month, end.day);
    return {
      listedDateWindow,
      startDate,
      endDate,
      datesTbd: false,
      dateToken: `${startDate}_${endDate}`,
    };
  }

  const ranged = normalizeDateRange(blob, { explicitYear: statedYear });
  if (ranged.value.startDate && ranged.value.endDate) {
    return {
      listedDateWindow,
      startDate: ranged.value.startDate,
      endDate: ranged.value.endDate,
      datesTbd: false,
      dateToken: `${ranged.value.startDate}_${ranged.value.endDate}`,
    };
  }

  return {
    listedDateWindow,
    startDate: null,
    endDate: null,
    datesTbd: false,
    dateToken: statedYear != null ? `${statedYear}:dates_not_stated` : "dates_not_stated",
  };
}

export function parseFrontLineHours(lines: readonly string[]): {
  start: string | null;
  end: string | null;
  copy: string | null;
  multipleBands: boolean;
} {
  const timeLines: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/\btimes?\s*:/i.test(line)) continue;
    timeLines.push(line);
    if (!/\d{1,2}:\d{2}/.test(line) && lines[index + 1]) {
      timeLines.push(lines[index + 1]);
      if (lines[index + 2] && /\d{1,2}:\d{2}/.test(lines[index + 2])) {
        timeLines.push(lines[index + 2]);
      }
    }
  }
  if (timeLines.length === 0) {
    const inline = lines.find((line) => /\d{1,2}:\d{2}\s*(?:am|pm)/i.test(line) && /[-–]/.test(line));
    if (!inline) return { start: null, end: null, copy: null, multipleBands: false };
    const parsed = normalizeTimeRange(inline);
    return {
      start: parsed.value.startTime,
      end: parsed.value.endTime,
      copy: collapse(inline),
      multipleBands: false,
    };
  }

  const copy = collapse(timeLines.join(" | "));
  const bandCount = (copy.match(/\d{1,2}:\d{2}/g) ?? []).length;
  if (bandCount > 2 && /ages?\s+\d/i.test(copy)) {
    return { start: null, end: null, copy, multipleBands: true };
  }
  const parsed = normalizeTimeRange(copy);
  return {
    start: parsed.value.startTime,
    end: parsed.value.endTime,
    copy,
    multipleBands: false,
  };
}

export function parseFrontLineBodyPrices(lines: readonly string[]): {
  playerAmount: number | null;
  goalieAmount: number | null;
  playerCopy: string | null;
  goalieCopy: string | null;
  taxExtra: boolean;
} {
  const blob = lines.join("\n");
  const playerLine =
    lines.find((line) => /\b(regular|players?)\b/i.test(line) && /\$\s*\d/.test(line)) ?? null;
  const goalieLine =
    lines.find((line) => /\bgoalies?\b/i.test(line) && /(\$|free)/i.test(line)) ?? null;

  const playerAmount = playerLine ? firstAmount(playerLine) : null;
  let goalieAmount: number | null = null;
  if (goalieLine && /\bfree\b/i.test(goalieLine)) goalieAmount = 0;
  else if (goalieLine) goalieAmount = firstAmount(goalieLine);

  return {
    playerAmount,
    goalieAmount,
    playerCopy: playerLine ? collapse(playerLine) : null,
    goalieCopy: goalieLine ? collapse(goalieLine) : null,
    taxExtra: /\bplus\s+hst\b/i.test(blob),
  };
}

export function parseFrontLineAvailability(
  rawHtml: string,
  variations: readonly FrontLineWooVariation[],
): { soldOut: boolean; availabilityCopy: string | null } {
  const productClass = /id="product-\d+"[^>]*class="([^"]*)"/i.exec(rawHtml)?.[1]
    ?? /class="([^"]*\bproduct type-product[^"]*)"/i.exec(rawHtml)?.[1]
    ?? "";
  const outOfStockClass = /\boutofstock\b/.test(productClass);
  const variationCopy = variations
    .map((variation) => variation.availabilityHtml)
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" | ");
  const variationsOut =
    variations.length > 0 &&
    variations.every(
      (row) => row.inStock === false || /\bout of stock\b/i.test(row.availabilityHtml ?? ""),
    );

  if (outOfStockClass || variationsOut) {
    return {
      soldOut: true,
      availabilityCopy: collapse(variationCopy || "Out of stock"),
    };
  }

  return {
    soldOut: false,
    availabilityCopy: variationCopy ? collapse(variationCopy) : null,
  };
}

export function resolveFrontLineGoaliePrice(options: {
  bodyAmount: number | null;
  bodyCopy: string | null;
  variationAmount: number | null;
}): {
  amount: number | null;
  copy: string | null;
  rawVariantAmount: number | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  const rawVariantAmount = options.variationAmount;
  if (options.bodyAmount != null) {
    if (options.bodyAmount === 0 && options.variationAmount === 1) {
      warnings.push("goalie_free_overrides_woocommerce_one_dollar");
    }
    return {
      amount: options.bodyAmount,
      copy: options.bodyCopy,
      rawVariantAmount,
      warnings,
    };
  }
  if (options.variationAmount === 1) {
    warnings.push("variant_amount_not_confirmed_as_customer_facing_price");
    warnings.push("goalie_price_not_found");
    return {
      amount: null,
      copy: null,
      rawVariantAmount,
      warnings,
    };
  }
  if (options.variationAmount != null) {
    return {
      amount: options.variationAmount,
      copy: `$${options.variationAmount}`,
      rawVariantAmount,
      warnings,
    };
  }
  warnings.push("goalie_price_not_found");
  return { amount: null, copy: null, rawVariantAmount: null, warnings };
}

export function classifyFrontLineCampType(title: string): string | null {
  if (/girls only/i.test(title)) return "girls_only_half_day";
  if (/full day/i.test(title)) return "full_day";
  if (/half day/i.test(title)) return "half_day";
  if (/pre-tryout|pre tryout/i.test(title)) return "pre_tryout_evening";
  if (/pre-evaluation|pre-season|pre evaluation/i.test(title)) return "pre_evaluation";
  if (/mid[- ]season|christmas/i.test(title)) return "mid_season";
  return null;
}

function collectMonthDays(text: string): Array<{ month: number; day: number }> {
  const hits: Array<{ month: number; day: number }> = [];
  const monthNames = Object.keys(MONTH_INDEX).join("|");
  const clusters = new RegExp(
    `\\b(${monthNames})\\.?\\s+(\\d{1,2}(?:st|nd|rd|th)?(?:\\s*,\\s*\\d{1,2}(?:st|nd|rd|th)?)*)(?:\\s*[-–—]\\s*(\\d{1,2}(?:st|nd|rd|th)?))?`,
    "gi",
  );
  for (const match of text.matchAll(clusters)) {
    const month = MONTH_INDEX[match[1].toLowerCase().replace(/\./g, "")];
    if (!month) continue;
    const startDays = match[2].match(/\d{1,2}/g) ?? [];
    for (const day of startDays) hits.push({ month, day: Number(day) });
    if (match[3]) hits.push({ month, day: Number(match[3]) });
  }
  return hits;
}

function firstAmount(text: string): number | null {
  const parsed = normalizePriceCad(text);
  return parsed.value.amount;
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function stripTags(value: string): string {
  return decodeHtmlAttr(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
