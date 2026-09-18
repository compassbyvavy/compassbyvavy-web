import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalizeSourceUrl } from "@/lib/camps/ingestion/canonicalizeUrl";
import { CREATIVE_KIDS_PLACE_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
import { NUTTY_SCIENTISTS_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/nuttyScientistsExtractor";
import { resolveExtractor } from "@/lib/camps/ingestion/extractors/registry";
import { HttpCampSourceFetcher } from "@/lib/camps/ingestion/httpFetcher";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import {
  CAMP_FETCH_ALLOWLIST,
  CREATIVE_KIDS_PLACE_SOURCE_ID,
  CREATIVE_KIDS_PLACE_SOURCE_URL,
  NUTTY_SCIENTISTS_SOURCE_ID,
  NUTTY_SCIENTISTS_SOURCE_URL,
  creativeKidsPlaceSource,
  isFetchAllowlisted,
  nuttyScientistsSource,
  registerSeedCampSources,
  seedCampSources,
} from "@/lib/camps/ingestion/sources/seedSources";

const NOW = new Date("2026-09-12T12:00:00.000Z");

describe("seed camp sources", () => {
  it("points at the provider's own page with a canonical URL", () => {
    const source = creativeKidsPlaceSource(NOW);
    assert.equal(source.sourceUrl, CREATIVE_KIDS_PLACE_SOURCE_URL);
    assert.equal(source.canonicalUrl, canonicalizeSourceUrl(CREATIVE_KIDS_PLACE_SOURCE_URL));
    assert.equal(source.crawlStrategy, "html");
    assert.equal(source.extractorKey, CREATIVE_KIDS_PLACE_EXTRACTOR_KEY);
  });

  it("registers Nutty Scientists against the official summer-camp HTML page", () => {
    const source = nuttyScientistsSource(NOW);
    assert.equal(source.sourceUrl, NUTTY_SCIENTISTS_SOURCE_URL);
    assert.equal(source.canonicalUrl, canonicalizeSourceUrl(NUTTY_SCIENTISTS_SOURCE_URL));
    assert.equal(source.crawlStrategy, "html");
    assert.equal(source.extractorKey, NUTTY_SCIENTISTS_EXTRACTOR_KEY);
    assert.doesNotMatch(source.sourceUrl, /forms\.gle|docs\.google\.com/);
  });

  it("is due immediately and has no history to compare against", () => {
    const source = creativeKidsPlaceSource(NOW);
    assert.equal(source.nextCheckAt, null);
    assert.equal(source.lastCheckedAt, null);
    assert.equal(source.lastContentHash, null);
  });

  it("resolves to the site-specific extractor, not the generic fallback", () => {
    const extractor = resolveExtractor({
      source: creativeKidsPlaceSource(NOW),
      document: { title: null, text: "", headings: [], links: [], metadata: {} },
      rawHtml: "",
    });
    assert.equal(extractor.key, CREATIVE_KIDS_PLACE_EXTRACTOR_KEY);
  });

  it("resolves Nutty Scientists to the Nutty extractor", () => {
    const extractor = resolveExtractor({
      source: nuttyScientistsSource(NOW),
      document: { title: null, text: "", headings: [], links: [], metadata: {} },
      rawHtml: "",
    });
    assert.equal(extractor.key, NUTTY_SCIENTISTS_EXTRACTOR_KEY);
  });
});

describe("fetch allowlist", () => {
  it("contains only the reviewed HTML sources", () => {
    assert.deepEqual(CAMP_FETCH_ALLOWLIST, [
      CREATIVE_KIDS_PLACE_SOURCE_ID,
      NUTTY_SCIENTISTS_SOURCE_ID,
    ]);
    assert.ok(isFetchAllowlisted(CREATIVE_KIDS_PLACE_SOURCE_ID));
    assert.ok(isFetchAllowlisted(NUTTY_SCIENTISTS_SOURCE_ID));
    assert.ok(!isFetchAllowlisted("src-some-other-provider"));
    assert.ok(!isFetchAllowlisted("https://forms.gle/SGgvXZddvprHFjGC9"));
  });

  it("registering a source does not make it fetchable", async () => {
    const store = createMemoryIngestionStore();
    const notAllowlisted = {
      ...creativeKidsPlaceSource(NOW),
      id: "src-not-reviewed",
    };
    await registerSeedCampSources(store, { now: NOW, sources: [notAllowlisted] });

    let requests = 0;
    const fetcher = new HttpCampSourceFetcher({
      allowedSourceIds: CAMP_FETCH_ALLOWLIST,
      fetchImpl: async () => {
        requests += 1;
        return new Response("<html></html>", { status: 200 });
      },
    });

    const snapshot = await fetcher.fetchSource(notAllowlisted);
    assert.equal(requests, 0, "a non-allowlisted source must not open a socket");
    assert.equal(snapshot.fetchStatus, "unsupported");
    assert.equal(snapshot.fetchError, "source_not_in_fetch_allowlist");
  });
});

describe("registerSeedCampSources", () => {
  it("inserts the seed on first run", async () => {
    const store = createMemoryIngestionStore();
    const registered = await registerSeedCampSources(store, { now: NOW });

    assert.deepEqual(
      registered.map((source) => source.id),
      seedCampSources(NOW).map((source) => source.id),
    );
    const stored = await store.sources.getSource(CREATIVE_KIDS_PLACE_SOURCE_ID);
    assert.equal(stored?.sourceUrl, CREATIVE_KIDS_PLACE_SOURCE_URL);
  });

  it("preserves check history and the content hash when re-registered", async () => {
    const store = createMemoryIngestionStore();
    await registerSeedCampSources(store, { now: NOW });
    await store.sources.markSourceChecked({
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      checkedAt: "2026-09-12T13:00:00.000Z",
      contentHash: "sha256:already-seen",
      changed: true,
      successful: true,
      nextCheckAt: "2026-09-13T13:00:00.000Z",
    });

    await registerSeedCampSources(store, { now: new Date("2026-09-12T14:00:00.000Z") });

    const stored = await store.sources.getSource(CREATIVE_KIDS_PLACE_SOURCE_ID);
    // Resetting these would re-extract unchanged content and re-queue candidates
    // a human has already reviewed.
    assert.equal(stored?.lastContentHash, "sha256:already-seen");
    assert.equal(stored?.lastCheckedAt, "2026-09-12T13:00:00.000Z");
    assert.equal(stored?.nextCheckAt, "2026-09-13T13:00:00.000Z");
    assert.equal(stored?.updatedAt, "2026-09-12T14:00:00.000Z");
    assert.equal((await store.sources.listSources()).length, 2);
  });

  it("refreshes configuration from the seed", async () => {
    const store = createMemoryIngestionStore();
    await registerSeedCampSources(store, { now: NOW });
    const stale = await store.sources.getSource(CREATIVE_KIDS_PLACE_SOURCE_ID);
    assert.ok(stale);
    await store.sources.upsertSource({
      ...stale,
      extractorKey: "generic_html",
      checkIntervalHours: 999,
      isActive: false,
    });

    await registerSeedCampSources(store, { now: NOW });

    const refreshed = await store.sources.getSource(CREATIVE_KIDS_PLACE_SOURCE_ID);
    assert.equal(refreshed?.extractorKey, CREATIVE_KIDS_PLACE_EXTRACTOR_KEY);
    assert.equal(refreshed?.checkIntervalHours, 24);
    assert.equal(refreshed?.isActive, true);
  });
});
