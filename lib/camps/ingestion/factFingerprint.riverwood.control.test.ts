/**
 * Prompt 9B-B — Riverwood Conservancy semantic fingerprint + pipeline control.
 *
 * Proves:
 * - exact repeat → unchanged_raw
 * - markup-only change → unchanged_facts
 * - SOLD OUT change → changed_facts
 * - explicit capacity 16 → another value → changed_facts
 * - price change → changed_facts
 * - grade copy change → changed_facts without inventing ages
 * - identity-bearing date-window change does not silently rematch
 * - yearless same month/day collides (known 9B-B limitation / future
 *   cross-season reconciliation issue). Footer, PDF-path, and capture years
 *   are not used as a workaround.
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
  buildFactFingerprintPayload,
  hashFactFingerprint,
} from "@/lib/camps/ingestion/factFingerprint";
import { riverwoodConservancyExtractor } from "@/lib/camps/ingestion/extractors/riverwoodConservancyExtractor";
import { FixtureSourceFetcher } from "@/lib/camps/ingestion/fetcher";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { exactSessionMatcher } from "@/lib/camps/ingestion/matchers";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import type { IngestionCatalogSnapshot } from "@/lib/camps/ingestion/repositories/types";
import { runCampSource } from "@/lib/camps/ingestion/runner/runDueCampSources";
import {
  RIVERWOOD_CONSERVANCY_SOURCE_ID,
  RIVERWOOD_CONSERVANCY_SOURCE_URL,
  riverwoodConservancySource,
} from "@/lib/camps/ingestion/sources/seedSources";

const BENCHMARK_DIR = "../../../data/camps/ingestion/benchmarks";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const goldHtml = readBenchmark("riverwood-conservancy-summercamp.html");

function chromeOnlyVariant(html: string): string {
  return html
    .replace("<body", '<body data-build="chrome-9b-b" class="nav-reordered"')
    .replace(
      "</body>",
      `<script>window.__riverwoodChrome = "decorative-static";</script>
<footer class="site-chrome">Updated footer copy that is not camp facts.</footer>
</body>`,
    )
    .replace(/class="/g, 'class="x-');
}

function soldOutClearedVariant(html: string): string {
  return html.replace(
    "Week 2: July 6 – 10 | $450 per child &#8211; SOLD OUT",
    "Week 2: July 6 – 10 | $450 per child",
  );
}

function capacityChangedVariant(html: string): string {
  return html.replace("limited to 16 children", "limited to 20 children");
}

function priceChangedVariant(html: string): string {
  return html.replace(
    "Week 2: July 6 – 10 | $450 per child &#8211; SOLD OUT",
    "Week 2: July 6 – 10 | $475 per child &#8211; SOLD OUT",
  );
}

function gradeChangedVariant(html: string): string {
  return html.replace(
    "Grade 1, 2, 3, 4, 5, or 6",
    "Grade 1, 2, 3, 4, or 5",
  );
}

function dateWindowChangedVariant(html: string): string {
  return html.replace("Week 2: July 6 – 10 |", "Week 2: July 6 – 11 |");
}

function extractRecords(html: string, runId = "run-riverwood-fp"): CampExtractedRecord[] {
  const document = cleanHtmlToDocument(html, { baseUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL });
  const source: CampSource = {
    ...riverwoodConservancySource(new Date("2026-09-19T16:00:00.000Z")),
  };
  const snapshot: CampSourceSnapshot = {
    id: "snap-riverwood-fp",
    sourceId: source.id,
    retrievedAt: "2026-09-19T16:00:00.000Z",
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(html),
    rawContent: html,
    fetchStatus: "success",
  };
  const result = riverwoodConservancyExtractor.extract({
    source,
    snapshot,
    document,
    rawHtml: html,
    extractionRunId: runId,
    newId: createSequentialIdFactory("fp"),
    now: new Date("2026-09-19T16:00:00.000Z"),
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

async function runPair(firstHtml: string, secondHtml: string, prefix: string) {
  const store = createMemoryIngestionStore({
    sources: [riverwoodConservancySource(new Date("2026-09-19T12:00:00.000Z"))],
  });
  const newId = createSequentialIdFactory(prefix);
  const first = await runCampSource({
    sourceId: RIVERWOOD_CONSERVANCY_SOURCE_ID,
    store,
    fetcher: new FixtureSourceFetcher(
      { [RIVERWOOD_CONSERVANCY_SOURCE_ID]: { content: firstHtml, fetchStatus: "success" } },
      { newId },
    ),
    catalog: emptyCatalog(),
    now: () => new Date("2026-09-19T12:00:00.000Z"),
    newId,
  });
  const second = await runCampSource({
    sourceId: RIVERWOOD_CONSERVANCY_SOURCE_ID,
    store,
    fetcher: new FixtureSourceFetcher(
      { [RIVERWOOD_CONSERVANCY_SOURCE_ID]: { content: secondHtml, fetchStatus: "success" } },
      { newId },
    ),
    catalog: emptyCatalog(),
    now: () => new Date("2026-09-20T12:00:00.000Z"),
    newId,
  });
  return { store, first, second };
}

describe("Riverwood Conservancy semantic fingerprint control (Prompt 9B-B)", () => {
  it("fingerprints 9 date-window sessions under camp-facts-v2", () => {
    const records = extractRecords(goldHtml);
    assert.equal(sessionsOf(records).length, 9);
    const fingerprint = hashFactFingerprint(records);
    assert.match(
      fingerprint,
      new RegExp(`^${FACT_FINGERPRINT_VERSION}:sha256:[0-9a-f]{64}$`),
    );
    assert.equal(hashFactFingerprint([...records].reverse()), fingerprint);
  });

  it("exact repeat → unchanged_raw", async () => {
    const { first, second, store } = await runPair(goldHtml, goldHtml, "riverwood-raw");
    assert.equal(first.status, "baseline");
    assert.ok(first.candidateIds.length > 0);
    assert.ok(store.snapshotState().candidates.some((candidate) => candidate.candidateType === "session"));
    assert.ok(second.status === "unchanged_raw" || second.status === "unchanged");
    assert.equal(second.extractionRunId, null);
    assert.equal(second.candidateIds.length, 0);
  });

  it("markup-only change → unchanged_facts", async () => {
    const chromeHtml = chromeOnlyVariant(goldHtml);
    assert.notEqual(hashSourceContent(goldHtml), hashSourceContent(chromeHtml));
    const { first, second, store } = await runPair(goldHtml, chromeHtml, "riverwood-chrome");
    assert.equal(first.status, "baseline");
    const fingerprint = store.snapshotState().sources[0].lastFactFingerprint;
    assert.equal(second.status, "unchanged_facts");
    assert.equal(second.candidateIds.length, 0);
    assert.equal(store.snapshotState().sources[0].lastFactFingerprint, fingerprint);
  });

  it("SOLD OUT state change → changed_facts without inventing a seat count or closing registration", async () => {
    const changedHtml = soldOutClearedVariant(goldHtml);
    const goldRecords = extractRecords(goldHtml);
    const changedRecords = extractRecords(changedHtml);
    const goldWeek2 = sessionsOf(goldRecords).find(
      (session) => session.sourceIdentity === "riverwood_conservancy:session:07-06_07-10",
    );
    const changedWeek2 = sessionsOf(changedRecords).find(
      (session) => session.sourceIdentity === "riverwood_conservancy:session:07-06_07-10",
    );
    assert.ok(goldWeek2);
    assert.ok(changedWeek2);
    assert.equal(goldWeek2.normalizedFields.seatAvailability, "confirmed_full");
    assert.equal(changedWeek2.normalizedFields.seatAvailability, null);
    assert.equal(changedWeek2.normalizedFields.registrationStatus, null);
    assert.notEqual(changedWeek2.normalizedFields.seatAvailability, 0);
    const goldPayload = buildFactFingerprintPayload([goldWeek2])[0]?.fields;
    const changedPayload = buildFactFingerprintPayload([changedWeek2])[0]?.fields;
    assert.equal(goldPayload?.seatAvailability, "confirmed_full");
    assert.equal(changedPayload?.seatAvailability, null);
    assert.equal(goldPayload?.registrationStatus, null);
    assert.equal(changedPayload?.registrationStatus, null);
    assert.equal(goldWeek2.sourceIdentity, changedWeek2.sourceIdentity);
    const { first, second } = await runPair(goldHtml, changedHtml, "riverwood-soldout");
    assert.equal(first.status, "baseline");
    assert.equal(second.status, "changed_facts");
  });

  it("explicit capacity 16 → 20 → changed_facts", async () => {
    const changedHtml = capacityChangedVariant(goldHtml);
    const goldCap = extractRecords(goldHtml).find((record) => record.recordType === "program");
    const changedCap = extractRecords(changedHtml).find((record) => record.recordType === "program");
    assert.equal((goldCap?.normalizedFields.policies as { enrolmentCapPerWeek: number }).enrolmentCapPerWeek, 16);
    assert.equal((changedCap?.normalizedFields.policies as { enrolmentCapPerWeek: number }).enrolmentCapPerWeek, 20);
    const goldSessionCap = sessionsOf(extractRecords(goldHtml))[0];
    const changedSessionCap = sessionsOf(extractRecords(changedHtml))[0];
    assert.equal(goldSessionCap.normalizedFields.enrolmentCapPerWeek, 16);
    assert.equal(changedSessionCap.normalizedFields.enrolmentCapPerWeek, 20);
    assert.equal(goldSessionCap.normalizedFields.seatAvailability, changedSessionCap.normalizedFields.seatAvailability);
    assert.equal(goldSessionCap.normalizedFields.registrationStatus, changedSessionCap.normalizedFields.registrationStatus);
    const { second } = await runPair(goldHtml, changedHtml, "riverwood-cap");
    assert.equal(second.status, "changed_facts");
  });

  it("published price change → changed_facts without changing identity", async () => {
    const changedHtml = priceChangedVariant(goldHtml);
    const goldWeek2 = sessionsOf(extractRecords(goldHtml)).find(
      (session) => session.sourceIdentity === "riverwood_conservancy:session:07-06_07-10",
    );
    const changedWeek2 = sessionsOf(extractRecords(changedHtml)).find(
      (session) => session.sourceIdentity === "riverwood_conservancy:session:07-06_07-10",
    );
    assert.equal(goldWeek2?.normalizedFields.priceAmount, 450);
    assert.equal(changedWeek2?.normalizedFields.priceAmount, 475);
    assert.equal(goldWeek2?.sourceIdentity, changedWeek2?.sourceIdentity);
    const { second } = await runPair(goldHtml, changedHtml, "riverwood-price");
    assert.equal(second.status, "changed_facts");
  });

  it("grade copy change → changed_facts without inventing ages", async () => {
    const changedHtml = gradeChangedVariant(goldHtml);
    const goldSessions = sessionsOf(extractRecords(goldHtml));
    const changedSessions = sessionsOf(extractRecords(changedHtml));
    assert.ok(goldSessions.every((session) => session.normalizedFields.ageMin === null));
    assert.ok(changedSessions.every((session) => session.normalizedFields.ageMin === null));
    assert.ok(changedSessions.every((session) => session.normalizedFields.ageMax === null));
    assert.ok(goldSessions.every((session) => session.normalizedFields.gradeMin === 1));
    assert.ok(goldSessions.every((session) => session.normalizedFields.gradeMax === 6));
    assert.ok(changedSessions.every((session) => session.normalizedFields.gradeMax === 5));
    assert.equal(buildFactFingerprintPayload(goldSessions)[0]?.fields.gradeMax, 6);
    assert.equal(buildFactFingerprintPayload(changedSessions)[0]?.fields.gradeMax, 5);
    assert.equal(goldSessions[0].sourceIdentity, changedSessions[0].sourceIdentity);
    const { second } = await runPair(goldHtml, changedHtml, "riverwood-grade");
    assert.equal(second.status, "changed_facts");
  });

  it("identity-bearing date-window change does not silently rematch", () => {
    const records = extractRecords(dateWindowChangedVariant(goldHtml));
    const changed = sessionsOf(records).find(
      (session) => session.sourceIdentity === "riverwood_conservancy:session:07-06_07-11",
    );
    assert.ok(changed);
    const match = exactSessionMatcher.match(
      {
        ...changed,
        normalizedFields: {
          ...changed.normalizedFields,
          programId: "prog-riverwood",
          externalId: changed.sourceIdentity,
        },
      },
      [
        {
          id: "catalog-riverwood-july-6-10",
          programId: "prog-riverwood",
          startDate: null,
          endDate: null,
          ageMin: null,
          ageMax: null,
          externalId: "riverwood_conservancy:session:07-06_07-10",
          sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
        },
      ],
    );
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
  });

  it("date-window HTML mutation is changed_facts and a new identity", async () => {
    const changedHtml = dateWindowChangedVariant(goldHtml);
    const goldIds = sessionsOf(extractRecords(goldHtml)).map((session) => session.sourceIdentity);
    const changedIds = sessionsOf(extractRecords(changedHtml)).map((session) => session.sourceIdentity);
    assert.ok(goldIds.includes("riverwood_conservancy:session:07-06_07-10"));
    assert.ok(changedIds.includes("riverwood_conservancy:session:07-06_07-11"));
    assert.ok(!changedIds.includes("riverwood_conservancy:session:07-06_07-10"));
    const { second } = await runPair(goldHtml, changedHtml, "riverwood-dates");
    assert.equal(second.status, "changed_facts");
  });

  it("yearless identity collides across seasons with the same month/day window", () => {
    const seasonPage = (footerYear: string, pdfYear: string, chrome: string) => `<html><body>
<h1>Summer Camp</h1>
<p>The Riverwood Conservancy</p>
<p>Children who have completed Grade 1, 2, 3, 4, 5, or 6 can spend a week adventuring.</p>
<p>Week 2: July 6 – 10 | $450 per child – SOLD OUT</p>
<p>Camp runs from 9:00 am – 3:30 pm each day</p>
<p>Dropoff and Pickup at Chappell House – 4300 Riverwood Park Lane</p>
<p>Enrolment for each week of Camp Riverwood is limited to 16 children</p>
<p>PLEASE NOTE: We will not provide pre- or post-camp care.</p>
<a href="https://theriverwoodconservancy.org/wp-content/uploads/${pdfYear}/06/${pdfYear}-Camp-Riverwood-Summer-Day-Camp-Information-Guide.pdf">Read More</a>
<footer>${footerYear} The Riverwood Conservancy</footer>
${chrome}
</body></html>`;

    const seasonA = seasonPage("2026", "2026", "<!-- season A chrome; year is still not stated -->");
    const seasonB = seasonPage("2027", "2027", "<!-- season B chrome; later year, still not stated -->");
    assert.notEqual(hashSourceContent(seasonA), hashSourceContent(seasonB));

    const recordsA = extractRecords(seasonA, "run-season-a");
    const recordsB = extractRecords(seasonB, "run-season-b");
    const sessionsA = sessionsOf(recordsA);
    const sessionsB = sessionsOf(recordsB);
    assert.equal(sessionsA.length, 1);
    assert.equal(sessionsB.length, 1);
    assert.equal(sessionsA[0].sourceIdentity, "riverwood_conservancy:session:07-06_07-10");
    assert.equal(sessionsA[0].sourceIdentity, sessionsB[0].sourceIdentity);
    assert.doesNotMatch(sessionsA[0].sourceIdentity, /20\d{2}/);
    assert.equal(sessionsA[0].normalizedFields.startDate, null);
    assert.equal(sessionsB[0].normalizedFields.startDate, null);
    assert.equal(sessionsA[0].normalizedFields.weekIdentity, "07-06_07-10");
    assert.equal(hashFactFingerprint(recordsA), hashFactFingerprint(recordsB));
  });
});
