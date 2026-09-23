/**
 * Nutty Scientists Canada (Vic Johnson Community Center, Mississauga) extractor.
 *
 * First multi-provider proof (Prompt 9B-A). It knows the shape of this
 * provider's official summer-camp page — two age bands, month/day week
 * windows with no stated year, core hours, 1-day / 1-week / 2-week fee
 * rows as attributes, Vic Johnson venue, and age-band Google Forms links —
 * and reads exactly those facts.
 *
 * Data-truth:
 * - Do not invent a calendar year. ISO start/end stay null with `year_not_stated`.
 * - Do not infer ages. Session eligibility is the stated 5–7 and 8–10 bands.
 * - Grain is one offering per week window × the age band that week names
 *   (gold: 8 week windows / 8 offerings). Price is a semantic fact, not identity.
 * - Google Forms hrefs are link facts only — this extractor never fetches them.
 * - "Few spots left" is retained as source copy. It is not a numeric seat
 *   count, not confirmed_available/full, and not registrationStatus.
 * - registrationStatus is not inferred from scarcity copy.
 * - CampSession.priceAmount can hold one amount. Weekly grain uses the
 *   stated 1-week price. 2-week and 1-day rows stay on the extracted
 *   program record (rawFields / observations / feeRows) and are not dropped.
 *
 * Identity (stable semantic facts, not HTML order):
 *   nutty_scientists:session:{MM-DD}_{MM-DD}:{ageMin}-{ageMax}
 *
 * KNOWN 9B-A LIMITATION — yearless annual collision:
 * Same month/day + age band in a later year, still with no stated year,
 * keeps the same sourceIdentity. If other fingerprinted facts are also
 * unchanged, camp-facts-v1 reports unchanged. Do not invent a year.
 *
 * Offline benchmark: `data/camps/ingestion/benchmarks/nutty-scientists-summercamp.html`
 * with expected facts in `nutty-scientists.expected.json`.
 */

import type {
  CampCurrency,
  CampExtractedRecord,
  CleanSourceDocument,
  PriceUnit,
  RegistrationPlatform,
} from "@/data/camps/ingestion/types";
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
import { NUTTY_SCIENTISTS_OFFERING_GRAIN } from "@/lib/camps/ingestion/extractors/offeringGrain";
import {
  documentLines,
  findAddress,
  findTimeRange,
  statedDocumentYear,
  type ParsedAddress,
} from "@/lib/camps/ingestion/extractors/textScan";
import { normalizePriceCad } from "@/lib/camps/ingestion/normalize/price";
import { normalizeTimeRange } from "@/lib/camps/ingestion/normalize/timeRange";
import { normalizeRegistrationPlatform } from "@/lib/camps/ingestion/normalize/registrationPlatform";
import {
  NUTTY_SCIENTISTS_EXTRACTOR_KEY,
  parseNuttyScientistsSchedule,
  repairNuttySourceText,
  type NuttyOffering,
} from "@/lib/camps/ingestion/extractors/nuttyScientistsSchedule";

export { NUTTY_SCIENTISTS_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/nuttyScientistsSchedule";
export {
  nuttySessionSourceIdentity,
  nuttyWeekIdentity,
  parseNuttyWeekWindows,
  parseNuttyScientistsSchedule,
  repairNuttySourceText,
} from "@/lib/camps/ingestion/extractors/nuttyScientistsSchedule";

export const NUTTY_SCIENTISTS_PROVIDER_NAME = "Nutty Scientists Canada";
export const NUTTY_SCIENTISTS_HOST = "nuttyscientistscanada.ca";
export const NUTTY_SCIENTISTS_HOSTS = [
  "nuttyscientistscanada.ca",
  "www.nuttyscientistscanada.ca",
] as const;
export const NUTTY_SCIENTISTS_PROGRAM_NAME = "Nutty Summer Science Camp";
export const NUTTY_SCIENTISTS_VENUE_NAME = "Vic Johnson Community Center";

const PRICE_TIER_RULES: ReadonlyArray<{
  key: string;
  label: string;
  unit: PriceUnit;
  pattern: RegExp;
}> = [
  { key: "two_week", label: "2 WEEK", unit: "other", pattern: /\bfor\s+2\s*weeks?\b/i },
  { key: "one_week", label: "1 WEEK", unit: "per_week", pattern: /\bfor\s+1\s*weeks?\b/i },
  { key: "one_day", label: "1 DAY", unit: "per_day", pattern: /\bfor\s+1\s*days?\b/i },
];

export type NuttyScientistsPriceTier = {
  key: string;
  label: string;
  priceAmount: number | null;
  priceUnit: PriceUnit | null;
  currency: CampCurrency;
  taxExtra: boolean;
  rawFee: string;
};

export type NuttyScientistsFacts = {
  provider: {
    name: string;
    websiteUrl: string | null;
    registrationPlatform: RegistrationPlatform;
  };
  venue: ({ name: string | null; neighbourhood: string | null } & ParsedAddress) | null;
  program: {
    name: string | null;
    ageMin: number | null;
    ageMax: number | null;
    seasonStartDate: null;
    seasonEndDate: null;
    coreHoursStart: string | null;
    coreHoursEnd: string | null;
    registrationUrl: null;
  };
  priceTiers: NuttyScientistsPriceTier[];
  marketingAgeMin: number | null;
  marketingAgeMax: number | null;
  derivedAvailableAgeMin: number | null;
  derivedAvailableAgeMax: number | null;
  weeks: NuttyScientistsFactsWeeks;
  offerings: NuttyOffering[];
  businessAddress: ({ name: string | null } & ParsedAddress) | null;
  policies: {
    walkInRegistrationHonored: boolean | null;
    lunchPackedByCamper: boolean | null;
    fourWeekDiscountPercent: number | null;
    siblingOrGroupDiscountPercent: number | null;
    siblingOrGroupDiscountExcludesOneWeek: boolean | null;
    creditCardProcessingPercent: number | null;
    extendedCareFeeCadOneStudent: number | null;
    extendedCareFeeCadGroup: number | null;
    extendedCareStart: string | null;
    extendedCareEnd: string | null;
    feeRows: string[];
  };
  raw: {
    ages: string | null;
    hours: string | null;
    address: string | null;
    businessAddress: string | null;
    extendedCare: string | null;
    /** Explicit scarcity wording. Not a seat count. */
    scarcityCopy: string[];
  };
  confidenceByField: Record<string, number>;
  warnings: string[];
  knownGaps: string[];
};

type NuttyScientistsFactsWeeks = Array<{
  weekNumber: number;
  weekIdentity: string;
  listedDateWindow: string;
  startDate: null;
  endDate: null;
}>;

export type ParseNuttyScientistsOptions = {
  sourceUrl?: string | null;
};

export function parseNuttyScientistsFacts(
  document: CleanSourceDocument,
  options: ParseNuttyScientistsOptions = {},
): NuttyScientistsFacts {
  const lines = documentLines(document).map(repairNuttySourceText);
  const warnings: string[] = [];
  const confidenceByField: Record<string, number> = {};
  const knownGaps: string[] = [];

  const documentYear = statedDocumentYear(document);
  if (documentYear !== null) {
    warnings.push(`document_year_stated:${documentYear}`);
  } else {
    warnings.push("year_not_stated");
  }

  const schedule = parseNuttyScientistsSchedule(lines, {
    registrationLinks: document.links,
  });
  warnings.push(...schedule.warnings);
  if (schedule.offerings.some((offering) => offering.startDate === null)) {
    warnings.push("session_iso_dates_unparsed_year_not_stated");
  }

  const hoursHit = findCoreHours(lines);
  if (!hoursHit) warnings.push("daily_hours_not_found");
  else {
    confidenceByField.coreHoursStart = hoursHit.confidence;
    confidenceByField.coreHoursEnd = hoursHit.confidence;
  }

  const priceTiers = parsePriceTiers(lines, warnings, confidenceByField);
  if (priceTiers.length === 0) warnings.push("fee_table_not_found");

  const googleFormLinks = document.links.filter((link) =>
    /forms\.gle|docs\.google\.com\/forms/i.test(link.href),
  );
  if (googleFormLinks.length === 0) warnings.push("registration_link_not_found");
  const registrationPlatform = normalizeRegistrationPlatform({
    links: document.links,
    text: document.text,
  });
  if (!registrationPlatform) warnings.push("registration_platform_not_identified");

  const venueHit = findCampVenue(lines);
  if (!venueHit) warnings.push("venue_address_not_found");

  const businessHit = findBusinessAddress(lines);

  const policies = parsePolicies(lines, warnings);
  const scarcityCopy = lines.filter((line) => /few spots left/i.test(line));

  if (
    !/\b(?:staff|counsellor|counselor|teacher)s?\b[\s\S]{0,60}\b(?:background check|vulnerable sector|screening)\b/i.test(
      document.text,
    )
  ) {
    knownGaps.push("own_counsellor_background_screening_policy_not_stated");
  }
  if (!/\banaphylaxis\b|\bepi[- ]?pen\b/i.test(document.text)) {
    knownGaps.push("anaphylaxis_epipen_protocol_not_stated");
  }
  if (!/\bfirst aid\b|\bcpr\b/i.test(document.text)) {
    knownGaps.push("staff_first_aid_cpr_certification_not_stated");
  }

  const ageLine =
    lines.find((line) => /^age groups:/i.test(line)) ??
    lines.find((line) => /for age group/i.test(line)) ??
    null;

  const providerName =
    document.metadata["og:site_name"]?.trim() ||
    (document.headings.find((heading) => /nutty scientists/i.test(heading)) ?? null) ||
    NUTTY_SCIENTISTS_PROVIDER_NAME;

  const programName = /nutty summer science camp/i.test(document.text)
    ? NUTTY_SCIENTISTS_PROGRAM_NAME
    : (document.headings[0]?.trim() ?? document.title?.trim() ?? null);

  return {
    provider: {
      name: providerName,
      websiteUrl: document.metadata.canonical ?? options.sourceUrl ?? null,
      registrationPlatform,
    },
    venue: venueHit
      ? {
          name: venueHit.name,
          neighbourhood: venueHit.neighbourhood,
          addressLine: venueHit.address.addressLine,
          city: venueHit.address.city,
          province: venueHit.address.province,
          postalCode: venueHit.address.postalCode,
        }
      : null,
    businessAddress: businessHit
      ? {
          name: "Nutty Scientists Canada (business address)",
          addressLine: businessHit.address.addressLine,
          city: businessHit.address.city,
          province: businessHit.address.province,
          postalCode: businessHit.address.postalCode,
        }
      : null,
    program: {
      name: programName,
      ageMin: schedule.derivedAvailableAgeMin,
      ageMax: schedule.derivedAvailableAgeMax,
      seasonStartDate: null,
      seasonEndDate: null,
      coreHoursStart: hoursHit?.startTime ?? null,
      coreHoursEnd: hoursHit?.endTime ?? null,
      registrationUrl: null,
    },
    priceTiers,
    marketingAgeMin: null,
    marketingAgeMax: null,
    derivedAvailableAgeMin: schedule.derivedAvailableAgeMin,
    derivedAvailableAgeMax: schedule.derivedAvailableAgeMax,
    weeks: schedule.weeks,
    offerings: schedule.offerings,
    policies: policies.value,
    raw: {
      ages: ageLine,
      hours: hoursHit?.line ?? null,
      address: venueHit?.line ?? null,
      businessAddress: businessHit?.line ?? null,
      extendedCare: policies.extendedCareRaw,
      scarcityCopy,
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
): NuttyScientistsPriceTier[] {
  const tiers: NuttyScientistsPriceTier[] = [];
  for (const rule of PRICE_TIER_RULES) {
    const line = lines.find((candidate) => rule.pattern.test(candidate));
    if (!line) {
      warnings.push(`fee_not_found_for_${rule.key}`);
      continue;
    }
    const price = normalizePriceCad(line);
    if (price.value.amount === null) {
      warnings.push(`fee_not_found_for_${rule.key}`);
      continue;
    }
    warnings.push(
      ...price.warnings.filter((warning) => warning !== "multiple_amounts_found_using_first"),
    );
    confidenceByField[`priceAmount:${rule.key}`] = price.confidence;
    tiers.push({
      key: rule.key,
      label: rule.label,
      priceAmount: price.value.amount,
      priceUnit: rule.unit,
      currency: price.value.currency,
      taxExtra: price.value.taxExtra,
      rawFee: line.replace(/\s+/g, " ").trim(),
    });
  }
  return tiers;
}

function findCoreHours(
  lines: readonly string[],
): { startTime: string; endTime: string; line: string; confidence: number } | null {
  const labelled = lines.find((line) => /^time\s*:/i.test(line));
  if (labelled) {
    const result = normalizeTimeRange(labelled);
    if (result.value.startTime && result.value.endTime) {
      return {
        startTime: result.value.startTime,
        endTime: result.value.endTime,
        line: labelled,
        confidence: result.confidence,
      };
    }
  }
  const fallback = findTimeRange(lines);
  if (fallback?.result.value.startTime && fallback.result.value.endTime) {
    return {
      startTime: fallback.result.value.startTime,
      endTime: fallback.result.value.endTime,
      line: fallback.line,
      confidence: fallback.result.confidence,
    };
  }
  return null;
}

function findCampVenue(lines: readonly string[]): {
  name: string;
  neighbourhood: string | null;
  address: ParsedAddress;
  line: string;
} | null {
  const line =
    lines.find((candidate) =>
      /335\s+church\s+st/i.test(candidate) && /mississauga/i.test(candidate),
    ) ?? lines.find((candidate) => /335\s+church\s+st/i.test(candidate));
  if (!line) return null;

  const churchLines = lines.filter((candidate) => /335\s+church\s+st/i.test(candidate));
  const evidence = churchLines.join(" ");
  const postal =
    /\b([A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)\b/.exec(evidence)?.[1]?.toUpperCase() ?? null;
  const neighbourhood = /\bstreetsville\b/i.test(evidence) ? "Streetsville" : null;
  const provinceMatch = /\bON\b|\bOntario\b/i.exec(evidence);
  const province = provinceMatch
    ? /ontario/i.test(provinceMatch[0])
      ? "ON"
      : provinceMatch[0].toUpperCase()
    : "";
  return {
    name: NUTTY_SCIENTISTS_VENUE_NAME,
    neighbourhood,
    address: {
      addressLine: "335 Church St",
      city: "Mississauga",
      province,
      postalCode: postal ? postal.replace(/\s+/g, " ") : null,
    },
    line,
  };
}

function findBusinessAddress(
  lines: readonly string[],
): { address: ParsedAddress; line: string } | null {
  const hit = findAddress(lines);
  if (!hit) return null;
  if (/335\s+church/i.test(hit.line)) return null;
  return { address: hit.address, line: hit.line };
}

function parsePolicies(
  lines: readonly string[],
  warnings: string[],
): {
  value: NuttyScientistsFacts["policies"];
  extendedCareRaw: string | null;
} {
  const joined = lines.join("\n");
  const walkInLine = lines.find((line) => /no walk-?in/i.test(line));
  const lunchLine = lines.find((line) => /bring their own lunch/i.test(line));
  const discountLine = lines.find((line) => /20\s*%\s*off/i.test(line) && /4 weeks/i.test(line));
  const extendedLine = lines.find((line) => /early drop off/i.test(line) && /\$20/i.test(line));

  let extendedCareStart: string | null = null;
  let extendedCareEnd: string | null = null;
  let extendedCareFeeCadOneStudent: number | null = null;
  let extendedCareFeeCadGroup: number | null = null;
  if (extendedLine) {
    const times = normalizeTimeRange(repairNuttySourceText(extendedLine));
    extendedCareStart = times.value.startTime;
    extendedCareEnd = times.value.endTime;
    const twenty = /\$\s*20(?:\.00)?/.exec(extendedLine);
    const ten = /\$\s*10(?:\.00)?/.exec(extendedLine);
    if (twenty) extendedCareFeeCadOneStudent = 20;
    if (ten) extendedCareFeeCadGroup = 10;
    warnings.push(...times.warnings.filter((warning) => warning !== "extra_times_ignored"));
  }

  const fourWeek = discountLine ? /20\s*%/.exec(discountLine) : null;
  const sibling = discountLine ? /5\s*%/.exec(discountLine) : null;
  const processing = /8\s*%\s*processing/i.exec(joined);

  return {
    extendedCareRaw: extendedLine ?? null,
    value: {
      walkInRegistrationHonored: walkInLine ? false : null,
      lunchPackedByCamper: lunchLine ? true : null,
      fourWeekDiscountPercent: fourWeek ? 20 : null,
      siblingOrGroupDiscountPercent: sibling ? 5 : null,
      siblingOrGroupDiscountExcludesOneWeek: discountLine
        ? /not applicable to one week/i.test(discountLine)
        : null,
      creditCardProcessingPercent: processing ? 8 : null,
      extendedCareFeeCadOneStudent,
      extendedCareFeeCadGroup,
      extendedCareStart,
      extendedCareEnd,
      feeRows: lines.filter((line) => /\bfor\s+\d\s*(week|day)/i.test(line) && /\$/.test(line)),
    },
  };
}

function weeklyPrice(facts: NuttyScientistsFacts): NuttyScientistsPriceTier | null {
  return facts.priceTiers.find((tier) => tier.key === "one_week") ?? null;
}

function supports(input: ExtractorSupportInput): boolean {
  if (input.source.extractorKey === NUTTY_SCIENTISTS_EXTRACTOR_KEY) return true;
  for (const host of NUTTY_SCIENTISTS_HOSTS) {
    if (sameCanonicalHost(input.source.canonicalUrl, `https://${host}`)) return true;
  }
  if (/nuttyscientistscanada\.ca/i.test(input.source.canonicalUrl)) return true;
  const siteName = input.document.metadata["og:site_name"] ?? "";
  return new RegExp(NUTTY_SCIENTISTS_PROVIDER_NAME, "i").test(siteName);
}

function extract(input: ExtractorInput): ExtractorResult {
  const { document, source, snapshot, extractionRunId, newId } = input;
  const observedAt = (input.now ?? new Date()).toISOString();
  const facts = parseNuttyScientistsFacts(document, { sourceUrl: source.canonicalUrl });

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
  const weekPrice = weeklyPrice(facts);

  records.push(
    buildExtractedRecord({
      id: newId(),
      extractionRunId,
      recordType: "provider",
      sourceIdentity: `${NUTTY_SCIENTISTS_EXTRACTOR_KEY}:provider`,
      rawFields: { siteName: document.metadata["og:site_name"] ?? null, title: document.title },
      normalizedFields: {
        providerId: source.providerId,
        name: facts.provider.name,
        websiteUrl: facts.provider.websiteUrl,
        registrationInfoUrl: null,
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
        sourceIdentity: `${NUTTY_SCIENTISTS_EXTRACTOR_KEY}:venue:vic-johnson-community-center`,
        rawFields: { addressLine: facts.raw.address },
        normalizedFields: {
          name: facts.venue.name,
          addressLine: facts.venue.addressLine,
          neighbourhood: facts.venue.neighbourhood,
          city: facts.venue.city,
          province: facts.venue.province,
          postalCode: facts.venue.postalCode,
          observations: {
            addressLine: observation(facts.venue.addressLine, facts.raw.address, 0.9),
          },
        },
        confidence: 0.9,
        warnings: facts.venue.postalCode ? [] : ["venue_postal_code_not_found"],
      }),
    );
  }

  const programObservations: Record<string, unknown> = {};
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
  for (const tier of facts.priceTiers) {
    programObservations[`priceTier:${tier.key}`] = observation(
      {
        key: tier.key,
        priceAmount: tier.priceAmount,
        priceUnit: tier.priceUnit,
        taxExtra: tier.taxExtra,
      },
      tier.rawFee,
      facts.confidenceByField[`priceAmount:${tier.key}`] ?? 0.9,
    );
  }
  if (facts.raw.scarcityCopy.length > 0) {
    programObservations.scarcityCopy = observation(
      facts.raw.scarcityCopy,
      facts.raw.scarcityCopy.join(" | "),
      0.95,
    );
  }

  records.push(
    buildExtractedRecord({
      id: newId(),
      extractionRunId,
      recordType: "program",
      sourceIdentity: `${NUTTY_SCIENTISTS_EXTRACTOR_KEY}:program:summer-science-camp`,
      rawFields: {
        heading: document.headings[0] ?? null,
        ages: facts.raw.ages,
        hours: facts.raw.hours,
        priceTiers: facts.priceTiers,
        scarcityCopy: facts.raw.scarcityCopy,
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
        /**
         * Not a CampSession field. Weekly grain uses one_week on sessions;
         * 2-week and 1-day remain here so they are not dropped.
         */
        priceTiers: facts.priceTiers,
        knownGaps: facts.knownGaps,
        observations: programObservations,
      },
      confidence: 0.9,
      warnings: [
        ...facts.warnings.filter((warning) => warning.endsWith("_not_found") || warning === "year_not_stated"),
        ...facts.knownGaps,
      ],
    }),
  );

  for (const offering of facts.offerings) {
    const sessionObservations: Record<string, unknown> = {
      ageMin: observation(offering.ageMin, offering.ageRaw, 0.95),
      ageMax: observation(offering.ageMax, offering.ageRaw, 0.95),
      weekIdentity: observation(offering.weekIdentity, offering.listedDateWindow, 0.95),
      listedDateWindow: observation(offering.listedDateWindow, offering.listedDateWindow, 0.95),
    };
    if (weekPrice?.priceAmount != null) {
      sessionObservations.priceAmount = observation(
        weekPrice.priceAmount,
        weekPrice.rawFee,
        facts.confidenceByField["priceAmount:one_week"] ?? 0.9,
      );
    }
    if (offering.registrationUrl) {
      sessionObservations.registrationUrl = observation(
        offering.registrationUrl,
        offering.registrationUrl,
        0.95,
      );
    }
    if (facts.raw.scarcityCopy.length > 0) {
      sessionObservations.scarcityCopy = observation(
        facts.raw.scarcityCopy,
        facts.raw.scarcityCopy.join(" | "),
        0.95,
      );
    }

    records.push(
      buildExtractedRecord({
        id: newId(),
        extractionRunId,
        recordType: "session",
        sourceIdentity: offering.sourceIdentity,
        rawFields: {
          listedDateWindow: offering.listedDateWindow,
          ageRaw: offering.ageRaw,
          hours: facts.raw.hours,
          priceTiers: facts.priceTiers,
          scarcityCopy: facts.raw.scarcityCopy,
        },
        normalizedFields: {
          externalId: offering.sourceIdentity,
          providerId: source.providerId,
          programName: facts.program.name,
          weekIdentity: offering.weekIdentity,
          weekNumber: offering.weekNumber,
          themeTitle: null,
          themeTitleNormalized: null,
          startDate: offering.startDate,
          endDate: offering.endDate,
          listedDateWindow: offering.listedDateWindow,
          seasonStartDate: facts.program.seasonStartDate,
          seasonEndDate: facts.program.seasonEndDate,
          ageMin: offering.ageMin,
          ageMax: offering.ageMax,
          priceTierKey: weekPrice?.key ?? "one_week",
          priceTierLabel: weekPrice?.label ?? "1 WEEK",
          priceAmount: weekPrice?.priceAmount ?? null,
          priceUnit: weekPrice?.priceUnit ?? "per_week",
          currency: weekPrice?.currency ?? "CAD",
          shortWeekPriceAmount: null,
          outingLabel: null,
          addOnFeeCad: null,
          addOnLabel: null,
          coreHoursStart: facts.program.coreHoursStart,
          coreHoursEnd: facts.program.coreHoursEnd,
          registrationUrl: offering.registrationUrl,
          registrationPlatform: facts.provider.registrationPlatform,
          registrationStatus: null,
          seatAvailability: null,
          sourceUrl: source.canonicalUrl,
          observations: sessionObservations,
        },
        confidence: 0.9,
        warnings: [
          "year_not_stated",
          "session_iso_dates_unparsed_year_not_stated",
          ...(facts.raw.scarcityCopy.length > 0
            ? ["scarcity_copy_not_mapped_to_seat_availability"]
            : []),
        ],
      }),
    );
  }

  const foundEnough = facts.offerings.length > 0 && facts.venue !== null;
  return {
    status: records.length === 0 ? "failed" : foundEnough ? "success" : "partial",
    records,
    warnings: [...facts.warnings, ...facts.knownGaps.map((gap) => `known_gap:${gap}`)],
  };
}

export const nuttyScientistsExtractor: CampExtractor = {
  key: NUTTY_SCIENTISTS_EXTRACTOR_KEY,
  version: "0.1.0",
  grain: NUTTY_SCIENTISTS_OFFERING_GRAIN,
  supports,
  extract,
};
