/**
 * Rebuild Front Line Hockey gold expected JSON from saved product fixtures.
 * Run: npx tsx scripts/rebuild-front-line-expected.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseFrontLineHockeyFacts } from "@/lib/camps/ingestion/extractors/frontLineHockeyExtractor";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import {
  FRONT_LINE_HOCKEY_PRODUCTS,
} from "@/lib/camps/ingestion/sources/seedSources";

const FIXTURES: Record<string, string> = {
  "src-front-line-hockey-april-pre-tryout": "front-line-hockey-april-hockey-camp.html",
  "src-front-line-hockey-july-half-day": "front-line-hockey-july-half-day.html",
  "src-front-line-hockey-july-girls-only": "front-line-hockey-july-girls-only.html",
  "src-front-line-hockey-august-full-day": "front-line-hockey-august-full-day.html",
  "src-front-line-hockey-fall-pre-evaluation": "front-line-hockey-fall-pre-evaluation.html",
  "src-front-line-hockey-december-mid-season": "front-line-hockey-december-mid-season.html",
};

const capturedAt = "2026-09-19";
const offerings = FRONT_LINE_HOCKEY_PRODUCTS.map((product) => {
  const fileName = FIXTURES[product.id];
  const html = readFileSync(`data/camps/ingestion/benchmarks/${fileName}`, "utf8");
  const document = cleanHtmlToDocument(html, { baseUrl: product.url });
  const facts = parseFrontLineHockeyFacts(document, {
    sourceUrl: product.url,
    rawHtml: html,
  });
  return {
    sourceId: product.id,
    sourceUrl: product.url,
    sourceFile: fileName,
    capturedAt,
    offering: facts.offering,
    venue: facts.venue,
    warnings: facts.warnings,
    knownGaps: facts.knownGaps,
  };
});

const next = {
  $comment: [
    "Expected offline extraction for Front Line Hockey School WooCommerce product pages.",
    "Official provider: https://frontlinehockeyschool.ca/",
    "Captured 2026-09-19. Each product URL is its own CampSource. Category and /hockey-camps/ marketing pages are not fetch targets.",
    "Grain: one offering per product page. Player vs Goalie is a pricing variant, not identity.",
    "Identity: front_line_hockey:session:{camp-token}:{date-token}",
    "camp-token is the classified camp type from the product title (half_day, girls_only_half_day, full_day, …). WooCommerce product slugs are source-location only.",
    "Dual age groups 5–9 and 10–14 stay one offering with envelope 5–14 plus recoverable ageBands.",
    "Fall WooCommerce goalie variant amount 1 is retained as rawGoalieVariantAmount and is not a confirmed normalized goalie price.",
    "Years come from product titles, never SKUs, image paths, or capture date.",
    "Currency stays unknown: pages state $ and sometimes plus HST, never CAD.",
    "WooCommerce stock counts are not remaining seats. Add to Cart is not registrationStatus.",
    "Fall 2026 product HTML does not state dates, ages, or venue on this page — those gaps are preserved.",
    "Regenerate via scripts/rebuild-front-line-expected.ts — never edit to make a failing extractor pass.",
  ],
  benchmark: {
    capturedAt,
    providerUrl: "https://frontlinehockeyschool.ca/",
    registeredSourceCount: FRONT_LINE_HOCKEY_PRODUCTS.length,
    goldSourcePageCount: offerings.length,
    goldOfferingCount: offerings.filter((row) => row.offering).length,
    extractorKey: "front_line_hockey",
    extractorVersion: "0.1.0",
  },
  identity: {
    formula: "front_line_hockey:session:{camp-token}:{date-token}",
    keys: offerings.map((row) => row.offering?.sourceIdentity ?? null),
  },
  sources: offerings,
};

writeFileSync(
  "data/camps/ingestion/benchmarks/front-line-hockey.expected.json",
  `${JSON.stringify(next, null, 2)}\n`,
);

console.log(`Wrote ${offerings.length} Front Line gold offerings.`);
