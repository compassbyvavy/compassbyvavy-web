/**
 * Offline benchmark: the saved Gymnastics Mississauga summer-camp page must
 * reproduce the recorded facts with no network access.
 *
 * Prompt 9B-C2 grain: one session per dated week × attendance format
 * (gold: 10 weeks × full_day|half_day = 20 offerings). Care is an add-on.
 * Identity: gymnastics_mississauga:session:{YYYY-MM-DD}_{YYYY-MM-DD}:{full_day|half_day}
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import { normalizeAgeRange } from "@/lib/camps/ingestion/normalize/ageRange";
import {
  GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY,
  gymnasticsMississaugaExtractor,
  parseGymnasticsMississaugaFacts,
} from "@/lib/camps/ingestion/extractors/gymnasticsMississaugaExtractor";
import {
  parseGymnasticsMississaugaSchedule,
  parseGymnasticsWeekTitle,
} from "@/lib/camps/ingestion/extractors/gymnasticsMississaugaSchedule";
import { resolveExtractor } from "@/lib/camps/ingestion/extractors/registry";
import { statedDocumentYear } from "@/lib/camps/ingestion/extractors/textScan";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import {
  exactSessionMatcher,
  isNewSessionCandidate,
} from "@/lib/camps/ingestion/matchers";
import { normalizePriceCad } from "@/lib/camps/ingestion/normalize/price";
import {
  GYMNASTICS_MISSISSAUGA_SOURCE_URL,
  gymnasticsMississaugaSource,
} from "@/lib/camps/ingestion/sources/seedSources";

const BENCHMARK_DIR = "../../../../data/camps/ingestion/benchmarks";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const savedHtml = readBenchmark("gymnastics-mississauga-summer-camps.html");
const expected = JSON.parse(readBenchmark("gymnastics-mississauga.expected.json")) as {
  benchmark: {
    extractorKey: string;
    extractorVersion: string;
    status: string;
    sourceUrl: string;
    sourcePageCount: number;
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
      marketingAgeMin: number | null;
      marketingAgeMax: number | null;
      coreHoursStart: string | null;
      coreHoursEnd: string | null;
      registrationUrl: string | null;
    };
    hours: {
      fullDayStart: string | null;
      fullDayEnd: string | null;
      halfDayStart: string | null;
      halfDayEnd: string | null;
    };
    care: {
      beforeStart: string | null;
      beforeEnd: string | null;
      afterStart: string | null;
      afterEnd: string | null;
      beforeFeeAmount: number | null;
      afterFeeAmount: number | null;
      feeCurrency: string;
    };
    warnings: string[];
    knownGaps: string[];
    weeks: Array<{
      weekNumber: number;
      weekIdentity: string;
      themeTitle: string;
      startDate: string;
      endDate: string;
      isShortWeek: boolean;
    }>;
    offerings: Array<{
      weekNumber: number;
      weekIdentity: string;
      themeTitle: string;
      attendanceFormat: string;
      startDate: string;
      endDate: string;
      jackrabbitCat2: string | null;
      sourceIdentity: string;
    }>;
  };
};

const document = cleanHtmlToDocument(savedHtml, { baseUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL });
const source: CampSource = gymnasticsMississaugaSource(new Date("2026-09-22T16:00:00.000Z"));
const snapshot: CampSourceSnapshot = {
  id: "snap-gymnastics-mississauga-benchmark",
  sourceId: source.id,
  retrievedAt: "2026-09-22T16:00:00.000Z",
  httpStatus: 200,
  contentType: "text/html",
  contentHash: hashSourceContent(savedHtml),
  rawContent: savedHtml,
  fetchStatus: "success",
};

function runExtractor(rawHtml = savedHtml) {
  return gymnasticsMississaugaExtractor.extract({
    source,
    snapshot,
    document: cleanHtmlToDocument(rawHtml, { baseUrl: source.sourceUrl }),
    rawHtml,
    extractionRunId: "run-gymnastics-mississauga-benchmark",
    newId: createSequentialIdFactory("ext"),
    now: new Date("2026-09-22T16:00:00.000Z"),
  });
}

describe("Gymnastics Mississauga week titles", () => {
  it("parses an explicit 2026 cross-month window from the toggle title", () => {
    const parsed = parseGymnasticsWeekTitle(
      "Week 1 June 29 - July 3, 2026 / Heroes in Action Week - 4 days",
    );
    assert.deepEqual(parsed, {
      weekNumber: 1,
      listedDateWindow: "June 29 - July 3, 2026",
      statedYear: 2026,
      themeTitle: "Heroes in Action Week",
      themeTitleNormalized: "heroes in action",
      isShortWeek: true,
      dayCount: 4,
      startDate: "2026-06-29",
      endDate: "2026-07-03",
      weekIdentity: "2026-06-29_2026-07-03",
    });
  });
});

describe("Gymnastics Mississauga benchmark (Prompt 9B-C2 grain)", () => {
  it("does not treat WordPress asset years as the camp year", () => {
    assert.match(savedHtml, /wp-content\/uploads\/2025\//);
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    assert.ok(facts.offerings.every((offering) => offering.startDate.startsWith("2026-")));
    assert.equal(
      facts.offerings.some((offering) => offering.startDate.startsWith("2025-")),
      false,
    );
    const headingYear = statedDocumentYear(document);
    assert.ok(headingYear === 2026 || headingYear === null);
  });

  it("takes ISO 2026 only from week/date copy on the official HTML", () => {
    assert.match(
      savedHtml,
      /<a class="elementor-toggle-title"[^>]*>Week 2 July 6 - 10, 2026 \/ Magical Disney Week<\/a>/,
    );
    assert.match(
      savedHtml,
      /<a class="elementor-toggle-title"[^>]*>Week 1 June 29 - July 3, 2026 \/ Heroes in Action Week - 4 days /,
    );
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    assert.ok(facts.weeks.every((week) => week.statedYear === 2026));
    assert.ok(facts.offerings.every((offering) => offering.statedYear === 2026));
    const result = runExtractor();
    const sessions = result.records.filter((record) => record.recordType === "session");
    for (const session of sessions) {
      assert.equal(session.rawFields.statedYear, 2026);
      assert.ok(session.warnings.includes("year_from_week_title"));
      const observations = session.normalizedFields.observations as Record<
        string,
        { value: unknown; rawValue: string | null }
      >;
      assert.equal(observations.statedYear.value, 2026);
      assert.match(String(observations.statedYear.rawValue), /,\s*2026\s*\//);
    }
  });

  it("resolves to the Gymnastics extractor, not generic_html", () => {
    assert.equal(
      resolveExtractor({ source, document, rawHtml: savedHtml }).key,
      GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY,
    );
  });

  it("extracts 10 weeks / 20 offerings from one official HTML page", () => {
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    assert.equal(expected.benchmark.sourcePageCount, 1);
    assert.equal(facts.weeks.length, 10);
    assert.equal(facts.offerings.length, 20);
    assert.equal(facts.jackrabbitOpenings.length, 30);
    assert.deepEqual(
      facts.offerings.map((offering) => offering.sourceIdentity),
      expected.identity.keys,
    );
    assert.equal(
      facts.offerings.filter((offering) => offering.attendanceFormat === "full_day").length,
      10,
    );
    assert.equal(
      facts.offerings.filter((offering) => offering.attendanceFormat === "half_day").length,
      10,
    );
    assert.equal(
      facts.jackrabbitOpenings.filter((embed) => embed.role === "care").length,
      10,
    );
  });

  it("keeps program ages 4–14 off session eligibility", () => {
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    assert.equal(facts.program.marketingAgeMin, 4);
    assert.equal(facts.program.marketingAgeMax, 14);
    assert.match(facts.raw.ages ?? "", /Ages 4/);
    const ageAttempt = normalizeAgeRange(facts.raw.ages ?? "");
    assert.equal(ageAttempt.value.ageMin, 4);
    assert.equal(ageAttempt.value.ageMax, 14);

    const result = runExtractor();
    const sessions = result.records.filter((record) => record.recordType === "session");
    assert.equal(sessions.length, 20);
    for (const session of sessions) {
      assert.equal(session.normalizedFields.ageMin, null);
      assert.equal(session.normalizedFields.ageMax, null);
      assert.ok(session.warnings.includes("program_ages_not_copied_onto_sessions"));
    }
    const program = result.records.find((record) => record.recordType === "program");
    assert.ok(program);
    assert.equal(program.normalizedFields.marketingAgeMin, 4);
    assert.equal(program.normalizedFields.marketingAgeMax, 14);
    assert.equal(program.normalizedFields.typicalAgeMin, 4);
    assert.equal(program.normalizedFields.typicalAgeMax, 14);
    assert.equal(program.normalizedFields.derivedAvailableAgeMin, null);
    assert.equal(program.normalizedFields.derivedAvailableAgeMax, null);
  });

  it("treats Ages 4–14 as one program-level heading in marketingAge and typicalAge", () => {
    const result = runExtractor();
    const program = result.records.find((record) => record.recordType === "program");
    assert.ok(program);
    assert.match(String(program.rawFields.heading), /Summer Camps \(Ages 4/);
    assert.equal(program.normalizedFields.marketingAgeMin, 4);
    assert.equal(program.normalizedFields.marketingAgeMax, 14);
    assert.equal(
      program.normalizedFields.typicalAgeMin,
      program.normalizedFields.marketingAgeMin,
      "typicalAge is CampProgram's descriptive program band from the same heading, not a second source fact",
    );
    assert.equal(program.normalizedFields.typicalAgeMax, program.normalizedFields.marketingAgeMax);
    const sessions = result.records.filter((record) => record.recordType === "session");
    for (const session of sessions) {
      assert.equal(session.normalizedFields.ageMin, null);
      assert.equal(session.normalizedFields.ageMax, null);
    }
  });

  it("matches gold facts for themes, hours, care, contact address, and unknown weekly price", () => {
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    assert.equal(facts.provider.name, "Gymnastics Mississauga");
    assert.equal(facts.provider.registrationPlatform, "Jackrabbit");
    assert.equal(facts.venue, null);
    assert.equal(facts.pageContact?.addressLine, "5600 Rose Cherry Pl");
    assert.equal(facts.pageContact?.city, "Mississauga");
    assert.equal(facts.pageContact?.province, "ON");
    assert.equal(facts.pageContact?.postalCode, "L4Z 4B6");
    assert.match(facts.pageContact?.facilityCopy ?? "", /Paramount Fine Food Centre/);
    assert.ok(facts.warnings.includes("page_contact_address_not_confirmed_as_camp_venue"));
    assert.equal(facts.program.name, "Summer Camps");
    assert.equal(facts.hours.fullDayStart, "09:00");
    assert.equal(facts.hours.fullDayEnd, "16:30");
    assert.equal(facts.hours.halfDayStart, "09:00");
    assert.equal(facts.hours.halfDayEnd, "12:00");
    assert.equal(facts.care.beforeStart, "08:00");
    assert.equal(facts.care.beforeEnd, "09:00");
    assert.equal(facts.care.afterStart, "16:30");
    assert.equal(facts.care.afterEnd, "17:30");
    assert.equal(facts.care.beforeFeeAmount, 10);
    assert.equal(facts.care.afterFeeAmount, 10);
    assert.equal(facts.care.feeCurrency, "unknown");
    assert.equal(facts.care.feeUnit, null);
    assert.equal(facts.care.formatApplicability, "not_stated");
    assert.ok(facts.warnings.includes("care_fee_unit_not_stated"));
    assert.ok(facts.warnings.includes("care_format_applicability_not_stated"));
    const result = runExtractor();
    for (const session of result.records.filter((record) => record.recordType === "session")) {
      assert.equal(session.normalizedFields.beforeCare, null);
      assert.equal(session.normalizedFields.afterCare, null);
      assert.ok(session.warnings.includes("care_format_applicability_not_stated"));
      assert.ok(session.warnings.includes("care_fee_unit_not_stated"));
    }
    assert.deepEqual(
      facts.weeks.map((week) => week.themeTitle),
      expected.facts.weeks.map((week) => week.themeTitle),
    );
    assert.deepEqual(
      facts.offerings.map((offering) => ({
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
      expected.facts.offerings,
    );
  });

  it("leaves weekly camp tuition unknown and does not adopt generic $→CAD", () => {
    const generic = normalizePriceCad("$10.00");
    assert.equal(generic.value.currency, "CAD");
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    const result = runExtractor();
    const sessions = result.records.filter((record) => record.recordType === "session");
    for (const session of sessions) {
      assert.equal(session.normalizedFields.priceAmount, null);
      assert.equal(session.normalizedFields.priceUnit, null);
      assert.equal(session.normalizedFields.currency, "unknown");
      assert.ok(session.warnings.includes("weekly_camp_tuition_not_stated_on_marketing_html"));
    }
    assert.equal(facts.warnings.includes("currency_symbol_only_assumed_cad"), false);
    assert.ok(facts.knownGaps.includes("weekly_camp_tuition_not_stated_on_marketing_html"));
    assert.equal(facts.care.beforeFeeAmount, 10);
    assert.equal(facts.care.feeCurrency, "unknown");
  });

  it("does not mine Jackrabbit script URLs for price or availability", () => {
    assert.match(savedHtml, /tuitionlabel=Tuition/);
    assert.match(savedHtml, /hidecols=Class,Session,Openings/);
    const withJackrabbitChrome = savedHtml.replace(
      /tuitionlabel=Tuition/g,
      "tuitionlabel=Tuition&amp;tuition=425",
    );
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: withJackrabbitChrome,
    });
    const result = runExtractor(withJackrabbitChrome);
    const sessions = result.records.filter((record) => record.recordType === "session");
    for (const session of sessions) {
      assert.equal(session.normalizedFields.priceAmount, null);
      assert.equal(session.normalizedFields.seatAvailability, null);
      assert.equal(session.normalizedFields.registrationStatus, null);
    }
    assert.ok(facts.knownGaps.includes("jackrabbit_not_fetched"));
    assert.ok(facts.knownGaps.includes("registration_status_not_inferred_from_jackrabbit_link"));
  });

  it("stores Jackrabbit hrefs as provenance and never treats Members Portal as registration", () => {
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    assert.equal(facts.program.registrationUrl, "https://app.jackrabbitclass.com/regv2.asp?id=537009");
    assert.equal(
      facts.raw.membersPortalUrl,
      "https://app.jackrabbitclass.com/jr4.0/ParentPortal/Login?orgId=537009",
    );
    assert.notEqual(facts.program.registrationUrl, facts.raw.membersPortalUrl);
    assert.ok(facts.offerings.every((offering) => offering.jackrabbitOpeningsUrl));
    const result = runExtractor();
    const sessions = result.records.filter((record) => record.recordType === "session");
    for (const session of sessions) {
      assert.equal(session.normalizedFields.registrationUrl, facts.program.registrationUrl);
      assert.match(String(session.rawFields.jackrabbitOpeningsUrl), /OpeningsJS/);
      assert.notEqual(session.normalizedFields.registrationUrl, session.rawFields.membersPortalUrl);
      assert.ok(session.warnings.includes("jackrabbit_not_fetched"));
    }
  });

  it("does not infer remaining seats from the group cap of 9", () => {
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    assert.equal(facts.policies.groupMaxParticipants, 9);
    assert.ok(facts.knownGaps.includes("remaining_seats_not_inferred_from_group_limit"));
    const result = runExtractor();
    const sessions = result.records.filter((record) => record.recordType === "session");
    for (const session of sessions) {
      assert.equal(session.normalizedFields.seatAvailability, null);
      assert.equal(session.normalizedFields.enrolmentCapPerWeek, 9);
      assert.notEqual(session.normalizedFields.seatAvailability, 9);
    }
  });

  it("keeps Magical Disney weeks as distinct dated offerings, not one theme identity", () => {
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    const disney = facts.weeks.filter((week) => /magical disney/i.test(week.themeTitle));
    assert.equal(disney.length, 2);
    assert.notEqual(disney[0].weekIdentity, disney[1].weekIdentity);
    assert.equal(disney[0].themeTitleNormalized, "magical disney");
    assert.equal(disney[1].themeTitleNormalized, "magical disney part ii");
  });

  it("does not create a new identity when only Jackrabbit query chrome changes", () => {
    const gold = parseGymnasticsMississaugaSchedule(savedHtml);
    const chromeHtml = savedHtml.replace(/exact=1/g, "exact=1&amp;utm_source=nav&amp;ref=header");
    const chrome = parseGymnasticsMississaugaSchedule(chromeHtml);
    assert.notEqual(chromeHtml, savedHtml);
    assert.deepEqual(
      chrome.offerings.map((offering) => offering.sourceIdentity),
      gold.offerings.map((offering) => offering.sourceIdentity),
    );
    assert.notEqual(
      chrome.offerings[0].jackrabbitOpeningsUrl,
      gold.offerings[0].jackrabbitOpeningsUrl,
    );
  });

  it("is independent of accordion order after sorting", () => {
    const facts = parseGymnasticsMississaugaFacts(document, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    const reversedDocument = {
      ...document,
      text: document.text.split("\n").reverse().join("\n"),
    };
    const reversed = parseGymnasticsMississaugaFacts(reversedDocument, {
      sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      rawHtml: savedHtml,
    });
    assert.deepEqual(
      reversed.offerings.map((offering) => offering.sourceIdentity),
      facts.offerings.map((offering) => offering.sourceIdentity),
    );
  });

  it("extracts records through matcher identity without inventing availability", () => {
    const result = runExtractor();
    assert.equal(result.status, expected.benchmark.status);
    assert.equal(gymnasticsMississaugaExtractor.version, expected.benchmark.extractorVersion);
    const sessions = result.records.filter((record) => record.recordType === "session");
    assert.equal(sessions.length, 20);
    const session = sessions.find(
      (record) =>
        record.sourceIdentity ===
        "gymnastics_mississauga:session:2026-07-06_2026-07-10:full_day",
    );
    assert.ok(session);
    const catalog = [
      {
        id: "catalog-gm-july-6-full",
        programId: "prog-gm",
        startDate: "2026-07-06",
        endDate: "2026-07-10",
        ageMin: null,
        ageMax: null,
        externalId: session.sourceIdentity,
        sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      },
    ];
    const withProgram = {
      ...session,
      normalizedFields: {
        ...session.normalizedFields,
        programId: "prog-gm",
        externalId: session.sourceIdentity,
      },
    };
    const match = exactSessionMatcher.match(withProgram, catalog);
    assert.equal(match.catalogId, "catalog-gm-july-6-full");
    assert.equal(isNewSessionCandidate(withProgram, []), true);
    assert.equal(result.records.filter((record) => record.recordType === "provider").length, 1);
    assert.equal(result.records.filter((record) => record.recordType === "venue").length, 0);
    assert.equal(result.records.filter((record) => record.recordType === "program").length, 1);
  });

  it("does not silently rematch an identity-changing date window", () => {
    const result = runExtractor();
    const session = result.records.find(
      (record) =>
        record.sourceIdentity ===
        "gymnastics_mississauga:session:2026-07-06_2026-07-10:full_day",
    );
    assert.ok(session);
    const newIdentity = "gymnastics_mississauga:session:2026-07-07_2026-07-11:full_day";
    const changed = {
      ...session,
      sourceIdentity: newIdentity,
      normalizedFields: {
        ...session.normalizedFields,
        programId: "prog-gm",
        externalId: newIdentity,
        startDate: "2026-07-07",
        endDate: "2026-07-11",
        weekIdentity: "2026-07-07_2026-07-11",
      },
    };
    const match = exactSessionMatcher.match(changed, [
      {
        id: "catalog-gm-july-6-full",
        programId: "prog-gm",
        startDate: "2026-07-06",
        endDate: "2026-07-10",
        ageMin: null,
        ageMax: null,
        externalId: session.sourceIdentity,
        sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
      },
    ]);
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
  });
});
