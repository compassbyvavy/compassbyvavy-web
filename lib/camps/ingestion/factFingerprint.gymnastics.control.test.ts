/**
 * Prompt 9B-C2 — Gymnastics Mississauga semantic fingerprint + pipeline.
 *
 * Proves the official marketing HTML CampSource passes through fixture →
 * Gymnastics extractor → camp-facts-v1 → matcher → change set → review
 * candidate, without a generic runner redesign. Jackrabbit stays outside
 * the crawl boundary.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type {
  CampExtractedRecord,
  CampSourceSnapshot,
} from "@/data/camps/ingestion/types";
import {
  FACT_FINGERPRINT_VERSION,
  hashFactFingerprint,
} from "@/lib/camps/ingestion/factFingerprint";
import { gymnasticsMississaugaExtractor } from "@/lib/camps/ingestion/extractors/gymnasticsMississaugaExtractor";
import { FixtureSourceFetcher } from "@/lib/camps/ingestion/fetcher";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { exactSessionMatcher } from "@/lib/camps/ingestion/matchers";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import type { IngestionCatalogSnapshot } from "@/lib/camps/ingestion/repositories/types";
import { runCampSource } from "@/lib/camps/ingestion/runner/runDueCampSources";
import {
  GYMNASTICS_MISSISSAUGA_SOURCE_ID,
  GYMNASTICS_MISSISSAUGA_SOURCE_URL,
  gymnasticsMississaugaSource,
} from "@/lib/camps/ingestion/sources/seedSources";

const BENCHMARK_DIR = "../../../data/camps/ingestion/benchmarks";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const goldHtml = readBenchmark("gymnastics-mississauga-summer-camps.html");

function chromeOnlyVariant(html: string): string {
  return html
    .replace("<body", '<body data-build="chrome-9b-c2" class="nav-reordered"')
    .replace(
      "</body>",
      `<script>window.__gmChrome = "decorative-static";</script>
<footer class="site-chrome">Updated footer copy that is not camp facts.</footer>
</body>`,
    );
}

function themeChanged(html: string): string {
  return html.replace("Heroes in Action Week", "Heroes in Space Week");
}

function dateWindowChanged(html: string): string {
  return html.replace("July 6 - 10, 2026", "July 7 - 11, 2026");
}

function endDateOnlyChanged(html: string): string {
  return html.replace("July 6 - 10, 2026", "July 6 - 11, 2026");
}

function formatHoursChanged(html: string): string {
  return html.replace("Half-Day Campers (9:00 AM – 12:00 PM)", "Half-Day Campers (9:00 AM – 1:00 PM)");
}

function coreHoursChanged(html: string): string {
  return html.replace("9:00 AM to 4:30 PM", "9:00 AM to 5:00 PM");
}

function careChanged(html: string): string {
  return html
    .replace(/Before Care[\s\S]{0,80}?\$10\.00/, "Before Care 7:30am – 9:00am $12.00")
    .replace(/After Care[\s\S]{0,80}?\$10\.00/, "After Care 4:30pm – 6:00pm $12.00");
}

function jackrabbitQueryChrome(html: string): string {
  return html
    .replace(/exact=1/g, "exact=1&amp;utm_source=nav")
    .replace(
      "https://app.jackrabbitclass.com/regv2.asp?id=537009",
      "https://app.jackrabbitclass.com/regv2.asp?id=537009&utm_campaign=header",
    );
}

function extractRecords(html: string): CampExtractedRecord[] {
  const source = gymnasticsMississaugaSource(new Date("2026-09-22T16:00:00.000Z"));
  const document = cleanHtmlToDocument(html, { baseUrl: source.sourceUrl });
  const snapshot: CampSourceSnapshot = {
    id: "snap-gm-fp",
    sourceId: GYMNASTICS_MISSISSAUGA_SOURCE_ID,
    retrievedAt: "2026-09-22T16:00:00.000Z",
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(html),
    rawContent: html,
    fetchStatus: "success",
  };
  const result = gymnasticsMississaugaExtractor.extract({
    source,
    snapshot,
    document,
    rawHtml: html,
    extractionRunId: "run-gm-fp",
    newId: createSequentialIdFactory("fp"),
    now: new Date("2026-09-22T16:00:00.000Z"),
  });
  assert.notEqual(result.status, "failed");
  return result.records;
}

function emptyCatalog(): IngestionCatalogSnapshot {
  return { providers: [], programs: [], sessions: [], venues: [] };
}

function sessionsOf(records: CampExtractedRecord[]): CampExtractedRecord[] {
  return records.filter((record) => record.recordType === "session");
}

function programOf(records: CampExtractedRecord[]): CampExtractedRecord {
  const program = records.find((record) => record.recordType === "program");
  assert.ok(program);
  return program;
}

async function runPair(firstHtml: string, secondHtml: string, prefix: string) {
  const store = createMemoryIngestionStore({
    sources: [gymnasticsMississaugaSource(new Date("2026-09-22T12:00:00.000Z"))],
  });
  const newId = createSequentialIdFactory(prefix);
  const first = await runCampSource({
    sourceId: GYMNASTICS_MISSISSAUGA_SOURCE_ID,
    store,
    fetcher: new FixtureSourceFetcher(
      { [GYMNASTICS_MISSISSAUGA_SOURCE_ID]: { content: firstHtml, fetchStatus: "success" } },
      { newId },
    ),
    catalog: emptyCatalog(),
    now: () => new Date("2026-09-22T12:00:00.000Z"),
    newId,
  });
  const second = await runCampSource({
    sourceId: GYMNASTICS_MISSISSAUGA_SOURCE_ID,
    store,
    fetcher: new FixtureSourceFetcher(
      { [GYMNASTICS_MISSISSAUGA_SOURCE_ID]: { content: secondHtml, fetchStatus: "success" } },
      { newId },
    ),
    catalog: emptyCatalog(),
    now: () => new Date("2026-09-23T12:00:00.000Z"),
    newId,
  });
  return { store, first, second };
}

describe("Gymnastics Mississauga semantic fingerprint control (Prompt 9B-C2)", () => {
  it("fingerprints the official page under camp-facts-v1", () => {
    const records = extractRecords(goldHtml);
    assert.equal(sessionsOf(records).length, 20);
    const fingerprint = hashFactFingerprint(records);
    assert.match(fingerprint, new RegExp(`^${FACT_FINGERPRINT_VERSION}:sha256:[0-9a-f]{64}$`));
    assert.equal(hashFactFingerprint([...records].reverse()), fingerprint);
  });

  it("exact repeat → unchanged_raw", async () => {
    const { first, second, store } = await runPair(goldHtml, goldHtml, "gm-raw");
    assert.equal(first.status, "baseline");
    assert.ok(first.candidateIds.length > 0);
    assert.ok(store.snapshotState().candidates.some((candidate) => candidate.candidateType === "session"));
    assert.ok(second.status === "unchanged_raw" || second.status === "unchanged");
    assert.equal(second.candidateIds.length, 0);
  });

  it("markup-only change → unchanged_facts", async () => {
    const chromeHtml = chromeOnlyVariant(goldHtml);
    assert.notEqual(hashSourceContent(goldHtml), hashSourceContent(chromeHtml));
    const { first, second } = await runPair(goldHtml, chromeHtml, "gm-chrome");
    assert.equal(first.status, "baseline");
    assert.equal(second.status, "unchanged_facts");
    assert.equal(second.candidateIds.length, 0);
  });

  it("theme change → changed_facts without changing identity", async () => {
    const changedHtml = themeChanged(goldHtml);
    const gold = sessionsOf(extractRecords(goldHtml)).find((session) =>
      String(session.sourceIdentity).includes("2026-06-29_2026-07-03:full_day"),
    );
    const changed = sessionsOf(extractRecords(changedHtml)).find((session) =>
      String(session.sourceIdentity).includes("2026-06-29_2026-07-03:full_day"),
    );
    assert.ok(gold);
    assert.ok(changed);
    assert.equal(gold.normalizedFields.themeTitle, "Heroes in Action Week");
    assert.equal(changed.normalizedFields.themeTitle, "Heroes in Space Week");
    assert.equal(gold.sourceIdentity, changed.sourceIdentity);
    const { second } = await runPair(goldHtml, changedHtml, "gm-theme");
    assert.equal(second.status, "changed_facts");
  });

  it("date-window change creates a new identity and does not silently rematch", () => {
    const gold = sessionsOf(extractRecords(goldHtml)).find((session) =>
      String(session.sourceIdentity).includes("2026-07-06_2026-07-10:full_day"),
    );
    const changed = sessionsOf(extractRecords(dateWindowChanged(goldHtml))).find((session) =>
      String(session.sourceIdentity).includes("2026-07-07_2026-07-11:full_day"),
    );
    assert.ok(gold);
    assert.ok(changed);
    assert.notEqual(changed.sourceIdentity, gold.sourceIdentity);
    assert.match(changed.sourceIdentity, /2026-07-07_2026-07-11/);
    const match = exactSessionMatcher.match(
      {
        ...changed,
        normalizedFields: {
          ...changed.normalizedFields,
          programId: "prog-gm",
          externalId: changed.sourceIdentity,
        },
      },
      [
        {
          id: "catalog-gm-july-6-full",
          programId: "prog-gm",
          startDate: "2026-07-06",
          endDate: "2026-07-10",
          ageMin: null,
          ageMax: null,
          externalId: gold.sourceIdentity,
          sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
        },
      ],
    );
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
  });

  it("end-date-only change: identity and camp-facts-v1 change; matcher still hits source_url_and_start", async () => {
    const gold = sessionsOf(extractRecords(goldHtml)).find((session) =>
      String(session.sourceIdentity).includes("2026-07-06_2026-07-10:full_day"),
    );
    const changedHtml = endDateOnlyChanged(goldHtml);
    const changed = sessionsOf(extractRecords(changedHtml)).find((session) =>
      String(session.sourceIdentity).includes("2026-07-06_2026-07-11:full_day"),
    );
    assert.ok(gold);
    assert.ok(changed);
    assert.equal(gold.normalizedFields.startDate, "2026-07-06");
    assert.equal(gold.normalizedFields.endDate, "2026-07-10");
    assert.equal(changed.normalizedFields.startDate, "2026-07-06");
    assert.equal(changed.normalizedFields.endDate, "2026-07-11");
    assert.notEqual(changed.sourceIdentity, gold.sourceIdentity);
    assert.notEqual(hashFactFingerprint(extractRecords(goldHtml)), hashFactFingerprint(extractRecords(changedHtml)));
    const match = exactSessionMatcher.match(
      {
        ...changed,
        normalizedFields: {
          ...changed.normalizedFields,
          programId: "prog-gm",
          externalId: changed.sourceIdentity,
        },
      },
      [
        {
          id: "catalog-gm-july-6-full",
          programId: "prog-gm",
          startDate: "2026-07-06",
          endDate: "2026-07-10",
          ageMin: null,
          ageMax: null,
          externalId: gold.sourceIdentity,
          sourceUrl: GYMNASTICS_MISSISSAUGA_SOURCE_URL,
        },
      ],
    );
    assert.equal(
      match.catalogId,
      "catalog-gm-july-6-full",
      "existing matcher falls through to source_url_and_start when session ages are null",
    );
    assert.deepEqual(match.reasons, ["source_url_and_start"]);
    const { second } = await runPair(goldHtml, changedHtml, "gm-end");
    assert.equal(second.status, "changed_facts");
  });

  it("date-window change → changed_facts because identity includes the dated window", async () => {
    const { second } = await runPair(goldHtml, dateWindowChanged(goldHtml), "gm-date");
    assert.equal(second.status, "changed_facts");
  });

  it("full-day/half-day hours change → changed_facts without changing identity", async () => {
    const changedHtml = formatHoursChanged(goldHtml);
    const gold = sessionsOf(extractRecords(goldHtml)).find((session) =>
      String(session.sourceIdentity).includes("2026-07-06_2026-07-10:half_day"),
    );
    const changed = sessionsOf(extractRecords(changedHtml)).find((session) =>
      String(session.sourceIdentity).includes("2026-07-06_2026-07-10:half_day"),
    );
    assert.ok(gold);
    assert.ok(changed);
    assert.equal(gold.normalizedFields.coreHoursEnd, "12:00");
    assert.equal(changed.normalizedFields.coreHoursEnd, "13:00");
    assert.equal(gold.sourceIdentity, changed.sourceIdentity);
    const { second } = await runPair(goldHtml, changedHtml, "gm-format");
    assert.equal(second.status, "changed_facts");
  });

  it("core-hours change → changed_facts without changing identity", async () => {
    const changedHtml = coreHoursChanged(goldHtml);
    const gold = sessionsOf(extractRecords(goldHtml)).find((session) =>
      String(session.sourceIdentity).includes(":full_day"),
    );
    const changed = sessionsOf(extractRecords(changedHtml)).find((session) =>
      String(session.sourceIdentity).includes(":full_day"),
    );
    assert.ok(gold);
    assert.ok(changed);
    assert.equal(gold.normalizedFields.coreHoursEnd, "16:30");
    assert.equal(changed.normalizedFields.coreHoursEnd, "17:00");
    assert.equal(gold.sourceIdentity, changed.sourceIdentity);
    const { second } = await runPair(goldHtml, changedHtml, "gm-hours");
    assert.equal(second.status, "changed_facts");
  });

  it("care-hours/care-fee change → changed_facts without changing identity", async () => {
    const changedHtml = careChanged(goldHtml);
    const goldPolicies = programOf(extractRecords(goldHtml)).normalizedFields.policies as {
      beforeCareStart: string;
      beforeCareFeeAmount: number;
      afterCareEnd: string;
      afterCareFeeAmount: number;
    };
    const changedPolicies = programOf(extractRecords(changedHtml)).normalizedFields.policies as {
      beforeCareStart: string;
      beforeCareFeeAmount: number;
      afterCareEnd: string;
      afterCareFeeAmount: number;
    };
    assert.equal(goldPolicies.beforeCareStart, "08:00");
    assert.equal(goldPolicies.beforeCareFeeAmount, 10);
    assert.equal(changedPolicies.beforeCareStart, "07:30");
    assert.equal(changedPolicies.beforeCareFeeAmount, 12);
    assert.equal(changedPolicies.afterCareEnd, "18:00");
    assert.equal(changedPolicies.afterCareFeeAmount, 12);
    assert.equal(
      sessionsOf(extractRecords(goldHtml))[0].sourceIdentity,
      sessionsOf(extractRecords(changedHtml))[0].sourceIdentity,
    );
    const { second } = await runPair(goldHtml, changedHtml, "gm-care");
    assert.equal(second.status, "changed_facts");
  });

  it("unknown weekly price stays unknown; Jackrabbit is not a price fallback", async () => {
    const records = extractRecords(goldHtml);
    for (const session of sessionsOf(records)) {
      assert.equal(session.normalizedFields.priceAmount, null);
      assert.equal(session.normalizedFields.currency, "unknown");
    }
    const withJackrabbitTuition = goldHtml.replace(
      /tuitionlabel=Tuition/g,
      "tuitionlabel=Tuition&amp;price=425",
    );
    for (const session of sessionsOf(extractRecords(withJackrabbitTuition))) {
      assert.equal(session.normalizedFields.priceAmount, null);
    }
    assert.notEqual(hashSourceContent(goldHtml), hashSourceContent(withJackrabbitTuition));
    const { second } = await runPair(goldHtml, withJackrabbitTuition, "gm-price");
    assert.ok(second.status === "unchanged_facts" || second.status === "unchanged_raw");
  });

  it("Jackrabbit URL query chrome does not create a new semantic identity", async () => {
    const changedHtml = jackrabbitQueryChrome(goldHtml);
    const gold = sessionsOf(extractRecords(goldHtml));
    const changed = sessionsOf(extractRecords(changedHtml));
    assert.deepEqual(
      changed.map((session) => session.sourceIdentity),
      gold.map((session) => session.sourceIdentity),
    );
    assert.notEqual(
      gold[0].rawFields.jackrabbitOpeningsUrl,
      changed[0].rawFields.jackrabbitOpeningsUrl,
    );
    assert.equal(gold[0].normalizedFields.registrationUrl, changed[0].normalizedFields.registrationUrl);
    const { second } = await runPair(goldHtml, changedHtml, "gm-jr");
    assert.ok(second.status === "unchanged_facts" || second.status === "unchanged_raw");
  });
});

describe("Gymnastics Mississauga pipeline (Prompt 9B-C2)", () => {
  it("runs the registered HTML source through the existing runner", async () => {
    const store = createMemoryIngestionStore({
      sources: [gymnasticsMississaugaSource(new Date("2026-09-22T12:00:00.000Z"))],
    });
    const newId = createSequentialIdFactory("gm-pipe");
    const result = await runCampSource({
      sourceId: GYMNASTICS_MISSISSAUGA_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [GYMNASTICS_MISSISSAUGA_SOURCE_ID]: { content: goldHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-22T12:00:00.000Z"),
      newId,
    });
    assert.ok(result.status === "baseline" || result.status === "changed_facts");
    assert.ok(result.candidateIds.length > 0);
    const sessionCandidates = store
      .snapshotState()
      .candidates.filter(
        (candidate) =>
          candidate.sourceId === GYMNASTICS_MISSISSAUGA_SOURCE_ID &&
          candidate.candidateType === "session",
      );
    assert.equal(sessionCandidates.length, 20);
    assert.equal(
      new Set(sessionCandidates.map((candidate) => String(candidate.candidateData.externalId))).size,
      20,
    );
  });
});
