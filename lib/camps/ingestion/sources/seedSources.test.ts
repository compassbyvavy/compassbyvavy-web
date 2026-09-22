import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalizeSourceUrl } from "@/lib/camps/ingestion/canonicalizeUrl";
import { CREATIVE_KIDS_PLACE_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
import { FRONT_LINE_HOCKEY_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/frontLineHockeyExtractor";
import { NUTTY_SCIENTISTS_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/nuttyScientistsExtractor";
import { RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/riverwoodConservancyExtractor";
import { resolveExtractor } from "@/lib/camps/ingestion/extractors/registry";
import { HttpCampSourceFetcher } from "@/lib/camps/ingestion/httpFetcher";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import {
  CAMP_FETCH_ALLOWLIST,
  CREATIVE_KIDS_PLACE_SOURCE_ID,
  CREATIVE_KIDS_PLACE_SOURCE_URL,
  FRONT_LINE_HOCKEY_APRIL_SOURCE_ID,
  FRONT_LINE_HOCKEY_JULY_SOURCE_ID,
  FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
  FRONT_LINE_HOCKEY_PROVIDER_ID,
  FRONT_LINE_HOCKEY_SOURCE_IDS,
  NUTTY_SCIENTISTS_SOURCE_ID,
  NUTTY_SCIENTISTS_SOURCE_URL,
  RIVERWOOD_CONSERVANCY_SOURCE_ID,
  RIVERWOOD_CONSERVANCY_SOURCE_URL,
  creativeKidsPlaceSource,
  frontLineHockeySourceById,
  frontLineHockeySources,
  isFetchAllowlisted,
  nuttyScientistsSource,
  registerSeedCampSources,
  riverwoodConservancySource,
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

  it("registers Riverwood Conservancy against the official summer-camp HTML page", () => {
    const source = riverwoodConservancySource(NOW);
    assert.equal(source.sourceUrl, RIVERWOOD_CONSERVANCY_SOURCE_URL);
    assert.equal(source.canonicalUrl, canonicalizeSourceUrl(RIVERWOOD_CONSERVANCY_SOURCE_URL));
    assert.equal(source.crawlStrategy, "html");
    assert.equal(source.extractorKey, RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY);
    assert.doesNotMatch(source.sourceUrl, /\.pdf($|\?)/i);
  });

  it("resolves Riverwood Conservancy to the Riverwood extractor", () => {
    const extractor = resolveExtractor({
      source: riverwoodConservancySource(NOW),
      document: { title: null, text: "", headings: [], links: [], metadata: {} },
      rawHtml: "",
    });
    assert.equal(extractor.key, RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY);
  });

  it("registers six Front Line Hockey product pages under one provider", () => {
    const sources = frontLineHockeySources(NOW);
    assert.equal(sources.length, 6);
    assert.ok(sources.every((source) => source.providerId === FRONT_LINE_HOCKEY_PROVIDER_ID));
    assert.ok(sources.every((source) => source.extractorKey === FRONT_LINE_HOCKEY_EXTRACTOR_KEY));
    assert.ok(sources.every((source) => source.crawlStrategy === "html"));
    assert.ok(sources.every((source) => /\/product\//.test(source.sourceUrl)));
    assert.ok(sources.every((source) => !/product-category/.test(source.sourceUrl)));
    assert.equal(
      new Set(sources.map((source) => source.sourceUrl)).size,
      6,
    );
  });

  it("resolves Front Line Hockey to the Front Line extractor", () => {
    const extractor = resolveExtractor({
      source: frontLineHockeySourceById(FRONT_LINE_HOCKEY_JULY_SOURCE_ID, NOW),
      document: { title: null, text: "", headings: [], links: [], metadata: {} },
      rawHtml: "",
    });
    assert.equal(extractor.key, FRONT_LINE_HOCKEY_EXTRACTOR_KEY);
    assert.equal(
      frontLineHockeySourceById(FRONT_LINE_HOCKEY_JULY_SOURCE_ID, NOW).sourceUrl,
      FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
    );
  });
});

describe("fetch allowlist", () => {
  it("contains only the reviewed HTML sources", () => {
    assert.deepEqual(CAMP_FETCH_ALLOWLIST, [
      CREATIVE_KIDS_PLACE_SOURCE_ID,
      NUTTY_SCIENTISTS_SOURCE_ID,
      RIVERWOOD_CONSERVANCY_SOURCE_ID,
      ...FRONT_LINE_HOCKEY_SOURCE_IDS,
    ]);
    assert.ok(isFetchAllowlisted(CREATIVE_KIDS_PLACE_SOURCE_ID));
    assert.ok(isFetchAllowlisted(NUTTY_SCIENTISTS_SOURCE_ID));
    assert.ok(isFetchAllowlisted(RIVERWOOD_CONSERVANCY_SOURCE_ID));
    assert.ok(isFetchAllowlisted(FRONT_LINE_HOCKEY_APRIL_SOURCE_ID));
    assert.ok(isFetchAllowlisted(FRONT_LINE_HOCKEY_JULY_SOURCE_ID));
    assert.ok(!isFetchAllowlisted("src-some-other-provider"));
    assert.ok(!isFetchAllowlisted("https://frontlinehockeyschool.ca/product-category/hockey-school/"));
    assert.ok(!isFetchAllowlisted("https://frontlinehockeyschool.ca/hockey-camps/july-camp/"));
    assert.ok(!isFetchAllowlisted("https://forms.gle/SGgvXZddvprHFjGC9"));
    assert.ok(
      !isFetchAllowlisted(
        "https://theriverwoodconservancy.org/wp-content/uploads/2026/06/2026-Camp-Riverwood-Summer-Day-Camp-Information-Guide.pdf",
      ),
    );
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
    assert.equal((await store.sources.listSources()).length, 9);
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
