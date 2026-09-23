/**
 * camp-facts-v2 version-transition policy (Phase A1).
 *
 * CASE A: stored v1 + same raw → rebaseline, zero candidates
 * CASE B: stored v1 + raw changed → normal candidate/review + transition reason
 * CASE C: force=true during transition → review still occurs
 * After A: next identical run → unchanged_raw
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { CampExtractedRecord, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import {
  FACT_FINGERPRINT_VERSION,
  FACT_FINGERPRINT_VERSION_V1,
  hashFactFingerprint,
  parseSemanticFingerprint,
} from "@/lib/camps/ingestion/factFingerprint";
import { riverwoodConservancyExtractor } from "@/lib/camps/ingestion/extractors/riverwoodConservancyExtractor";
import { FixtureSourceFetcher } from "@/lib/camps/ingestion/fetcher";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import { runCampSource } from "@/lib/camps/ingestion/runner/runDueCampSources";
import {
  RIVERWOOD_CONSERVANCY_SOURCE_ID,
  riverwoodConservancySource,
} from "@/lib/camps/ingestion/sources/seedSources";

const goldHtml = readFileSync(
  fileURLToPath(new URL("../../../data/camps/ingestion/benchmarks/riverwood-conservancy-summercamp.html", import.meta.url)),
  "utf8",
);

function soldOutCleared(html: string): string {
  return html.replace(
    "Week 2: July 6 – 10 | $450 per child &#8211; SOLD OUT",
    "Week 2: July 6 – 10 | $450 per child",
  );
}

function extractRecords(html: string): CampExtractedRecord[] {
  const source = riverwoodConservancySource(new Date("2026-09-19T16:00:00.000Z"));
  const document = cleanHtmlToDocument(html, { baseUrl: source.canonicalUrl });
  const snapshot: CampSourceSnapshot = {
    id: "snap-riverwood-v2-transition",
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
    extractionRunId: "run-riverwood-v2-transition",
    newId: createSequentialIdFactory("fp"),
    now: new Date("2026-09-19T16:00:00.000Z"),
  });
  assert.notEqual(result.status, "failed");
  return result.records;
}

function storeWithStoredV1(rawHtml: string) {
  const v1 = hashFactFingerprint(extractRecords(rawHtml), FACT_FINGERPRINT_VERSION_V1);
  assert.match(v1, /^camp-facts-v1:sha256:[0-9a-f]{64}$/);
  return createMemoryIngestionStore({
    sources: [
      {
        ...riverwoodConservancySource(new Date("2026-09-19T12:00:00.000Z")),
        lastContentHash: hashSourceContent(rawHtml),
        lastFactFingerprint: v1,
      },
    ],
  });
}

function emptyCatalog() {
  return { providers: [], programs: [], sessions: [], venues: [] };
}

describe("camp-facts-v2 version transition", () => {
  it("CASE A: stored v1 + same raw → v2 rebaseline with zero review candidates", async () => {
    const store = storeWithStoredV1(goldHtml);
    const newId = createSequentialIdFactory("v2-a");
    const result = await runCampSource({
      sourceId: RIVERWOOD_CONSERVANCY_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [RIVERWOOD_CONSERVANCY_SOURCE_ID]: { content: goldHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-19T12:00:00.000Z"),
      newId,
    });
    assert.equal(result.status, "fingerprint_rebaseline");
    assert.ok(result.warnings.includes("fingerprint_rebaseline"));
    assert.equal(result.candidateIds.length, 0);
    assert.equal(store.snapshotState().candidates.length, 0);
    const persisted = store.snapshotState().sources[0].lastFactFingerprint;
    assert.ok(persisted);
    assert.equal(parseSemanticFingerprint(persisted)?.version, FACT_FINGERPRINT_VERSION);
    assert.equal(persisted, hashFactFingerprint(extractRecords(goldHtml)));
  });

  it("CASE B: stored v1 + raw changed → candidate path with visible transition reason", async () => {
    const store = storeWithStoredV1(goldHtml);
    const newId = createSequentialIdFactory("v2-b");
    const changedHtml = soldOutCleared(goldHtml);
    assert.notEqual(hashSourceContent(goldHtml), hashSourceContent(changedHtml));
    const result = await runCampSource({
      sourceId: RIVERWOOD_CONSERVANCY_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [RIVERWOOD_CONSERVANCY_SOURCE_ID]: { content: changedHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-19T12:00:00.000Z"),
      newId,
    });
    assert.notEqual(result.status, "fingerprint_rebaseline");
    assert.ok(result.candidateIds.length > 0);
    assert.ok(result.warnings.includes("fingerprint_version_changed"));
    assert.ok(result.warnings.includes("fingerprint_version_transition"));
    assert.ok(result.warnings.includes("fingerprint_version_transition_with_raw_change"));
    const candidates = store.snapshotState().candidates;
    assert.ok(
      candidates.some((candidate) =>
        String(candidate.reviewReason).includes("fingerprint_version_transition_with_raw_change"),
      ),
    );
    const persisted = store.snapshotState().sources[0].lastFactFingerprint;
    assert.equal(parseSemanticFingerprint(persisted)?.version, FACT_FINGERPRINT_VERSION);
  });

  it("after successful rebaseline, the next identical run is unchanged_raw", async () => {
    const store = storeWithStoredV1(goldHtml);
    const newId = createSequentialIdFactory("v2-c");
    const first = await runCampSource({
      sourceId: RIVERWOOD_CONSERVANCY_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [RIVERWOOD_CONSERVANCY_SOURCE_ID]: { content: goldHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-19T12:00:00.000Z"),
      newId,
    });
    assert.equal(first.status, "fingerprint_rebaseline");
    const second = await runCampSource({
      sourceId: RIVERWOOD_CONSERVANCY_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [RIVERWOOD_CONSERVANCY_SOURCE_ID]: { content: goldHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-20T12:00:00.000Z"),
      newId,
    });
    assert.ok(second.status === "unchanged_raw" || second.status === "unchanged");
    assert.equal(second.extractionRunId, null);
    assert.equal(second.candidateIds.length, 0);
  });

  it("CASE C: force=true during v1→v2 transition still creates review", async () => {
    const store = storeWithStoredV1(goldHtml);
    const newId = createSequentialIdFactory("v2-d");
    const result = await runCampSource({
      sourceId: RIVERWOOD_CONSERVANCY_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        { [RIVERWOOD_CONSERVANCY_SOURCE_ID]: { content: goldHtml, fetchStatus: "success" } },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-19T12:00:00.000Z"),
      newId,
      force: true,
    });
    assert.notEqual(result.status, "fingerprint_rebaseline");
    assert.ok(result.candidateIds.length > 0);
    assert.ok(
      result.status === "fingerprint_version_changed" ||
        result.status === "changed_facts" ||
        result.status === "baseline",
    );
  });

  it("unknown future fingerprint version + changed raw is not a silent rebaseline", async () => {
    const store = createMemoryIngestionStore({
      sources: [
        {
          ...riverwoodConservancySource(new Date("2026-09-19T12:00:00.000Z")),
          lastContentHash: hashSourceContent(goldHtml),
          lastFactFingerprint:
            "camp-facts-v9:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      ],
    });
    const newId = createSequentialIdFactory("v2-future");
    const result = await runCampSource({
      sourceId: RIVERWOOD_CONSERVANCY_SOURCE_ID,
      store,
      fetcher: new FixtureSourceFetcher(
        {
          [RIVERWOOD_CONSERVANCY_SOURCE_ID]: {
            content: soldOutCleared(goldHtml),
            fetchStatus: "success",
          },
        },
        { newId },
      ),
      catalog: emptyCatalog(),
      now: () => new Date("2026-09-19T12:00:00.000Z"),
      newId,
    });
    assert.notEqual(result.status, "fingerprint_rebaseline");
    assert.ok(result.candidateIds.length > 0);
    assert.ok(result.warnings.includes("fingerprint_version_changed"));
  });
});
