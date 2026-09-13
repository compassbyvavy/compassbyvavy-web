/**
 * Registered camp sources, and the allowlist of sources the HTTP fetcher may
 * actually request.
 *
 * Two separate decisions, deliberately kept separate:
 * 1. *Registering* a source records that a page exists and describes how it
 *    would be read. Registration alone fetches nothing.
 * 2. *Allowlisting* a source id opts it into real network requests.
 *
 * `HttpCampSourceFetcher` refuses any source id outside
 * {@link CAMP_FETCH_ALLOWLIST}, so a row added to the registry — by a migration,
 * a seed script, or a future admin form — cannot start crawling on its own.
 * Widening the allowlist is a code change with a diff and a reviewer.
 */

import type { CampSource } from "@/data/camps/ingestion/types";
import { canonicalizeSourceUrl } from "@/lib/camps/ingestion/canonicalizeUrl";
import { CREATIVE_KIDS_PLACE_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
import { DEFAULT_CHECK_INTERVAL_HOURS } from "@/lib/camps/ingestion/freshness";
import type { CampIngestionStore } from "@/lib/camps/ingestion/repositories/types";

export const CREATIVE_KIDS_PLACE_SOURCE_ID = "src-creative-kids-place-summer-camp";
export const CREATIVE_KIDS_PLACE_PROVIDER_ID = "prov-creative-kids-place";

/** The provider's own public Square One summer camp page (official .ca site). */
export const CREATIVE_KIDS_PLACE_SOURCE_URL =
  "https://www.creativekidsplace.ca/pages/camps/summer-camp-square-one-mississauga-on";

/**
 * Source ids `HttpCampSourceFetcher` is permitted to fetch. One entry: the
 * first real provider page. Everything else in the registry is read from
 * fixtures or handled manually.
 */
export const CAMP_FETCH_ALLOWLIST: readonly string[] = [CREATIVE_KIDS_PLACE_SOURCE_ID];

export function isFetchAllowlisted(sourceId: string): boolean {
  return CAMP_FETCH_ALLOWLIST.includes(sourceId);
}

/**
 * The Creative Kids Place source row. Every timestamp field is left null: a
 * seeded source has never been checked, so it is due immediately and its first
 * cycle has no hash to compare against.
 */
export function creativeKidsPlaceSource(now: Date = new Date()): CampSource {
  const timestamp = now.toISOString();
  return {
    id: CREATIVE_KIDS_PLACE_SOURCE_ID,
    providerId: CREATIVE_KIDS_PLACE_PROVIDER_ID,
    sourceType: "provider_website",
    sourceUrl: CREATIVE_KIDS_PLACE_SOURCE_URL,
    canonicalUrl: canonicalizeSourceUrl(CREATIVE_KIDS_PLACE_SOURCE_URL),
    registrationPlatform: "Activity Messenger",
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "daily",
    checkIntervalHours: DEFAULT_CHECK_INTERVAL_HOURS,
    nextCheckAt: null,
    extractorKey: CREATIVE_KIDS_PLACE_EXTRACTOR_KEY,
    lastCheckedAt: null,
    lastSuccessfulAt: null,
    lastChangedAt: null,
    lastContentHash: null,
    lastFactFingerprint: null,
    lastErrorAt: null,
    lastError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function seedCampSources(now: Date = new Date()): CampSource[] {
  return [creativeKidsPlaceSource(now)];
}

/**
 * Register the seed sources in a store, idempotently.
 *
 * Re-registering must not reset ingestion history: an existing row keeps its
 * check marks, content hash, and error state, and only its configuration
 * (URL, strategy, extractor, interval) is refreshed from the seed. Resetting
 * `lastContentHash` would make the next cycle re-extract unchanged content and
 * re-queue candidates a human has already reviewed.
 */
export async function registerSeedCampSources(
  store: CampIngestionStore,
  options: { now?: Date; sources?: readonly CampSource[] } = {},
): Promise<CampSource[]> {
  const now = options.now ?? new Date();
  const seeds = options.sources ?? seedCampSources(now);
  const registered: CampSource[] = [];

  for (const seed of seeds) {
    const existing = await store.sources.getSource(seed.id);
    const row: CampSource = existing
      ? {
          ...existing,
          providerId: seed.providerId,
          sourceType: seed.sourceType,
          sourceUrl: seed.sourceUrl,
          canonicalUrl: seed.canonicalUrl,
          registrationPlatform: seed.registrationPlatform,
          isActive: seed.isActive,
          crawlStrategy: seed.crawlStrategy,
          crawlFrequency: seed.crawlFrequency,
          checkIntervalHours: seed.checkIntervalHours,
          extractorKey: seed.extractorKey,
          updatedAt: now.toISOString(),
        }
      : seed;
    registered.push(await store.sources.upsertSource(row));
  }

  return registered;
}
