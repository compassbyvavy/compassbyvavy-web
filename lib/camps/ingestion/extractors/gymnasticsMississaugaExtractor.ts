/**
 * Gymnastics Mississauga extractor.
 *
 * Fifth structurally different provider on the existing Camps pipeline
 * (Prompt 9B-C2). It knows the shape of the official summer-camp HTML page —
 * ten themed 2026 weeks, full-day vs half-day as separate purchasable catalogs,
 * before/after care as a week-level add-on, program ages 4–14, core hours,
 * care $10 with no stated unit, a site-wide footer contact address that is
 * not confirmed as the camp venue, and Jackrabbit registration hand-off —
 * and reads exactly those facts.
 *
 * Data-truth:
 * - Official marketing HTML is the 9B-C2 truth source. Jackrabbit is outside
 *   the crawl boundary: Register Here / Members Portal / OpeningsJS hrefs are
 *   provenance only and are never fetched.
 * - Grain is week × attendance format (gold: 10 weeks × full_day|half_day).
 *   Care is not a third session. Theme is a fingerprinted week attribute, not
 *   identity.
 * - Years come from week titles only ("July 6 - 10, 2026") — not WordPress
 *   timestamps, image paths, capture date, or Jackrabbit URL parameters.
 * - Program heading "Summer Camps (Ages 4–14)" stays on the program as
 *   marketingAge and as CampProgram typicalAge (descriptive program band,
 *   never session eligibility). Session ageMin/ageMax stay null.
 * - Weekly camp tuition is not on the marketing HTML. Session price stays
 *   unknown. Care $10.00 is a care add-on fee with no stated unit, not camp
 *   tuition, and "$" is not CAD. Care applicability to half-day is unknown.
 * - Footer "5600 Rose Cherry Pl" / "Located at the Paramount Fine Food Centre"
 *   is page contact evidence, not a confirmed camp venue.
 * - "maximum of 9 participants" is a group cap, not remaining seats.
 * - Members Portal is a login page and is not registrationUrl.
 *
 * Identity (stable semantic facts, not HTML order, not Jackrabbit tokens):
 *   gymnastics_mississauga:session:{YYYY-MM-DD}_{YYYY-MM-DD}:{full_day|half_day}
 *
 * Offline benchmark: `data/camps/ingestion/benchmarks/gymnastics-mississauga-summer-camps.html`
 * with expected facts in `gymnastics-mississauga.expected.json`.
 */

import type {
  CampCurrency,
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
import { GYMNASTICS_MISSISSAUGA_OFFERING_GRAIN } from "@/lib/camps/ingestion/extractors/offeringGrain";
import { documentLines, findAddress } from "@/lib/camps/ingestion/extractors/textScan";
import { normalizeAgeRange } from "@/lib/camps/ingestion/normalize/ageRange";
import { normalizeTimeRange } from "@/lib/camps/ingestion/normalize/timeRange";
import {
  GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY,
  GYMNASTICS_MISSISSAUGA_MEMBERS_PORTAL_URL,
  GYMNASTICS_MISSISSAUGA_REGISTER_HERE_URL,
  parseGymnasticsMississaugaSchedule,
  type GymnasticsOffering,
  type GymnasticsWeek,
  type JackrabbitOpeningsEmbed,
} from "@/lib/camps/ingestion/extractors/gymnasticsMississaugaSchedule";

export {
  GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY,
  GYMNASTICS_MISSISSAUGA_MEMBERS_PORTAL_URL,
  GYMNASTICS_MISSISSAUGA_REGISTER_HERE_URL,
  gymnasticsSessionSourceIdentity,
  gymnasticsVenueSourceIdentity,
  gymnasticsWeekIdentity,
  normalizeGymnasticsThemeTitle,
  parseGymnasticsMississaugaSchedule,
  parseGymnasticsWeekTitle,
  parseJackrabbitOpeningsEmbeds,
} from "@/lib/camps/ingestion/extractors/gymnasticsMississaugaSchedule";

export const GYMNASTICS_MISSISSAUGA_PROVIDER_NAME = "Gymnastics Mississauga";
export const GYMNASTICS_MISSISSAUGA_HOST = "gymmississauga.org";
export const GYMNASTICS_MISSISSAUGA_HOSTS = [
  "gymmississauga.org",
  "www.gymmississauga.org",
] as const;
export const GYMNASTICS_MISSISSAUGA_PROGRAM_NAME = "Summer Camps";
export const GYMNASTICS_MISSISSAUGA_VENUE_NAME = "Paramount Fine Food Centre";
export const GYMNASTICS_MISSISSAUGA_WEBSITE_URL = "https://gymmississauga.org/";

export type GymnasticsMississaugaFacts = {
  provider: {
    name: string;
    websiteUrl: string;
    registrationPlatform: RegistrationPlatform;
  };
  /**
   * Footer/contact copy on the camps page. Not a confirmed camp venue:
   * phone, email, website, and address sit together in `<footer>`.
   */
  pageContact: {
    facilityCopy: string | null;
    addressLine: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  } | null;
  venue: null;
  program: {
    name: string;
    marketingAgeMin: number | null;
    marketingAgeMax: number | null;
    typicalAgeMin: number | null;
    typicalAgeMax: number | null;
    seasonStartDate: string | null;
    seasonEndDate: string | null;
    coreHoursStart: string | null;
    coreHoursEnd: string | null;
    registrationUrl: string | null;
  };
  hours: {
    fullDayStart: string | null;
    fullDayEnd: string | null;
    halfDayStart: string | null;
    halfDayEnd: string | null;
    fullDayCopy: string | null;
    halfDayCopy: string | null;
  };
  care: {
    beforeOffered: true | null;
    afterOffered: true | null;
    beforeStart: string | null;
    beforeEnd: string | null;
    afterStart: string | null;
    afterEnd: string | null;
    beforeFeeAmount: number | null;
    afterFeeAmount: number | null;
    feeCurrency: CampCurrency;
    feeUnit: null;
    formatApplicability: "not_stated";
    beforeCopy: string | null;
    afterCopy: string | null;
    notGymClassesCopy: string | null;
  };
  weeks: GymnasticsWeek[];
  offerings: GymnasticsOffering[];
  jackrabbitOpenings: JackrabbitOpeningsEmbed[];
  policies: {
    marketingAgeMin: number | null;
    marketingAgeMax: number | null;
    marketingAgeCopy: string | null;
    groupMaxParticipants: number | null;
    beforeCareOffered: true | null;
    beforeCareStart: string | null;
    beforeCareEnd: string | null;
    beforeCareFeeAmount: number | null;
    afterCareOffered: true | null;
    afterCareStart: string | null;
    afterCareEnd: string | null;
    afterCareFeeAmount: number | null;
    careFeeCurrency: CampCurrency;
    careFeeUnit: null;
    careFormatApplicability: "not_stated";
    careNotGymClasses: boolean;
    pageContactAddress: string | null;
    pageContactFacilityCopy: string | null;
    annualAdministrationMembershipFeeCopy: string | null;
    membersPortalUrl: string | null;
    registerHereUrl: string | null;
  };
  raw: {
    ages: string | null;
    fullDayHours: string | null;
    halfDayHours: string | null;
    beforeCare: string | null;
    afterCare: string | null;
    groupMax: string | null;
    address: string | null;
    venueName: string | null;
    membershipFee: string | null;
    registerHereUrl: string | null;
    membersPortalUrl: string | null;
  };
  confidenceByField: Record<string, number>;
  warnings: string[];
  knownGaps: string[];
};

function firstMatchingLine(lines: readonly string[], pattern: RegExp): string | null {
  return lines.find((line) => pattern.test(line)) ?? null;
}

function parseDollarAmount(raw: string | null): number | null {
  if (!raw) return null;
  const match = /\$(\d+(?:\.\d{1,2})?)/.exec(raw);
  return match ? Number(match[1]) : null;
}

function parseClockRange(raw: string | null): { start: string | null; end: string | null } {
  if (!raw) return { start: null, end: null };
  const result = normalizeTimeRange(raw);
  return { start: result.value.startTime, end: result.value.endTime };
}

export function parseGymnasticsMississaugaFacts(
  document: CleanSourceDocument,
  options: { sourceUrl?: string | null; rawHtml?: string | null } = {},
): GymnasticsMississaugaFacts {
  const lines = documentLines(document);
  const warnings: string[] = [];
  const knownGaps: string[] = [];
  const schedule = parseGymnasticsMississaugaSchedule(options.rawHtml ?? "");
  warnings.push(...schedule.warnings);

  const agesCopy = firstMatchingLine(lines, /summer camps\s*\(ages\s*\d/i);
  const programAges = agesCopy ? normalizeAgeRange(agesCopy) : null;
  const marketingAgeMin = programAges?.value.ageMin ?? null;
  const marketingAgeMax = programAges?.value.ageMax ?? null;
  if (agesCopy && (marketingAgeMin == null || marketingAgeMax == null)) {
    warnings.push("program_ages_unparsed");
  }
  if (marketingAgeMin != null) {
    warnings.push("program_ages_not_copied_onto_sessions");
  }

  const fullDayHoursCopy = firstMatchingLine(lines, /camps run daily from/i);
  const halfDayHoursCopy = firstMatchingLine(lines, /half-day campers/i);
  const fullDayHours = parseClockRange(fullDayHoursCopy);
  const halfDayHours = parseClockRange(halfDayHoursCopy);
  if (!fullDayHours.start) warnings.push("full_day_hours_not_found");
  if (!halfDayHours.start) warnings.push("half_day_hours_not_found");

  const beforeCareCopy = firstMatchingLine(lines, /before care/i);
  const afterCareCopy = firstMatchingLine(lines, /after care\s+\d/i);
  const notGymClassesCopy = firstMatchingLine(lines, /before and after care are not gym classes/i);
  const beforeCareHours = parseClockRange(beforeCareCopy);
  const afterCareHours = parseClockRange(afterCareCopy);
  const beforeFeeAmount = parseDollarAmount(beforeCareCopy);
  const afterFeeAmount = parseDollarAmount(afterCareCopy);
  if (!beforeCareCopy) warnings.push("before_care_not_found");
  if (!afterCareCopy) warnings.push("after_care_not_found");

  const groupMaxCopy = firstMatchingLine(lines, /maximum of\s+\d+\s+participants/i);
  const groupMaxMatch = groupMaxCopy ? /maximum of\s+(\d+)\s+participants/i.exec(groupMaxCopy) : null;
  const groupMaxParticipants = groupMaxMatch ? Number(groupMaxMatch[1]) : null;
  if (groupMaxParticipants != null) {
    knownGaps.push("remaining_seats_not_inferred_from_group_limit");
  }

  const membershipFeeCopy = firstMatchingLine(lines, /annual administration membership fee/i);
  const addressHit = findAddress(lines);
  const venueNameCopy = firstMatchingLine(lines, /located at the paramount fine food centre/i);
  const pageContact = addressHit
    ? {
        facilityCopy: venueNameCopy,
        addressLine: addressHit.address.addressLine,
        city: addressHit.address.city,
        province: addressHit.address.province,
        postalCode: addressHit.address.postalCode,
      }
    : venueNameCopy
      ? {
          facilityCopy: venueNameCopy,
          addressLine: null,
          city: null,
          province: null,
          postalCode: null,
        }
      : null;
  warnings.push("page_contact_address_not_confirmed_as_camp_venue");
  warnings.push("care_fee_unit_not_stated");
  warnings.push("care_format_applicability_not_stated");

  const seasonStartDate = schedule.weeks[0]?.startDate ?? null;
  const seasonEndDate = schedule.weeks.at(-1)?.endDate ?? null;

  const registerHereUrl = schedule.registerHereUrl ?? GYMNASTICS_MISSISSAUGA_REGISTER_HERE_URL;
  const membersPortalUrl = schedule.membersPortalUrl ?? GYMNASTICS_MISSISSAUGA_MEMBERS_PORTAL_URL;

  knownGaps.push("weekly_camp_tuition_not_stated_on_marketing_html");
  knownGaps.push("jackrabbit_not_fetched");
  knownGaps.push("registration_status_not_inferred_from_jackrabbit_link");
  if (schedule.jackrabbitOpenings.some((embed) => embed.role === "unknown")) {
    warnings.push("unknown_jackrabbit_openings_catalog");
  }

  const feeCurrency: CampCurrency = "unknown";

  return {
    provider: {
      name: GYMNASTICS_MISSISSAUGA_PROVIDER_NAME,
      websiteUrl: GYMNASTICS_MISSISSAUGA_WEBSITE_URL,
      registrationPlatform: "Jackrabbit",
    },
    pageContact,
    venue: null,
    program: {
      name: GYMNASTICS_MISSISSAUGA_PROGRAM_NAME,
      marketingAgeMin,
      marketingAgeMax,
      typicalAgeMin: marketingAgeMin,
      typicalAgeMax: marketingAgeMax,
      seasonStartDate,
      seasonEndDate,
      coreHoursStart: fullDayHours.start,
      coreHoursEnd: fullDayHours.end,
      registrationUrl: registerHereUrl,
    },
    hours: {
      fullDayStart: fullDayHours.start,
      fullDayEnd: fullDayHours.end,
      halfDayStart: halfDayHours.start,
      halfDayEnd: halfDayHours.end,
      fullDayCopy: fullDayHoursCopy,
      halfDayCopy: halfDayHoursCopy,
    },
    care: {
      beforeOffered: beforeCareCopy ? true : null,
      afterOffered: afterCareCopy ? true : null,
      beforeStart: beforeCareHours.start,
      beforeEnd: beforeCareHours.end,
      afterStart: afterCareHours.start,
      afterEnd: afterCareHours.end,
      beforeFeeAmount,
      afterFeeAmount,
      feeCurrency,
      feeUnit: null,
      formatApplicability: "not_stated",
      beforeCopy: beforeCareCopy,
      afterCopy: afterCareCopy,
      notGymClassesCopy,
    },
    weeks: schedule.weeks,
    offerings: schedule.offerings,
    jackrabbitOpenings: schedule.jackrabbitOpenings,
    policies: {
      marketingAgeMin,
      marketingAgeMax,
      marketingAgeCopy: agesCopy,
      groupMaxParticipants,
      beforeCareOffered: beforeCareCopy ? true : null,
      beforeCareStart: beforeCareHours.start,
      beforeCareEnd: beforeCareHours.end,
      beforeCareFeeAmount: beforeFeeAmount,
      afterCareOffered: afterCareCopy ? true : null,
      afterCareStart: afterCareHours.start,
      afterCareEnd: afterCareHours.end,
      afterCareFeeAmount: afterFeeAmount,
      careFeeCurrency: feeCurrency,
      careFeeUnit: null,
      careFormatApplicability: "not_stated",
      careNotGymClasses: Boolean(notGymClassesCopy),
      pageContactAddress: addressHit?.line ?? null,
      pageContactFacilityCopy: venueNameCopy,
      annualAdministrationMembershipFeeCopy: membershipFeeCopy,
      membersPortalUrl,
      registerHereUrl,
    },
    raw: {
      ages: agesCopy,
      fullDayHours: fullDayHoursCopy,
      halfDayHours: halfDayHoursCopy,
      beforeCare: beforeCareCopy,
      afterCare: afterCareCopy,
      groupMax: groupMaxCopy,
      address: addressHit?.line ?? null,
      venueName: venueNameCopy,
      membershipFee: membershipFeeCopy,
      registerHereUrl,
      membersPortalUrl,
    },
    confidenceByField: {
      marketingAgeMin: programAges?.confidence ?? 0,
      coreHoursStart: fullDayHours.start ? 0.95 : 0,
      beforeCare: beforeCareHours.start ? 0.95 : 0,
      pageContact: pageContact ? 0.8 : 0,
    },
    warnings,
    knownGaps,
  };
}

function supports(input: ExtractorSupportInput): boolean {
  if (input.source.extractorKey === GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY) return true;
  for (const host of GYMNASTICS_MISSISSAUGA_HOSTS) {
    if (sameCanonicalHost(input.source.canonicalUrl, `https://${host}`)) return true;
  }
  if (/gymmississauga\.org/i.test(input.source.canonicalUrl)) return true;
  const title = `${input.document.title ?? ""} ${input.document.headings.join(" ")}`;
  return /gymnastics mississauga/i.test(title) && /summer camp/i.test(title);
}

function extract(input: ExtractorInput): ExtractorResult {
  const { document, source, snapshot, extractionRunId, newId } = input;
  const observedAt = (input.now ?? new Date()).toISOString();
  const facts = parseGymnasticsMississaugaFacts(document, {
    sourceUrl: source.canonicalUrl,
    rawHtml: input.rawHtml,
  });

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
      sourceIdentity: `${GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY}:provider`,
      rawFields: { title: document.title },
      normalizedFields: {
        providerId: source.providerId,
        name: facts.provider.name,
        websiteUrl: facts.provider.websiteUrl,
        registrationInfoUrl: facts.raw.registerHereUrl,
        registrationPlatform: facts.provider.registrationPlatform,
        sourceUrl: source.canonicalUrl,
        businessAddress: facts.pageContact
          ? {
              name: GYMNASTICS_MISSISSAUGA_VENUE_NAME,
              addressLine: facts.pageContact.addressLine,
              city: facts.pageContact.city,
              province: facts.pageContact.province,
              postalCode: facts.pageContact.postalCode,
            }
          : null,
      },
      confidence: 0.95,
      warnings: ["page_contact_address_not_confirmed_as_camp_venue"],
    }),
  );

  const programObservations: Record<string, unknown> = {};
  if (facts.program.marketingAgeMin != null) {
    programObservations.marketingAgeMin = observation(
      facts.program.marketingAgeMin,
      facts.raw.ages,
      facts.confidenceByField.marketingAgeMin,
    );
    programObservations.marketingAgeMax = observation(
      facts.program.marketingAgeMax,
      facts.raw.ages,
      facts.confidenceByField.marketingAgeMin,
    );
    programObservations.typicalAgeMin = observation(
      facts.program.typicalAgeMin,
      facts.raw.ages,
      facts.confidenceByField.marketingAgeMin,
    );
    programObservations.typicalAgeMax = observation(
      facts.program.typicalAgeMax,
      facts.raw.ages,
      facts.confidenceByField.marketingAgeMin,
    );
  }
  if (facts.program.coreHoursStart) {
    programObservations.coreHoursStart = observation(
      facts.program.coreHoursStart,
      facts.raw.fullDayHours,
      0.95,
    );
    programObservations.coreHoursEnd = observation(
      facts.program.coreHoursEnd,
      facts.raw.fullDayHours,
      0.95,
    );
  }
  if (facts.raw.beforeCare) {
    programObservations.beforeCare = observation(facts.care.beforeStart, facts.raw.beforeCare, 0.95);
  }
  if (facts.raw.afterCare) {
    programObservations.afterCare = observation(facts.care.afterStart, facts.raw.afterCare, 0.95);
  }
  if (facts.pageContact?.addressLine) {
    programObservations.pageContactAddress = observation(
      facts.pageContact.addressLine,
      facts.raw.address,
      0.8,
    );
  }
  if (facts.raw.registerHereUrl) {
    programObservations.registrationUrl = observation(
      facts.program.registrationUrl,
      facts.raw.registerHereUrl,
      0.95,
    );
  }

  records.push(
    buildExtractedRecord({
      id: newId(),
      extractionRunId,
      recordType: "program",
      sourceIdentity: `${GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY}:program:summer-camps`,
      rawFields: {
        heading: facts.raw.ages,
        hours: facts.raw.fullDayHours,
        halfDayHours: facts.raw.halfDayHours,
        beforeCare: facts.raw.beforeCare,
        afterCare: facts.raw.afterCare,
        groupMax: facts.raw.groupMax,
        membershipFee: facts.raw.membershipFee,
        registerHereUrl: facts.raw.registerHereUrl,
        membersPortalUrl: facts.raw.membersPortalUrl,
      },
      normalizedFields: {
        providerId: source.providerId,
        name: facts.program.name,
        typicalAgeMin: facts.program.typicalAgeMin,
        typicalAgeMax: facts.program.typicalAgeMax,
        marketingAgeMin: facts.program.marketingAgeMin,
        marketingAgeMax: facts.program.marketingAgeMax,
        derivedAvailableAgeMin: null,
        derivedAvailableAgeMax: null,
        seasonStartDate: facts.program.seasonStartDate,
        seasonEndDate: facts.program.seasonEndDate,
        coreHoursStart: facts.program.coreHoursStart,
        coreHoursEnd: facts.program.coreHoursEnd,
        registrationUrl: facts.program.registrationUrl,
        registrationPlatform: facts.provider.registrationPlatform,
        sourceUrl: source.canonicalUrl,
        businessAddress: facts.pageContact,
        policies: facts.policies,
        knownGaps: facts.knownGaps,
        observations: programObservations,
      },
      confidence: 0.9,
      warnings: [
        ...facts.warnings.filter(
          (warning) =>
            warning.endsWith("_not_found") ||
            warning === "program_ages_not_copied_onto_sessions" ||
            warning === "page_contact_address_not_confirmed_as_camp_venue" ||
            warning === "care_fee_unit_not_stated" ||
            warning === "care_format_applicability_not_stated",
        ),
        ...facts.knownGaps,
      ],
    }),
  );

  for (const offering of facts.offerings) {
    const hoursCopy =
      offering.attendanceFormat === "full_day" ? facts.raw.fullDayHours : facts.raw.halfDayHours;
    const coreHoursStart =
      offering.attendanceFormat === "full_day" ? facts.hours.fullDayStart : facts.hours.halfDayStart;
    const coreHoursEnd =
      offering.attendanceFormat === "full_day" ? facts.hours.fullDayEnd : facts.hours.halfDayEnd;

    const sessionObservations: Record<string, unknown> = {
      weekIdentity: observation(offering.weekIdentity, offering.listedDateWindow, 0.95),
      listedDateWindow: observation(offering.listedDateWindow, offering.listedTitle, 0.95),
      themeTitle: observation(offering.themeTitle, offering.listedTitle, 0.95),
      attendanceFormat: observation(offering.attendanceFormat, offering.priceTierLabel, 0.95),
      statedYear: observation(offering.statedYear, offering.listedTitle, 0.95),
    };
    if (coreHoursStart) {
      sessionObservations.coreHoursStart = observation(coreHoursStart, hoursCopy, 0.95);
      sessionObservations.coreHoursEnd = observation(coreHoursEnd, hoursCopy, 0.95);
    }
    if (offering.jackrabbitOpeningsUrl) {
      sessionObservations.jackrabbitOpeningsUrl = observation(
        offering.jackrabbitOpeningsUrl,
        offering.jackrabbitOpeningsUrl,
        0.95,
      );
    }
    if (facts.raw.registerHereUrl) {
      sessionObservations.registrationUrl = observation(
        facts.program.registrationUrl,
        facts.raw.registerHereUrl,
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
          listedTitle: offering.listedTitle,
          listedDateWindow: offering.listedDateWindow,
          statedYear: offering.statedYear,
          themeTitle: offering.themeTitle,
          attendanceFormat: offering.attendanceFormat,
          hours: hoursCopy,
          beforeCare: facts.raw.beforeCare,
          afterCare: facts.raw.afterCare,
          jackrabbitOpeningsUrl: offering.jackrabbitOpeningsUrl,
          jackrabbitCat2: offering.jackrabbitCat2,
          registerHereUrl: facts.raw.registerHereUrl,
          membersPortalUrl: facts.raw.membersPortalUrl,
          groupMax: facts.raw.groupMax,
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
          listedDateWindow: offering.listedDateWindow,
          seasonStartDate: facts.program.seasonStartDate,
          seasonEndDate: facts.program.seasonEndDate,
          ageMin: null,
          ageMax: null,
          gradeMin: null,
          gradeMax: null,
          scheduleFormat: offering.attendanceFormat,
          priceTierKey: offering.priceTierKey,
          priceTierLabel: offering.priceTierLabel,
          priceAmount: null,
          priceUnit: null,
          currency: "unknown",
          shortWeekPriceAmount: null,
          outingLabel: null,
          addOnFeeCad: null,
          addOnLabel: null,
          coreHoursStart,
          coreHoursEnd,
          beforeCare: null,
          afterCare: null,
          registrationUrl: facts.program.registrationUrl,
          registrationPlatform: facts.provider.registrationPlatform,
          registrationStatus: null,
          seatAvailability: null,
          enrolmentCapPerWeek: facts.policies.groupMaxParticipants,
          sourceUrl: source.canonicalUrl,
          observations: sessionObservations,
        },
        confidence: 0.9,
        warnings: [
          "program_ages_not_copied_onto_sessions",
          "weekly_camp_tuition_not_stated_on_marketing_html",
          "jackrabbit_not_fetched",
          "registration_status_not_inferred_from_jackrabbit_link",
          "year_from_week_title",
          "care_fee_unit_not_stated",
          "care_format_applicability_not_stated",
        ],
      }),
    );
  }

  const foundEnough = facts.offerings.length > 0;
  return {
    status: records.length === 0 ? "failed" : foundEnough ? "success" : "partial",
    records,
    warnings: [...facts.warnings, ...facts.knownGaps.map((gap) => `known_gap:${gap}`)],
  };
}

export const gymnasticsMississaugaExtractor: CampExtractor = {
  key: GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY,
  version: "0.1.0",
  grain: GYMNASTICS_MISSISSAUGA_OFFERING_GRAIN,
  supports,
  extract,
};
