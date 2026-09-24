/**
 * Prompt 9B-C1 — Front Line Hockey semantic fingerprint + multi-source pipeline.
 *
 * Proves at least two CampSources pass independently through fixture → extractor
 * → fingerprint → matcher → change set → review candidate, without a generic
 * runner redesign.
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
  buildFactFingerprintPayload,
  hashFactFingerprint,
} from "@/lib/camps/ingestion/factFingerprint";
import { frontLineHockeyExtractor } from "@/lib/camps/ingestion/extractors/frontLineHockeyExtractor";
import { FixtureSourceFetcher } from "@/lib/camps/ingestion/fetcher";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { exactSessionMatcher } from "@/lib/camps/ingestion/matchers";
import { FRONT_LINE_HOCKEY_OFFERING_GRAIN } from "@/lib/camps/ingestion/extractors/offeringGrain";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import type { IngestionCatalogSnapshot } from "@/lib/camps/ingestion/repositories/types";
import { runCampSource } from "@/lib/camps/ingestion/runner/runDueCampSources";
import {
  FRONT_LINE_HOCKEY_APRIL_SOURCE_ID,
  FRONT_LINE_HOCKEY_DECEMBER_SOURCE_ID,
  FRONT_LINE_HOCKEY_JULY_SOURCE_ID,
  FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
  frontLineHockeySourceById,
  frontLineHockeySources,
} from "@/lib/camps/ingestion/sources/seedSources";

const BENCHMARK_DIR = "../../../data/camps/ingestion/benchmarks";

function readBenchmark(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(`${BENCHMARK_DIR}/${fileName}`, import.meta.url)),
    "utf8",
  );
}

const julyHtml = readBenchmark("front-line-hockey-july-half-day.html");
const aprilHtml = readBenchmark("front-line-hockey-april-hockey-camp.html");
const girlsHtml = readBenchmark("front-line-hockey-july-girls-only.html");
const augustHtml = readBenchmark("front-line-hockey-august-full-day.html");
const fallHtml = readBenchmark("front-line-hockey-fall-pre-evaluation.html");
const decemberHtml = readBenchmark("front-line-hockey-december-mid-season.html");

const FIXTURE_BY_ID: Record<string, string> = {
  "src-front-line-hockey-april-pre-tryout": aprilHtml,
  "src-front-line-hockey-july-half-day": julyHtml,
  "src-front-line-hockey-july-girls-only": girlsHtml,
  "src-front-line-hockey-august-full-day": augustHtml,
  "src-front-line-hockey-fall-pre-evaluation": fallHtml,
  "src-front-line-hockey-december-mid-season": decemberHtml,
};

function chromeOnlyVariant(html: string): string {
  return html
    .replace("<body", '<body data-build="chrome-9b-c1" class="nav-reordered"')
    .replace(
      "</body>",
      `<script>window.__frontLineChrome = "decorative-static";</script>
<footer class="site-chrome">Updated footer copy that is not camp facts.</footer>
</body>`,
    );
}

function playerPriceChanged(html: string): string {
  return html.replace(/&quot;display_price&quot;:395/g, "&quot;display_price&quot;:410");
}

function goaliePriceChanged(html: string): string {
  return html.replace(/&quot;display_price&quot;:100/g, "&quot;display_price&quot;:125");
}

function ageBandHoursChanged(html: string): string {
  return html.replace("10:00am - 11:30am: ages 5-9", "10:30am - 11:30am: ages 5-9");
}

function venueChanged(html: string): string {
  return html.replace(/Vic Johnston Arena/g, "Hershey Centre");
}

function availabilityChanged(html: string): string {
  return html
    .replace(/\binstock\b/g, "outofstock")
    .replace(/&quot;is_in_stock&quot;:true/g, "&quot;is_in_stock&quot;:false")
    .replace(/in-stock/g, "out-of-stock")
    .replace(/\d+ in stock/g, "Out of stock");
}

function dateWindowChanged(html: string): string {
  return html.replace("July 6 -10", "July 6 -11");
}

function eligibilityChanged(html: string): string {
  return html.replace("ages 5-9 and 10-14", "ages 6-9 and 10-14");
}

function extractRecords(html: string, sourceId: string = FRONT_LINE_HOCKEY_JULY_SOURCE_ID): CampExtractedRecord[] {
  const source = frontLineHockeySourceById(sourceId, new Date("2026-09-19T16:00:00.000Z"));
  const document = cleanHtmlToDocument(html, { baseUrl: source.sourceUrl });
  const snapshot: CampSourceSnapshot = {
    id: `snap-${sourceId}-fp`,
    sourceId,
    retrievedAt: "2026-09-19T16:00:00.000Z",
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(html),
    rawContent: html,
    fetchStatus: "success",
  };
  const result = frontLineHockeyExtractor.extract({
    source,
    snapshot,
    document,
    rawHtml: html,
    extractionRunId: `run-${sourceId}`,
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

async function runPair(
  firstHtml: string,
  secondHtml: string,
  prefix: string,
  sourceId: string = FRONT_LINE_HOCKEY_JULY_SOURCE_ID,
) {
  const store = createMemoryIngestionStore({
    sources: [frontLineHockeySourceById(sourceId, new Date("2026-09-19T12:00:00.000Z"))],
  });
  const newId = createSequentialIdFactory(prefix);
  const first = await runCampSource({
    sourceId,
    store,
    fetcher: new FixtureSourceFetcher(
      { [sourceId]: { content: firstHtml, fetchStatus: "success" } },
      { newId },
    ),
    catalog: emptyCatalog(),
    now: () => new Date("2026-09-19T12:00:00.000Z"),
    newId,
  });
  const second = await runCampSource({
    sourceId,
    store,
    fetcher: new FixtureSourceFetcher(
      { [sourceId]: { content: secondHtml, fetchStatus: "success" } },
      { newId },
    ),
    catalog: emptyCatalog(),
    now: () => new Date("2026-09-20T12:00:00.000Z"),
    newId,
  });
  return { store, first, second };
}

describe("Front Line Hockey semantic fingerprint control (Prompt 9B-C1)", () => {
  it("fingerprints the July product under camp-facts-v2", () => {
    const records = extractRecords(julyHtml);
    assert.equal(sessionsOf(records).length, 1);
    const fingerprint = hashFactFingerprint(records);
    assert.match(fingerprint, new RegExp(`^${FACT_FINGERPRINT_VERSION}:sha256:[0-9a-f]{64}$`));
    assert.equal(hashFactFingerprint([...records].reverse()), fingerprint);
  });

  it("exact repeat → unchanged_raw", async () => {
    const { first, second, store } = await runPair(julyHtml, julyHtml, "fl-raw");
    assert.equal(first.status, "baseline");
    assert.ok(first.candidateIds.length > 0);
    assert.ok(store.snapshotState().candidates.some((candidate) => candidate.candidateType === "session"));
    assert.ok(second.status === "unchanged_raw" || second.status === "unchanged");
    assert.equal(second.candidateIds.length, 0);
  });

  it("markup-only change → unchanged_facts", async () => {
    const chromeHtml = chromeOnlyVariant(julyHtml);
    assert.notEqual(hashSourceContent(julyHtml), hashSourceContent(chromeHtml));
    const { first, second } = await runPair(julyHtml, chromeHtml, "fl-chrome");
    assert.equal(first.status, "baseline");
    assert.equal(second.status, "unchanged_facts");
    assert.equal(second.candidateIds.length, 0);
  });

  it("player price change → changed_facts without changing identity", async () => {
    const changedHtml = playerPriceChanged(julyHtml);
    const gold = sessionsOf(extractRecords(julyHtml))[0];
    const changed = sessionsOf(extractRecords(changedHtml))[0];
    assert.equal(gold.normalizedFields.priceAmount, 395);
    assert.equal(changed.normalizedFields.priceAmount, 410);
    assert.equal(gold.sourceIdentity, changed.sourceIdentity);
    const { second } = await runPair(julyHtml, changedHtml, "fl-player");
    assert.equal(second.status, "changed_facts");
  });

  it("goalie price change on the July product → changed_facts via structured priceOptions", async () => {
    const changedHtml = goaliePriceChanged(julyHtml);
    const gold = sessionsOf(extractRecords(julyHtml))[0];
    const changed = sessionsOf(extractRecords(changedHtml))[0];
    const goldOptions = gold.normalizedFields.priceOptions as Array<{ key: string; amount: number }>;
    const changedOptions = changed.normalizedFields.priceOptions as Array<{
      key: string;
      amount: number;
    }>;
    assert.equal(goldOptions.find((option) => option.key === "player")?.amount, 395);
    assert.equal(goldOptions.find((option) => option.key === "goalie")?.amount, 100);
    assert.equal(changedOptions.find((option) => option.key === "goalie")?.amount, 125);
    assert.equal(gold.normalizedFields.priceAmount, 395);
    assert.equal(changed.normalizedFields.priceAmount, 395);
    assert.equal(gold.sourceIdentity, changed.sourceIdentity);
    const goldPayload = buildFactFingerprintPayload([gold])[0]?.fields.priceOptions as Array<{
      key: string;
      amount: number;
    }>;
    assert.equal(goldPayload.find((option) => option.key === "goalie")?.amount, 100);
    const { second } = await runPair(julyHtml, changedHtml, "fl-goalie");
    assert.equal(second.status, "changed_facts");
  });

  it("venue change → changed_facts", async () => {
    const changedHtml = venueChanged(julyHtml);
    const goldVenue = extractRecords(julyHtml).find((record) => record.recordType === "venue");
    const changedVenue = extractRecords(changedHtml).find((record) => record.recordType === "venue");
    assert.equal(goldVenue?.normalizedFields.name, "Vic Johnston Arena");
    assert.equal(changedVenue?.normalizedFields.name, "Hershey Centre");
    const { second } = await runPair(julyHtml, changedHtml, "fl-venue");
    assert.equal(second.status, "changed_facts");
  });

  it("availability state change → changed_facts without closing registration", async () => {
    const changedHtml = availabilityChanged(julyHtml);
    const gold = sessionsOf(extractRecords(julyHtml))[0];
    const changed = sessionsOf(extractRecords(changedHtml))[0];
    assert.equal(gold.normalizedFields.seatAvailability, null);
    assert.equal(changed.normalizedFields.seatAvailability, "confirmed_full");
    assert.equal(changed.normalizedFields.registrationStatus, null);
    const { second } = await runPair(julyHtml, changedHtml, "fl-avail");
    assert.equal(second.status, "changed_facts");
  });

  it("date-window change creates a new identity and does not silently rematch", () => {
    const changed = sessionsOf(extractRecords(dateWindowChanged(julyHtml)))[0];
    const gold = sessionsOf(extractRecords(julyHtml))[0];
    assert.notEqual(changed.sourceIdentity, gold.sourceIdentity);
    assert.match(changed.sourceIdentity, /2026-07-11/);
    const match = exactSessionMatcher.match(
      {
        ...changed,
        normalizedFields: {
          ...changed.normalizedFields,
          programId: "prog-fl",
          externalId: changed.sourceIdentity,
        },
      },
      [
        {
          id: "catalog-july-6-10",
          programId: "prog-fl",
          startDate: "2026-07-06",
          endDate: "2026-07-10",
          ageMin: 5,
          ageMax: 14,
          externalId: gold.sourceIdentity,
          sourceUrl: FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
        },
      ],
      FRONT_LINE_HOCKEY_OFFERING_GRAIN,
    );
    assert.equal(match.catalogId, null);
    assert.deepEqual(match.reasons, ["no_match"]);
  });

  it("duplicate semantic URL with the same sourceIdentity is EXACT_IDENTITY", () => {
    const gold = sessionsOf(extractRecords(julyHtml))[0];
    const match = exactSessionMatcher.match(
      {
        ...gold,
        normalizedFields: {
          ...gold.normalizedFields,
          programId: "prog-fl",
          externalId: gold.sourceIdentity,
          sourceUrl: "https://frontlinehockeyschool.ca/product/july-hockey-camp/?ref=duplicate",
        },
      },
      [
        {
          id: "catalog-july-6-10",
          programId: "prog-fl",
          startDate: "2026-07-06",
          endDate: "2026-07-10",
          externalId: gold.sourceIdentity,
          sourceUrl: FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
        },
      ],
      FRONT_LINE_HOCKEY_OFFERING_GRAIN,
    );
    assert.equal(match.kind, "EXACT_IDENTITY");
    assert.equal(match.catalogId, "catalog-july-6-10");
  });

  it("Player/Goalie price-option change keeps offering identity", () => {
    const gold = sessionsOf(extractRecords(julyHtml))[0];
    const changed = sessionsOf(extractRecords(goaliePriceChanged(julyHtml)))[0];
    assert.equal(gold.sourceIdentity, changed.sourceIdentity);
    const match = exactSessionMatcher.match(
      {
        ...changed,
        normalizedFields: {
          ...changed.normalizedFields,
          programId: "prog-fl",
          externalId: changed.sourceIdentity,
        },
      },
      [
        {
          id: "catalog-july-6-10",
          programId: "prog-fl",
          startDate: String(gold.normalizedFields.startDate),
          endDate: String(gold.normalizedFields.endDate),
          externalId: gold.sourceIdentity,
          sourceUrl: FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
        },
      ],
      FRONT_LINE_HOCKEY_OFFERING_GRAIN,
    );
    assert.equal(match.kind, "EXACT_IDENTITY");
    assert.notEqual(match.kind, "IDENTITY_CHANGED");
    assert.equal(match.catalogId, "catalog-july-6-10");
  });

  it("eligibility/age-group change → changed_facts without inventing a hockey-level age model", async () => {
    const changedHtml = eligibilityChanged(julyHtml);
    const gold = sessionsOf(extractRecords(julyHtml))[0];
    const changed = sessionsOf(extractRecords(changedHtml))[0];
    assert.equal(gold.normalizedFields.ageMin, 5);
    assert.equal(changed.normalizedFields.ageMin, 6);
    assert.equal(gold.sourceIdentity, changed.sourceIdentity);
    const { second } = await runPair(julyHtml, changedHtml, "fl-age");
    assert.equal(second.status, "changed_facts");
  });

  it("December structured age-band hour change → changed_facts without flattening bands", async () => {
    const changedHtml = ageBandHoursChanged(decemberHtml);
    const gold = sessionsOf(extractRecords(decemberHtml, FRONT_LINE_HOCKEY_DECEMBER_SOURCE_ID))[0];
    const changed = sessionsOf(
      extractRecords(changedHtml, FRONT_LINE_HOCKEY_DECEMBER_SOURCE_ID),
    )[0];
    const goldBands = gold.normalizedFields.ageBands as Array<{
      ageMin: number;
      hoursStart: string | null;
      hoursEnd: string | null;
    }>;
    const changedBands = changed.normalizedFields.ageBands as Array<{
      ageMin: number;
      hoursStart: string | null;
      hoursEnd: string | null;
    }>;
    assert.equal(goldBands.length, 2);
    assert.equal(changedBands.length, 2);
    assert.equal(goldBands.find((band) => band.ageMin === 5)?.hoursStart, "10:00");
    assert.equal(goldBands.find((band) => band.ageMin === 5)?.hoursEnd, "11:30");
    assert.equal(changedBands.find((band) => band.ageMin === 5)?.hoursStart, "10:30");
    assert.equal(gold.normalizedFields.ageMin, 5);
    assert.equal(gold.normalizedFields.ageMax, 14);
    assert.equal(changed.normalizedFields.ageMin, 5);
    assert.equal(changed.normalizedFields.ageMax, 14);
    assert.equal(gold.sourceIdentity, changed.sourceIdentity);
    assert.notEqual(
      hashFactFingerprint(extractRecords(decemberHtml, FRONT_LINE_HOCKEY_DECEMBER_SOURCE_ID)),
      hashFactFingerprint(extractRecords(changedHtml, FRONT_LINE_HOCKEY_DECEMBER_SOURCE_ID)),
    );
    const { first, second } = await runPair(
      decemberHtml,
      changedHtml,
      "fl-hours",
      FRONT_LINE_HOCKEY_DECEMBER_SOURCE_ID,
    );
    assert.ok(first.status === "baseline" || first.status === "partial");
    assert.ok(second.candidateIds.length > 0);
    assert.ok(second.warnings.includes("changed_facts"));
    assert.notEqual(second.status, "unchanged_facts");
    assert.notEqual(second.status, "unchanged_raw");
    assert.notEqual(second.status, "fingerprint_rebaseline");
    // December gold is a thin/partial extraction; the runner reports `partial`
    // ahead of `changed_facts` even when the fact fingerprint moved.
    assert.ok(second.status === "changed_facts" || second.status === "partial");
  });

  it("ageBands reorder only → unchanged fingerprint", () => {
    const gold = sessionsOf(extractRecords(julyHtml))[0];
    const bands = [...((gold.normalizedFields.ageBands as unknown[]) ?? [])];
    const reordered = {
      ...gold,
      normalizedFields: {
        ...gold.normalizedFields,
        ageBands: [...bands].reverse(),
      },
    };
    assert.equal(hashFactFingerprint([gold]), hashFactFingerprint([reordered]));
  });

  it("priceOptions reorder only → unchanged fingerprint", () => {
    const gold = sessionsOf(extractRecords(julyHtml))[0];
    const options = [...((gold.normalizedFields.priceOptions as unknown[]) ?? [])];
    const reordered = {
      ...gold,
      normalizedFields: {
        ...gold.normalizedFields,
        priceOptions: [...options].reverse(),
      },
    };
    assert.equal(hashFactFingerprint([gold]), hashFactFingerprint([reordered]));
  });

  it("Fall goalie stays unresolved: null structured price, raw $1 retained", () => {
    const session = sessionsOf(
      extractRecords(fallHtml, "src-front-line-hockey-fall-pre-evaluation"),
    )[0];
    const options = (session.normalizedFields.priceOptions as Array<{ key: string; amount: number }>) ?? [];
    assert.equal(options.find((option) => option.key === "player")?.amount, 375);
    assert.equal(options.find((option) => option.key === "goalie"), undefined);
    assert.equal(session.rawFields.rawGoalieVariantAmount, 1);
    const observations = session.normalizedFields.observations as {
      goaliePriceAmount?: { value: number | null };
      rawGoalieVariantAmount?: { value: number | null };
    };
    assert.equal(observations.goaliePriceAmount?.value, null);
    assert.equal(observations.rawGoalieVariantAmount?.value, 1);
  });
});

describe("Front Line Hockey multi-source pipeline (Prompt 9B-C1)", () => {
  it("runs all six gold product sources independently through the existing runner", async () => {
    const sources = frontLineHockeySources(new Date("2026-09-19T12:00:00.000Z"));
    const store = createMemoryIngestionStore({ sources });
    const identities: string[] = [];
    for (const source of sources) {
      const newId = createSequentialIdFactory(source.id);
      const result = await runCampSource({
        sourceId: source.id,
        store,
        fetcher: new FixtureSourceFetcher(
          { [source.id]: { content: FIXTURE_BY_ID[source.id], fetchStatus: "success" } },
          { newId },
        ),
        catalog: emptyCatalog(),
        now: () => new Date("2026-09-19T12:00:00.000Z"),
        newId,
      });
      assert.ok(result.status === "baseline" || result.status === "changed_facts");
      assert.ok(result.candidateIds.length > 0);
      const sessionCandidate = store
        .snapshotState()
        .candidates.find(
          (candidate) => candidate.sourceId === source.id && candidate.candidateType === "session",
        );
      assert.ok(sessionCandidate, `missing session candidate for ${source.id}`);
      identities.push(String(sessionCandidate.candidateData.externalId));
    }
    assert.equal(new Set(identities).size, 6);
  });

  it("April and July sources do not share a session identity", () => {
    const april = sessionsOf(extractRecords(aprilHtml, FRONT_LINE_HOCKEY_APRIL_SOURCE_ID))[0];
    const july = sessionsOf(extractRecords(julyHtml, FRONT_LINE_HOCKEY_JULY_SOURCE_ID))[0];
    assert.notEqual(april.sourceIdentity, july.sourceIdentity);
    assert.equal(april.rawFields.sourceId, FRONT_LINE_HOCKEY_APRIL_SOURCE_ID);
    assert.equal(july.rawFields.sourceId, FRONT_LINE_HOCKEY_JULY_SOURCE_ID);
  });
});
