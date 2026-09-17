import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSource } from "@/data/camps/ingestion/types";
import type { CampSourceFetcher } from "@/lib/camps/ingestion/fetcher";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import {
  fetchRegisteredSource,
  resolveRegisteredSource,
} from "@/lib/camps/ingestion/sources/registeredSourceFetch";
import {
  CREATIVE_KIDS_PLACE_SOURCE_ID,
  creativeKidsPlaceSource,
} from "@/lib/camps/ingestion/sources/seedSources";

function countingFetcher(): CampSourceFetcher & { attempts: number } {
  const fetcher: CampSourceFetcher & { attempts: number } = {
    kind: "test-counter",
    attempts: 0,
    async fetchSource(source) {
      fetcher.attempts += 1;
      return {
        id: "snap-test",
        sourceId: source.id,
        retrievedAt: "2026-09-12T20:00:00.000Z",
        httpStatus: 200,
        contentType: "text/html",
        contentHash: "abc123",
        rawContent: "<html></html>",
        fetchStatus: "success",
        fetchError: null,
        previousSnapshotId: null,
      };
    },
  };
  return fetcher;
}

describe("registered source fetch gate (Prompt 7B)", () => {
  it("H. unregistered sourceId → rejected with zero fetch attempts", async () => {
    const store = createMemoryIngestionStore({
      sources: [creativeKidsPlaceSource()],
    });
    const fetcher = countingFetcher();

    const result = await fetchRegisteredSource({
      store,
      sourceId: "src-not-in-registry",
      fetcher,
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "unregistered_source");
    assert.equal(result.fetchAttempts, 0);
    assert.equal(fetcher.attempts, 0);
  });

  it("registered sourceId resolves the registry record without requiring network", async () => {
    const source = creativeKidsPlaceSource();
    const store = createMemoryIngestionStore({ sources: [source] });

    const resolved = await resolveRegisteredSource(store, CREATIVE_KIDS_PLACE_SOURCE_ID);
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.source.id, CREATIVE_KIDS_PLACE_SOURCE_ID);
    assert.equal(resolved.source.canonicalUrl, source.canonicalUrl);
    assert.equal(resolved.source.sourceUrl, source.sourceUrl);
  });

  it("registered sourceId may fetch using the registry URL (fixture fetcher, no internet)", async () => {
    const store = createMemoryIngestionStore({
      sources: [creativeKidsPlaceSource()],
    });
    const fetcher = countingFetcher();

    const result = await fetchRegisteredSource({
      store,
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      fetcher,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.fetchAttempts, 1);
    assert.equal(fetcher.attempts, 1);
    assert.equal(result.snapshot.sourceId, CREATIVE_KIDS_PLACE_SOURCE_ID);
  });

  it("inactive registered source is rejected before fetch", async () => {
    const inactive: CampSource = {
      ...creativeKidsPlaceSource(),
      isActive: false,
    };
    const store = createMemoryIngestionStore({ sources: [inactive] });
    const fetcher = countingFetcher();

    const result = await fetchRegisteredSource({
      store,
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      fetcher,
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "inactive_source");
    assert.equal(fetcher.attempts, 0);
  });
});
