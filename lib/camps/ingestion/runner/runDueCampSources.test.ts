import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSource } from "@/data/camps/ingestion/types";
import { canonicalizeSourceUrl } from "@/lib/camps/ingestion/canonicalizeUrl";
import { FixtureSourceFetcher, type FixturePayload } from "@/lib/camps/ingestion/fetcher";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import {
  createMemoryIngestionStore,
  type MemoryIngestionStore,
} from "@/lib/camps/ingestion/repositories/memoryStore";
import type { IngestionCatalogSnapshot } from "@/lib/camps/ingestion/repositories/types";
import { runCampSource, runDueCampSources } from "@/lib/camps/ingestion/runner/runDueCampSources";

const SOURCE_URL = "https://example-camps.test/summer-camp";
const CANONICAL_URL = canonicalizeSourceUrl(SOURCE_URL);

function campPage(price: string): string {
  return `<!doctype html>
<html>
  <head><title>Bright Sparks Day Camp | Summer 2026</title></head>
  <body>
    <h1>Bright Sparks Day Camp</h1>
    <p>Ages 6-11</p>
    <p>July 6 - 10, 2026</p>
    <p>9:00 am - 4:00 pm</p>
    <p>${price} per week</p>
    <p><a href="https://app.activitymessenger.com/bright-sparks/register">Register now</a></p>
  </body>
</html>`;
}

function source(overrides: Partial<CampSource> = {}): CampSource {
  return {
    id: "src-bright-sparks",
    providerId: "prov-bright-sparks",
    sourceType: "provider_website",
    sourceUrl: SOURCE_URL,
    canonicalUrl: CANONICAL_URL,
    registrationPlatform: null,
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "daily",
    checkIntervalHours: 24,
    nextCheckAt: null,
    extractorKey: null,
    lastCheckedAt: null,
    lastContentHash: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function catalog(): IngestionCatalogSnapshot {
  return {
    providers: [
      {
        id: "prov-bright-sparks",
        name: "Bright Sparks",
        websiteUrl: "https://example-camps.test/",
      },
    ],
    programs: [
      {
        id: "prog-bright-sparks-day-camp",
        providerId: "prov-bright-sparks",
        name: "Bright Sparks Day Camp",
        slug: "bright-sparks-day-camp",
        typicalAgeMin: 6,
        typicalAgeMax: 11,
      },
    ],
    sessions: [
      {
        id: "sess-bright-sparks-week-1",
        programId: "prog-bright-sparks-day-camp",
        startDate: "2026-07-06",
        endDate: "2026-07-10",
        ageMin: 6,
        ageMax: 11,
        priceAmount: 399,
        coreHoursStart: "09:00",
        coreHoursEnd: "16:00",
        sourceUrl: CANONICAL_URL,
      },
    ],
    venues: [],
  };
}

type Harness = {
  store: MemoryIngestionStore;
  run: (
    payload: string,
    now: string,
    options?: { force?: boolean },
  ) => ReturnType<typeof runDueCampSources>;
};

function harness(seedSource: CampSource = source()): Harness {
  const store = createMemoryIngestionStore({ sources: [seedSource] });
  const newId = createSequentialIdFactory("row");
  return {
    store,
    run: (payload, now, options = {}) => {
      const payloads: Record<string, FixturePayload> = {
        [seedSource.id]: { content: payload, fetchStatus: "success" },
      };
      return runDueCampSources({
        store,
        fetcher: new FixtureSourceFetcher(payloads, { newId }),
        catalog: catalog(),
        now: () => new Date(now),
        newId,
        force: options.force,
      });
    },
  };
}

describe("runDueCampSources", () => {
  it("extracts on first sight and records the content hash", async () => {
    const { store, run } = harness();
    const summary = await run(campPage("$399"), "2026-09-12T12:00:00.000Z");

    assert.equal(summary.sourcesAttempted, 1);
    assert.equal(summary.sourcesSucceeded, 1);
    assert.equal(summary.sourcesChanged, 1);
    assert.equal(summary.sourcesUnchanged, 0);
    assert.equal(summary.extractionsSucceeded, 1);
    assert.deepEqual(summary.errors, []);

    const state = store.snapshotState();
    assert.equal(state.snapshots.length, 1);
    assert.equal(state.extractionRuns.length, 1);
    assert.equal(state.extractionRuns[0].status, "success");
    assert.equal(state.sources[0].lastContentHash, state.snapshots[0].contentHash);
    assert.equal(state.sources[0].lastSuccessfulAt, "2026-09-12T12:00:00.000Z");
    // Scheduled forward by the source's own interval, not a global constant.
    assert.equal(state.sources[0].nextCheckAt, "2026-09-13T12:00:00.000Z");
  });

  it("skips extraction entirely when the content hash is unchanged", async () => {
    const { store, run } = harness();
    const page = campPage("$399");
    await run(page, "2026-09-12T12:00:00.000Z");

    const afterFirst = store.snapshotState();
    // Due again: the second cycle must actually re-check the source.
    await store.sources.markSourceChecked({
      sourceId: "src-bright-sparks",
      checkedAt: "2026-09-12T12:00:00.000Z",
      contentHash: afterFirst.sources[0].lastContentHash,
      factFingerprint: afterFirst.sources[0].lastFactFingerprint,
      changed: true,
      successful: true,
      nextCheckAt: "2026-09-13T00:00:00.000Z",
    });

    const summary = await run(page, "2026-09-14T12:00:00.000Z");

    assert.equal(summary.sourcesAttempted, 1);
    assert.equal(summary.sourcesUnchanged, 1);
    assert.equal(summary.sourcesChanged, 0);
    assert.equal(summary.extractionsSucceeded, 0);
    assert.equal(summary.candidatesCreated, 0);
    assert.deepEqual(summary.errors, []);

    const state = store.snapshotState();
    // The snapshot is still recorded — the gate stops extraction, not evidence.
    assert.equal(state.snapshots.length, 2);
    assert.equal(state.extractionRuns.length, afterFirst.extractionRuns.length);
    assert.equal(state.candidates.length, afterFirst.candidates.length);
    assert.equal(state.sources[0].lastCheckedAt, "2026-09-14T12:00:00.000Z");
    // Unchanged content is not a change: lastChangedAt stays where it was.
    assert.equal(state.sources[0].lastChangedAt, "2026-09-12T12:00:00.000Z");
  });

  it("persists a new snapshot but creates no candidates when raw hash changes and facts do not", async () => {
    const { store, run } = harness();
    const pageA = campPage("$399");
    // Non-fact chrome that changes bytes without changing extracted fields.
    const pageB = campPage("$399").replace(
      "<body>",
      '<body><!-- build:b --><div class="tracker" data-cache="2"></div>',
    );

    const first = await run(pageA, "2026-09-12T12:00:00.000Z");
    assert.equal(first.sourcesChanged, 1);
    assert.ok(first.candidatesCreated > 0);

    const afterFirst = store.snapshotState();
    assert.ok(afterFirst.sources[0].lastFactFingerprint);
    assert.notEqual(afterFirst.snapshots[0].contentHash, undefined);
    const candidatesAfterFirst = afterFirst.candidates.length;
    const fingerprint = afterFirst.sources[0].lastFactFingerprint;

    await store.sources.markSourceChecked({
      sourceId: "src-bright-sparks",
      checkedAt: "2026-09-12T12:00:00.000Z",
      contentHash: afterFirst.sources[0].lastContentHash,
      factFingerprint: fingerprint,
      changed: true,
      successful: true,
      nextCheckAt: "2026-09-13T00:00:00.000Z",
    });

    const second = await run(pageB, "2026-09-14T12:00:00.000Z");

    assert.equal(second.sourcesAttempted, 1);
    assert.equal(second.sourcesUnchanged, 0);
    assert.equal(second.sourcesNonSemanticChange, 1);
    assert.equal(second.sourcesChanged, 0);
    assert.equal(second.extractionsSucceeded, 1);
    assert.equal(second.candidatesCreated, 0);
    assert.deepEqual(second.errors, []);

    const state = store.snapshotState();
    assert.equal(state.snapshots.length, 2);
    assert.notEqual(state.snapshots[0].contentHash, state.snapshots[1].contentHash);
    assert.equal(state.snapshots[1].factFingerprint, fingerprint);
    assert.equal(state.sources[0].lastFactFingerprint, fingerprint);
    assert.equal(state.sources[0].lastContentHash, state.snapshots[1].contentHash);
    assert.equal(state.candidates.length, candidatesAfterFirst);
    assert.equal(state.extractionRuns.length, afterFirst.extractionRuns.length + 1);
    assert.ok(
      state.extractionRuns.some((run) =>
        run.warnings.includes("non_semantic_source_change"),
      ),
    );
    // Facts did not move: lastChangedAt stays on the first fact-changing check.
    assert.equal(state.sources[0].lastChangedAt, "2026-09-12T12:00:00.000Z");
  });

  it("re-extracts unchanged content when forced", async () => {
    const { run } = harness();
    const page = campPage("$399");
    await run(page, "2026-09-12T12:00:00.000Z");

    const summary = await run(page, "2026-09-14T12:00:00.000Z", { force: true });
    assert.equal(summary.sourcesUnchanged, 0);
    assert.equal(summary.extractionsSucceeded, 1);
  });

  it("creates a needs_review candidate with the changed price when content changes", async () => {
    const { store, run } = harness();
    await run(campPage("$399"), "2026-09-12T12:00:00.000Z");
    const summary = await run(campPage("$429"), "2026-09-14T12:00:00.000Z");

    assert.equal(summary.sourcesChanged, 1);
    assert.equal(summary.extractionsSucceeded, 1);
    assert.deepEqual(summary.errors, []);

    const sessionCandidates = (
      await store.candidates.listCandidates({ candidateType: "session" })
    ).filter((candidate) => candidate.snapshotId === store.snapshotState().snapshots[1].id);
    assert.equal(sessionCandidates.length, 1);

    const candidate = sessionCandidates[0];
    assert.equal(candidate.matchedCatalogId, "sess-bright-sparks-week-1");
    assert.equal(candidate.status, "needs_review");
    assert.equal(candidate.pipelineOutcome, "MATCHED_CHANGED");

    const priceChange = candidate.changeSet.find((change) => change.field === "priceAmount");
    assert.ok(priceChange, "expected a priceAmount change");
    assert.equal(priceChange.changeType, "changed");
    assert.equal(priceChange.oldValue, 399);
    assert.equal(priceChange.newValue, 429);
    assert.equal(priceChange.sourceSnapshotId, candidate.snapshotId);

    // Unchanged facts on the same page are not proposed as changes.
    const changedFields = candidate.changeSet.map((change) => change.field);
    assert.ok(!changedFields.includes("startDate"));
    assert.ok(!changedFields.includes("ageMin"));

    // Nothing about a review decision has happened yet.
    assert.equal(candidate.reviewedAt ?? null, null);
    assert.equal(candidate.reviewedBy ?? null, null);
  });

  it("proposes an unmatched session as new rather than guessing a match", async () => {
    const { store, run } = harness();
    const page = campPage("$399").replace("July 6 - 10, 2026", "August 17 - 21, 2026");
    await run(page, "2026-09-12T12:00:00.000Z");

    const candidates = (
      await store.candidates.listCandidates({ candidateType: "session" })
    ).filter((candidate) => !candidate.qualityFlags.includes("possible_removed_session"));
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].matchedCatalogId, null);
    assert.equal(candidates[0].status, "new");
    assert.equal(candidates[0].pipelineOutcome, "NEW");
    // A new record proposes every stated field as an addition.
    assert.ok(candidates[0].changeSet.every((change) => change.changeType === "added"));
  });

  it("flags a catalog session the source stopped listing without deleting it", async () => {
    const { store, run } = harness();
    await run(campPage("$399"), "2026-09-12T12:00:00.000Z");

    const droppedWeek = campPage("$399").replace(
      "July 6 - 10, 2026",
      "July 13 - 17, 2026",
    );
    await run(droppedWeek, "2026-09-14T12:00:00.000Z");

    const flagged = (await store.candidates.listCandidates({ candidateType: "session" })).filter(
      (candidate) => candidate.qualityFlags.includes("possible_removed_session"),
    );
    assert.equal(flagged.length, 1);
    assert.equal(flagged[0].matchedCatalogId, "sess-bright-sparks-week-1");
    assert.equal(flagged[0].status, "needs_review");
    // Flagged, never removed: the runner proposes nothing about the row itself.
    assert.deepEqual(flagged[0].changeSet, []);
  });

  it("treats a read that lost most known sessions as incomplete, not as removals", async () => {
    const wideCatalog = catalog();
    const manyWeeks: IngestionCatalogSnapshot = {
      ...wideCatalog,
      sessions: [
        ...wideCatalog.sessions,
        ...["2026-07-13", "2026-07-20", "2026-07-27"].map((startDate) => ({
          id: `sess-week-${startDate}`,
          programId: "prog-bright-sparks-day-camp",
          startDate,
          endDate: startDate,
          sourceUrl: CANONICAL_URL,
        })),
      ],
    };
    const store = createMemoryIngestionStore({ sources: [source()] });
    const newId = createSequentialIdFactory("row");

    await runDueCampSources({
      store,
      fetcher: new FixtureSourceFetcher(
        { "src-bright-sparks": { content: campPage("$399"), fetchStatus: "success" } },
        { newId },
      ),
      catalog: manyWeeks,
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });

    const state = store.snapshotState();
    const flagged = state.candidates.filter((candidate) =>
      candidate.qualityFlags.includes("possible_removed_session"),
    );
    assert.deepEqual(flagged, []);
    assert.ok(
      state.extractionRuns[0].warnings.some((warning) =>
        warning.startsWith("removal_detection_skipped_low_coverage:1_of_4"),
      ),
      `expected a coverage warning, got ${state.extractionRuns[0].warnings.join(", ")}`,
    );
  });

  it("records candidates without ever touching the published catalog", async () => {
    const published = catalog();
    const before = structuredClone(published);
    const store = createMemoryIngestionStore({ sources: [source()] });
    const newId = createSequentialIdFactory("row");

    await runDueCampSources({
      store,
      fetcher: new FixtureSourceFetcher(
        { "src-bright-sparks": { content: campPage("$429"), fetchStatus: "success" } },
        { newId },
      ),
      catalog: published,
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });

    assert.deepEqual(published, before);
    assert.ok(store.snapshotState().candidates.length > 0);
  });

  it("skips sources that are not due yet", async () => {
    const { store, run } = harness(
      source({
        lastCheckedAt: "2026-09-12T11:00:00.000Z",
        nextCheckAt: "2026-09-13T11:00:00.000Z",
      }),
    );

    const summary = await run(campPage("$399"), "2026-09-12T12:00:00.000Z");
    assert.equal(summary.sourcesAttempted, 0);
    assert.equal(store.snapshotState().snapshots.length, 0);
  });

  it("records a fetch error as a source error and keeps the cycle going", async () => {
    const store = createMemoryIngestionStore({
      sources: [source(), source({ id: "src-other", sourceUrl: "https://other.test/camp" })],
    });
    const newId = createSequentialIdFactory("row");

    const summary = await runDueCampSources({
      store,
      fetcher: new FixtureSourceFetcher(
        {
          "src-bright-sparks": {
            content: "",
            fetchStatus: "error",
            fetchError: "connect ETIMEDOUT",
          },
          "src-other": { content: campPage("$399"), fetchStatus: "success" },
        },
        { newId },
      ),
      catalog: catalog(),
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });

    assert.equal(summary.sourcesAttempted, 2);
    assert.equal(summary.extractionsSucceeded, 1);
    assert.equal(summary.errors.length, 1);
    assert.equal(summary.errors[0].sourceId, "src-bright-sparks");
    assert.match(summary.errors[0].message, /ETIMEDOUT/);

    const failed = await store.sources.getSource("src-bright-sparks");
    assert.equal(failed?.lastError, "connect ETIMEDOUT");
    assert.equal(failed?.lastSuccessfulAt ?? null, null);
    // A failed fetch must not record a hash, or the retry would be skipped.
    assert.equal(failed?.lastContentHash ?? null, null);
  });

  it("does not record a content hash when extraction fails, so the next cycle retries", async () => {
    const { store, run } = harness();
    const summary = await run("<html><body><p>Closed for the season.</p></body></html>", "2026-09-12T12:00:00.000Z");

    assert.equal(summary.extractionsSucceeded, 0);
    assert.equal(summary.errors.length, 1);
    assert.match(summary.errors[0].message, /extraction_failed/);

    const state = store.snapshotState();
    assert.equal(state.extractionRuns[0].status, "failed");
    assert.equal(state.sources[0].lastContentHash ?? null, null);
    assert.equal(state.candidates.length, 0);
  });

  it("does not fetch or extract an unsupported source, and does not call it an error", async () => {
    const { store, run } = harness(source({ crawlStrategy: "manual" }));
    const summary = await run(campPage("$399"), "2026-09-12T12:00:00.000Z");

    assert.equal(summary.sourcesAttempted, 1);
    assert.equal(summary.extractionsSucceeded, 0);
    assert.deepEqual(summary.errors, []);
    assert.equal(store.snapshotState().extractionRuns.length, 0);
  });

  it("honours the limit and saves one run summary", async () => {
    const store = createMemoryIngestionStore({
      sources: [source(), source({ id: "src-other", sourceUrl: "https://other.test/camp" })],
    });
    const newId = createSequentialIdFactory("row");

    const summary = await runDueCampSources({
      store,
      fetcher: new FixtureSourceFetcher(
        {
          "src-bright-sparks": { content: campPage("$399"), fetchStatus: "success" },
          "src-other": { content: campPage("$399"), fetchStatus: "success" },
        },
        { newId },
      ),
      catalog: catalog(),
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
      limit: 1,
    });

    assert.equal(summary.sourcesAttempted, 1);
    const saved = await store.runs.latestRunSummary();
    assert.equal(saved?.id, summary.id);
    assert.equal(saved?.completedAt, "2026-09-12T12:00:00.000Z");
  });
});

describe("runCampSource", () => {
  it("runs one registered source end-to-end and returns a structured result", async () => {
    const seed = source();
    const store = createMemoryIngestionStore({ sources: [seed] });
    const newId = createSequentialIdFactory("row");
    const result = await runCampSource({
      sourceId: seed.id,
      store,
      fetcher: new FixtureSourceFetcher(
        { [seed.id]: { content: campPage("$399"), fetchStatus: "success" } },
        { newId },
      ),
      catalog: catalog(),
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });

    assert.equal(result.sourceId, seed.id);
    assert.equal(result.status, "baseline");
    assert.ok(result.snapshotId);
    assert.ok(result.extractionRunId);
    assert.ok(result.extractedRecords > 0);
    assert.ok(result.candidateIds.length > 0);
    assert.ok(result.durationMs >= 0);
  });

  it("rejects an unregistered sourceId before any network work", async () => {
    const store = createMemoryIngestionStore({ sources: [] });
    const newId = createSequentialIdFactory("row");
    let fetched = 0;
    const result = await runCampSource({
      sourceId: "src-unknown",
      store,
      fetcher: {
        kind: "fixture",
        async fetchSource() {
          fetched += 1;
          throw new Error("should_not_fetch");
        },
      },
      catalog: catalog(),
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });

    assert.equal(result.status, "failed");
    assert.deepEqual(result.warnings, ["source_not_registered"]);
    assert.equal(fetched, 0);
    assert.equal(result.snapshotId, null);
  });

  it("short-circuits unchanged content without creating duplicate candidates", async () => {
    const seed = source();
    const store = createMemoryIngestionStore({ sources: [seed] });
    const newId = createSequentialIdFactory("row");
    const page = campPage("$399");
    const fetcher = new FixtureSourceFetcher(
      { [seed.id]: { content: page, fetchStatus: "success" } },
      { newId },
    );

    const first = await runCampSource({
      sourceId: seed.id,
      store,
      fetcher,
      catalog: catalog(),
      now: () => new Date("2026-09-12T12:00:00.000Z"),
      newId,
    });
    assert.equal(first.status, "baseline");
    const candidatesAfterFirst = first.candidateIds.length;

    const second = await runCampSource({
      sourceId: seed.id,
      store,
      fetcher,
      catalog: catalog(),
      now: () => new Date("2026-09-13T12:00:00.000Z"),
      newId,
    });

    assert.equal(second.status, "unchanged_raw");
    assert.equal(second.candidateIds.length, 0);
    assert.equal(second.extractionRunId, null);
    const allCandidates = await store.candidates.listCandidates({ sourceId: seed.id });
    assert.equal(allCandidates.length, candidatesAfterFirst);
  });
});
