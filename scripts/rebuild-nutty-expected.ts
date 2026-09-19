/**
 * Rebuild Nutty Scientists gold expected JSON from the saved HTML fixture.
 * Run: npx tsx scripts/rebuild-nutty-expected.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseNuttyScientistsFacts } from "@/lib/camps/ingestion/extractors/nuttyScientistsExtractor";
import { nuttyScientistsExtractor } from "@/lib/camps/ingestion/extractors/nuttyScientistsExtractor";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { NUTTY_SCIENTISTS_SOURCE_URL } from "@/lib/camps/ingestion/sources/seedSources";

const HTML_PATH = "data/camps/ingestion/benchmarks/nutty-scientists-summercamp.html";
const EXPECTED_PATH = "data/camps/ingestion/benchmarks/nutty-scientists.expected.json";

const html = readFileSync(HTML_PATH, "utf8");
const document = cleanHtmlToDocument(html, { baseUrl: NUTTY_SCIENTISTS_SOURCE_URL });
const facts = parseNuttyScientistsFacts(document, { sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL });

const next = {
  $comment: [
    "Expected offline extraction for nutty-scientists-summercamp.html.",
    "Prompt 9B-A grain: one session per week window × the age band that week names (8 week windows / 8 offerings).",
    "The official page states month/day windows only — ISO dates stay null.",
    "Identity: nutty_scientists:session:{MM-DD}_{MM-DD}:{ageMin}-{ageMax}",
    "KNOWN LIMITATION: the same month/day + age band in a later year, still without a stated year, collides on identity and can look unchanged.",
    "Price is a semantic fact, not session identity.",
    "Google Forms hrefs are link facts only and are never fetched.",
    "Regenerate via scripts/rebuild-nutty-expected.ts — never edit to make a failing extractor pass.",
  ],
  benchmark: {
    sourceFile: "nutty-scientists-summercamp.html",
    sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
    capturedAt: "2026-09-18",
    extractorKey: nuttyScientistsExtractor.key,
    extractorVersion: nuttyScientistsExtractor.version,
    status: "success",
    weekCount: facts.weeks.length,
    offeringCount: facts.offerings.length,
  },
  identity: {
    formula: "nutty_scientists:session:{MM-DD}_{MM-DD}:{ageMin}-{ageMax}",
    keys: facts.offerings.map((offering) => offering.sourceIdentity),
  },
  facts: {
    provider: {
      name: facts.provider.name,
      registrationPlatform: facts.provider.registrationPlatform,
    },
    venue: facts.venue,
    program: facts.program,
    priceTiers: facts.priceTiers.map((tier) => ({
      key: tier.key,
      priceAmount: tier.priceAmount,
      priceUnit: tier.priceUnit,
      taxExtra: tier.taxExtra,
    })),
    scarcityCopy: facts.raw.scarcityCopy,
    derivedAvailableAgeMin: facts.derivedAvailableAgeMin,
    derivedAvailableAgeMax: facts.derivedAvailableAgeMax,
    marketingAgeMin: facts.marketingAgeMin,
    marketingAgeMax: facts.marketingAgeMax,
    warnings: facts.warnings,
    offerings: facts.offerings.map((offering) => ({
      weekIdentity: offering.weekIdentity,
      listedDateWindow: offering.listedDateWindow,
      ageMin: offering.ageMin,
      ageMax: offering.ageMax,
      startDate: offering.startDate,
      endDate: offering.endDate,
      registrationUrl: offering.registrationUrl,
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
      hours: [facts.program.coreHoursStart, facts.program.coreHoursEnd],
      prices: facts.priceTiers.map((tier) => `${tier.key}:${tier.priceAmount}`),
      warnings: facts.warnings,
    },
    null,
    2,
  ),
);
