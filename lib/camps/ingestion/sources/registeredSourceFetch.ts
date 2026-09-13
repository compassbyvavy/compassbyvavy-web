/**
 * Registered-source fetch gate (Prompt 7B).
 *
 * Callers may only submit a registered `sourceId`. The server looks up the
 * source in the registry, reads the canonical URL from that row, and only then
 * hands the registered CampSource to the fetcher.
 *
 * Arbitrary URLs from the client are never accepted. An unregistered sourceId
 * is rejected before any network attempt.
 *
 * Prompt 7B still has no live crawler — this gate is the only permitted entry
 * point for future live fetching.
 */

import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import type {
  CampSourceFetcher,
  FetchSourceContext,
} from "@/lib/camps/ingestion/fetcher";
import type { CampIngestionStore } from "@/lib/camps/ingestion/repositories/types";
import { isFetchAllowlisted } from "@/lib/camps/ingestion/sources/seedSources";

export type ResolveRegisteredSourceFailure =
  | "unregistered_source"
  | "inactive_source"
  | "not_allowlisted";

export type ResolveRegisteredSourceResult =
  | { ok: true; source: CampSource }
  | { ok: false; reason: ResolveRegisteredSourceFailure; message: string };

/**
 * Look up a source by id from the registry. Does not fetch.
 */
export async function resolveRegisteredSource(
  store: CampIngestionStore,
  sourceId: string,
  options: { requireAllowlisted?: boolean } = {},
): Promise<ResolveRegisteredSourceResult> {
  const trimmed = sourceId.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: "unregistered_source",
      message: "sourceId is required.",
    };
  }

  const source = await store.sources.getSource(trimmed);
  if (!source) {
    return {
      ok: false,
      reason: "unregistered_source",
      message: `Source ${trimmed} is not in the registered source registry.`,
    };
  }

  if (!source.isActive) {
    return {
      ok: false,
      reason: "inactive_source",
      message: `Source ${trimmed} is registered but inactive.`,
    };
  }

  if (options.requireAllowlisted && !isFetchAllowlisted(source.id)) {
    return {
      ok: false,
      reason: "not_allowlisted",
      message: `Source ${trimmed} is registered but not in the fetch allowlist.`,
    };
  }

  return { ok: true, source };
}

export type FetchRegisteredSourceInput = {
  store: CampIngestionStore;
  sourceId: string;
  fetcher: CampSourceFetcher;
  context?: FetchSourceContext;
  /** When true (default for HTTP), also require CAMP_FETCH_ALLOWLIST membership. */
  requireAllowlisted?: boolean;
};

export type FetchRegisteredSourceResult =
  | {
      ok: true;
      source: CampSource;
      snapshot: CampSourceSnapshot;
      fetchAttempts: number;
    }
  | {
      ok: false;
      reason: ResolveRegisteredSourceFailure;
      message: string;
      /** Always 0 when resolution fails — the fetcher is never called. */
      fetchAttempts: 0;
    };

/**
 * Resolve sourceId from the registry, then fetch.
 * Unregistered / inactive / (optionally) non-allowlisted ids never touch the network.
 */
export async function fetchRegisteredSource(
  input: FetchRegisteredSourceInput,
): Promise<FetchRegisteredSourceResult> {
  const resolved = await resolveRegisteredSource(input.store, input.sourceId, {
    requireAllowlisted: input.requireAllowlisted ?? false,
  });

  if (!resolved.ok) {
    return {
      ok: false,
      reason: resolved.reason,
      message: resolved.message,
      fetchAttempts: 0,
    };
  }

  const snapshot = await input.fetcher.fetchSource(resolved.source, input.context);
  return {
    ok: true,
    source: resolved.source,
    snapshot,
    fetchAttempts: 1,
  };
}
