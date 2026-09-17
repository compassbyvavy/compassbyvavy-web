/**
 * Offline benchmark: the saved Creative Kids Place page must reproduce the
 * recorded facts with no network access.
 *
 * Prompt 8B grain: one session per week × theme × age band.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import {
  creativeKidsPlaceExtractor,
  parseCreativeKidsPlaceFacts,
} from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
import {
  isShortSessionWindow,
  parseWeekDateWindows,
} from "@/lib/camps/ingestion/extractors/creativeKidsPlaceSchedule";
import { resolveExtractor } from "@/lib/camps/ingestion/extractors/registry";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import {
  exactSessionMatcher,
  isNewSessionCandidate,
} from "@/lib/camps/ingestion/matchers";

const BENCHMARK_DIR = "../../../../data/camps/ingestion/benchmarks";
const SOURCE_URL =
  "https://www.creativekidsplace.ca/pages/camps/summer-camp-square-one-mississauga-on";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const savedHtml = readBenchmark("creative-kids-place-square-one.html");
const expected = JSON.parse(readBenchmark("creative-kids-place.expected.json")) as {
  benchmark: {
    extractorKey: string;
    extractorVersion: string;
    status: string;
    recordTypes: string[];
    sourceUrl: string;
    weekCount: number;
    offeringCount: number;
  };
  facts: Record<string, unknown> & {
    marketingAgeMin: number;
    marketingAgeMax: number;
    derivedAvailableAgeMin: number;
    derivedAvailableAgeMax: number;
    warnings: string[];
    knownGaps: string[];
    program: { ageMin: number; ageMax: number };
    offerings: Array<{
      weekNumber: number;
      themeTitle: string;
      ageMin: number;
      ageMax: number;
      priceTierKey: string;
      priceAmount: number | null;
      startDate: string | null;
      sourceIdentity: string;
      addOnFeeCad: number | null;
      addOnLabel: string | null;
      sharedObservationKey: string;
    }>;
    weeks: unknown[];
    priceTiers: Array<{ key: string; priceAmount: number | null; priceUnit: string | null }>;
  };
};

const document = cleanHtmlToDocument(savedHtml, { baseUrl: SOURCE_URL });

const source: CampSource = {
  id: "src-creative-kids-place-square-one",
  providerId: "prov-creative-kids-place",
  sourceType: "provider_website",
  sourceUrl: SOURCE_URL,
  canonicalUrl: SOURCE_URL,
  registrationPlatform: null,
  isActive: true,
  crawlStrategy: "html",
  crawlFrequency: "daily",
  extractorKey: "creative_kids_place",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-12T16:00:00.000Z",
};

const snapshot: CampSourceSnapshot = {
  id: "snap-ckp-benchmark",
  sourceId: source.id,
  retrievedAt: "2026-09-12T16:00:00.000Z",
  httpStatus: 200,
  contentType: "text/html",
  contentHash: hashSourceContent(savedHtml),
  rawContent: savedHtml,
  fetchStatus: "success",
};

function runExtractor() {
  return creativeKidsPlaceExtractor.extract({
    source,
    snapshot,
    document,
    rawHtml: savedHtml,
    extractionRunId: "run-ckp-benchmark",
    newId: createSequentialIdFactory("ext"),
    now: new Date("2026-09-12T16:00:00.000Z"),
  });
}

describe("Creative Kids Place benchmark (Prompt 8B grain)", () => {
  it("parses discontinuous short-week segments as separate windows", () => {
    assert.deepEqual(parseWeekDateWindows("June 29-30, July 2-3", 2026), [
      { startDate: "2026-06-29", endDate: "2026-06-30" },
      { startDate: "2026-07-02", endDate: "2026-07-03" },
    ]);
    assert.deepEqual(parseWeekDateWindows("Aug. 4-7", 2026), [
      { startDate: "2026-08-04", endDate: "2026-08-07" },
    ]);
    assert.deepEqual(parseWeekDateWindows("July 6-10", 2026), [
      { startDate: "2026-07-06", endDate: "2026-07-10" },
    ]);
    assert.equal(isShortSessionWindow("2026-06-29", "2026-06-30"), true);
    assert.equal(isShortSessionWindow("2026-07-02", "2026-07-03"), true);
    assert.equal(isShortSessionWindow("2026-08-04", "2026-08-07"), true);
    assert.equal(isShortSessionWindow("2026-07-06", "2026-07-10"), false);
  });

  it("never collapses non-contiguous segments into one continuous span", () => {
    // Fee-copy style list naming all three short weeks — still three windows.
    assert.deepEqual(
      parseWeekDateWindows("June 29-30, July 2-3 & Aug. 4-7", 2026),
      [
        { startDate: "2026-06-29", endDate: "2026-06-30" },
        { startDate: "2026-07-02", endDate: "2026-07-03" },
        { startDate: "2026-08-04", endDate: "2026-08-07" },
      ],
    );

    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    const spans = facts.weeks.map((week) => `${week.startDate}|${week.endDate}`);
    assert.ok(spans.includes("2026-06-29|2026-06-30"));
    assert.ok(spans.includes("2026-07-02|2026-07-03"));
    assert.ok(spans.includes("2026-08-04|2026-08-07"));
    // Forbidden bridges: inventing Jul 1, or stitching all short weeks together.
    assert.equal(spans.includes("2026-06-29|2026-07-03"), false);
    assert.equal(spans.includes("2026-06-29|2026-08-07"), false);
    assert.ok(
      facts.offerings.every(
        (offering) =>
          !(offering.startDate === "2026-06-29" && offering.endDate === "2026-07-03") &&
          !(offering.startDate === "2026-06-29" && offering.endDate === "2026-08-07"),
      ),
    );
  });

  it("reproduces the recorded facts from the saved page", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    assert.deepEqual(JSON.parse(JSON.stringify(facts)), expected.facts);
  });

  it("keeps marketing ages 4–12 separate from derived session envelope ending at 13", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    assert.equal(facts.marketingAgeMin, 4);
    assert.equal(facts.marketingAgeMax, 12);
    assert.equal(facts.program.ageMin, 4);
    assert.equal(facts.program.ageMax, 12);
    assert.equal(facts.derivedAvailableAgeMin, 4);
    assert.equal(facts.derivedAvailableAgeMax, 13);
    assert.notEqual(facts.marketingAgeMax, facts.derivedAvailableAgeMax);
  });

  it("extracts ten session windows and ninety-three week×theme×age offerings", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    assert.equal(facts.weeks.length, 10);
    assert.equal(facts.offerings.length, 93);
    assert.equal(facts.weeks.length, expected.benchmark.weekCount);
    assert.equal(facts.offerings.length, expected.benchmark.offeringCount);
  });

  it("splits Week 1 into distinct Jun 29–30 and Jul 2–3 short-week windows", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    const week1 = facts.weeks.filter((week) => week.weekNumber === 1);
    assert.equal(week1.length, 2);
    assert.deepEqual(
      week1.map((week) => [week.startDate, week.endDate, week.isShortWeek]),
      [
        ["2026-06-29", "2026-06-30", true],
        ["2026-07-02", "2026-07-03", true],
      ],
    );
    const battlebot = facts.offerings.filter((offering) =>
      /battlebot/i.test(offering.themeTitle),
    );
    assert.equal(battlebot.length, 2);
    assert.deepEqual(
      battlebot.map((offering) => [offering.startDate, offering.endDate]).sort(),
      [
        ["2026-06-29", "2026-06-30"],
        ["2026-07-02", "2026-07-03"],
      ],
    );
    assert.notEqual(battlebot[0].sourceIdentity, battlebot[1].sourceIdentity);

    const augustShort = facts.weeks.find((week) => week.startDate === "2026-08-04");
    assert.ok(augustShort);
    assert.equal(augustShort!.endDate, "2026-08-07");
    assert.equal(augustShort!.isShortWeek, true);
  });

  it("A: Week 1 STEM 4–5 and Week 1 STEM 6–9 are distinct offerings", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    const stem = facts.offerings
      .filter(
        (o) =>
          o.weekNumber === 1 &&
          o.themeTitle === "STEM" &&
          o.startDate === "2026-06-29",
      )
      .sort((a, b) => a.ageMin - b.ageMin);
    assert.equal(stem.length, 2);
    assert.deepEqual(
      stem.map((o) => [o.ageMin, o.ageMax]),
      [
        [4, 5],
        [6, 9],
      ],
    );
    assert.notEqual(stem[0].sourceIdentity, stem[1].sourceIdentity);
  });

  it("B: same week + different themes stay distinct", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    const week3 = facts.offerings.filter((o) => o.weekNumber === 3);
    const detective = week3.find((o) => /detective/i.test(o.themeTitle));
    const pokemon = week3.find((o) => /pokemon/i.test(o.themeTitle));
    assert.ok(detective);
    assert.ok(pokemon);
    assert.notEqual(detective!.sourceIdentity, pokemon!.sourceIdentity);
  });

  it("C: same theme + age across weeks stays distinct", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    const lego = facts.offerings.filter(
      (o) => o.themeTitle === "Lego Robotics" && o.ageMin === 5 && o.ageMax === 8,
    );
    assert.ok(lego.length >= 2);
    assert.ok(new Set(lego.map((o) => o.weekNumber)).size >= 2);
    assert.equal(new Set(lego.map((o) => o.sourceIdentity)).size, lego.length);
  });

  it("Creator is not one global age band — 8–13 and 5–7 both exist", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    const creator = facts.offerings.filter((o) => /creator camp/i.test(o.themeTitle));
    assert.ok(creator.some((o) => o.ageMin === 8 && o.ageMax === 13));
    assert.ok(creator.some((o) => o.ageMin === 5 && o.ageMax === 7));
    assert.ok(creator.every((o) => o.priceAmount === 370 || o.priceAmount === 295));
  });

  it("standard-tier Ultimate Detective keeps explicit ages 8–10", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    const detective = facts.offerings.find(
      (o) => /detective/i.test(o.themeTitle) && o.ageMin === 8 && o.ageMax === 10,
    );
    assert.ok(detective);
    assert.ok(
      detective!.priceTierKey === "full_week" || detective!.priceTierKey === "short_week",
    );
    assert.notEqual(detective!.ageMin, facts.marketingAgeMin);
    assert.notEqual(detective!.ageMax, facts.marketingAgeMax);
  });

  it("On the Go Excursions keeps offering ages 6–12 and on_the_go pricing", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    const excursions = facts.offerings.filter((o) => /on the go/i.test(o.themeTitle));
    assert.ok(excursions.length >= 2);
    for (const offering of excursions) {
      assert.equal(offering.ageMin, 6);
      assert.equal(offering.ageMax, 12);
      assert.equal(offering.priceTierKey, "on_the_go");
      assert.equal(offering.priceAmount, 390);
    }
  });

  it("F: same-week offerings share add-on values and one shared observation key", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    const week2 = facts.offerings.filter((o) => o.weekNumber === 2);
    assert.ok(week2.length >= 2);
    assert.ok(week2.every((o) => o.addOnFeeCad === 10));
    assert.ok(week2.every((o) => o.addOnLabel === "African Lion Safari"));
    assert.equal(new Set(week2.map((o) => o.sharedObservationKey)).size, 1);
  });

  it("emits provider, venue, program, and one session per weekly offering", () => {
    const result = runExtractor();
    assert.equal(result.status, expected.benchmark.status);
    assert.deepEqual(
      result.records.map((record) => record.recordType),
      expected.benchmark.recordTypes,
    );
    const sessions = result.records.filter((record) => record.recordType === "session");
    assert.equal(sessions.length, 93);

    const program = result.records.find((record) => record.recordType === "program");
    assert.equal(program?.normalizedFields.typicalAgeMin, 4);
    assert.equal(program?.normalizedFields.typicalAgeMax, 12);
    assert.equal(program?.normalizedFields.marketingAgeMin, 4);
    assert.equal(program?.normalizedFields.marketingAgeMax, 12);
    assert.equal(program?.normalizedFields.derivedAvailableAgeMin, 4);
    assert.equal(program?.normalizedFields.derivedAvailableAgeMax, 13);
  });

  it("session observations carry theme/age evidence from the schedule line", () => {
    const sessions = runExtractor().records.filter((record) => record.recordType === "session");
    const stem = sessions.find(
      (record) =>
        record.normalizedFields.themeTitle === "STEM" &&
        record.normalizedFields.ageMin === 4 &&
        record.normalizedFields.weekNumber === 1,
    );
    assert.ok(stem);
    const observations = stem!.normalizedFields.observations as Record<
      string,
      { value: unknown; rawValue: string | null; sourceSnapshotId: string | null }
    >;
    assert.equal(observations.ageMin.value, 4);
    assert.equal(observations.ageMax.value, 5);
    assert.match(String(observations.themeTitle.rawValue), /STEM\s*\(4-5\)/i);
    assert.equal(observations.ageMin.sourceSnapshotId, "snap-ckp-benchmark");
  });

  it("only emits offerings tied to a weekly schedule date", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    assert.ok(facts.offerings.every((o) => o.startDate && o.weekNumber >= 1));
  });

  it("preserves known gaps and declared assumptions", () => {
    const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });
    assert.deepEqual(facts.knownGaps, expected.facts.knownGaps);
    assert.ok(facts.warnings.includes("start_year_shared_from_range"));
    assert.ok(facts.warnings.includes("currency_symbol_only_assumed_cad"));
  });

  it("is selected by the registry for this source", () => {
    assert.equal(
      resolveExtractor({ source, document, rawHtml: savedHtml }).key,
      expected.benchmark.extractorKey,
    );
    assert.equal(creativeKidsPlaceExtractor.version, expected.benchmark.extractorVersion);
  });
});

describe("CKP session matcher identity (Prompt 8B)", () => {
  const programId = "prog-ckp-summer";

  function sessionRecord(fields: Record<string, unknown>) {
    return {
      id: "ext-1",
      extractionRunId: "run-1",
      recordType: "session" as const,
      sourceIdentity: String(fields.externalId ?? "x"),
      rawFields: {},
      normalizedFields: { programId, ...fields },
      confidence: 0.9,
      warnings: [],
    };
  }

  const catalog = [
    {
      id: "sess-w1-stem-4-5",
      programId,
      externalId: "creative_kids_place:session:2026-06-29:stem:4-5",
      startDate: "2026-06-29",
      endDate: "2026-06-30",
      ageMin: 4,
      ageMax: 5,
      themeTitle: "STEM",
      themeTitleNormalized: "stem",
    },
    {
      id: "sess-w1-stem-6-9",
      programId,
      externalId: "creative_kids_place:session:2026-06-29:stem:6-9",
      startDate: "2026-06-29",
      endDate: "2026-06-30",
      ageMin: 6,
      ageMax: 9,
      themeTitle: "STEM",
      themeTitleNormalized: "stem",
    },
    {
      id: "sess-w1-detective",
      programId,
      externalId: "creative_kids_place:session:2026-06-29:ultimate-detective:8-10",
      startDate: "2026-06-29",
      endDate: "2026-06-30",
      ageMin: 8,
      ageMax: 10,
      themeTitle: "Ultimate Detective",
      themeTitleNormalized: "ultimate detective",
    },
    {
      id: "sess-w3-stem-6-9",
      programId,
      externalId: "creative_kids_place:session:2026-07-13:stem:6-9",
      startDate: "2026-07-13",
      endDate: "2026-07-17",
      ageMin: 6,
      ageMax: 9,
      themeTitle: "STEM",
      themeTitleNormalized: "stem",
    },
  ];

  it("A: does not merge Week1 STEM 4–5 with Week1 STEM 6–9", () => {
    assert.equal(
      exactSessionMatcher.match(
        sessionRecord({
          externalId: "creative_kids_place:session:2026-06-29:stem:4-5",
          startDate: "2026-06-29",
          endDate: "2026-06-30",
          ageMin: 4,
          ageMax: 5,
          themeTitle: "STEM",
        }),
        catalog,
      ).catalogId,
      "sess-w1-stem-4-5",
    );
    assert.equal(
      exactSessionMatcher.match(
        sessionRecord({
          startDate: "2026-06-29",
          endDate: "2026-06-30",
          ageMin: 6,
          ageMax: 9,
          themeTitle: "STEM",
        }),
        catalog,
      ).catalogId,
      "sess-w1-stem-6-9",
    );
  });

  it("B: same week different theme stays distinct", () => {
    assert.equal(
      exactSessionMatcher.match(
        sessionRecord({
          startDate: "2026-06-29",
          endDate: "2026-06-30",
          ageMin: 8,
          ageMax: 10,
          themeTitle: "Ultimate Detective",
        }),
        catalog,
      ).catalogId,
      "sess-w1-detective",
    );
  });

  it("C: same theme+age in another week is a different session", () => {
    assert.equal(
      exactSessionMatcher.match(
        sessionRecord({
          startDate: "2026-07-13",
          endDate: "2026-07-17",
          ageMin: 6,
          ageMax: 9,
          themeTitle: "STEM",
        }),
        catalog,
      ).catalogId,
      "sess-w3-stem-6-9",
    );
  });

  it("D: price change keeps the same matched session", () => {
    assert.equal(
      exactSessionMatcher.match(
        sessionRecord({
          externalId: "creative_kids_place:session:2026-06-29:stem:4-5",
          startDate: "2026-06-29",
          endDate: "2026-06-30",
          ageMin: 4,
          ageMax: 5,
          themeTitle: "STEM",
          priceAmount: 999,
        }),
        catalog,
      ).catalogId,
      "sess-w1-stem-4-5",
    );
  });

  it("date-only match is ambiguous when multiple themes share a week", () => {
    const match = exactSessionMatcher.match(
      sessionRecord({
        startDate: "2026-06-29",
        endDate: "2026-06-30",
      }),
      catalog,
    );
    assert.equal(match.catalogId, null);
    assert.ok(match.reasons.some((reason) => reason.startsWith("ambiguous_")));
  });

  it("Jun 29–30 and Jul 2–3 stay distinct session windows", () => {
    assert.equal(
      exactSessionMatcher.match(
        sessionRecord({
          startDate: "2026-07-02",
          endDate: "2026-07-03",
          ageMin: 4,
          ageMax: 5,
          themeTitle: "STEM",
        }),
        catalog,
      ).catalogId,
      null,
    );
  });

  it("rerun with same externalId is not a new session candidate", () => {
    assert.equal(
      isNewSessionCandidate(
        sessionRecord({
          externalId: "creative_kids_place:session:2026-06-29:stem:4-5",
          startDate: "2026-06-29",
          endDate: "2026-06-30",
          ageMin: 4,
          ageMax: 5,
          themeTitle: "STEM",
        }),
        catalog,
      ),
      false,
    );
  });
});
