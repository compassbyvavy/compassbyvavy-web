import { readActiveNetAvailabilityConfig } from "@/lib/camps/availability/activenet/config";
import {
  fetchActiveNetActivityDetail,
  type FetchLike,
} from "@/lib/camps/availability/activenet/fetchDetail";
import {
  getActiveNetMappingByCandidateId,
  getActiveNetMappingBySessionId,
} from "@/lib/camps/availability/activenet/registry";
import type {
  ActiveNetActivityMapping,
  ActiveNetAvailabilityConfig,
  ActiveNetAvailabilityError,
  ActiveNetAvailabilitySnapshot,
  ActiveNetFreshness,
  ActiveNetSpaceStatusKind,
} from "@/lib/camps/availability/activenet/types";
import { urlsForMapping } from "@/lib/camps/availability/activenet/urls";

export type GetActiveNetAvailabilityOptions = {
  force?: boolean;
  fetchImpl?: FetchLike;
  now?: () => Date;
  config?: ActiveNetAvailabilityConfig;
};

type CacheEntry = {
  snapshot: ActiveNetAvailabilitySnapshot;
  fetchedAtMs: number;
  inFlight: Promise<ActiveNetAvailabilitySnapshot> | null;
};

const cache = new Map<string, CacheEntry>();

function emptySnapshot(
  mapping: ActiveNetActivityMapping,
  config: ActiveNetAvailabilityConfig,
  error: ActiveNetAvailabilityError,
): ActiveNetAvailabilitySnapshot {
  const urls = urlsForMapping(mapping);
  return {
    candidateId: mapping.candidateId,
    activityId: mapping.activityId,
    activityNumber: mapping.activityNumber,
    retrievedAt: null,
    freshness: "unavailable",
    status: "unknown",
    openingsRemaining: null,
    spaceStatusRaw: null,
    bookingUrl: urls.bookingUrl,
    sourceUrl: urls.sourceUrl,
    refreshIntervalMs: config.refreshIntervalMs,
    error,
  };
}

function freshnessForAge(
  ageMs: number,
  refreshIntervalMs: number,
  originFetched: boolean,
): ActiveNetFreshness {
  if (originFetched) return "fresh";
  if (ageMs >= refreshIntervalMs) return "stale";
  return "cached";
}

function snapshotFromOrigin(
  mapping: ActiveNetActivityMapping,
  config: ActiveNetAvailabilityConfig,
  retrievedAt: Date,
  origin: {
    status: ActiveNetSpaceStatusKind;
    openingsRemaining: number | null;
    spaceStatusRaw: string | null;
  },
): ActiveNetAvailabilitySnapshot {
  const urls = urlsForMapping(mapping);
  return {
    candidateId: mapping.candidateId,
    activityId: mapping.activityId,
    activityNumber: mapping.activityNumber,
    retrievedAt: retrievedAt.toISOString(),
    freshness: "fresh",
    status: origin.status,
    openingsRemaining: origin.openingsRemaining,
    spaceStatusRaw: origin.spaceStatusRaw,
    bookingUrl: urls.bookingUrl,
    sourceUrl: urls.sourceUrl,
    refreshIntervalMs: config.refreshIntervalMs,
    error: null,
  };
}

function withFreshness(
  snapshot: ActiveNetAvailabilitySnapshot,
  freshness: ActiveNetFreshness,
  config: ActiveNetAvailabilityConfig,
): ActiveNetAvailabilitySnapshot {
  return {
    ...snapshot,
    freshness,
    refreshIntervalMs: config.refreshIntervalMs,
  };
}

export function resetActiveNetAvailabilityCacheForTests(): void {
  cache.clear();
}

export async function getActiveNetAvailability(
  candidateId: string,
  options: GetActiveNetAvailabilityOptions = {},
): Promise<ActiveNetAvailabilitySnapshot> {
  const config = options.config ?? readActiveNetAvailabilityConfig();
  const mapping = getActiveNetMappingByCandidateId(candidateId);
  if (!mapping) {
    return {
      candidateId,
      activityId: 0,
      activityNumber: "",
      retrievedAt: null,
      freshness: "unavailable",
      status: "unknown",
      openingsRemaining: null,
      spaceStatusRaw: null,
      bookingUrl: "",
      sourceUrl: "",
      refreshIntervalMs: config.refreshIntervalMs,
      error: "unknown_candidate",
    };
  }

  const now = options.now ?? (() => new Date());
  const nowDate = now();
  const nowMs = nowDate.getTime();
  const entry = cache.get(mapping.candidateId);

  if (entry?.inFlight) {
    return entry.inFlight;
  }

  const ageMs = entry ? nowMs - entry.fetchedAtMs : Number.POSITIVE_INFINITY;
  const withinMinInterval = entry != null && ageMs < config.minOriginIntervalMs;
  if (!options.force && withinMinInterval && entry) {
    return withFreshness(
      entry.snapshot,
      freshnessForAge(ageMs, config.refreshIntervalMs, false),
      config,
    );
  }
  if (options.force && withinMinInterval && entry) {
    return withFreshness(
      entry.snapshot,
      freshnessForAge(ageMs, config.refreshIntervalMs, false),
      config,
    );
  }

  const pending = (async (): Promise<ActiveNetAvailabilitySnapshot> => {
    const origin = await fetchActiveNetActivityDetail({
      mapping,
      fetchImpl: options.fetchImpl,
      timeoutMs: config.timeoutMs,
    });
    const retrievedAt = now();
    if (!origin.ok) {
      if (entry) {
        return withFreshness(
          { ...entry.snapshot, error: origin.error },
          "stale",
          config,
        );
      }
      return emptySnapshot(mapping, config, origin.error);
    }
    const snapshot = snapshotFromOrigin(mapping, config, retrievedAt, {
      status: origin.parsed.kind,
      openingsRemaining: origin.parsed.openingsRemaining,
      spaceStatusRaw: origin.parsed.raw,
    });
    cache.set(mapping.candidateId, {
      snapshot,
      fetchedAtMs: retrievedAt.getTime(),
      inFlight: null,
    });
    return snapshot;
  })();

  cache.set(mapping.candidateId, {
    snapshot: entry?.snapshot ?? emptySnapshot(mapping, config, "provider_failure"),
    fetchedAtMs: entry?.fetchedAtMs ?? 0,
    inFlight: pending,
  });

  try {
    const result = await pending;
    const current = cache.get(mapping.candidateId);
    if (current) current.inFlight = null;
    if (result.freshness === "fresh" && result.retrievedAt) {
      cache.set(mapping.candidateId, {
        snapshot: result,
        fetchedAtMs: Date.parse(result.retrievedAt),
        inFlight: null,
      });
    }
    return result;
  } catch {
    const current = cache.get(mapping.candidateId);
    if (current) current.inFlight = null;
    return emptySnapshot(mapping, config, "provider_failure");
  }
}

export async function loadActiveNetAvailabilityBySessionId(
  sessionIds: readonly string[],
  options: GetActiveNetAvailabilityOptions = {},
): Promise<Record<string, ActiveNetAvailabilitySnapshot>> {
  const out: Record<string, ActiveNetAvailabilitySnapshot> = {};
  const seen = new Set<string>();
  for (const sessionId of sessionIds) {
    const mapping = getActiveNetMappingBySessionId(sessionId);
    if (!mapping || seen.has(mapping.candidateId)) continue;
    seen.add(mapping.candidateId);
    const snapshot = await getActiveNetAvailability(mapping.candidateId, options);
    out[mapping.sessionId] = snapshot;
  }
  return out;
}
