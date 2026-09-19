/**
 * Offline benchmark: the saved Riverwood Conservancy summer-camp page must
 * reproduce the recorded facts with no network access.
 *
 * Prompt 9B-B grain: one session per stated date window (gold: 8 labelled weeks
 * split to 9 windows / 9 offerings because Week 1 is discontinuous).
 * Identity: riverwood_conservancy:session:{MM-DD}_{MM-DD}
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import { normalizeAgeRange } from "@/lib/camps/ingestion/normalize/ageRange";
import {
  RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY,
  parseRiverwoodConservancyFacts,
  parseRiverwoodGradeEligibility,
  parseRiverwoodSchedule,
  riverwoodConservancyExtractor,
} from "@/lib/camps/ingestion/extractors/riverwoodConservancyExtractor";
import { parseMonthDayWindows } from "@/lib/camps/ingestion/normalize/monthDayWindow";
import { normalizePriceCad } from "@/lib/camps/ingestion/normalize/price";
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
  RIVERWOOD_CONSERVANCY_SOURCE_URL,
  riverwoodConservancySource,
} from "@/lib/camps/ingestion/sources/seedSources";

const BENCHMARK_DIR = "../../../../data/camps/ingestion/benchmarks";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const savedHtml = readBenchmark("riverwood-conservancy-summercamp.html");
const expected = JSON.parse(readBenchmark("riverwood-conservancy.expected.json")) as {
  benchmark: {
    extractorKey: string;
    extractorVersion: string;
    status: string;
    sourceUrl: string;
    labelledWeekCount: number;
    weekCount: number;
    offeringCount: number;
  };
  identity: {
    formula: string;
    keys: string[];
  };
  facts: {
    provider: { name: string; registrationPlatform: string | null };
    venue: { name: string; addressLine: string; city: string | null };
    program: {
      name: string;
      coreHoursStart: string | null;
      coreHoursEnd: string | null;
      seasonStartDate: null;
      registrationUrl: null;
    };
    gradeEligibility: { gradeMin: number; gradeMax: number; copy: string };
    enrolmentCapPerWeek: number | null;
    prePostCampCareOffered: false | null;
    informationGuidePdfUrl: string | null;
    warnings: string[];
    offerings: Array<{
      listedWeekNumber: number;
      weekIdentity: string;
      listedDateWindow: string;
      startDate: null;
      endDate: null;
      isShortWeek: boolean;
      dayCount: number | null;
      priceAmount: number | null;
      currency: string;
      soldOut: boolean;
      sourceIdentity: string;
    }>;
  };
};

const document = cleanHtmlToDocument(savedHtml, { baseUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL });
const source: CampSource = {
  ...riverwoodConservancySource(new Date("2026-09-19T16:00:00.000Z")),
};
const snapshot: CampSourceSnapshot = {
  id: "snap-riverwood-benchmark",
  sourceId: source.id,
  retrievedAt: "2026-09-19T16:00:00.000Z",
  httpStatus: 200,
  contentType: "text/html",
  contentHash: hashSourceContent(savedHtml),
  rawContent: savedHtml,
  fetchStatus: "success",
};

function runExtractor() {
  return riverwoodConservancyExtractor.extract({
    source,
    snapshot,
    document,
    rawHtml: savedHtml,
    extractionRunId: "run-riverwood-benchmark",
    newId: createSequentialIdFactory("ext"),
    now: new Date("2026-09-19T16:00:00.000Z"),
  });
}

describe("Riverwood Conservancy date windows", () => {
  it("uses the shared yearless month/day splitter for discontinuous Week 1", () => {
    const windows = parseMonthDayWindows("June 29 – 30, July 2 – 3");
    assert.deepEqual(
      windows.map((window) => window.weekIdentity),
      ["06-29_06-30", "07-02_07-03"],
    );
    assert.ok(windows.every((window) => window.startDate === null && window.endDate === null));
  });

  it("keeps a Mon–Tue window as two days, not a five-day week", () => {
    const parsed = parseRiverwoodSchedule([
      "Week 1: June 29 – 30, July 2 – 3 | $360 per child – SOLD OUT",
    ]);
    assert.equal(parsed.offerings.length, 2);
    assert.deepEqual(
      parsed.offerings.map((offering) => ({
        weekIdentity: offering.weekIdentity,
        dayCount: offering.dayCount,
        isShortWeek: offering.isShortWeek,
      })),
      [
        { weekIdentity: "06-29_06-30", dayCount: 2, isShortWeek: true },
        { weekIdentity: "07-02_07-03", dayCount: 2, isShortWeek: true },
      ],
    );
  });
});

describe("Riverwood Conservancy benchmark (Prompt 9B-B grain)", () => {
  it("does not treat footer, PDF path, or asset years as a document year", () => {
    assert.equal(statedDocumentYear(document), null);
    assert.match(savedHtml, /2026 The Riverwood Conservancy/);
    assert.match(savedHtml, /2026-Camp-Riverwood-Summer-Day-Camp-Information-Guide\.pdf/);
    assert.match(savedHtml, /wp-content\/uploads\/2025\//);
  });

  it("resolves to the Riverwood extractor, not generic_html", () => {
    assert.equal(
      resolveExtractor({ source, document, rawHtml: savedHtml }).key,
      RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY,
    );
  });

  it("extracts 9 date windows / 9 offerings from 8 labelled weeks", () => {
    const facts = parseRiverwoodConservancyFacts(document, {
      sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
    });
    assert.equal(facts.weeks.length, 9);
    assert.equal(facts.offerings.length, 9);
    assert.equal(expected.benchmark.labelledWeekCount, 8);
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

  it("never converts Grades 1–6 into invented ages", () => {
    const facts = parseRiverwoodConservancyFacts(document, {
      sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
    });
    assert.equal(facts.gradeEligibility?.gradeMin, 1);
    assert.equal(facts.gradeEligibility?.gradeMax, 6);
    assert.match(facts.gradeEligibility?.copy ?? "", /Grade 1, 2, 3, 4, 5, or 6/);
    const ageAttempt = normalizeAgeRange(facts.gradeEligibility!.copy);
    assert.equal(ageAttempt.value.ageMin, null);
    assert.equal(ageAttempt.value.ageMax, null);
    assert.ok(ageAttempt.warnings.includes("grade_band_not_age"));
    assert.equal(parseRiverwoodGradeEligibility(facts.gradeEligibility!.copy)?.gradeMin, 1);

    const result = runExtractor();
    const sessions = result.records.filter((record) => record.recordType === "session");
    assert.equal(sessions.length, 9);
    for (const session of sessions) {
      assert.equal(session.normalizedFields.ageMin, null);
      assert.equal(session.normalizedFields.ageMax, null);
      assert.equal(session.normalizedFields.gradeMin, 1);
      assert.equal(session.normalizedFields.gradeMax, 6);
    }
    const program = result.records.find((record) => record.recordType === "program");
    assert.ok(program);
    assert.equal(program.normalizedFields.typicalAgeMin, null);
    assert.equal(program.normalizedFields.typicalAgeMax, null);
    assert.equal(program.normalizedFields.marketingAgeMin, null);
    assert.equal(program.normalizedFields.marketingAgeMax, null);
  });

  it("matches gold facts for venue, hours, prices, SOLD OUT, and capacity", () => {
    const facts = parseRiverwoodConservancyFacts(document, {
      sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
    });
    assert.equal(facts.provider.name, "The Riverwood Conservancy");
    assert.equal(facts.provider.registrationPlatform, null);
    assert.equal(facts.venue?.name, "Chappell House");
    assert.equal(facts.venue?.addressLine, "4300 Riverwood Park Lane");
    assert.equal(facts.venue?.city, null);
    assert.equal(facts.program.name, "Camp Riverwood");
    assert.equal(facts.program.coreHoursStart, "09:00");
    assert.equal(facts.program.coreHoursEnd, "15:30");
    assert.equal(facts.program.seasonStartDate, null);
    assert.equal(facts.program.registrationUrl, null);
    assert.equal(facts.enrolmentCapPerWeek, 16);
    assert.equal(facts.prePostCampCareOffered, false);
    assert.ok(facts.offerings.every((offering) => offering.soldOut));
    assert.deepEqual(
      facts.offerings.filter((offering) => offering.isShortWeek).map((offering) => offering.weekIdentity),
      ["06-29_06-30", "07-02_07-03", "08-04_08-07"],
    );
    assert.equal(facts.offerings.find((offering) => offering.weekIdentity === "07-06_07-10")?.priceAmount, 450);
    assert.equal(facts.offerings.find((offering) => offering.weekIdentity === "06-29_06-30")?.priceAmount, 360);
    assert.equal(facts.offerings.find((offering) => offering.weekIdentity === "07-06_07-10")?.currency, "unknown");
    assert.equal(facts.offerings.find((offering) => offering.weekIdentity === "06-29_06-30")?.currency, "unknown");
    assert.deepEqual(
      facts.offerings.map((offering) => ({
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
      expected.facts.offerings,
    );
  });

  it("maps SOLD OUT to confirmed_full without closing registration or inventing a seat count", () => {
    const result = runExtractor();
    const sessions = result.records.filter((record) => record.recordType === "session");
    assert.equal(sessions.length, 9);
    for (const session of sessions) {
      assert.equal(session.normalizedFields.seatAvailability, "confirmed_full");
      assert.equal(session.normalizedFields.registrationStatus, null);
      assert.equal(session.normalizedFields.enrolmentCapPerWeek, 16);
      assert.notEqual(session.normalizedFields.seatAvailability, 0);
      assert.notEqual(session.normalizedFields.seatAvailability, 16);
      assert.match(String(session.rawFields.availabilityCopy), /SOLD OUT/i);
      const observations = session.normalizedFields.observations as Record<
        string,
        { value: unknown; rawValue: string | null }
      >;
      assert.match(String(observations.seatAvailability.rawValue), /SOLD OUT/i);
      assert.equal(observations.seatAvailability.value, "confirmed_full");
      assert.equal(observations.enrolmentCapPerWeek.value, 16);
      assert.ok(session.warnings.includes("sold_out_mapped_to_confirmed_full_not_registration_closed"));
    }
  });

  it("preserves explicit no-care and does not fetch the PDF or invent a registration URL", () => {
    const facts = parseRiverwoodConservancyFacts(document, {
      sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
    });
    assert.equal(facts.prePostCampCareOffered, false);
    assert.match(facts.latePickupFeeCopy ?? "", /will not provide pre- or post-camp care/i);
    assert.match(
      facts.informationGuidePdfUrl ?? "",
      /2026-Camp-Riverwood-Summer-Day-Camp-Information-Guide\.pdf$/,
    );
    assert.ok(facts.knownGaps.includes("camp_information_guide_pdf_not_fetched"));
    assert.ok(facts.knownGaps.includes("no_registration_url_on_html"));

    const result = runExtractor();
    const sessions = result.records.filter((record) => record.recordType === "session");
    for (const session of sessions) {
      assert.equal(session.normalizedFields.registrationUrl, null);
      assert.deepEqual(session.normalizedFields.beforeCare, { offered: "no" });
      assert.deepEqual(session.normalizedFields.afterCare, { offered: "no" });
    }
    assert.doesNotMatch(savedHtml, /https:\/\/forms\.gle/);
  });

  it("is independent of HTML order", () => {
    const facts = parseRiverwoodConservancyFacts(document, {
      sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
    });
    const reversedLines = document.text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .reverse();
    const reversed = parseRiverwoodConservancyFacts(
      { ...document, text: reversedLines.join("\n") },
      { sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL },
    );
    assert.deepEqual(
      reversed.offerings.map((offering) => offering.sourceIdentity),
      facts.offerings.map((offering) => offering.sourceIdentity),
    );
  });

  it("extracts records without inventing ISO dates or remaining seats", () => {
    const result = runExtractor();
    assert.equal(result.status, expected.benchmark.status);
    assert.equal(riverwoodConservancyExtractor.version, expected.benchmark.extractorVersion);
    const sessions = result.records.filter((record) => record.recordType === "session");
    assert.equal(sessions.length, 9);
    for (const session of sessions) {
      assert.equal(session.normalizedFields.startDate, null);
      assert.equal(session.normalizedFields.endDate, null);
      assert.equal(session.normalizedFields.currency, "unknown");
      assert.ok(session.warnings.includes("year_not_stated"));
      assert.ok(session.warnings.includes("grades_not_converted_to_ages"));
    }
    assert.equal(result.records.filter((record) => record.recordType === "provider").length, 1);
    assert.equal(result.records.filter((record) => record.recordType === "venue").length, 1);
    assert.equal(result.records.filter((record) => record.recordType === "program").length, 1);
  });

  it("treats sourceIdentity as matcher identity when ISO dates are unparsed", () => {
    const result = runExtractor();
    const session = result.records.find(
      (record) => record.sourceIdentity === "riverwood_conservancy:session:07-06_07-10",
    );
    assert.ok(session);
    const catalog = [
      {
        id: "catalog-riverwood-july-6",
        programId: "prog-riverwood",
        startDate: null,
        endDate: null,
        ageMin: null,
        ageMax: null,
        externalId: session.sourceIdentity,
        sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
      },
    ];
    const withProgram = {
      ...session,
      normalizedFields: {
        ...session.normalizedFields,
        programId: "prog-riverwood",
        externalId: session.sourceIdentity,
      },
    };
    const match = exactSessionMatcher.match(withProgram, catalog);
    assert.equal(match.catalogId, "catalog-riverwood-july-6");
    assert.equal(isNewSessionCandidate(withProgram, []), true);
  });

  it("does not silently rematch an identity-changing date window", () => {
    const result = runExtractor();
    const session = result.records.find(
      (record) => record.sourceIdentity === "riverwood_conservancy:session:07-06_07-10",
    );
    assert.ok(session);
    const newIdentity = "riverwood_conservancy:session:07-06_07-11";
    const changed = {
      ...session,
      sourceIdentity: newIdentity,
      normalizedFields: {
        ...session.normalizedFields,
        programId: "prog-riverwood",
        weekIdentity: "07-06_07-11",
        listedDateWindow: "July 6 – 11",
        externalId: newIdentity,
      },
    };
    const match = exactSessionMatcher.match(changed, [
      {
        id: "catalog-riverwood-july-6",
        programId: "prog-riverwood",
        startDate: null,
        endDate: null,
        ageMin: null,
        ageMax: null,
        externalId: session.sourceIdentity,
        sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
      },
    ]);
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
  });

  it("keeps $360 / $450 amounts without inventing CAD", () => {
    const generic = normalizePriceCad("$360 per child");
    assert.equal(generic.value.amount, 360);
    assert.equal(generic.value.currency, "CAD");
    assert.ok(generic.warnings.includes("currency_symbol_only_assumed_cad"));

    assert.doesNotMatch(savedHtml, /\bCAD\b|\bCDN\b|\bOntario\b|\bMississauga\b|\bCanada\b/);

    const facts = parseRiverwoodConservancyFacts(document, {
      sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
    });
    const week1 = facts.offerings.find((offering) => offering.weekIdentity === "06-29_06-30");
    const week2 = facts.offerings.find((offering) => offering.weekIdentity === "07-06_07-10");
    assert.ok(week1);
    assert.ok(week2);
    assert.equal(week1.priceAmount, 360);
    assert.equal(week2.priceAmount, 450);
    assert.match(week1.rawFee, /\$360/);
    assert.match(week2.rawFee, /\$450/);
    assert.equal(week1.currency, "unknown");
    assert.equal(week2.currency, "unknown");
    assert.ok(facts.warnings.includes("currency_not_stated"));
    assert.equal(facts.warnings.includes("currency_symbol_only_assumed_cad"), false);

    const result = runExtractor();
    for (const session of result.records.filter((record) => record.recordType === "session")) {
      assert.equal(session.normalizedFields.currency, "unknown");
      assert.match(String(session.rawFields.rawFee), /\$\d+/);
    }
  });

  it("yearless annual repeat keeps the same identity and does not borrow footer or PDF years", () => {
    const season = (footerYear: string, pdfYear: string, chrome: string) =>
      cleanHtmlToDocument(
        `<html><head><title>Summer Camp – The Riverwood Conservancy</title></head><body>
<h1>Summer Camp</h1>
<p>Children who have completed Grade 1, 2, 3, 4, 5, or 6 can spend a week adventuring.</p>
<p>Week 2: July 6 – 10 | $450 per child – SOLD OUT</p>
<p>Camp runs from 9:00 am – 3:30 pm each day</p>
<p>Dropoff and Pickup at Chappell House – 4300 Riverwood Park Lane</p>
<p>Enrolment for each week of Camp Riverwood is limited to 16 children</p>
<p>PLEASE NOTE: We will not provide pre- or post-camp care.</p>
<a href="https://theriverwoodconservancy.org/wp-content/uploads/${pdfYear}/06/${pdfYear}-Camp-Riverwood-Summer-Day-Camp-Information-Guide.pdf">Read More</a>
<footer>${footerYear} The Riverwood Conservancy</footer>
${chrome}
</body></html>`,
        { baseUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL },
      );

    const seasonA = parseRiverwoodConservancyFacts(
      season("2026", "2026", "<!-- season A; year is still not stated in camp copy -->"),
      { sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL },
    );
    const seasonB = parseRiverwoodConservancyFacts(
      season("2027", "2027", "<!-- season B; later year, still not stated in camp copy -->"),
      { sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL },
    );

    assert.equal(statedDocumentYear(season("2026", "2026", "")), null);
    assert.equal(seasonA.offerings.length, 1);
    assert.equal(seasonB.offerings.length, 1);
    assert.equal(seasonA.offerings[0].sourceIdentity, "riverwood_conservancy:session:07-06_07-10");
    assert.equal(seasonA.offerings[0].sourceIdentity, seasonB.offerings[0].sourceIdentity);
    assert.equal(seasonA.offerings[0].startDate, null);
    assert.equal(seasonB.offerings[0].startDate, null);
    assert.equal(seasonA.offerings[0].weekIdentity, "07-06_07-10");
    assert.doesNotMatch(seasonA.offerings[0].sourceIdentity, /2026|2027/);
    assert.ok(seasonA.warnings.includes("year_not_stated"));
    assert.ok(seasonB.warnings.includes("year_not_stated"));
  });
});
