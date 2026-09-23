/**
 * The Riverwood Conservancy (Camp Riverwood) extractor.
 *
 * Third structurally different provider on the existing Camps pipeline
 * (Prompt 9B-B). It knows the shape of the official summer-camp HTML page —
 * eight labelled weeks (Week 1 splits into two short windows), Grades 1–6
 * completed, $360 / $450 per child, SOLD OUT copy, enrolment cap of 16,
 * 9:00 am–3:30 pm, Chappell House, and an explicit no-care statement — and
 * reads exactly those facts.
 *
 * Data-truth:
 * - Do not invent a calendar year. ISO start/end stay null with `year_not_stated`.
 *   Footer copyright, PDF href years, and WordPress asset paths are not a year.
 * - Do not convert grades to ages. ageMin / ageMax stay null.
 * - Grain is one offering per date window (gold: 9 windows / 9 offerings from
 *   8 labelled weeks because Week 1 is discontinuous). Price is not identity.
 * - SOLD OUT maps to seatAvailability=confirmed_full. It is not a seat count
 *   and does not set registrationStatus.
 * - `$360` / `$450` amounts are kept. Currency stays unknown: the HTML does not
 *   state CAD, and this extractor does not adopt the generic `$`→CAD assumption.
 * - Capacity 16 is a source enrolment cap, not remaining seats.
 * - The Information Guide PDF href is recorded as a coverage gap and is never
 *   fetched. HTML is the only 9B-B source.
 * - "We will not provide pre- or post-camp care" is explicit negative truth.
 *
 * Identity (stable semantic facts, not HTML order):
 *   riverwood_conservancy:session:{MM-DD}_{MM-DD}
 *
 * KNOWN 9B-B LIMITATION — yearless annual collision:
 * Same month/day window in a later year, still with no stated year, keeps the
 * same sourceIdentity. If other fingerprinted facts are also unchanged,
 * camp-facts-v1 reports unchanged. Do not invent a year.
 *
 * Offline benchmark: `data/camps/ingestion/benchmarks/riverwood-conservancy-summercamp.html`
 * with expected facts in `riverwood-conservancy.expected.json`.
 */

import type {
  CampExtractedRecord,
  CleanSourceDocument,
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
import { RIVERWOOD_CONSERVANCY_OFFERING_GRAIN } from "@/lib/camps/ingestion/extractors/offeringGrain";
import {
  documentLines,
  statedDocumentYear,
} from "@/lib/camps/ingestion/extractors/textScan";
import { normalizeTimeRange } from "@/lib/camps/ingestion/normalize/timeRange";
import { normalizeAgeRange } from "@/lib/camps/ingestion/normalize/ageRange";
import {
  RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY,
  parseRiverwoodGradeEligibility,
  parseRiverwoodSchedule,
  type RiverwoodOffering,
} from "@/lib/camps/ingestion/extractors/riverwoodConservancySchedule";

export { RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/riverwoodConservancySchedule";
export {
  riverwoodSessionSourceIdentity,
  parseRiverwoodSchedule,
  parseRiverwoodGradeEligibility,
  isRiverwoodShortWindow,
  riverwoodWindowDayCount,
  RIVERWOOD_INFORMATION_GUIDE_PDF_HREF,
} from "@/lib/camps/ingestion/extractors/riverwoodConservancySchedule";

export const RIVERWOOD_CONSERVANCY_PROVIDER_NAME = "The Riverwood Conservancy";
export const RIVERWOOD_CONSERVANCY_HOST = "theriverwoodconservancy.org";
export const RIVERWOOD_CONSERVANCY_HOSTS = [
  "theriverwoodconservancy.org",
  "www.theriverwoodconservancy.org",
] as const;
export const RIVERWOOD_CONSERVANCY_PROGRAM_NAME = "Camp Riverwood";
export const RIVERWOOD_CONSERVANCY_VENUE_NAME = "Chappell House";

export type RiverwoodConservancyFacts = {
  provider: {
    name: string;
    websiteUrl: string | null;
    registrationPlatform: RegistrationPlatform;
  };
  venue: {
    name: string;
    addressLine: string;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    neighbourhood: string | null;
  } | null;
  program: {
    name: string;
    ageMin: null;
    ageMax: null;
    seasonStartDate: null;
    seasonEndDate: null;
    coreHoursStart: string | null;
    coreHoursEnd: string | null;
    registrationUrl: null;
  };
  gradeEligibility: {
    gradeMin: number;
    gradeMax: number;
    copy: string;
  } | null;
  enrolmentCapPerWeek: number | null;
  prePostCampCareOffered: false | null;
  latePickupFeeCopy: string | null;
  informationGuidePdfUrl: string | null;
  weeks: ReturnType<typeof parseRiverwoodSchedule>["weeks"];
  offerings: RiverwoodOffering[];
  policies: {
    gradeMin: number | null;
    gradeMax: number | null;
    gradeEligibilityCopy: string | null;
    enrolmentCapPerWeek: number | null;
    soldOutCopy: string[];
    prePostCampCareOffered: false | null;
    latePickupFeeCopy: string | null;
    lunchPackedByCamper: true | null;
    camperToStaffRatioCopy: string | null;
  };
  raw: {
    grades: string | null;
    hours: string | null;
    address: string | null;
    enrolmentCap: string | null;
    care: string | null;
    soldOutCopy: string[];
  };
  confidenceByField: Record<string, number>;
  warnings: string[];
  knownGaps: string[];
};

export function parseRiverwoodConservancyFacts(
  document: CleanSourceDocument,
  options: { sourceUrl?: string | null } = {},
): RiverwoodConservancyFacts {
  const lines = documentLines(document);
  const warnings: string[] = [];
  const knownGaps: string[] = [];
  const confidenceByField: Record<string, number> = {};

  const documentYear = statedDocumentYear(document);
  if (documentYear === null) {
    warnings.push("year_not_stated");
    knownGaps.push("session_iso_dates_unparsed_year_not_stated");
  } else {
    warnings.push("stated_document_year_ignored_until_date_lines_include_year");
  }

  const schedule = parseRiverwoodSchedule(lines);
  warnings.push(...schedule.warnings);

  const gradeLine =
    lines.find((line) => /completed grade/i.test(line)) ??
    lines.find((line) => /\bgrade\s+\d/i.test(line)) ??
    null;
  const gradeEligibility = gradeLine ? parseRiverwoodGradeEligibility(gradeLine) : null;
  if (gradeLine) {
    const ageAttempt = normalizeAgeRange(gradeLine);
    if (ageAttempt.value.ageMin !== null || ageAttempt.value.ageMax !== null) {
      warnings.push("grade_copy_must_not_become_ages");
    }
  }
  if (gradeEligibility) {
    confidenceByField.gradeMin = 0.95;
    confidenceByField.gradeMax = 0.95;
  } else {
    warnings.push("grade_eligibility_not_found");
  }

  const hoursHit = findCoreHours(lines);
  if (hoursHit) {
    confidenceByField.coreHoursStart = hoursHit.confidence;
    confidenceByField.coreHoursEnd = hoursHit.confidence;
  } else {
    warnings.push("hours_not_found");
  }

  const venueHit = findCampVenue(lines);
  if (!venueHit) warnings.push("venue_not_found");

  const enrolmentHit = findEnrolmentCap(lines);
  if (enrolmentHit) {
    confidenceByField.enrolmentCapPerWeek = 0.95;
  } else {
    warnings.push("enrolment_cap_not_found");
  }

  const careLine = lines.find((line) => /will not provide pre- or post-camp care/i.test(line));
  const latePickupFeeCopy = careLine ? careLine.replace(/\s+/g, " ").trim() : null;
  if (!careLine) warnings.push("care_policy_not_found");

  const lunchLine = lines.find((line) => /bring their own nut-free lunch/i.test(line));
  const staffRatioLine = lines.find((line) => /camper to staff ratio/i.test(line));

  const pdfUrl = findInformationGuidePdf(document);
  if (pdfUrl) {
    knownGaps.push("camp_information_guide_pdf_not_fetched");
  }

  knownGaps.push("no_registration_url_on_html");
  if (enrolmentHit) {
    knownGaps.push("session_capacity_field_not_on_camp_session_contract");
  }
  knownGaps.push("grades_not_converted_to_ages");

  const soldOutCopy = [
    ...new Set(
      schedule.offerings
        .filter((offering) => offering.soldOut)
        .map((offering) => offering.listedWeekLine),
    ),
  ].sort();

  return {
    provider: {
      name: RIVERWOOD_CONSERVANCY_PROVIDER_NAME,
      websiteUrl: document.metadata.canonical ?? options.sourceUrl ?? null,
      registrationPlatform: null,
    },
    venue: venueHit
      ? {
          name: venueHit.name,
          addressLine: venueHit.addressLine,
          city: null,
          province: null,
          postalCode: null,
          neighbourhood: null,
        }
      : null,
    program: {
      name: RIVERWOOD_CONSERVANCY_PROGRAM_NAME,
      ageMin: null,
      ageMax: null,
      seasonStartDate: null,
      seasonEndDate: null,
      coreHoursStart: hoursHit?.startTime ?? null,
      coreHoursEnd: hoursHit?.endTime ?? null,
      registrationUrl: null,
    },
    gradeEligibility,
    enrolmentCapPerWeek: enrolmentHit?.cap ?? null,
    prePostCampCareOffered: careLine ? false : null,
    latePickupFeeCopy,
    informationGuidePdfUrl: pdfUrl,
    weeks: schedule.weeks,
    offerings: schedule.offerings,
    policies: {
      gradeMin: gradeEligibility?.gradeMin ?? null,
      gradeMax: gradeEligibility?.gradeMax ?? null,
      gradeEligibilityCopy: gradeEligibility?.copy ?? null,
      enrolmentCapPerWeek: enrolmentHit?.cap ?? null,
      soldOutCopy,
      prePostCampCareOffered: careLine ? false : null,
      latePickupFeeCopy,
      lunchPackedByCamper: lunchLine ? true : null,
      camperToStaffRatioCopy: staffRatioLine?.replace(/\s+/g, " ").trim() ?? null,
    },
    raw: {
      grades: gradeEligibility?.copy ?? gradeLine,
      hours: hoursHit?.line ?? null,
      address: venueHit?.line ?? null,
      enrolmentCap: enrolmentHit?.line ?? null,
      care: careLine?.replace(/\s+/g, " ").trim() ?? null,
      soldOutCopy,
    },
    confidenceByField,
    warnings: [...new Set(warnings)],
    knownGaps: [...new Set(knownGaps)],
  };
}

function findCoreHours(
  lines: readonly string[],
): { startTime: string; endTime: string; line: string; confidence: number } | null {
  const labelled = lines.find((line) => /camp runs from/i.test(line));
  if (!labelled) return null;
  const result = normalizeTimeRange(labelled);
  if (result.value.startTime && result.value.endTime) {
    return {
      startTime: result.value.startTime,
      endTime: result.value.endTime,
      line: labelled.replace(/\s+/g, " ").trim(),
      confidence: result.confidence,
    };
  }
  return null;
}

function findCampVenue(
  lines: readonly string[],
): { name: string; addressLine: string; line: string } | null {
  const line = lines.find(
    (candidate) => /chappell house/i.test(candidate) && /riverwood park lane/i.test(candidate),
  );
  if (!line) return null;
  const address = /(\d{3,5}\s+Riverwood Park Lane)/i.exec(line);
  return {
    name: RIVERWOOD_CONSERVANCY_VENUE_NAME,
    addressLine: address?.[1] ?? "4300 Riverwood Park Lane",
    line: line.replace(/\s+/g, " ").trim(),
  };
}

function findEnrolmentCap(lines: readonly string[]): { cap: number; line: string } | null {
  const line = lines.find((candidate) => /enrolment for each week/i.test(candidate));
  if (!line) return null;
  const cap = /limited to\s+(\d+)\s+children/i.exec(line);
  if (!cap) return null;
  return { cap: Number(cap[1]), line: line.replace(/\s+/g, " ").trim() };
}

function findInformationGuidePdf(document: CleanSourceDocument): string | null {
  const match = document.links.find((link) =>
    /camp-riverwood-summer-day-camp-information-guide\.pdf/i.test(link.href),
  );
  return match?.href ?? null;
}

function supports(input: ExtractorSupportInput): boolean {
  if (input.source.extractorKey === RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY) return true;
  for (const host of RIVERWOOD_CONSERVANCY_HOSTS) {
    if (sameCanonicalHost(input.source.canonicalUrl, `https://${host}`)) return true;
  }
  if (/theriverwoodconservancy\.org/i.test(input.source.canonicalUrl)) return true;
  const title = `${input.document.title ?? ""} ${input.document.headings.join(" ")}`;
  return /riverwood/i.test(title) && /summer camp/i.test(title);
}

function extract(input: ExtractorInput): ExtractorResult {
  const { document, source, snapshot, extractionRunId, newId } = input;
  const observedAt = (input.now ?? new Date()).toISOString();
  const facts = parseRiverwoodConservancyFacts(document, { sourceUrl: source.canonicalUrl });

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
      sourceIdentity: `${RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY}:provider`,
      rawFields: { title: document.title },
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
        sourceIdentity: `${RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY}:venue:chappell-house`,
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
        confidence: 0.85,
        warnings: ["venue_city_not_stated_on_html"],
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
  if (facts.gradeEligibility) {
    programObservations.gradeMin = observation(
      facts.gradeEligibility.gradeMin,
      facts.raw.grades,
      0.95,
    );
    programObservations.gradeMax = observation(
      facts.gradeEligibility.gradeMax,
      facts.raw.grades,
      0.95,
    );
  }
  if (facts.enrolmentCapPerWeek != null) {
    programObservations.enrolmentCapPerWeek = observation(
      facts.enrolmentCapPerWeek,
      facts.raw.enrolmentCap,
      0.95,
    );
  }
  if (facts.raw.soldOutCopy.length > 0) {
    programObservations.soldOutCopy = observation(
      facts.raw.soldOutCopy,
      facts.raw.soldOutCopy.join(" | "),
      0.95,
    );
  }
  if (facts.raw.care) {
    programObservations.prePostCampCareOffered = observation(
      facts.prePostCampCareOffered,
      facts.raw.care,
      0.95,
    );
  }
  if (facts.informationGuidePdfUrl) {
    programObservations.informationGuidePdfUrl = observation(
      facts.informationGuidePdfUrl,
      facts.informationGuidePdfUrl,
      0.95,
    );
  }

  records.push(
    buildExtractedRecord({
      id: newId(),
      extractionRunId,
      recordType: "program",
      sourceIdentity: `${RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY}:program:camp-riverwood`,
      rawFields: {
        heading: document.headings[0] ?? null,
        grades: facts.raw.grades,
        hours: facts.raw.hours,
        enrolmentCap: facts.raw.enrolmentCap,
        care: facts.raw.care,
        soldOutCopy: facts.raw.soldOutCopy,
        informationGuidePdfUrl: facts.informationGuidePdfUrl,
      },
      normalizedFields: {
        providerId: source.providerId,
        name: facts.program.name,
        typicalAgeMin: null,
        typicalAgeMax: null,
        marketingAgeMin: null,
        marketingAgeMax: null,
        derivedAvailableAgeMin: null,
        derivedAvailableAgeMax: null,
        seasonStartDate: facts.program.seasonStartDate,
        seasonEndDate: facts.program.seasonEndDate,
        coreHoursStart: facts.program.coreHoursStart,
        coreHoursEnd: facts.program.coreHoursEnd,
        registrationUrl: facts.program.registrationUrl,
        registrationPlatform: facts.provider.registrationPlatform,
        sourceUrl: source.canonicalUrl,
        policies: facts.policies,
        knownGaps: facts.knownGaps,
        observations: programObservations,
      },
      confidence: 0.9,
      warnings: [
        ...facts.warnings.filter(
          (warning) => warning.endsWith("_not_found") || warning === "year_not_stated",
        ),
        ...facts.knownGaps,
      ],
    }),
  );

  for (const offering of facts.offerings) {
    const sessionObservations: Record<string, unknown> = {
      weekIdentity: observation(offering.weekIdentity, offering.listedDateWindow, 0.95),
      listedDateWindow: observation(offering.listedDateWindow, offering.listedDateWindow, 0.95),
    };
    if (facts.gradeEligibility) {
      sessionObservations.gradeMin = observation(
        facts.gradeEligibility.gradeMin,
        facts.raw.grades,
        0.95,
      );
      sessionObservations.gradeMax = observation(
        facts.gradeEligibility.gradeMax,
        facts.raw.grades,
        0.95,
      );
    }
    if (offering.priceAmount != null) {
      sessionObservations.priceAmount = observation(offering.priceAmount, offering.rawFee, 0.9);
    }
    if (offering.soldOut) {
      sessionObservations.seatAvailability = observation(
        "confirmed_full",
        offering.availabilityCopy,
        0.95,
      );
    }
    if (facts.enrolmentCapPerWeek != null) {
      sessionObservations.enrolmentCapPerWeek = observation(
        facts.enrolmentCapPerWeek,
        facts.raw.enrolmentCap,
        0.95,
      );
    }
    if (facts.raw.care) {
      sessionObservations.prePostCampCareOffered = observation(
        facts.prePostCampCareOffered,
        facts.raw.care,
        0.95,
      );
    }

    const beforeCare = facts.prePostCampCareOffered === false ? { offered: "no" as const } : null;
    const afterCare = facts.prePostCampCareOffered === false ? { offered: "no" as const } : null;

    records.push(
      buildExtractedRecord({
        id: newId(),
        extractionRunId,
        recordType: "session",
        sourceIdentity: offering.sourceIdentity,
        rawFields: {
          listedDateWindow: offering.listedDateWindow,
          listedWeekNumber: offering.listedWeekNumber,
          grades: facts.raw.grades,
          hours: facts.raw.hours,
          availabilityCopy: offering.availabilityCopy,
          enrolmentCap: facts.raw.enrolmentCap,
          care: facts.raw.care,
          rawFee: offering.rawFee,
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
          ageMin: null,
          ageMax: null,
          gradeMin: facts.gradeEligibility?.gradeMin ?? null,
          gradeMax: facts.gradeEligibility?.gradeMax ?? null,
          priceTierKey: "listed_week",
          priceTierLabel: "per child",
          priceAmount: offering.priceAmount,
          priceUnit: offering.priceUnit,
          currency: offering.currency,
          shortWeekPriceAmount: null,
          outingLabel: null,
          addOnFeeCad: null,
          addOnLabel: null,
          coreHoursStart: facts.program.coreHoursStart,
          coreHoursEnd: facts.program.coreHoursEnd,
          beforeCare,
          afterCare,
          registrationUrl: null,
          registrationPlatform: facts.provider.registrationPlatform,
          registrationStatus: null,
          seatAvailability: offering.soldOut ? "confirmed_full" : null,
          enrolmentCapPerWeek: facts.enrolmentCapPerWeek,
          sourceUrl: source.canonicalUrl,
          observations: sessionObservations,
        },
        confidence: 0.9,
        warnings: [
          "year_not_stated",
          "session_iso_dates_unparsed_year_not_stated",
          "grades_not_converted_to_ages",
          ...(offering.soldOut ? ["sold_out_mapped_to_confirmed_full_not_registration_closed"] : []),
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

export const riverwoodConservancyExtractor: CampExtractor = {
  key: RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY,
  version: "0.1.0",
  grain: RIVERWOOD_CONSERVANCY_OFFERING_GRAIN,
  supports,
  extract,
};
