/**
 * Development-only ingestion store, seeded from the fixture bundle.
 *
 * The admin surfaces need somewhere to write a review decision. In development
 * there is no Supabase project, so decisions go to a process-lifetime memory
 * store: real persistence semantics (read back what you wrote, no state
 * shared by reference) with no infrastructure. Restarting the dev server
 * resets it, which is the honest behaviour to show an operator.
 *
 * Production returns null. Fixtures never reach a deployed environment, and
 * this module is the only place the two are wired together.
 */

import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import { areIngestionDevFixturesAllowed } from "@/lib/camps/ingestion/devGate";
import { loadIngestionDevFixtures } from "@/lib/camps/ingestion/devFixtures";
import { FixtureSourceFetcher, type FixturePayload } from "@/lib/camps/ingestion/fetcher";
import { createPrefixedIdFactory } from "@/lib/camps/ingestion/ids";
import {
  createMemoryIngestionStore,
  type MemoryIngestionStore,
} from "@/lib/camps/ingestion/repositories/memoryStore";
import type { IngestionCatalogSnapshot } from "@/lib/camps/ingestion/repositories/types";
import { runDueCampSources } from "@/lib/camps/ingestion/runner/runDueCampSources";

export type IngestionDevContext = {
  store: MemoryIngestionStore;
  /** The fixture "published" catalog, read-only, for matching and diffs. */
  catalog: IngestionCatalogSnapshot;
};

/**
 * Held on `globalThis`, not in a module variable.
 *
 * Next.js may evaluate the same module more than once in one process — a
 * server action and a page can end up in different module graphs, and dev
 * recompiles re-evaluate modules. Module-level state would then silently split
 * in two, and a decision written by the action would not be visible to the page
 * that rendered the form. A single global key is the one place both halves can
 * agree on.
 */
const DEV_STORE_KEY = "__compassCampsIngestionDevStore";

type DevStoreGlobal = typeof globalThis & {
  [DEV_STORE_KEY]?: IngestionDevContext | null;
};

function build(): IngestionDevContext | null {
  const fixtures = loadIngestionDevFixtures();
  if (!fixtures) return null;

  return {
    store: createMemoryIngestionStore({
      sources: seedSourceHashes(fixtures.sources, fixtures.snapshots),
      snapshots: fixtures.snapshots,
      extractionRuns: fixtures.extractionRuns,
      extractedRecords: fixtures.extractedRecords,
      candidates: fixtures.candidates,
    }),
    catalog: {
      providers: fixtures.published.providers,
      programs: fixtures.published.programs,
      sessions: fixtures.published.sessions,
      venues: fixtures.published.venues,
    },
  };
}

/**
 * Give each source the hash of the *earliest* content the fixtures recorded for
 * it, unless the fixture states one.
 *
 * The fixtures encode a history — an earlier read and a current one — and
 * `runIngestionDevCycle` replays the current snapshot as the live response.
 * Anchoring the recorded hash to the earlier read is what makes that replay
 * exercise the change path instead of reporting everything as unchanged.
 */
function seedSourceHashes(
  sources: readonly CampSource[],
  snapshots: readonly CampSourceSnapshot[],
): CampSource[] {
  return sources.map((source) => {
    if (source.lastContentHash) return source;
    const earliest = snapshots
      .filter((snapshot) => snapshot.sourceId === source.id && snapshot.fetchStatus === "success")
      .sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt))[0];
    return earliest ? { ...source, lastContentHash: earliest.contentHash } : source;
  });
}

/** Null in production; a memory store seeded from fixtures otherwise. */
export function getIngestionDevContext(): IngestionDevContext | null {
  if (!areIngestionDevFixturesAllowed()) return null;
  const container = globalThis as DevStoreGlobal;
  container[DEV_STORE_KEY] ??= build();
  return container[DEV_STORE_KEY] ?? null;
}

/** Drop dev state, e.g. between tests or after a fixture change. */
export function resetIngestionDevContext(): void {
  delete (globalThis as DevStoreGlobal)[DEV_STORE_KEY];
}

/**
 * Run one real ingestion cycle over fixture content — the same runner used
 * against live sources, with the network replaced by saved snapshot HTML.
 *
 * This is how the admin review queue gets a genuine run summary and genuine
 * candidates in development, without touching a provider's site.
 */
export async function runIngestionDevCycle(now: Date = new Date()) {
  const context = getIngestionDevContext();
  if (!context) return null;

  const [snapshots, sources] = await Promise.all([
    context.store.snapshots.listSnapshots(),
    context.store.sources.listSources(),
  ]);

  // Dev convenience: treat every source as due, so an operator can run the
  // cycle on demand instead of waiting out a 24-hour interval. The hash gate is
  // untouched — running twice in a row correctly reports the second pass as
  // unchanged.
  for (const source of sources) {
    if (source.nextCheckAt) {
      await context.store.sources.upsertSource({ ...source, nextCheckAt: null });
    }
  }

  return runDueCampSources({
    store: context.store,
    fetcher: new FixtureSourceFetcher(fixturePayloads(snapshots, sources), {
      newId: createPrefixedIdFactory("snap-dev"),
    }),
    catalog: context.catalog,
    now: () => now,
    newId: createPrefixedIdFactory("dev"),
  });
}

/**
 * Replay each source's most recent snapshot as its "live" response, so a dev
 * cycle re-reads exactly the content the fixtures recorded.
 *
 * Payloads are also keyed by canonical URL, which is how a second source
 * pointing at the same page (the duplicate-source scenario) gets content
 * without the fixtures having to repeat it.
 */
function fixturePayloads(
  snapshots: readonly CampSourceSnapshot[],
  sources: readonly CampSource[],
): Record<string, FixturePayload> {
  const latest = new Map<string, CampSourceSnapshot>();
  for (const snapshot of snapshots) {
    const current = latest.get(snapshot.sourceId);
    if (!current || snapshot.retrievedAt > current.retrievedAt) {
      latest.set(snapshot.sourceId, snapshot);
    }
  }

  const canonicalById = new Map(sources.map((source) => [source.id, source.canonicalUrl]));
  const payloads: Record<string, FixturePayload> = {};
  for (const [sourceId, snapshot] of latest) {
    const payload: FixturePayload = {
      content: snapshot.rawContent ?? "",
      contentType: snapshot.contentType ?? "text/html",
      httpStatus: snapshot.httpStatus ?? null,
      // A blocked or errored fixture stays blocked or errored on replay.
      fetchStatus: snapshot.fetchStatus === "not_modified" ? "success" : snapshot.fetchStatus,
      fetchError: snapshot.fetchError ?? null,
    };
    payloads[sourceId] = payload;
    const canonicalUrl = canonicalById.get(sourceId);
    if (canonicalUrl) payloads[canonicalUrl] ??= payload;
  }
  return payloads;
}
