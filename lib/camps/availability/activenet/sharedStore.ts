import type { ActiveNetAvailabilitySnapshot } from "@/lib/camps/availability/activenet/types";

/**
 * Shared snapshot store for ActiveNet availability.
 *
 * Compass runs on Cloudflare Workers, where many isolates serve traffic and
 * each has its own memory. An in-memory cache alone means every isolate (and
 * every parent's 60-second poll) can reach the City. The shared store lets all
 * isolates in a Cloudflare location reuse one reading per activity for the
 * refresh interval, so the City sees roughly one request per activity per
 * minute per location, however many parents have the page open.
 *
 * Production uses the Workers Cache API (`caches.default`). Tests and local
 * Node use the in-memory store. Both are keyed by internal activity_id.
 */

export type StoredSnapshot = {
  snapshot: ActiveNetAvailabilitySnapshot;
  /** When the City was actually read (ms since epoch). */
  fetchedAtMs: number;
};

export interface SnapshotStore {
  get(activityId: number): Promise<StoredSnapshot | null>;
  set(activityId: number, value: StoredSnapshot, ttlMs: number): Promise<void>;
}

/** Minimal shape of the Workers Cache API used here. */
export type CacheLike = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

/** Never served to anyone; only a cache key. */
const CACHE_KEY_ORIGIN = "https://compassbyvavy.ca/__compass-cache/activenet/";

export function snapshotCacheKey(activityId: number): string {
  return `${CACHE_KEY_ORIGIN}${activityId}`;
}

function isStoredSnapshot(value: unknown): value is StoredSnapshot {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.fetchedAtMs !== "number" || !Number.isFinite(v.fetchedAtMs)) return false;
  const s = v.snapshot as Record<string, unknown> | null;
  return (
    s !== null &&
    typeof s === "object" &&
    typeof s.activityId === "number" &&
    typeof s.activityNumber === "string" &&
    typeof s.status === "string"
  );
}

export function createMemorySnapshotStore(
  now: () => number = () => Date.now(),
): SnapshotStore {
  const entries = new Map<number, { value: StoredSnapshot; expiresAtMs: number }>();
  return {
    async get(activityId) {
      const entry = entries.get(activityId);
      if (!entry) return null;
      if (now() >= entry.expiresAtMs) {
        entries.delete(activityId);
        return null;
      }
      return entry.value;
    },
    async set(activityId, value, ttlMs) {
      entries.set(activityId, { value, expiresAtMs: now() + Math.max(0, ttlMs) });
    },
  };
}

export function createCacheApiSnapshotStore(cache: CacheLike): SnapshotStore {
  return {
    async get(activityId) {
      try {
        const response = await cache.match(new Request(snapshotCacheKey(activityId)));
        if (!response) return null;
        const value: unknown = await response.json();
        if (!isStoredSnapshot(value)) return null;
        // The cache key is per activity, but never trust a stored record for another one.
        if (value.snapshot.activityId !== activityId) return null;
        return value;
      } catch {
        return null;
      }
    },
    async set(activityId, value, ttlMs) {
      const seconds = Math.max(1, Math.floor(ttlMs / 1000));
      try {
        await cache.put(
          new Request(snapshotCacheKey(activityId)),
          new Response(JSON.stringify(value), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": `public, max-age=${seconds}`,
            },
          }),
        );
      } catch {
        /* a failed cache write only means the next reader asks the City again */
      }
    },
  };
}

let defaultStore: SnapshotStore | null = null;

/** Workers Cache API when present (Cloudflare), otherwise one in-memory store per process. */
export function getDefaultSnapshotStore(): SnapshotStore {
  if (defaultStore) return defaultStore;
  const cachesGlobal = (globalThis as { caches?: { default?: CacheLike } }).caches;
  defaultStore = cachesGlobal?.default
    ? createCacheApiSnapshotStore(cachesGlobal.default)
    : createMemorySnapshotStore();
  return defaultStore;
}

export function resetDefaultSnapshotStoreForTests(store: SnapshotStore | null = null): void {
  defaultStore = store;
}
