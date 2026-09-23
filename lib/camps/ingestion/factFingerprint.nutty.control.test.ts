/**
 * Prompt 9B-A — Nutty Scientists semantic fingerprint + pipeline control.
 *
 * Proves:
 * - exact repeat → unchanged_raw
 * - markup-only change → unchanged_facts
 * - real fact change → changed_facts
 * - identity-bearing age-band / date-window changes do not silently rematch
 * - AAA → BBB → BBB compares against BBB
 * - yearless same month/day + age band collides (known 9B-A limitation)
 *
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type {
  CampExtractedRecord,
  CampSource,
  CampSourceSnapshot,
} from "@/data/camps/ingestion/types";
import {
  FACT_FINGERPRINT_VERSION,
  hashFactFingerprint,
} from "@/lib/camps/ingestion/factFingerprint";
import { nuttyScientistsExtractor } from "@/lib/camps/ingestion/extractors/nuttyScientistsExtractor";
import { FixtureSourceFetcher } from "@/lib/camps/ingestion/fetcher";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { exactSessionMatcher } from "@/lib/camps/ingestion/matchers";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import type { IngestionCatalogSnapshot } from "@/lib/camps/ingestion/repositories/types";
import { runCampSource } from "@/lib/camps/ingestion/runner/runDueCampSources";
import {
  NUTTY_SCIENTISTS_SOURCE_ID,
  NUTTY_SCIENTISTS_SOURCE_URL,
  nuttyScientistsSource,
} from "@/lib/camps/ingestion/sources/seedSources";

const BENCHMARK_DIR = "../../../data/camps/ingestion/benchmarks";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const goldHtml = readBenchmark("nutty-scientists-summercamp.html");

function chromeOnlyVariant(html: string): string {
  return html
    .replace("<body", '<body data-build="chrome-9b-a" class="nav-reordered"')
    .replace(
      "</body>",
      `<script>window.__nuttyChrome = "decorative-static";</script>
<footer class="site-chrome">Updated footer copy that is not camp facts.</footer>
</body>`,
    )
    .replace(/class="/g, 'class="x-');
}

function priceChangedVariant(html: string): string {
  return html.replace("$399.00", "$429.00");
}

function extractRecords(html: string, runId = "run-nutty-fp"): CampExtractedRecord[] {
  const document = cleanHtmlToDocument(html, { baseUrl: NUTTY_SCIENTISTS_SOURCE_URL });
  const source: CampSource = {
    ...nuttyScientistsSource(new Date("2026-09-18T16:00:00.000Z")),
  };
  const snapshot: CampSourceSnapshot = {
    id: "snap-nutty-fp",
    sourceId: source.id,
    retrievedAt: "2026-09-18T16:00:00.000Z",
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(html),
    rawContent: html,
    fetchStatus: "success",
  };
  const result = nuttyScientistsExtractor.extract({
    source,
    snapshot,
    document,
    rawHtml: html,
    extractionRunId: runId,
    newId: createSequentialIdFactory("fp"),
    now: new Date("2026-09-18T16:00:00.000Z"),
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

describe("Nutty Scientists semantic fingerprint control (Prompt 9B-A)", () => {
  it("fingerprints 8 week × age-band sessions under camp-facts-v2", () => {
    const records = extractRecords(goldHtml);
    assert.equal(sessionsOf(records).length, 8);
    const fingerprint = hashFactFingerprint(records);
    assert.match(
      fingerprint,
      new RegExp(`^${FACT_FINGERPRINT_VERSION}:sha256:[0-9a-f]{64}$`),
    );
    assert.equal(hashFactFingerprint([...records].reverse()), fingerprint);
  });

  it("exact repeat → unchanged_raw", async () => {
    const store = createMemoryIngestionStore({
      sources: [nuttyScientistsSource(new Date("2026-09-18T12:00:00.000Z"))],
    });
    const newId = createSequentialIdFactory("nutty-raw");
    const fetcher = new FixtureSourceFetcher(
      {
        [NUTTY_SCIENTISTS_SOURCE_ID]: { content: goldHtml, fetchStatus: "success" },
      },
      { newId },
    );

    const first = await runCampSource({
      sourceId: NUTTY_SCIENTISTS_SOURCE_ID,
      store,
      fetcher,
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-18T12:00:00.000Z"),
      newId,
    });
    assert.equal(first.status, "baseline");
    assert.equal(sessionsOf(extractRecords(goldHtml)).length, 8);

    const second = await runCampSource({
      sourceId: NUTTY_SCIENTISTS_SOURCE_ID,
      store,
      fetcher,
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-19T12:00:00.000Z"),
      newId,
    });
    assert.ok(second.status === "unchanged_raw" || second.status === "unchanged");
    assert.equal(second.extractionRunId, null);
    assert.equal(second.candidateIds.length, 0);
  });

  it("markup-only change → unchanged_facts", async () => {
    const store = createMemoryIngestionStore({
      sources: [nuttyScientistsSource(new Date("2026-09-18T12:00:00.000Z"))],
    });
    const newId = createSequentialIdFactory("nutty-chrome");
    const chromeHtml = chromeOnlyVariant(goldHtml);
    assert.notEqual(hashSourceContent(goldHtml), hashSourceContent(chromeHtml));

    const first = await runCampSource({
      sourceId: NUTTY_SCIENTISTS_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [NUTTY_SCIENTISTS_SOURCE_ID]: { content: goldHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-18T12:00:00.000Z"),
      newId,
    });
    assert.equal(first.status, "baseline");
    const afterFirst = store.snapshotState();
    const fingerprint = afterFirst.sources[0].lastFactFingerprint;
    const candidatesAfterFirst = afterFirst.candidates.length;

    const second = await runCampSource({
      sourceId: NUTTY_SCIENTISTS_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [NUTTY_SCIENTISTS_SOURCE_ID]: { content: chromeHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-19T12:00:00.000Z"),
      newId,
    });
    assert.equal(second.status, "unchanged_facts");
    assert.equal(second.candidateIds.length, 0);
    const state = store.snapshotState();
    assert.equal(state.sources[0].lastFactFingerprint, fingerprint);
    assert.equal(state.candidates.length, candidatesAfterFirst);
  });

  it("real weekly-price change → changed_facts", async () => {
    const store = createMemoryIngestionStore({
      sources: [nuttyScientistsSource(new Date("2026-09-18T12:00:00.000Z"))],
    });
    const newId = createSequentialIdFactory("nutty-price");
    const changedHtml = priceChangedVariant(goldHtml);
    assert.notEqual(hashSourceContent(goldHtml), hashSourceContent(changedHtml));
    assert.notEqual(
      hashFactFingerprint(extractRecords(goldHtml)),
      hashFactFingerprint(extractRecords(changedHtml)),
    );

    const first = await runCampSource({
      sourceId: NUTTY_SCIENTISTS_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [NUTTY_SCIENTISTS_SOURCE_ID]: { content: goldHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-18T12:00:00.000Z"),
      newId,
    });
    assert.equal(first.status, "baseline");

    const second = await runCampSource({
      sourceId: NUTTY_SCIENTISTS_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [NUTTY_SCIENTISTS_SOURCE_ID]: { content: changedHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-19T12:00:00.000Z"),
      newId,
    });
    assert.equal(second.status, "changed_facts");
  });

  it("identity-bearing age-band change does not silently rematch", () => {
    const records = extractRecords(goldHtml);
    const target = sessionsOf(records).find(
      (session) => session.sourceIdentity === "nutty_scientists:session:07-06_07-10:5-7",
    );
    assert.ok(target);
    const oldIdentity = target.sourceIdentity;
    const newIdentity = oldIdentity.replace(/:5-7$/, ":5-8");
    const changed = {
      ...target,
      sourceIdentity: newIdentity,
      normalizedFields: {
        ...target.normalizedFields,
        programId: "prog-nutty",
        ageMax: 8,
        externalId: newIdentity,
      },
    };
    assert.notEqual(hashFactFingerprint(records), hashFactFingerprint(
      records.map((record) => (record.sourceIdentity === oldIdentity ? changed : record)),
    ));
    const match = exactSessionMatcher.match(changed, [
      {
        id: "catalog-nutty-5-7",
        programId: "prog-nutty",
        startDate: null,
        endDate: null,
        ageMin: 5,
        ageMax: 7,
        externalId: oldIdentity,
        sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
      },
    ]);
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
  });

  it("identity-bearing date-window change does not silently rematch", () => {
    const records = extractRecords(goldHtml);
    const target = sessionsOf(records).find(
      (session) => session.sourceIdentity === "nutty_scientists:session:07-06_07-10:5-7",
    );
    assert.ok(target);
    const newIdentity = "nutty_scientists:session:07-06_07-11:5-7";
    const changed = {
      ...target,
      sourceIdentity: newIdentity,
      normalizedFields: {
        ...target.normalizedFields,
        programId: "prog-nutty",
        weekIdentity: "07-06_07-11",
        listedDateWindow: "July 6th - 11th",
        externalId: newIdentity,
      },
    };
    const match = exactSessionMatcher.match(changed, [
      {
        id: "catalog-nutty-july-6-10",
        programId: "prog-nutty",
        startDate: null,
        endDate: null,
        ageMin: 5,
        ageMax: 7,
        externalId: target.sourceIdentity,
        sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
      },
    ]);
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
  });

  it("AAA → BBB → BBB: run 3 compares against BBB, not AAA", async () => {
    const store = createMemoryIngestionStore({
      sources: [nuttyScientistsSource(new Date("2026-09-18T12:00:00.000Z"))],
    });
    const newId = createSequentialIdFactory("nutty-aaa");
    const rawAaa = goldHtml;
    const rawBbb = chromeOnlyVariant(goldHtml);
    const hashAaa = hashSourceContent(rawAaa);
    const hashBbb = hashSourceContent(rawBbb);
    assert.notEqual(hashAaa, hashBbb);

    const run = (content: string, now: string) =>
      runCampSource({
        sourceId: NUTTY_SCIENTISTS_SOURCE_ID,
        store,
        fetcher: new FixtureSourceFetcher(
          { [NUTTY_SCIENTISTS_SOURCE_ID]: { content, fetchStatus: "success" } },
          { newId },
        ),
        catalog: emptyCatalog(),
        now: () => new Date(now),
        newId,
      });

    const first = await run(rawAaa, "2026-09-18T12:00:00.000Z");
    assert.equal(first.status, "baseline");
    const afterFirst = store.snapshotState();
    const fingerprintXyz = afterFirst.sources[0].lastFactFingerprint;
    const changedAtBaseline = afterFirst.sources[0].lastChangedAt;
    const candidatesAfterFirst = afterFirst.candidates.length;

    const second = await run(rawBbb, "2026-09-19T12:00:00.000Z");
    assert.equal(second.status, "unchanged_facts");
    const afterSecond = store.snapshotState();
    assert.equal(afterSecond.sources[0].lastContentHash, hashBbb);
    assert.equal(afterSecond.sources[0].lastFactFingerprint, fingerprintXyz);
    assert.equal(afterSecond.sources[0].lastChangedAt, changedAtBaseline);

    const third = await run(rawBbb, "2026-09-20T12:00:00.000Z");
    assert.equal(third.status, "unchanged_raw");
    assert.equal(third.extractionRunId, null);
    const afterThird = store.snapshotState();
    assert.equal(afterThird.extractionRuns.length, afterSecond.extractionRuns.length);
    assert.equal(afterThird.candidates.length, candidatesAfterFirst);
    assert.equal(afterThird.sources[0].lastContentHash, hashBbb);
    assert.notEqual(afterThird.sources[0].lastContentHash, hashAaa);
  });

  it("yearless identity collides across seasons with the same month/day and age band", () => {
    const seasonPage = (chrome: string) => `<html><body>
<h1>Science Camp</h1>
<p>Nutty Summer Science Camp</p>
<p>For Age Group: 5 to 7yrs : July 6th - 10th</p>
<p>Time: 10:30 am to 4:00 pm</p>
<p>Where: At the Vic Johnson Community Center</p>
<p>335 Church St Streetsville (Mississauga ) L5M 1N1</p>
<p>FOR 1 WEEK : $399.00 + tax/per registration</p>
<p>FOR 2 WEEK : $599.00 + tax/per registration</p>
<p>FOR 1 DAY : $105.00 + tax/per registration</p>
${chrome}
</body></html>`;

    const seasonA = seasonPage("<!-- season A chrome; year is still not stated -->");
    const seasonB = seasonPage("<!-- season B chrome; later year, still not stated -->");
    assert.notEqual(hashSourceContent(seasonA), hashSourceContent(seasonB));

    const recordsA = extractRecords(seasonA, "run-season-a");
    const recordsB = extractRecords(seasonB, "run-season-b");
    const sessionsA = sessionsOf(recordsA);
    const sessionsB = sessionsOf(recordsB);
    assert.equal(sessionsA.length, 1);
    assert.equal(sessionsB.length, 1);
    assert.equal(sessionsA[0].sourceIdentity, "nutty_scientists:session:07-06_07-10:5-7");
    assert.equal(sessionsA[0].sourceIdentity, sessionsB[0].sourceIdentity);
    assert.equal(sessionsA[0].normalizedFields.startDate, null);
    assert.equal(sessionsB[0].normalizedFields.startDate, null);
    assert.equal(hashFactFingerprint(recordsA), hashFactFingerprint(recordsB));
  });
});
