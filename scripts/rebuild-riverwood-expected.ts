/**
 * Rebuild Riverwood Conservancy gold expected JSON from the saved HTML fixture.
 * Run: npx tsx scripts/rebuild-riverwood-expected.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  parseRiverwoodConservancyFacts,
  riverwoodConservancyExtractor,
} from "@/lib/camps/ingestion/extractors/riverwoodConservancyExtractor";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { RIVERWOOD_CONSERVANCY_SOURCE_URL } from "@/lib/camps/ingestion/sources/seedSources";

const HTML_PATH = "data/camps/ingestion/benchmarks/riverwood-conservancy-summercamp.html";
const EXPECTED_PATH = "data/camps/ingestion/benchmarks/riverwood-conservancy.expected.json";

const html = readFileSync(HTML_PATH, "utf8");
const document = cleanHtmlToDocument(html, { baseUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL });
const facts = parseRiverwoodConservancyFacts(document, {
  sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
});

const next = {
  $comment: [
    "Expected offline extraction for riverwood-conservancy-summercamp.html.",
    "Official URL: https://theriverwoodconservancy.org/summercamp/",
    "Captured 2026-09-19 from the live WordPress/WooCommerce page. Fixture is the official HTML as captured (nav, footer, scripts retained). The Information Guide PDF is linked and is not fetched or parsed.",
    "Prompt 9B-B grain: one session per stated date window. The page lists 8 labelled weeks; Week 1 is two discontinuous windows, so gold is 9 windows / 9 offerings.",
    "The official page states month/day windows only — ISO dates stay null. Footer copyright 2026, PDF href 2026, and wp-content years are not a camp year.",
    "Identity: riverwood_conservancy:session:{MM-DD}_{MM-DD}",
    "KNOWN LIMITATION: the same month/day window in a later year, still without a stated year, collides on identity and can look unchanged.",
    "Grades 1–6 stay grades. ageMin/ageMax stay null.",
    "Prices are literal $360 / $450 per child. Currency stays unknown: the HTML does not state CAD, and the generic `$`→CAD assumption is not adopted.",
    "SOLD OUT maps to seatAvailability=confirmed_full and does not close registrationStatus.",
    "Capacity 16 is an enrolment cap on policies/provenance — CampSession has no numeric capacity field.",
    "Price is a semantic fact, not session identity.",
    "Regenerate via scripts/rebuild-riverwood-expected.ts — never edit to make a failing extractor pass.",
  ],
  benchmark: {
    sourceFile: "riverwood-conservancy-summercamp.html",
    sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
    capturedAt: "2026-09-19",
    extractorKey: riverwoodConservancyExtractor.key,
    extractorVersion: riverwoodConservancyExtractor.version,
    status: "success",
    labelledWeekCount: 8,
    weekCount: facts.weeks.length,
    offeringCount: facts.offerings.length,
  },
  identity: {
    formula: "riverwood_conservancy:session:{MM-DD}_{MM-DD}",
    keys: facts.offerings.map((offering) => offering.sourceIdentity),
  },
  facts: {
    provider: {
      name: facts.provider.name,
      registrationPlatform: facts.provider.registrationPlatform,
    },
    venue: facts.venue,
    program: facts.program,
    gradeEligibility: facts.gradeEligibility,
    enrolmentCapPerWeek: facts.enrolmentCapPerWeek,
    prePostCampCareOffered: facts.prePostCampCareOffered,
    informationGuidePdfUrl: facts.informationGuidePdfUrl,
    policies: facts.policies,
    derivedAvailableAgeMin: null,
    derivedAvailableAgeMax: null,
    marketingAgeMin: null,
    marketingAgeMax: null,
    warnings: facts.warnings,
    knownGaps: facts.knownGaps,
    offerings: facts.offerings.map((offering) => ({
      listedWeekNumber: offering.listedWeekNumber,
      weekIdentity: offering.weekIdentity,
      listedDateWindow: offering.listedDateWindow,
      startDate: offering.startDate,
      endDate: offering.endDate,
      isShortWeek: offering.isShortWeek,
      dayCount: offering.dayCount,
      priceAmount: offering.priceAmount,
      currency: offering.currency,
      soldOut: offering.soldOut,
      sourceIdentity: offering.sourceIdentity,
    })),
  },
};

writeFileSync(EXPECTED_PATH, `${JSON.stringify(next, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      weeks: facts.weeks.length,
      offerings: facts.offerings.length,
      identities: facts.offerings.map((offering) => offering.sourceIdentity),
      shortWeeks: facts.offerings.filter((offering) => offering.isShortWeek).map((offering) => offering.weekIdentity),
      hours: [facts.program.coreHoursStart, facts.program.coreHoursEnd],
      grades: facts.gradeEligibility,
      cap: facts.enrolmentCapPerWeek,
      soldOut: facts.offerings.filter((offering) => offering.soldOut).length,
      warnings: facts.warnings,
    },
    null,
    2,
  ),
);
