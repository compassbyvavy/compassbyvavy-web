import { readActiveNetAvailabilityConfig } from "@/lib/camps/availability/activenet/config";
import type { FetchLike } from "@/lib/camps/availability/activenet/fetchDetail";
import {
  availabilityFromListItem,
  fetchActiveNetActivityList,
  type ActiveNetListItem,
  type ActiveNetListSearch,
} from "@/lib/camps/availability/activenet/listClient";
import {
  getDefaultSnapshotStore,
  type SnapshotStore,
} from "@/lib/camps/availability/activenet/sharedStore";
import type {
  ActiveNetActivityMapping,
  ActiveNetAvailabilityConfig,
  ActiveNetAvailabilitySnapshot,
} from "@/lib/camps/availability/activenet/types";
import { urlsForMapping } from "@/lib/camps/availability/activenet/urls";

/**
 * Refresh many sessions from one list search and write each reading to the
 * shared store. The per-session detail route then serves those readings
 * without asking the City again until they age past the refresh interval.
 *
 * A row is used only when BOTH its internal id and public number match the
 * mapping. Mappings missing from the list are left to the detail endpoint
 * (closed activities can drop out of the default list).
 */

export type ActiveNetBatchSummary =
  | {
      ok: true;
      retrievedAt: string;
      updated: string[];
      notInList: string[];
      idMismatch: Array<{ candidateId: string; listNumber: string; expectedNumber: string }>;
      pages: number;
    }
  | { ok: false; error: string };

export function snapshotFromListItem(
  mapping: ActiveNetActivityMapping,
  item: ActiveNetListItem,
  retrievedAt: Date,
  config: ActiveNetAvailabilityConfig,
): ActiveNetAvailabilitySnapshot {
  const urls = urlsForMapping(mapping);
  const parsed = availabilityFromListItem(item);
  return {
    candidateId: mapping.candidateId,
    activityId: mapping.activityId,
    activityNumber: mapping.activityNumber,
    retrievedAt: retrievedAt.toISOString(),
    freshness: "fresh",
    status: parsed.kind,
    openingsRemaining: parsed.openingsRemaining,
    spaceStatusRaw: parsed.raw,
    bookingUrl: urls.bookingUrl,
    sourceUrl: urls.sourceUrl,
    refreshIntervalMs: config.refreshIntervalMs,
    error: null,
  };
}

export async function refreshActiveNetBatch(options: {
  search: ActiveNetListSearch;
  mappings: readonly ActiveNetActivityMapping[];
  store?: SnapshotStore;
  fetchImpl?: FetchLike;
  now?: () => Date;
  config?: ActiveNetAvailabilityConfig;
  maxPages?: number;
}): Promise<ActiveNetBatchSummary> {
  const config = options.config ?? readActiveNetAvailabilityConfig();
  const store = options.store ?? getDefaultSnapshotStore();
  const now = options.now ?? (() => new Date());

  const list = await fetchActiveNetActivityList({
    search: options.search,
    fetchImpl: options.fetchImpl,
    timeoutMs: config.timeoutMs,
    maxPages: options.maxPages,
  });
  if (!list.ok) return { ok: false, error: list.error };

  const retrievedAt = now();
  const byId = new Map(list.items.map((item) => [item.activityId, item]));
  const summary = {
    ok: true as const,
    retrievedAt: retrievedAt.toISOString(),
    updated: [] as string[],
    notInList: [] as string[],
    idMismatch: [] as Array<{ candidateId: string; listNumber: string; expectedNumber: string }>,
    pages: list.pages,
  };

  for (const mapping of options.mappings) {
    const item = byId.get(mapping.activityId);
    if (!item) {
      summary.notInList.push(mapping.candidateId);
      continue;
    }
    if (item.activityNumber !== mapping.activityNumber) {
      summary.idMismatch.push({
        candidateId: mapping.candidateId,
        listNumber: item.activityNumber,
        expectedNumber: mapping.activityNumber,
      });
      continue;
    }
    const snapshot = snapshotFromListItem(mapping, item, retrievedAt, config);
    await store.set(
      mapping.activityId,
      { snapshot, fetchedAtMs: retrievedAt.getTime() },
      config.refreshIntervalMs,
    );
    summary.updated.push(mapping.candidateId);
  }
  return summary;
}
