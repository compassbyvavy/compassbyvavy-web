/**
 * Offline benchmark: the saved Nutty Scientists summer-camp page must reproduce
 * the recorded facts with no network access.
 *
 * Prompt 9B-A grain: one session per week window × the age band that week names
 * (gold: 8 week windows / 8 offerings).
 * Identity: nutty_scientists:session:{MM-DD}_{MM-DD}:{ageMin}-{ageMax}
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import {
  NUTTY_SCIENTISTS_EXTRACTOR_KEY,
  nuttyScientistsExtractor,
  parseNuttyScientistsFacts,
  parseNuttyWeekWindows,
} from "@/lib/camps/ingestion/extractors/nuttyScientistsExtractor";
import { resolveExtractor } from "@/lib/camps/ingestion/extractors/registry";
import { statedDocumentYear } from "@/lib/camps/ingestion/extractors/textScan";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import {
  exactSessionMatcher,
  isNewSessionCandidate,
} from "@/lib/camps/ingestion/matchers";
import {
  NUTTY_SCIENTISTS_SOURCE_URL,
  nuttyScientistsSource,
} from "@/lib/camps/ingestion/sources/seedSources";

const BENCHMARK_DIR = "../../../../data/camps/ingestion/benchmarks";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const savedHtml = readBenchmark("nutty-scientists-summercamp.html");
const expected = JSON.parse(readBenchmark("nutty-scientists.expected.json")) as {
  benchmark: {
    extractorKey: string;
    extractorVersion: string;
    status: string;
    sourceUrl: string;
    weekCount: number;
    offeringCount: number;
  };
  identity: {
    formula: string;
    keys: string[];
  };
  facts: {
    provider: { name: string; registrationPlatform: string | null };
    venue: { name: string | null; addressLine: string; city: string; postalCode: string | null };
    program: {
      name: string | null;
      coreHoursStart: string | null;
      coreHoursEnd: string | null;
      seasonStartDate: null;
      registrationUrl: null;
    };
    priceTiers: Array<{
      key: string;
      priceAmount: number | null;
      priceUnit: string | null;
      taxExtra?: boolean;
    }>;
    derivedAvailableAgeMin: number | null;
    derivedAvailableAgeMax: number | null;
    marketingAgeMin: number | null;
    marketingAgeMax: number | null;
    warnings: string[];
    offerings: Array<{
      weekIdentity: string;
      listedDateWindow: string;
      ageMin: number;
      ageMax: number;
      startDate: null;
      endDate: null;
      registrationUrl: string | null;
      sourceIdentity: string;
    }>;
  };
};

const document = cleanHtmlToDocument(savedHtml, { baseUrl: NUTTY_SCIENTISTS_SOURCE_URL });
const source: CampSource = {
  ...nuttyScientistsSource(new Date("2026-09-18T16:00:00.000Z")),
};
const snapshot: CampSourceSnapshot = {
  id: "snap-nutty-benchmark",
  sourceId: source.id,
  retrievedAt: "2026-09-18T16:00:00.000Z",
  httpStatus: 200,
  contentType: "text/html",
  contentHash: hashSourceContent(savedHtml),
  rawContent: savedHtml,
  fetchStatus: "success",
};

function runExtractor() {
  return nuttyScientistsExtractor.extract({
    source,
    snapshot,
    document,
    rawHtml: savedHtml,
    extractionRunId: "run-nutty-benchmark",
    newId: createSequentialIdFactory("ext"),
    now: new Date("2026-09-18T16:00:00.000Z"),
  });
}

describe("Nutty Scientists date windows", () => {
  it("parses month/day tokens without inventing a year", () => {
    const windows = parseNuttyWeekWindows("July 6th - 10th & July 13th - 17th");
    assert.deepEqual(
      windows.map((window) => ({
        weekIdentity: window.weekIdentity,
        startDate: window.startDate,
        endDate: window.endDate,
      })),
      [
        { weekIdentity: "07-06_07-10", startDate: null, endDate: null },
        { weekIdentity: "07-13_07-17", startDate: null, endDate: null },
      ],
    );
  });

  it("reads dotted August tokens and repaired ordinals", () => {
    const windows = parseNuttyWeekWindows("Aug.17th - 21st & Aug. 24th - 28t h");
    assert.deepEqual(
      windows.map((window) => window.weekIdentity),
      ["08-17_08-21", "08-24_08-28"],
    );
  });
});

describe("Nutty Scientists benchmark (Prompt 9B-A grain)", () => {
  it("does not treat asset timestamps as a document year", () => {
    assert.equal(statedDocumentYear(document), null);
    assert.match(savedHtml, /20260208092325/);
  });

  it("resolves to the Nutty extractor", () => {
    assert.equal(
      resolveExtractor({ source, document, rawHtml: savedHtml }).key,
      NUTTY_SCIENTISTS_EXTRACTOR_KEY,
    );
  });

  it("extracts 8 week windows / 8 offerings with the documented identity keys", () => {
    const facts = parseNuttyScientistsFacts(document, {
      sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
    });
    assert.equal(facts.weeks.length, 8);
    assert.equal(facts.offerings.length, 8);
    assert.equal(facts.weeks.length, facts.offerings.length);
    assert.deepEqual(
      facts.offerings.map((offering) => offering.sourceIdentity),
      expected.identity.keys,
    );
    for (const offering of facts.offerings) {
      assert.equal(offering.startDate, null);
      assert.equal(offering.endDate, null);
    }
    assert.ok(facts.warnings.includes("year_not_stated"));
  });

  it("matches gold facts for venue, hours, prices, and registration links", () => {
    const facts = parseNuttyScientistsFacts(document, {
      sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
    });
    assert.equal(facts.provider.name, expected.facts.provider.name);
    assert.equal(facts.provider.registrationPlatform, "Google Forms");
    assert.equal(facts.venue?.name, expected.facts.venue.name);
    assert.equal(facts.venue?.addressLine, expected.facts.venue.addressLine);
    assert.equal(facts.venue?.city, expected.facts.venue.city);
    assert.equal(facts.venue?.postalCode, expected.facts.venue.postalCode);
    assert.equal(facts.program.name, expected.facts.program.name);
    assert.equal(facts.program.coreHoursStart, "10:30");
    assert.equal(facts.program.coreHoursEnd, "16:00");
    assert.equal(facts.program.seasonStartDate, null);
    assert.equal(facts.program.registrationUrl, null);
    assert.equal(facts.marketingAgeMin, null);
    assert.equal(facts.marketingAgeMax, null);
    assert.equal(facts.derivedAvailableAgeMin, 5);
    assert.equal(facts.derivedAvailableAgeMax, 10);
    assert.deepEqual(
      facts.priceTiers.map((tier) => ({
        key: tier.key,
        priceAmount: tier.priceAmount,
        priceUnit: tier.priceUnit,
        taxExtra: tier.taxExtra,
      })),
      expected.facts.priceTiers,
    );
    assert.deepEqual(
      facts.offerings.map((offering) => ({
        weekIdentity: offering.weekIdentity,
        listedDateWindow: offering.listedDateWindow,
        ageMin: offering.ageMin,
        ageMax: offering.ageMax,
        startDate: offering.startDate,
        endDate: offering.endDate,
        registrationUrl: offering.registrationUrl,
        sourceIdentity: offering.sourceIdentity,
      })),
      expected.facts.offerings,
    );
    assert.ok(
      facts.offerings.every((offering) =>
        /^https:\/\/forms\.gle\//.test(offering.registrationUrl ?? ""),
      ),
    );
  });

  it("is independent of HTML order", () => {
    const facts = parseNuttyScientistsFacts(document, {
      sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
    });
    const reversedLines = document.text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .reverse();
    const reversedDocument = {
      ...document,
      text: reversedLines.join("\n"),
    };
    const reversed = parseNuttyScientistsFacts(reversedDocument, {
      sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
    });
    assert.deepEqual(
      reversed.offerings.map((offering) => offering.sourceIdentity),
      facts.offerings.map((offering) => offering.sourceIdentity),
    );
  });

  it("keeps all three stated prices recoverable from the extraction payload", () => {
    const facts = parseNuttyScientistsFacts(document, {
      sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
    });
    const byKey = Object.fromEntries(facts.priceTiers.map((tier) => [tier.key, tier]));
    assert.equal(byKey.one_week.priceAmount, 399);
    assert.equal(byKey.one_week.priceUnit, "per_week");
    assert.equal(byKey.one_week.taxExtra, true);
    assert.equal(byKey.two_week.priceAmount, 599);
    assert.equal(byKey.two_week.taxExtra, true);
    assert.equal(byKey.one_day.priceAmount, 105);
    assert.equal(byKey.one_day.priceUnit, "per_day");
    assert.equal(byKey.one_day.taxExtra, true);
    assert.match(byKey.one_week.rawFee, /\$399\.00\s*\+\s*tax/i);
    assert.match(byKey.two_week.rawFee, /\$599\.00\s*\+\s*tax/i);
    assert.match(byKey.one_day.rawFee, /\$105\.00\s*\+\s*tax/i);

    const result = runExtractor();
    const program = result.records.find((record) => record.recordType === "program");
    assert.ok(program);
    const payloadTiers = program.rawFields.priceTiers as typeof facts.priceTiers;
    const normalizedTiers = program.normalizedFields.priceTiers as typeof facts.priceTiers;
    const feeRows = (program.normalizedFields.policies as { feeRows: string[] }).feeRows;
    assert.deepEqual(
      payloadTiers.map((tier) => ({
        key: tier.key,
        priceAmount: tier.priceAmount,
        taxExtra: tier.taxExtra,
      })),
      [
        { key: "two_week", priceAmount: 599, taxExtra: true },
        { key: "one_week", priceAmount: 399, taxExtra: true },
        { key: "one_day", priceAmount: 105, taxExtra: true },
      ],
    );
    assert.deepEqual(normalizedTiers, payloadTiers);
    assert.ok(feeRows.some((row) => /\$399\.00/.test(row) && /\+\s*tax/i.test(row)));
    assert.ok(feeRows.some((row) => /\$599\.00/.test(row) && /\+\s*tax/i.test(row)));
    assert.ok(feeRows.some((row) => /\$105\.00/.test(row) && /\+\s*tax/i.test(row)));

    const sessions = result.records.filter((record) => record.recordType === "session");
    for (const session of sessions) {
      assert.equal(session.normalizedFields.priceAmount, 399);
      assert.equal(session.normalizedFields.priceUnit, "per_week");
      const sessionTiers = session.rawFields.priceTiers as typeof facts.priceTiers;
      assert.equal(sessionTiers.find((tier) => tier.key === "two_week")?.priceAmount, 599);
      assert.equal(sessionTiers.find((tier) => tier.key === "one_day")?.priceAmount, 105);
    }
  });

  it("retains 'Few spots left' as source copy without inventing capacity", () => {
    const facts = parseNuttyScientistsFacts(document, {
      sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
    });
    assert.ok(facts.raw.scarcityCopy.length > 0);
    assert.ok(facts.raw.scarcityCopy.some((line) => /few spots left/i.test(line)));

    const result = runExtractor();
    const program = result.records.find((record) => record.recordType === "program");
    assert.ok(program);
    const programCopy = program.rawFields.scarcityCopy as string[];
    assert.ok(programCopy.some((line) => /few spots left/i.test(line)));
    const observations = program.normalizedFields.observations as Record<
      string,
      { value: unknown; rawValue: string | null }
    >;
    assert.match(String(observations.scarcityCopy.rawValue), /few spots left/i);

    const sessions = result.records.filter((record) => record.recordType === "session");
    assert.equal(sessions.length, 8);
    for (const session of sessions) {
      assert.equal(session.normalizedFields.seatAvailability, null);
      assert.equal(session.normalizedFields.registrationStatus, null);
      const copy = session.rawFields.scarcityCopy as string[];
      assert.ok(copy.some((line) => /few spots left/i.test(line)));
      assert.ok(session.warnings.includes("scarcity_copy_not_mapped_to_seat_availability"));
    }
  });

  it("extracts records without inventing ISO dates or seat counts", () => {
    const result = runExtractor();
    assert.equal(result.status, expected.benchmark.status);
    assert.equal(nuttyScientistsExtractor.version, expected.benchmark.extractorVersion);
    const sessions = result.records.filter((record) => record.recordType === "session");
    assert.equal(sessions.length, 8);
    for (const session of sessions) {
      assert.equal(session.normalizedFields.startDate, null);
      assert.equal(session.normalizedFields.endDate, null);
      assert.equal(session.normalizedFields.seatAvailability, null);
      assert.equal(session.normalizedFields.registrationStatus, null);
      assert.equal(session.normalizedFields.priceAmount, 399);
      assert.equal(session.normalizedFields.priceUnit, "per_week");
      assert.ok(session.warnings.includes("year_not_stated"));
    }
    assert.equal(
      result.records.filter((record) => record.recordType === "provider").length,
      1,
    );
    assert.equal(result.records.filter((record) => record.recordType === "venue").length, 1);
    assert.equal(result.records.filter((record) => record.recordType === "program").length, 1);
  });

  it("treats sourceIdentity as matcher identity when ISO dates are unparsed", () => {
    const result = runExtractor();
    const session = result.records.find(
      (record) => record.sourceIdentity === "nutty_scientists:session:07-06_07-10:5-7",
    );
    assert.ok(session);
    const catalog = [
      {
        id: "catalog-nutty-july-6",
        programId: "prog-nutty",
        startDate: null,
        endDate: null,
        ageMin: 5,
        ageMax: 7,
        externalId: session.sourceIdentity,
        sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
      },
    ];
    const withProgram = {
      ...session,
      normalizedFields: {
        ...session.normalizedFields,
        programId: "prog-nutty",
        externalId: session.sourceIdentity,
      },
    };
    const match = exactSessionMatcher.match(withProgram, catalog);
    assert.equal(match.catalogId, "catalog-nutty-july-6");
    assert.equal(isNewSessionCandidate(withProgram, []), true);
  });

  it("does not silently rematch an identity-changing age-band", () => {
    const result = runExtractor();
    const session = result.records.find(
      (record) => record.sourceIdentity === "nutty_scientists:session:07-06_07-10:5-7",
    );
    assert.ok(session);
    const newIdentity = "nutty_scientists:session:07-06_07-10:5-8";
    const changed = {
      ...session,
      sourceIdentity: newIdentity,
      normalizedFields: {
        ...session.normalizedFields,
        programId: "prog-nutty",
        ageMax: 8,
        externalId: newIdentity,
      },
    };
    const match = exactSessionMatcher.match(changed, [
      {
        id: "catalog-nutty-july-6",
        programId: "prog-nutty",
        startDate: null,
        endDate: null,
        ageMin: 5,
        ageMax: 7,
        externalId: session.sourceIdentity,
        sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
      },
    ]);
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
  });
});
