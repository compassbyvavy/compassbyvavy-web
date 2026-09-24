/**
 * Offline benchmark: saved Front Line Hockey School product pages.
 *
 * Prompt 9B-C1 grain: one WooCommerce product page = one offering.
 * Player vs Goalie is a pricing variant, not identity.
 * Identity: front_line_hockey:session:{camp-token}:{date-token}
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { CampSourceSnapshot } from "@/data/camps/ingestion/types";
import { normalizeAgeRange } from "@/lib/camps/ingestion/normalize/ageRange";
import {
  FRONT_LINE_HOCKEY_EXTRACTOR_KEY,
  frontLineHockeyExtractor,
  parseFrontLineHockeyFacts,
} from "@/lib/camps/ingestion/extractors/frontLineHockeyExtractor";
import { parseFrontLineWooVariations } from "@/lib/camps/ingestion/extractors/frontLineHockeyProduct";
import { resolveExtractor } from "@/lib/camps/ingestion/extractors/registry";
import { statedDocumentYear } from "@/lib/camps/ingestion/extractors/textScan";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { FRONT_LINE_HOCKEY_OFFERING_GRAIN } from "@/lib/camps/ingestion/extractors/offeringGrain";
import { exactSessionMatcher } from "@/lib/camps/ingestion/matchers";
import { normalizePriceCad } from "@/lib/camps/ingestion/normalize/price";
import {
  FRONT_LINE_HOCKEY_APRIL_SOURCE_ID,
  FRONT_LINE_HOCKEY_JULY_SOURCE_ID,
  FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
  FRONT_LINE_HOCKEY_PRODUCTS,
  frontLineHockeySourceById,
} from "@/lib/camps/ingestion/sources/seedSources";

const BENCHMARK_DIR = "../../../../data/camps/ingestion/benchmarks";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const FIXTURES: Record<string, string> = {
  "src-front-line-hockey-april-pre-tryout": "front-line-hockey-april-hockey-camp.html",
  "src-front-line-hockey-july-half-day": "front-line-hockey-july-half-day.html",
  "src-front-line-hockey-july-girls-only": "front-line-hockey-july-girls-only.html",
  "src-front-line-hockey-august-full-day": "front-line-hockey-august-full-day.html",
  "src-front-line-hockey-fall-pre-evaluation": "front-line-hockey-fall-pre-evaluation.html",
  "src-front-line-hockey-december-mid-season": "front-line-hockey-december-mid-season.html",
};

const expected = JSON.parse(readBenchmark("front-line-hockey.expected.json")) as {
  benchmark: {
    registeredSourceCount: number;
    goldSourcePageCount: number;
    goldOfferingCount: number;
    extractorKey: string;
    extractorVersion: string;
  };
  identity: { formula: string; keys: Array<string | null> };
  sources: Array<{
    sourceId: string;
    sourceUrl: string;
    offering: {
      productTitle: string;
      sourceIdentity: string;
      startDate: string | null;
      endDate: string | null;
      ageMin: number | null;
      ageMax: number | null;
      playerPriceAmount: number | null;
      goaliePriceAmount: number | null;
      currency: string;
      soldOut: boolean;
      venueName: string | null;
      registrationUrl: string;
    } | null;
  }>;
};

function loadProduct(sourceId: string) {
  const product = FRONT_LINE_HOCKEY_PRODUCTS.find((row) => row.id === sourceId);
  assert.ok(product);
  const html = readBenchmark(FIXTURES[sourceId]);
  const document = cleanHtmlToDocument(html, { baseUrl: product.url });
  const source = frontLineHockeySourceById(sourceId, new Date("2026-09-19T16:00:00.000Z"));
  const snapshot: CampSourceSnapshot = {
    id: `snap-${sourceId}`,
    sourceId,
    retrievedAt: "2026-09-19T16:00:00.000Z",
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(html),
    rawContent: html,
    fetchStatus: "success",
  };
  return { html, document, source, snapshot, url: product.url };
}

describe("Front Line Hockey product gold (Prompt 9B-C1)", () => {
  it("resolves to the Front Line extractor, not generic_html", () => {
    const { source, document, html } = loadProduct(FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
    assert.equal(
      resolveExtractor({ source, document, rawHtml: html }).key,
      FRONT_LINE_HOCKEY_EXTRACTOR_KEY,
    );
  });

  it("extracts six product pages / six offerings", () => {
    assert.equal(FRONT_LINE_HOCKEY_PRODUCTS.length, 6);
    assert.equal(expected.benchmark.goldSourcePageCount, 6);
    assert.equal(expected.benchmark.goldOfferingCount, 6);
    const identities = FRONT_LINE_HOCKEY_PRODUCTS.map((product) => {
      const { html, document, url } = loadProduct(product.id);
      const facts = parseFrontLineHockeyFacts(document, { sourceUrl: url, rawHtml: html });
      assert.ok(facts.offering);
      assert.equal(facts.offering.currency, "unknown");
      assert.equal(facts.offering.registrationUrl, url);
      assert.match(facts.offering.sourceIdentity, /^front_line_hockey:session:/);
      return facts.offering.sourceIdentity;
    });
    assert.equal(new Set(identities).size, 6);
    assert.deepEqual(identities, expected.identity.keys);
  });

  it("does not treat SKU years or image-path years as the camp year", () => {
    const { html, document } = loadProduct(FRONT_LINE_HOCKEY_APRIL_SOURCE_ID);
    assert.match(html, /april2023/);
    assert.match(html, /Hockey-School-Mississauga-2016/);
    assert.equal(statedDocumentYear(document), 2026);
    const facts = parseFrontLineHockeyFacts(document, {
      sourceUrl: "https://frontlinehockeyschool.ca/product/april-hockey-camp/",
      rawHtml: html,
    });
    assert.equal(facts.offering?.statedYear, 2026);
    assert.doesNotMatch(facts.offering?.sourceIdentity ?? "", /2023|2016/);
  });

  it("keeps April player $375 and goalie FREE without collapsing them", () => {
    const { html, document, url } = loadProduct(FRONT_LINE_HOCKEY_APRIL_SOURCE_ID);
    const facts = parseFrontLineHockeyFacts(document, { sourceUrl: url, rawHtml: html });
    assert.equal(facts.offering?.playerPriceAmount, 375);
    assert.equal(facts.offering?.goaliePriceAmount, 0);
    assert.match(facts.offering?.playerPriceCopy ?? "", /\$375/);
    assert.match(facts.offering?.goaliePriceCopy ?? "", /FREE/i);
    assert.equal(facts.offering?.currency, "unknown");
    assert.equal(facts.offering?.startDate, "2026-04-14");
    assert.equal(facts.offering?.endDate, "2026-04-23");
    assert.equal(facts.offering?.ageMin, 8);
    assert.equal(facts.offering?.ageMax, 14);
    assert.equal(facts.offering?.venueName, "Vic Johnston Arena");
    assert.ok(facts.warnings.includes("hockey_level_copy_not_converted_to_ages"));
    const ageAttempt = normalizeAgeRange("House League Red/white, Rep and A");
    assert.equal(ageAttempt.value.ageMin, null);
  });

  it("keeps July player $395 and goalie $100 as variants of one offering", () => {
    const { html, document, url } = loadProduct(FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
    const facts = parseFrontLineHockeyFacts(document, { sourceUrl: url, rawHtml: html });
    const variations = parseFrontLineWooVariations(html);
    assert.equal(variations.length, 2);
    assert.equal(facts.offering?.playerPriceAmount, 395);
    assert.equal(facts.offering?.goaliePriceAmount, 100);
    assert.equal(facts.offering?.startDate, "2026-07-06");
    assert.equal(facts.offering?.endDate, "2026-07-10");
    assert.equal(facts.offering?.ageMin, 5);
    assert.equal(facts.offering?.ageMax, 14);
    assert.match(facts.offering?.eligibilityCopy ?? "", /ages 5-9 and 10-14/i);
    assert.equal(facts.offering?.coreHoursStart, "09:00");
    assert.equal(facts.offering?.coreHoursEnd, "13:00");
    assert.equal(facts.offering?.soldOut, false);
    assert.equal(facts.offering?.sourceIdentity, "front_line_hockey:session:half_day:2026-07-06_2026-07-10");
  });

  it("keeps 5–9 and 10–14 recoverable as structured bands of one offering", () => {
    const july = loadProduct(FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
    const julyFacts = parseFrontLineHockeyFacts(july.document, {
      sourceUrl: july.url,
      rawHtml: july.html,
    });
    assert.equal(julyFacts.offering?.ageMin, 5);
    assert.equal(julyFacts.offering?.ageMax, 14);
    assert.deepEqual(
      julyFacts.offering?.ageBands.map((band) => ({
        ageMin: band.ageMin,
        ageMax: band.ageMax,
        hoursStart: band.hoursStart,
        hoursEnd: band.hoursEnd,
      })),
      [
        { ageMin: 5, ageMax: 9, hoursStart: null, hoursEnd: null },
        { ageMin: 10, ageMax: 14, hoursStart: null, hoursEnd: null },
      ],
    );
    assert.match(julyFacts.offering?.ageBands[0]?.copy ?? "", /5–9|5-9/);
    assert.match(julyFacts.offering?.ageBands[1]?.copy ?? "", /10–14|10-14/);
    assert.match(julyFacts.raw.eligibility ?? "", /ages 5-9 and 10-14/i);

    const august = loadProduct("src-front-line-hockey-august-full-day");
    const augustFacts = parseFrontLineHockeyFacts(august.document, {
      sourceUrl: august.url,
      rawHtml: august.html,
    });
    assert.deepEqual(
      augustFacts.offering?.ageBands.map((band) => [band.ageMin, band.ageMax]),
      [
        [5, 9],
        [10, 14],
      ],
    );

    const december = loadProduct("src-front-line-hockey-december-mid-season");
    const decemberFacts = parseFrontLineHockeyFacts(december.document, {
      sourceUrl: december.url,
      rawHtml: december.html,
    });
    assert.equal(decemberFacts.offering?.ageMin, 5);
    assert.equal(decemberFacts.offering?.ageMax, 14);
    assert.deepEqual(
      decemberFacts.offering?.ageBands.map((band) => ({
        ageMin: band.ageMin,
        ageMax: band.ageMax,
        hoursStart: band.hoursStart,
        hoursEnd: band.hoursEnd,
      })),
      [
        { ageMin: 5, ageMax: 9, hoursStart: "10:00", hoursEnd: "11:30" },
        { ageMin: 10, ageMax: 14, hoursStart: "11:30", hoursEnd: "13:00" },
      ],
    );
    assert.equal(decemberFacts.offering?.coreHoursStart, null);
    assert.equal(decemberFacts.offering?.coreHoursEnd, null);
  });

  it("does not adopt generic $→CAD", () => {
    const generic = normalizePriceCad("$395.00 plus HST");
    assert.equal(generic.value.currency, "CAD");
    const { html, document, url } = loadProduct(FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
    const facts = parseFrontLineHockeyFacts(document, { sourceUrl: url, rawHtml: html });
    assert.equal(facts.offering?.currency, "unknown");
    assert.equal(facts.warnings.includes("currency_symbol_only_assumed_cad"), false);
  });

  it("leaves Fall dates, ages, and venue unknown when this product omits them", () => {
    const { html, document, url } = loadProduct("src-front-line-hockey-fall-pre-evaluation");
    const facts = parseFrontLineHockeyFacts(document, { sourceUrl: url, rawHtml: html });
    assert.equal(facts.offering?.productTitle.includes("Fall 2026"), true);
    assert.equal(facts.offering?.startDate, null);
    assert.equal(facts.offering?.endDate, null);
    assert.equal(facts.offering?.ageMin, null);
    assert.equal(facts.offering?.venueName, null);
    assert.equal(facts.offering?.playerPriceAmount, 375);
    assert.equal(facts.offering?.goaliePriceAmount, null);
    assert.equal(facts.offering?.rawGoalieVariantAmount, 1);
    assert.equal(facts.raw.rawGoalieVariantAmount, 1);
    assert.match(facts.raw.goalieVariationDescription ?? "", /FREE/i);
    assert.ok(facts.warnings.includes("variant_amount_not_confirmed_as_customer_facing_price"));
    assert.equal(facts.warnings.includes("woocommerce_one_dollar_goalie_price_unexplained"), false);
    assert.equal(facts.venue, null);
    assert.ok(facts.warnings.includes("venue_not_stated_on_this_product"));
    assert.ok(facts.knownGaps.includes("venue_not_borrowed_from_other_front_line_pages"));
  });

  it("preserves December TBD dates and FREE goalies", () => {
    const { html, document, url } = loadProduct("src-front-line-hockey-december-mid-season");
    const facts = parseFrontLineHockeyFacts(document, { sourceUrl: url, rawHtml: html });
    assert.equal(facts.offering?.datesTbd, true);
    assert.equal(facts.offering?.startDate, null);
    assert.equal(facts.offering?.playerPriceAmount, 250);
    assert.equal(facts.offering?.goaliePriceAmount, 0);
    assert.equal(facts.offering?.ageMin, 5);
    assert.equal(facts.offering?.ageMax, 14);
    assert.match(facts.offering?.sourceIdentity ?? "", /dates_tbd/);
  });

  it("does not infer remaining seats or close registration because Add to Cart exists", () => {
    const { html, document, source, snapshot } = loadProduct(FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
    const result = frontLineHockeyExtractor.extract({
      source,
      snapshot,
      document,
      rawHtml: html,
      extractionRunId: "run-fl-july",
      newId: createSequentialIdFactory("fl"),
      now: new Date("2026-09-19T16:00:00.000Z"),
    });
    const session = result.records.find((record) => record.recordType === "session");
    assert.ok(session);
    assert.equal(session.normalizedFields.seatAvailability, null);
    assert.equal(session.normalizedFields.registrationStatus, null);
    assert.equal(session.normalizedFields.currency, "unknown");
    assert.equal(session.normalizedFields.registrationUrl, source.canonicalUrl);
    assert.equal(session.rawFields.sourceId, FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
    assert.ok(result.warnings.includes("woocommerce_stock_count_not_used_as_remaining_seats"));
  });

  it("does not collide April and July identities", () => {
    const april = loadProduct(FRONT_LINE_HOCKEY_APRIL_SOURCE_ID);
    const july = loadProduct(FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
    const aprilFacts = parseFrontLineHockeyFacts(april.document, {
      sourceUrl: april.url,
      rawHtml: april.html,
    });
    const julyFacts = parseFrontLineHockeyFacts(july.document, {
      sourceUrl: july.url,
      rawHtml: july.html,
    });
    assert.notEqual(aprilFacts.offering?.sourceIdentity, julyFacts.offering?.sourceIdentity);
    const match = exactSessionMatcher.match(
      {
        id: "extracted-july",
        extractionRunId: "run",
        recordType: "session",
        sourceIdentity: julyFacts.offering!.sourceIdentity,
        rawFields: {},
        normalizedFields: {
          programId: "prog-fl",
          externalId: julyFacts.offering!.sourceIdentity,
        },
        confidence: 1,
        warnings: [],
      },
      [
        {
          id: "catalog-april",
          programId: "prog-fl",
          startDate: "2026-04-14",
          endDate: "2026-04-23",
          ageMin: 8,
          ageMax: 14,
          externalId: aprilFacts.offering!.sourceIdentity,
          sourceUrl: april.url,
        },
      ],
      FRONT_LINE_HOCKEY_OFFERING_GRAIN,
    );
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
  });

  it("keeps the same identity when only the product URL chrome differs", () => {
    const { html, document } = loadProduct(FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
    const wwwUrl = "https://www.frontlinehockeyschool.ca/product/july-hockey-camp-2/?utm=nav";
    const factsA = parseFrontLineHockeyFacts(document, {
      sourceUrl: FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
      rawHtml: html,
    });
    const factsB = parseFrontLineHockeyFacts(document, { sourceUrl: wwwUrl, rawHtml: html });
    assert.equal(factsA.offering?.sourceIdentity, factsB.offering?.sourceIdentity);
  });

  it("does not create a new session when only the product URL slug differs", () => {
    const { html, document } = loadProduct(FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
    const duplicateUrl = "https://frontlinehockeyschool.ca/product/july-hockey-camp/?ref=duplicate";
    const factsA = parseFrontLineHockeyFacts(document, {
      sourceUrl: FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
      rawHtml: html,
    });
    const factsB = parseFrontLineHockeyFacts(document, {
      sourceUrl: duplicateUrl,
      rawHtml: html,
    });
    assert.equal(factsA.offering?.productSlug, "july-hockey-camp-2");
    assert.equal(factsB.offering?.productSlug, "july-hockey-camp");
    assert.equal(factsA.offering?.campToken, "half_day");
    assert.equal(factsB.offering?.campToken, "half_day");
    assert.equal(factsA.offering?.sourceIdentity, factsB.offering?.sourceIdentity);
    assert.equal(
      factsA.offering?.sourceIdentity,
      "front_line_hockey:session:half_day:2026-07-06_2026-07-10",
    );
  });
});
