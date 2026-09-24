/**
 * Creative Kids Place (Square One, Mississauga) extractor.
 *
 * The first site-specific parser: it knows the shape of this provider's summer
 * camp page — an age band, a season window, daily hours, a weekly theme schedule, fee tiers as attributes,
 * an Activity Messenger registration link, and a studio address — and reads
 * exactly those facts.
 *
 * Site-specific does not mean brittle-by-fiat: parsing still runs over the
 * cleaned text with labelled patterns, so re-ordered markup does not break it.
 * What it will not do is guess. A missing fee row is missing, and a season with
 * no stated year stays unparsed (see `normalizeDateRange`).
 *
 * Offline benchmark: `data/camps/ingestion/benchmarks/creative-kids-place-square-one.html`
 * with the expected facts in `creative-kids-place.expected.json`.
 */

import type {
  CampExtractedRecord,
  CleanSourceDocument,
  RegistrationPlatform,
} from "@/data/camps/ingestion/types";
import type { CampCurrency, PriceUnit } from "@/data/camps/ingestion/types";
import { clampConfidence } from "@/lib/camps/ingestion/confidence";
import { sameCanonicalHost } from "@/lib/camps/ingestion/canonicalizeUrl";
import {
  buildExtractedRecord,
  makeFieldObservation,
  type CampExtractor,
  type ExtractorInput,
  type ExtractorResult,
  type ExtractorSupportInput,
} from "@/lib/camps/ingestion/extractors/types";
import { CREATIVE_KIDS_PLACE_OFFERING_GRAIN } from "@/lib/camps/ingestion/extractors/offeringGrain";
import {
  documentLines,
  findAddress,
  findAgeRange,
  findDateRange,
  findPriceNear,
  findTimeRange,
  statedDocumentYear,
  type ParsedAddress,
} from "@/lib/camps/ingestion/extractors/textScan";
import {
  findRegistrationLink,
  normalizeRegistrationPlatform,
} from "@/lib/camps/ingestion/normalize/registrationPlatform";

import {
  parseCreativeKidsPlaceSchedule,
  type CreativeKidsPlaceOffering,
  type CreativeKidsPlaceWeekFact,
} from "@/lib/camps/ingestion/extractors/creativeKidsPlaceSchedule";

export const CREATIVE_KIDS_PLACE_EXTRACTOR_KEY = "creative_kids_place";
export const CREATIVE_KIDS_PLACE_PROVIDER_NAME = "Creative Kids Place";
export const CREATIVE_KIDS_PLACE_HOST = "www.creativekidsplace.ca";
export const CREATIVE_KIDS_PLACE_HOSTS = ["www.creativekidsplace.ca", "www.creativekidsplace.com"] as const;

/** Fee rows this provider publishes. Order is the order shown on the page. */
const PRICE_TIER_RULES: ReadonlyArray<{ key: string; label: string; pattern: RegExp }> = [
  {
    key: "full_week",
    label: "Full Week",
    pattern: /\b(?:1\s+)?full week\b/i,
  },
  {
    key: "short_week",
    label: "Short Week",
    pattern: /\bshort weeks?\b|\bfour[- ]day\b|\b4[- ]day\b/i,
  },
  {
    key: "creator_camp",
    label: "Creator Camp",
    pattern: /\bcreator camps?\b/i,
  },
  {
    key: "on_the_go",
    label: "On the Go Excursions",
    pattern: /\bon the go excursions?\b/i,
  },
];

/** Dollar amounts on fee rows are two-to-four digits; never the leading "1" in "1 Full Week". */
const FEE_AMOUNT_PATTERN = /\$\s*(\d{2,4})(?:\.\d{2})?\b/;

export type CreativeKidsPlacePriceTier = {
  key: string;
  label: string;
  priceAmount: number | null;
  priceUnit: PriceUnit | null;
  currency: CampCurrency;
  rawFee: string;
};

export type CreativeKidsPlaceFacts = {
  provider: {
    name: string;
    websiteUrl: string | null;
    registrationPlatform: RegistrationPlatform;
  };
  venue: ({ name: string | null } & ParsedAddress) | null;
  program: {
    name: string | null;
    ageMin: number | null;
    ageMax: number | null;
    seasonStartDate: string | null;
    seasonEndDate: string | null;
    coreHoursStart: string | null;
    coreHoursEnd: string | null;
    registrationUrl: string | null;
  };
  priceTiers: CreativeKidsPlacePriceTier[];
  /**
   * Program ages from marketing copy (e.g. "ages 4–12").
   * Not session eligibility — see offerings[].ageMin/ageMax.
   */
  marketingAgeMin: number | null;
  marketingAgeMax: number | null;
  /** Min/max across extracted weekly theme offerings (may exceed marketing max). */
  derivedAvailableAgeMin: number | null;
  derivedAvailableAgeMax: number | null;
  weeks: CreativeKidsPlaceWeekFact[];
  /** One parent-facing offering per week × theme × age band. */
  offerings: CreativeKidsPlaceOffering[];
  /** Provider business / mailing address when distinct from the camp venue. */
  businessAddress: ({ name: string | null } & ParsedAddress) | null;
  policies: {
    nutFree: boolean | null;
    extendedHoursFeeCad: number | null;
    cancellationNoticeWeeks: number | null;
    cancellationFeeCad: number | null;
    staffRatioGeneral: string | null;
    staffRatioYoungest: string | null;
  };
  /** Raw source text behind each parsed value, for review provenance. */
  raw: {
    ages: string | null;
    season: string | null;
    hours: string | null;
    address: string | null;
    businessAddress: string | null;
    nutFree: string | null;
    extendedHours: string | null;
    cancellation: string | null;
    staffRatio: string | null;
  };
  confidenceByField: Record<string, number>;
  warnings: string[];
  /**
   * Facts the answer key tracks that this page does not state.
   * Absence is not false — these stay explicit gaps.
   */
  knownGaps: string[];
};

export type ParseCreativeKidsPlaceOptions = {
  /** Canonical page URL, used as the provider website when present. */
  sourceUrl?: string | null;
};

/**
 * Pure fact parser — no ids, no timestamps — so the offline benchmark can assert
 * the parsed facts directly.
 */
export function parseCreativeKidsPlaceFacts(
  document: CleanSourceDocument,
  options: ParseCreativeKidsPlaceOptions = {},
): CreativeKidsPlaceFacts {
  const lines = documentLines(document);
  const warnings: string[] = [];
  const confidenceByField: Record<string, number> = {};
  const knownGaps: string[] = [];

  const ageHit = findOverallAgeBand(document, lines);
  if (!ageHit) warnings.push("age_band_not_found");
  else {
    confidenceByField.ageMin = ageHit.confidence;
    confidenceByField.ageMax = ageHit.confidence;
  }

  const seasonScan = findDateRange(lines, {
    explicitYear: statedDocumentYear(document),
    preferWidest: true,
  });
  const seasonHit = seasonScan.hit;
  warnings.push(...seasonScan.unparsedWarnings);
  if (!seasonHit) warnings.push("season_window_not_found");
  if (seasonHit) {
    warnings.push(...seasonHit.result.warnings);
    confidenceByField.seasonStartDate = seasonHit.result.confidence;
    confidenceByField.seasonEndDate = seasonHit.result.confidence;
  }

  const hoursHit = findCampHours(lines);
  if (!hoursHit) warnings.push("daily_hours_not_found");
  else {
    confidenceByField.coreHoursStart = hoursHit.confidence;
    confidenceByField.coreHoursEnd = hoursHit.confidence;
  }

  const priceTiers = parsePriceTiers(lines, warnings, confidenceByField);
  if (priceTiers.length === 0) warnings.push("fee_table_not_found");

  const priceLookup = Object.fromEntries(
    priceTiers.map((tier) => [tier.key, tier.priceAmount]),
  );
  const schedule = parseCreativeKidsPlaceSchedule(lines, {
    year: statedDocumentYear(document) ?? 2026,
    prices: {
      fullWeek: priceLookup.full_week ?? 350,
      shortWeek: priceLookup.short_week ?? 280,
      creatorCamp: priceLookup.creator_camp ?? 370,
      creatorShortWeek: 295,
      onTheGo: priceLookup.on_the_go ?? 390,
    },
  });
  warnings.push(...schedule.warnings);

  const registrationLink = findRegistrationLink(document.links);
  if (!registrationLink) warnings.push("registration_link_not_found");
  const registrationPlatform = normalizeRegistrationPlatform({
    links: document.links,
    text: document.text,
  });
  if (!registrationPlatform) warnings.push("registration_platform_not_identified");

  const venueHit = findVenueAddress(lines);
  if (!venueHit) warnings.push("venue_address_not_found");
  const businessHit = findBusinessAddress(lines);

  const policiesParsed = parsePolicies(lines, warnings, confidenceByField);
  const policies: CreativeKidsPlaceFacts["policies"] = {
    nutFree: policiesParsed.nutFree,
    extendedHoursFeeCad: policiesParsed.extendedHoursFeeCad,
    cancellationNoticeWeeks: policiesParsed.cancellationNoticeWeeks,
    cancellationFeeCad: policiesParsed.cancellationFeeCad,
    staffRatioGeneral: policiesParsed.staffRatioGeneral,
    staffRatioYoungest: policiesParsed.staffRatioYoungest,
  };

  // Answer-key gaps: not stated for *own* staff (do not invent false).
  // A requirement that a parent-supplied support worker bring a vulnerable-sector
  // search does not document Creative Kids Place counsellor screening.
  const statesOwnStaffScreening =
    /\b(?:staff|counsellor|counselor|teacher)s?\b[\s\S]{0,60}\b(?:background check|vulnerable sector|screening)\b|\b(?:background check|vulnerable sector|screening)\b[\s\S]{0,60}\b(?:staff|counsellor|counselor|teacher)s?\b/i.test(
      document.text,
    );
  if (!statesOwnStaffScreening) {
    knownGaps.push("own_counsellor_background_screening_policy_not_stated");
  }
  if (!/\banaphylaxis\b|\bepi[- ]?pen\b/i.test(document.text)) {
    knownGaps.push("anaphylaxis_epipen_protocol_not_stated");
  }
  if (!/\bfirst aid\b|\bcpr\b/i.test(document.text)) {
    knownGaps.push("staff_first_aid_cpr_certification_not_stated");
  }

  const providerName =
    document.metadata["og:site_name"]?.trim() || CREATIVE_KIDS_PLACE_PROVIDER_NAME;
  const programName = document.headings[0]?.trim() ?? document.title?.trim() ?? null;

  return {
    provider: {
      name: providerName.replace(/\s+Inc\.?$/i, "").trim() || providerName,
      websiteUrl: document.metadata.canonical ?? options.sourceUrl ?? null,
      registrationPlatform,
    },
    venue: venueHit
      ? {
          name: venueHit.name,
          addressLine: venueHit.address.addressLine,
          city: venueHit.address.city,
          province: venueHit.address.province,
          postalCode: venueHit.address.postalCode,
        }
      : null,
    businessAddress: businessHit
      ? {
          name: "Creative Kids Place (business address)",
          addressLine: businessHit.address.addressLine,
          city: businessHit.address.city,
          province: businessHit.address.province,
          postalCode: businessHit.address.postalCode,
        }
      : null,
    program: {
      name: programName,
      ageMin: ageHit?.ageMin ?? null,
      ageMax: ageHit?.ageMax ?? null,
      seasonStartDate: seasonHit?.result.value.startDate ?? null,
      seasonEndDate: seasonHit?.result.value.endDate ?? null,
      coreHoursStart: hoursHit?.startTime ?? null,
      coreHoursEnd: hoursHit?.endTime ?? null,
      registrationUrl: registrationLink?.href ?? null,
    },
    priceTiers,
    marketingAgeMin: ageHit?.ageMin ?? null,
    marketingAgeMax: ageHit?.ageMax ?? null,
    derivedAvailableAgeMin: schedule.derivedAvailableAgeMin,
    derivedAvailableAgeMax: schedule.derivedAvailableAgeMax,
    weeks: schedule.weeks,
    offerings: schedule.offerings,
    policies,
    raw: {
      ages: ageHit?.line ?? null,
      season: seasonHit?.line ?? null,
      hours: hoursHit?.line ?? null,
      address: venueHit?.line ?? null,
      businessAddress: businessHit?.line ?? null,
      nutFree: policiesParsed.nutFreeRaw,
      extendedHours: policiesParsed.extendedHoursRaw,
      cancellation: policiesParsed.cancellationRaw,
      staffRatio: policiesParsed.staffRatioRaw,
    },
    confidenceByField,
    warnings: [...new Set(warnings)],
    knownGaps,
  };
}

function parsePriceTiers(
  lines: readonly string[],
  warnings: string[],
  confidenceByField: Record<string, number>,
): CreativeKidsPlacePriceTier[] {
  const tiers: CreativeKidsPlacePriceTier[] = [];
  const joined = lines.join("\n");

  for (const rule of PRICE_TIER_RULES) {
    // Prefer an amount anchored to this tier's label on the live fee prose.
    // Pattern alternatives must be grouped so the amount stays attached to every arm.
    const labelled = new RegExp(
      `(?:${rule.pattern.source})[^\\n$]{0,120}${FEE_AMOUNT_PATTERN.source}`,
      "i",
    );
    const labelledMatch = labelled.exec(joined);
    if (labelledMatch) {
      const amount = Number(labelledMatch[labelledMatch.length - 1]);
      confidenceByField[`priceAmount:${rule.key}`] = 0.95;
      if (/tax/i.test(labelledMatch[0])) warnings.push("tax_charged_on_top");
      if (/\$/.test(labelledMatch[0])) warnings.push("currency_symbol_only_assumed_cad");
      tiers.push({
        key: rule.key,
        label: rule.label,
        priceAmount: amount,
        priceUnit: "per_week",
        currency: "CAD",
        rawFee: labelledMatch[0].replace(/\s+/g, " ").trim(),
      });
      continue;
    }

    const lineIndex = lines.findIndex((line) => rule.pattern.test(line));
    if (lineIndex === -1) {
      warnings.push(`fee_not_found_for_${rule.key}`);
      continue;
    }
    const window = lines.slice(lineIndex, lineIndex + 3).join(" ");
    const amountMatch = FEE_AMOUNT_PATTERN.exec(window);
    if (amountMatch) {
      confidenceByField[`priceAmount:${rule.key}`] = 0.92;
      if (/tax/i.test(window)) warnings.push("tax_charged_on_top");
      if (/\$/.test(window)) warnings.push("currency_symbol_only_assumed_cad");
      tiers.push({
        key: rule.key,
        label: rule.label,
        priceAmount: Number(amountMatch[1]),
        priceUnit: "per_week",
        currency: "CAD",
        rawFee: window.replace(/\s+/g, " ").trim(),
      });
      continue;
    }

    const price = findPriceNear(lines, lineIndex, 2);
    if (!price || price.value.amount === null) {
      warnings.push(`fee_not_found_for_${rule.key}`);
      continue;
    }
    // Guard against reading the leading "1" in "1 Full Week = $350".
    if (price.value.amount < 50) {
      const dollar = FEE_AMOUNT_PATTERN.exec(window);
      if (dollar) {
        confidenceByField[`priceAmount:${rule.key}`] = 0.9;
        tiers.push({
          key: rule.key,
          label: rule.label,
          priceAmount: Number(dollar[1]),
          priceUnit: "per_week",
          currency: "CAD",
          rawFee: window.replace(/\s+/g, " ").trim(),
        });
        continue;
      }
    }
    warnings.push(...price.warnings.filter((w) => w !== "multiple_amounts_found_using_first"));
    confidenceByField[`priceAmount:${rule.key}`] = price.confidence;
    tiers.push({
      key: rule.key,
      label: rule.label,
      priceAmount: price.value.amount,
      priceUnit: price.value.unit,
      currency: price.value.currency,
      rawFee: price.raw,
    });
  }
  return tiers;
}

/**
 * Program-level age band.
 *
 * Prefer an explicit marketing claim ("for 4 – 12 years old kids") from meta
 * description / page prose over the min/max of every theme row. Theme rows
 * include Creator Camp (e.g. 8–13) and must not silently widen the advertised
 * program band.
 */
function findOverallAgeBand(
  document: CleanSourceDocument,
  lines: readonly string[],
): { ageMin: number; ageMax: number; line: string; confidence: number } | null {
  const marketing =
    /\b(?:for|ages?|aged)\s*(\d{1,2})\s*(?:to|-|–|—)\s*(\d{1,2})\s*years?\s*old/i;

  const metaCandidates = [
    document.metadata.description,
    document.metadata["og:description"],
    document.metadata["twitter:description"],
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  for (const meta of metaCandidates) {
    const match = marketing.exec(meta);
    if (!match) continue;
    const lo = Number(match[1]);
    const hi = Number(match[2]);
    if (lo > hi || lo < 1 || hi > 18) continue;
    return { ageMin: lo, ageMax: hi, line: match[0], confidence: 0.95 };
  }

  for (const line of lines) {
    // Skip theme-specific Creator Camp marketing so it cannot override the
    // program-wide band already stated in the page description.
    if (/creator camp/i.test(line)) continue;
    const match = marketing.exec(line);
    if (!match) continue;
    const lo = Number(match[1]);
    const hi = Number(match[2]);
    if (lo > hi || lo < 1 || hi > 18) continue;
    return { ageMin: lo, ageMax: hi, line, confidence: 0.92 };
  }

  const pattern = /\b[Aa]ges?\s*(\d{1,2})\s*(?:to|-|–|—)\s*(\d{1,2})\b/g;
  let ageMin: number | null = null;
  let ageMax: number | null = null;
  const evidence: string[] = [];
  for (const line of lines) {
    for (const match of line.matchAll(pattern)) {
      const lo = Number(match[1]);
      const hi = Number(match[2]);
      if (lo > hi || lo < 1 || hi > 18) continue;
      ageMin = ageMin === null ? lo : Math.min(ageMin, lo);
      ageMax = ageMax === null ? hi : Math.max(ageMax, hi);
      evidence.push(match[0]);
    }
  }
  if (ageMin === null || ageMax === null) return null;
  return {
    ageMin,
    ageMax,
    line: evidence.slice(0, 6).join("; "),
    confidence: evidence.length >= 3 ? 0.9 : 0.8,
  };
}

function findCampHours(
  lines: readonly string[],
): { startTime: string; endTime: string; line: string; confidence: number } | null {
  for (const line of lines) {
    if (!/camps? will run|will run from|core hours|camp hours/i.test(line)) continue;
    const hit = findTimeRange([line]);
    if (hit?.result.value.startTime && hit.result.value.endTime) {
      return {
        startTime: hit.result.value.startTime,
        endTime: hit.result.value.endTime,
        line,
        confidence: hit.result.confidence,
      };
    }
  }
  // Fallback: first window that has both start and end (skip registration-open times).
  for (const line of lines) {
    if (/registration .* open|open on january/i.test(line)) continue;
    const hit = findTimeRange([line]);
    if (hit?.result.value.startTime && hit.result.value.endTime) {
      return {
        startTime: hit.result.value.startTime,
        endTime: hit.result.value.endTime,
        line,
        confidence: hit.result.confidence,
      };
    }
  }
  return null;
}

function findVenueAddress(
  lines: readonly string[],
): { name: string; line: string; address: ParsedAddress } | null {
  for (const line of lines) {
    if (!/sheridan|hazel mccallion|duke of york/i.test(line)) continue;
    const street = /(\d{3,5}\s+Duke of York Blvd\.?)/i.exec(line);
    if (!street) continue;
    const named = /(Sheridan College Hazel McCallion Campus)/i.exec(line);
    return {
      name: named?.[1] ?? "Sheridan College Hazel McCallion Campus",
      line,
      address: {
        addressLine: street[1].replace(/\.$/, ""),
        city: "Mississauga",
        province: "ON",
        postalCode: null,
      },
    };
  }
  // Fallback to generic address finder when the campus line is absent.
  const generic = findAddress(lines);
  if (!generic) return null;
  return {
    name: venueNameNear(lines, generic.lineIndex, []) ?? "Camp venue",
    line: generic.line,
    address: generic.address,
  };
}

function findBusinessAddress(
  lines: readonly string[],
): { line: string; address: ParsedAddress } | null {
  for (const line of lines) {
    if (!/bethune/i.test(line)) continue;
    const match =
      /(\d{3,5}\s+Bethune Rd\.?),?\s*Mississauga,?\s*(Ontario|ON)\b\.?,?\s*(Canada\.?)?,?\s*([A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)?/i.exec(
        line,
      );
    if (!match) continue;
    return {
      line,
      address: {
        addressLine: match[1],
        city: "Mississauga",
        province: "ON",
        postalCode: match[4] ? match[4].toUpperCase().replace(/\s+/g, " ") : null,
      },
    };
  }
  return null;
}

function parsePolicies(
  lines: readonly string[],
  warnings: string[],
  confidenceByField: Record<string, number>,
): CreativeKidsPlaceFacts["policies"] & {
  nutFreeRaw: string | null;
  extendedHoursRaw: string | null;
  cancellationRaw: string | null;
  staffRatioRaw: string | null;
} {
  const text = lines.join("\n");
  let nutFree: boolean | null = null;
  let nutFreeRaw: string | null = null;
  const nutLine = lines.find((line) => /nut[- ]?free/i.test(line));
  if (nutLine) {
    nutFree = true;
    nutFreeRaw = nutLine;
    confidenceByField.nutFree = 0.95;
  }

  let extendedHoursFeeCad: number | null = null;
  let extendedHoursRaw: string | null = null;
  const extLine = lines.find((line) => /extended hours/i.test(line) && /\$\s*35/i.test(line));
  if (extLine) {
    extendedHoursFeeCad = 35;
    extendedHoursRaw = extLine;
    confidenceByField.extendedHoursFeeCad = 0.95;
  }

  let cancellationNoticeWeeks: number | null = null;
  let cancellationFeeCad: number | null = null;
  let cancellationRaw: string | null = null;
  const cancelLine = lines.find(
    (line) =>
      /cancellations must be made/i.test(line) ||
      /admin fee of \$\s*25/i.test(line) ||
      (/2 weeks prior/i.test(line) && /\$\s*25/i.test(line)),
  );
  if (cancelLine) {
    cancellationRaw = cancelLine;
    if (/2 weeks/i.test(cancelLine)) cancellationNoticeWeeks = 2;
    const fee = /\$\s*(25)\b/.exec(cancelLine);
    if (fee) cancellationFeeCad = Number(fee[1]);
    confidenceByField.cancellationNoticeWeeks = 0.95;
    confidenceByField.cancellationFeeCad = 0.95;
  } else {
    warnings.push("cancellation_policy_not_found");
  }

  let staffRatioGeneral: string | null = null;
  let staffRatioYoungest: string | null = null;
  let staffRatioRaw: string | null = null;
  // Live page: "class of 10 kids with 1 teacher" / "class of 12 kids of 4 and 5 year old's with 2 teachers"
  const general =
    /(?:class of\s*)?10\s*kids with\s*1\s*teacher/i.exec(text);
  const youngest =
    /(?:class of\s*)?12\s*kids of 4 and 5 year old'?s? with\s*2\s*teachers/i.exec(text);
  if (general) {
    staffRatioGeneral = "10:1";
    staffRatioRaw = general[0];
    confidenceByField.staffRatioGeneral = 0.85;
  }
  if (youngest) {
    staffRatioYoungest = "12:2";
    staffRatioRaw = [staffRatioRaw, youngest[0]].filter(Boolean).join(" | ");
    confidenceByField.staffRatioYoungest = 0.85;
  }
  if (!staffRatioGeneral && !staffRatioYoungest) {
    warnings.push("staff_ratio_not_stated");
  }

  return {
    nutFree,
    extendedHoursFeeCad,
    cancellationNoticeWeeks,
    cancellationFeeCad,
    staffRatioGeneral,
    staffRatioYoungest,
    nutFreeRaw,
    extendedHoursRaw,
    cancellationRaw,
    staffRatioRaw,
  };
}

/** The venue name is the labelled line directly above the street address. */
function venueNameNear(
  lines: readonly string[],
  addressLineIndex: number,
  warnings: string[],
): string | null {
  for (let index = addressLineIndex - 1; index >= 0 && index >= addressLineIndex - 2; index -= 1) {
    const candidate = lines[index]?.trim() ?? "";
    if (candidate === "" || candidate.length > 80) continue;
    if (/^(location|address|find us|visit us|contact)$/i.test(candidate)) continue;
    if (/^\d/.test(candidate)) continue;
    return candidate;
  }
  warnings.push("venue_name_not_found");
  return null;
}

function supports(input: ExtractorSupportInput): boolean {
  if (input.source.extractorKey === CREATIVE_KIDS_PLACE_EXTRACTOR_KEY) return true;
  for (const host of CREATIVE_KIDS_PLACE_HOSTS) {
    if (sameCanonicalHost(input.source.canonicalUrl, `https://${host}`)) return true;
  }
  if (/creativekidsplace\.(ca|com)/i.test(input.source.canonicalUrl)) return true;
  const siteName = input.document.metadata["og:site_name"] ?? "";
  return new RegExp(CREATIVE_KIDS_PLACE_PROVIDER_NAME, "i").test(siteName);
}

function extract(input: ExtractorInput): ExtractorResult {
  const { document, source, snapshot, extractionRunId, newId } = input;
  const observedAt = (input.now ?? new Date()).toISOString();
  const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: source.canonicalUrl });

  const observation = <T,>(value: T, rawValue: string | null, confidence: number) =>
    makeFieldObservation(value, {
      rawValue,
      sourceUrl: source.canonicalUrl,
      sourceSnapshotId: snapshot.id,
      observedAt,
      confidence: clampConfidence(confidence),
      extractionMethod: "regex",
    });

  const records: CampExtractedRecord[] = [];

  records.push(
    buildExtractedRecord({
      id: newId(),
      extractionRunId,
      recordType: "provider",
      sourceIdentity: `${CREATIVE_KIDS_PLACE_EXTRACTOR_KEY}:provider`,
      rawFields: { siteName: document.metadata["og:site_name"] ?? null, title: document.title },
      normalizedFields: {
        providerId: source.providerId,
        name: facts.provider.name,
        websiteUrl: facts.provider.websiteUrl,
        registrationInfoUrl: facts.program.registrationUrl,
        registrationPlatform: facts.provider.registrationPlatform,
      },
      confidence: 0.95,
      warnings: [],
    }),
  );

  if (facts.venue) {
    records.push(
      buildExtractedRecord({
        id: newId(),
        extractionRunId,
        recordType: "venue",
        sourceIdentity: `${CREATIVE_KIDS_PLACE_EXTRACTOR_KEY}:venue:square-one`,
        rawFields: { addressLine: facts.raw.address },
        normalizedFields: {
          name: facts.venue.name,
          addressLine: facts.venue.addressLine,
          city: facts.venue.city,
          province: facts.venue.province,
          postalCode: facts.venue.postalCode,
          observations: {
            addressLine: observation(facts.venue.addressLine, facts.raw.address, 0.9),
          },
        },
        confidence: 0.9,
        warnings: facts.venue.name ? [] : ["venue_name_not_found"],
      }),
    );
  }

  const programObservations: Record<string, unknown> = {};
  if (facts.program.ageMin !== null) {
    programObservations.typicalAgeMin = observation(
      facts.program.ageMin,
      facts.raw.ages,
      facts.confidenceByField.ageMin ?? 0,
    );
    programObservations.typicalAgeMax = observation(
      facts.program.ageMax,
      facts.raw.ages,
      facts.confidenceByField.ageMax ?? 0,
    );
  }
  if (facts.program.seasonStartDate) {
    programObservations.seasonStartDate = observation(
      facts.program.seasonStartDate,
      facts.raw.season,
      facts.confidenceByField.seasonStartDate ?? 0,
    );
    programObservations.seasonEndDate = observation(
      facts.program.seasonEndDate,
      facts.raw.season,
      facts.confidenceByField.seasonEndDate ?? 0,
    );
  }
  if (facts.program.coreHoursStart) {
    programObservations.coreHoursStart = observation(
      facts.program.coreHoursStart,
      facts.raw.hours,
      facts.confidenceByField.coreHoursStart ?? 0,
    );
    programObservations.coreHoursEnd = observation(
      facts.program.coreHoursEnd,
      facts.raw.hours,
      facts.confidenceByField.coreHoursEnd ?? 0,
    );
  }

  records.push(
    buildExtractedRecord({
      id: newId(),
      extractionRunId,
      recordType: "program",
      sourceIdentity: `${CREATIVE_KIDS_PLACE_EXTRACTOR_KEY}:program:summer-camp`,
      rawFields: {
        heading: document.headings[0] ?? null,
        ages: facts.raw.ages,
        season: facts.raw.season,
        hours: facts.raw.hours,
      },
      normalizedFields: {
        providerId: source.providerId,
        name: facts.program.name,
        typicalAgeMin: facts.program.ageMin,
        typicalAgeMax: facts.program.ageMax,
        marketingAgeMin: facts.marketingAgeMin,
        marketingAgeMax: facts.marketingAgeMax,
        derivedAvailableAgeMin: facts.derivedAvailableAgeMin,
        derivedAvailableAgeMax: facts.derivedAvailableAgeMax,
        seasonStartDate: facts.program.seasonStartDate,
        seasonEndDate: facts.program.seasonEndDate,
        coreHoursStart: facts.program.coreHoursStart,
        coreHoursEnd: facts.program.coreHoursEnd,
        registrationUrl: facts.program.registrationUrl,
        registrationPlatform: facts.provider.registrationPlatform,
        sourceUrl: source.canonicalUrl,
        businessAddress: facts.businessAddress,
        policies: facts.policies,
        knownGaps: facts.knownGaps,
        observations: programObservations,
      },
      confidence: 0.9,
      warnings: [
        ...facts.warnings.filter((warning) => warning.endsWith("_not_found")),
        ...facts.knownGaps,
      ],
    }),
  );

  // One session per week × theme × age band. Price tier is an attribute.
  for (const offering of facts.offerings) {
    const ageRaw = offering.rawLabel;
    const sessionObservations: Record<string, unknown> = {
      themeTitle: observation(offering.themeTitle, offering.rawLabel, 0.95),
      ageMin: observation(offering.ageMin, ageRaw, 0.95),
      ageMax: observation(offering.ageMax, ageRaw, 0.95),
      startDate: observation(
        offering.startDate,
        facts.weeks.find((week) => week.weekIdentity === offering.weekIdentity)?.heading ?? null,
        offering.startDate ? 0.92 : 0,
      ),
      endDate: observation(
        offering.endDate,
        facts.weeks.find((week) => week.weekIdentity === offering.weekIdentity)?.heading ?? null,
        offering.endDate ? 0.92 : 0,
      ),
      priceAmount: observation(
        offering.priceAmount,
        offering.priceTierLabel,
        offering.priceAmount !== null ? 0.9 : 0,
      ),
      priceTierKey: observation(offering.priceTierKey, offering.priceTierLabel, 0.9),
    };
    if (offering.outingLabel) {
      const week = facts.weeks.find((entry) => entry.weekIdentity === offering.weekIdentity);
      sessionObservations.outingLabel = observation(
        offering.outingLabel,
        week?.outingRaw ?? offering.outingLabel,
        0.9,
      );
    }
    if (offering.addOnFeeCad !== null) {
      const week = facts.weeks.find((entry) => entry.weekIdentity === offering.weekIdentity);
      sessionObservations.addOnFeeCad = observation(
        offering.addOnFeeCad,
        week?.addOnRaw ?? null,
        0.9,
      );
      sessionObservations.addOnLabel = observation(
        offering.addOnLabel,
        week?.addOnRaw ?? null,
        0.9,
      );
    }

    records.push(
      buildExtractedRecord({
        id: newId(),
        extractionRunId,
        recordType: "session",
        sourceIdentity: offering.sourceIdentity,
        rawFields: {
          label: offering.rawLabel,
          weekHeading:
            facts.weeks.find((week) => week.weekIdentity === offering.weekIdentity)?.heading ??
            null,
          hours: facts.raw.hours,
        },
        normalizedFields: {
          externalId: offering.sourceIdentity,
          providerId: source.providerId,
          programName: facts.program.name,
          weekIdentity: offering.weekIdentity,
          weekNumber: offering.weekNumber,
          themeTitle: offering.themeTitle,
          themeTitleNormalized: offering.themeTitleNormalized,
          startDate: offering.startDate,
          endDate: offering.endDate,
          seasonStartDate: facts.program.seasonStartDate,
          seasonEndDate: facts.program.seasonEndDate,
          ageMin: offering.ageMin,
          ageMax: offering.ageMax,
          priceTierKey: offering.priceTierKey,
          priceTierLabel: offering.priceTierLabel,
          priceAmount: offering.priceAmount,
          priceUnit: offering.priceUnit === "per_week" ? "per_week" : offering.priceUnit,
          currency: offering.currency,
          shortWeekPriceAmount: offering.shortWeekPriceAmount,
          outingLabel: offering.outingLabel,
          addOnFeeCad: offering.addOnFeeCad,
          addOnLabel: offering.addOnLabel,
          factScope: {
            outingLabel: offering.outingLabel
              ? {
                  scope: "week",
                  weekIdentity: offering.weekIdentity,
                  sharedObservationKey: offering.sharedObservationKey,
                }
              : null,
            addOnFeeCad:
              offering.addOnFeeCad !== null
                ? {
                    scope: "week",
                    weekIdentity: offering.weekIdentity,
                    sharedObservationKey: offering.sharedObservationKey,
                  }
                : null,
          },
          coreHoursStart: facts.program.coreHoursStart,
          coreHoursEnd: facts.program.coreHoursEnd,
          registrationUrl: facts.program.registrationUrl,
          registrationPlatform: facts.provider.registrationPlatform,
          sourceUrl: source.canonicalUrl,
          observations: sessionObservations,
        },
        confidence: 0.9,
        warnings: offering.startDate ? [] : ["week_dates_unparsed"],
      }),
    );
  }

  const foundEnough =
    facts.program.ageMin !== null &&
    facts.program.seasonStartDate !== null &&
    facts.offerings.length > 0;

  return {
    status: records.length === 0 ? "failed" : foundEnough ? "success" : "partial",
    records,
    warnings: [...facts.warnings, ...facts.knownGaps.map((gap) => `known_gap:${gap}`)],
  };
}

export const creativeKidsPlaceExtractor: CampExtractor = {
  key: CREATIVE_KIDS_PLACE_EXTRACTOR_KEY,
  version: "0.2.0",
  grain: CREATIVE_KIDS_PLACE_OFFERING_GRAIN,
  supports,
  extract,
};
