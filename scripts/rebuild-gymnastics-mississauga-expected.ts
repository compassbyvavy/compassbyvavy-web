/**
 * Rebuild Gymnastics Mississauga gold expected JSON from the saved HTML fixture.
 * Run: npx tsx scripts/rebuild-gymnastics-mississauga-expected.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  parseGymnasticsMississaugaFacts,
  gymnasticsMississaugaExtractor,
} from "@/lib/camps/ingestion/extractors/gymnasticsMississaugaExtractor";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { GYMNASTICS_MISSISSAUGA_SOURCE_URL } from "@/lib/camps/ingestion/sources/seedSources";

const HTML_PATH = "data/camps/ingestion/benchmarks/gymnastics-mississauga-summer-camps.html";
const EXPECTED_PATH = "data/camps/ingestion/benchmarks/gymnastics-mississauga.expected.json";

const html = readFileSync(HTML_PATH, "utf8");
const document = cleanHtmlToDocument(html, { baseUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL });
const facts = parseGymnasticsMississaugaFacts(document, {
  sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
  rawHtml: html,
});

const next = {
  $comment: [
    "Expected offline extraction for gymnastics-mississauga-summer-camps.html.",
    "Official URL: https://gymmississauga.org/summer-camps/",
    "Provider: https://gymmississauga.org/",
    "Captured 2026-09-22 from the live WordPress/Elementor page. Fixture is the official HTML as captured (nav, footer, scripts retained). Jackrabbit OpeningsJS, Register Here, and Members Portal hrefs are recorded as provenance and are never fetched.",
    "Prompt 9B-C2 grain: one session per dated week × attendance format. Gold is 10 themed weeks × full_day|half_day = 20 offerings. Before & After Care is a week-level add-on, not a third session.",
    "Theme is descriptive week content (fingerprinted), not identity. Dates uniquely identify a week; Magical Disney can appear on more than one dated week.",
    "Identity: gymnastics_mississauga:session:{YYYY-MM-DD}_{YYYY-MM-DD}:{full_day|half_day}",
    "Years come from week titles (2026). WordPress timestamps, image paths, capture date, and Jackrabbit URL parameters are not a year.",
    "Program heading Ages 4–14 stays on the program. Session ageMin/ageMax stay null.",
    "Weekly camp tuition is not on the marketing HTML. Session price stays unknown. Care $10.00 is a care fee; currency stays unknown because the HTML does not state CAD.",
    "maximum of 9 participants is a group cap, not remaining seats. Jackrabbit links do not set registrationStatus or availability.",
    "The camps-page footer lists 5600 Rose Cherry Pl and Located at the Paramount Fine Food Centre with phone/email/website. That is page contact evidence, not a confirmed camp venue. Session venue stays null.",
    "Care $10.00 has no stated unit (not per day / per week / per occurrence). Care is a week-level add-on; HTML does not say it applies to half-day. Session beforeCare/afterCare stay null.",
    "Jackrabbit query-string chrome is provenance only and is not session identity.",
    "Regenerate via scripts/rebuild-gymnastics-mississauga-expected.ts — never edit to make a failing extractor pass.",
  ],
  benchmark: {
    sourceFile: "gymnastics-mississauga-summer-camps.html",
    sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
    capturedAt: "2026-09-22",
    extractorKey: gymnasticsMississaugaExtractor.key,
    extractorVersion: gymnasticsMississaugaExtractor.version,
    status: "success",
    sourcePageCount: 1,
    weekCount: facts.weeks.length,
    offeringCount: facts.offerings.length,
    jackrabbitOpeningsCount: facts.jackrabbitOpenings.length,
  },
  identity: {
    formula: "gymnastics_mississauga:session:{YYYY-MM-DD}_{YYYY-MM-DD}:{full_day|half_day}",
    keys: facts.offerings.map((offering) => offering.sourceIdentity),
  },
  facts: {
    provider: {
      name: facts.provider.name,
      registrationPlatform: facts.provider.registrationPlatform,
    },
    venue: facts.venue,
    pageContact: facts.pageContact,
    program: facts.program,
    hours: facts.hours,
    care: {
      beforeStart: facts.care.beforeStart,
      beforeEnd: facts.care.beforeEnd,
      afterStart: facts.care.afterStart,
      afterEnd: facts.care.afterEnd,
      beforeFeeAmount: facts.care.beforeFeeAmount,
      afterFeeAmount: facts.care.afterFeeAmount,
      feeCurrency: facts.care.feeCurrency,
      feeUnit: facts.care.feeUnit,
      formatApplicability: facts.care.formatApplicability,
    },
    policies: facts.policies,
    derivedAvailableAgeMin: null,
    derivedAvailableAgeMax: null,
    warnings: facts.warnings,
    knownGaps: facts.knownGaps,
    weeks: facts.weeks.map((week) => ({
      weekNumber: week.weekNumber,
      weekIdentity: week.weekIdentity,
      listedDateWindow: week.listedDateWindow,
      themeTitle: week.themeTitle,
      themeTitleNormalized: week.themeTitleNormalized,
      startDate: week.startDate,
      endDate: week.endDate,
      statedYear: week.statedYear,
      isShortWeek: week.isShortWeek,
      dayCount: week.dayCount,
    })),
    offerings: facts.offerings.map((offering) => ({
      weekNumber: offering.weekNumber,
      weekIdentity: offering.weekIdentity,
      listedDateWindow: offering.listedDateWindow,
      themeTitle: offering.themeTitle,
      attendanceFormat: offering.attendanceFormat,
      startDate: offering.startDate,
      endDate: offering.endDate,
      isShortWeek: offering.isShortWeek,
      dayCount: offering.dayCount,
      jackrabbitCat2: offering.jackrabbitCat2,
      sourceIdentity: offering.sourceIdentity,
    })),
  },
};

writeFileSync(EXPECTED_PATH, `${JSON.stringify(next, null, 2)}\n`);
console.log(
  `Wrote Gymnastics Mississauga gold: ${facts.weeks.length} weeks / ${facts.offerings.length} offerings.`,
);
