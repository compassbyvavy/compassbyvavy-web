import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPASS_ACTIVENET_USER_AGENT } from "@/lib/camps/availability/activenet/config";
import type { FetchLike } from "@/lib/camps/availability/activenet/fetchDetail";
import {
  getActiveNetAvailability,
  resetActiveNetAvailabilityCacheForTests,
} from "@/lib/camps/availability/activenet/service";
import {
  createCacheApiSnapshotStore,
  createMemorySnapshotStore,
  snapshotCacheKey,
  type CacheLike,
  type StoredSnapshot,
} from "@/lib/camps/availability/activenet/sharedStore";
import type { ActiveNetAvailabilitySnapshot } from "@/lib/camps/availability/activenet/types";
import {
  MSC_0007_ACTIVITY_ID,
  MSC_0007_ACTIVITY_NUMBER,
  MSC_0007_CANDIDATE_ID,
} from "@/data/camps/real/msc0007.ids";

const CONFIG = { refreshIntervalMs: 60_000, timeoutMs: 8_000, minOriginIntervalMs: 5_000 };
const T0 = new Date("2026-11-10T10:45:00.000Z");

function detail(spaceStatus: string): unknown {
  return {
    headers: { response_code: "0000" },
    body: {
      detail: {
        activity_id: MSC_0007_ACTIVITY_ID,
        activity_number: MSC_0007_ACTIVITY_NUMBER,
        space_status: spaceStatus,
      },
    },
  };
}

function counter(spaceStatus = "33 openings remaining"): { fetchImpl: FetchLike; state: { calls: number } } {
  const state = { calls: 0 };
  const fetchImpl: FetchLike = async () => {
    state.calls += 1;
    return new Response(JSON.stringify(detail(spaceStatus)), { status: 200 });
  };
  return { fetchImpl, state };
}

function snapshot(overrides: Partial<ActiveNetAvailabilitySnapshot> = {}): ActiveNetAvailabilitySnapshot {
  return {
    candidateId: MSC_0007_CANDIDATE_ID,
    activityId: MSC_0007_ACTIVITY_ID,
    activityNumber: MSC_0007_ACTIVITY_NUMBER,
    retrievedAt: T0.toISOString(),
    freshness: "fresh",
    status: "available",
    openingsRemaining: 33,
    spaceStatusRaw: "33 openings remaining",
    bookingUrl: "",
    sourceUrl: "",
    refreshIntervalMs: 60_000,
    error: null,
    ...overrides,
  };
}

/** A fake Workers Cache API that honours nothing but exact keys. */
function fakeCache(): CacheLike & { keys: string[] } {
  const map = new Map<string, string>();
  return {
    keys: [] as string[],
    async match(request) {
      const body = map.get(request.url);
      return body === undefined ? undefined : new Response(body);
    },
    async put(request, response) {
      this.keys.push(request.url);
      map.set(request.url, await response.text());
    },
  };
}

describe("ActiveNet shared snapshot store", () => {
  it("memory store expires entries after the TTL", async () => {
    let clock = 0;
    const store = createMemorySnapshotStore(() => clock);
    const value: StoredSnapshot = { snapshot: snapshot(), fetchedAtMs: 0 };
    await store.set(MSC_0007_ACTIVITY_ID, value, 60_000);
    clock = 59_999;
    assert.deepEqual(await store.get(MSC_0007_ACTIVITY_ID), value);
    clock = 60_000;
    assert.equal(await store.get(MSC_0007_ACTIVITY_ID), null);
  });

  it("Cache API store round-trips by internal activity_id and sets max-age", async () => {
    const cache = fakeCache();
    let seenCacheControl = "";
    const spy: CacheLike = {
      match: (r) => cache.match(r),
      put: async (r, res) => {
        seenCacheControl = res.headers.get("Cache-Control") ?? "";
        await cache.put(r, res);
      },
    };
    const store = createCacheApiSnapshotStore(spy);
    await store.set(MSC_0007_ACTIVITY_ID, { snapshot: snapshot(), fetchedAtMs: T0.getTime() }, 60_000);
    assert.equal(seenCacheControl, "public, max-age=60");
    assert.deepEqual(cache.keys, [snapshotCacheKey(MSC_0007_ACTIVITY_ID)]);
    assert.ok(cache.keys[0].endsWith(`/${MSC_0007_ACTIVITY_ID}`));
    assert.ok(!cache.keys[0].includes(MSC_0007_ACTIVITY_NUMBER));
    const back = await store.get(MSC_0007_ACTIVITY_ID);
    assert.equal(back?.snapshot.openingsRemaining, 33);
  });

  it("Cache API store ignores malformed or mismatched records", async () => {
    const cache = fakeCache();
    await cache.put(new Request(snapshotCacheKey(1)), new Response("{not json"));
    await cache.put(
      new Request(snapshotCacheKey(2)),
      new Response(JSON.stringify({ snapshot: snapshot({ activityId: 999 }), fetchedAtMs: 1 })),
    );
    const store = createCacheApiSnapshotStore(cache);
    assert.equal(await store.get(1), null);
    assert.equal(await store.get(2), null);
  });
});

describe("getActiveNetAvailability with a shared store", () => {
  it("a second isolate reuses a recent reading instead of asking the City", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const store = createMemorySnapshotStore();
    const first = counter();
    const a = await getActiveNetAvailability(MSC_0007_CANDIDATE_ID, {
      fetchImpl: first.fetchImpl, store, config: CONFIG, now: () => T0,
    });
    assert.equal(a.freshness, "fresh");
    assert.equal(first.state.calls, 1);

    // New isolate: empty in-memory cache, same shared store, 30 s later.
    resetActiveNetAvailabilityCacheForTests();
    const second = counter();
    const b = await getActiveNetAvailability(MSC_0007_CANDIDATE_ID, {
      fetchImpl: second.fetchImpl, store, config: CONFIG, now: () => new Date(T0.getTime() + 30_000),
    });
    assert.equal(second.state.calls, 0);
    assert.equal(b.freshness, "cached");
    assert.equal(b.openingsRemaining, 33);
    assert.equal(b.retrievedAt, T0.toISOString());
  });

  it("asks the City again once the shared reading is older than the refresh interval", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const store = createMemorySnapshotStore();
    await store.set(MSC_0007_ACTIVITY_ID, { snapshot: snapshot(), fetchedAtMs: T0.getTime() }, 120_000);
    const later = counter("32 openings remaining");
    const result = await getActiveNetAvailability(MSC_0007_CANDIDATE_ID, {
      fetchImpl: later.fetchImpl, store, config: CONFIG, now: () => new Date(T0.getTime() + 61_000),
    });
    assert.equal(later.state.calls, 1);
    assert.equal(result.freshness, "fresh");
    assert.equal(result.openingsRemaining, 32);
  });

  it("manual Refresh reuses only a reading younger than the minimum origin interval", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const store = createMemorySnapshotStore();
    await store.set(MSC_0007_ACTIVITY_ID, { snapshot: snapshot(), fetchedAtMs: T0.getTime() }, 60_000);

    const quick = counter();
    await getActiveNetAvailability(MSC_0007_CANDIDATE_ID, {
      force: true, fetchImpl: quick.fetchImpl, store, config: CONFIG, now: () => new Date(T0.getTime() + 2_000),
    });
    assert.equal(quick.state.calls, 0);

    resetActiveNetAvailabilityCacheForTests();
    const later = counter();
    const r = await getActiveNetAvailability(MSC_0007_CANDIDATE_ID, {
      force: true, fetchImpl: later.fetchImpl, store, config: CONFIG, now: () => new Date(T0.getTime() + 20_000),
    });
    assert.equal(later.state.calls, 1);
    assert.equal(r.freshness, "fresh");
  });

  it("never reuses a shared record that carries an error or a different public number", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const store = createMemorySnapshotStore();
    await store.set(
      MSC_0007_ACTIVITY_ID,
      { snapshot: snapshot({ activityNumber: "149897" }), fetchedAtMs: T0.getTime() },
      60_000,
    );
    const c = counter();
    const r = await getActiveNetAvailability(MSC_0007_CANDIDATE_ID, {
      fetchImpl: c.fetchImpl, store, config: CONFIG, now: () => new Date(T0.getTime() + 1_000),
    });
    assert.equal(c.state.calls, 1);
    assert.equal(r.activityNumber, MSC_0007_ACTIVITY_NUMBER);
  });
});

describe("ActiveNet contact details", () => {
  it("identifies Compass with the compassbyvavy.ca domain", () => {
    assert.match(COMPASS_ACTIVENET_USER_AGENT, /compassbyvavy\.ca/);
    assert.doesNotMatch(COMPASS_ACTIVENET_USER_AGENT, /compassbyvavy\.com/);
  });
});
