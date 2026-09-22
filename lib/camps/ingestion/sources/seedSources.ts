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
import { FRONT_LINE_HOCKEY_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/frontLineHockeyExtractor";
import { NUTTY_SCIENTISTS_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/nuttyScientistsExtractor";
import { RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY } from "@/lib/camps/ingestion/extractors/riverwoodConservancyExtractor";
import { DEFAULT_CHECK_INTERVAL_HOURS } from "@/lib/camps/ingestion/freshness";
import type { CampIngestionStore } from "@/lib/camps/ingestion/repositories/types";

export const CREATIVE_KIDS_PLACE_SOURCE_ID = "src-creative-kids-place-summer-camp";
export const CREATIVE_KIDS_PLACE_PROVIDER_ID = "prov-creative-kids-place";

/** The provider's own public Square One summer camp page (official .ca site). */
export const CREATIVE_KIDS_PLACE_SOURCE_URL =
  "https://www.creativekidsplace.ca/pages/camps/summer-camp-square-one-mississauga-on";

export const NUTTY_SCIENTISTS_SOURCE_ID = "src-nutty-scientists-summer-camp";
export const NUTTY_SCIENTISTS_PROVIDER_ID = "prov-nutty-scientists-canada";

/** Official Nutty Scientists Canada summer-camp HTML page. Google Forms are not fetch targets. */
export const NUTTY_SCIENTISTS_SOURCE_URL = "https://nuttyscientistscanada.ca/summercamp";

export const RIVERWOOD_CONSERVANCY_SOURCE_ID = "src-riverwood-conservancy-summer-camp";
export const RIVERWOOD_CONSERVANCY_PROVIDER_ID = "prov-riverwood-conservancy";

/** Official Riverwood Conservancy summer-camp HTML page. The camp guide PDF is not a fetch target. */
export const RIVERWOOD_CONSERVANCY_SOURCE_URL = "https://theriverwoodconservancy.org/summercamp/";

export const FRONT_LINE_HOCKEY_PROVIDER_ID = "prov-front-line-hockey-school";
export const FRONT_LINE_HOCKEY_PROVIDER_URL = "https://frontlinehockeyschool.ca/";

/**
 * Reviewed Front Line Hockey School WooCommerce product pages. Each URL is its
 * own CampSource under one provider. The category listing and marketing
 * `/hockey-camps/` pages are not fetch targets.
 */
export const FRONT_LINE_HOCKEY_PRODUCTS = [
  {
    id: "src-front-line-hockey-april-pre-tryout",
    url: "https://frontlinehockeyschool.ca/product/april-hockey-camp/",
  },
  {
    id: "src-front-line-hockey-july-half-day",
    url: "https://frontlinehockeyschool.ca/product/july-hockey-camp-2/",
  },
  {
    id: "src-front-line-hockey-july-girls-only",
    url: "https://frontlinehockeyschool.ca/product/july-2026-girls-only-half-day-hockey-camp/",
  },
  {
    id: "src-front-line-hockey-august-full-day",
    url: "https://frontlinehockeyschool.ca/product/august-full-day-hockey-camp-2/",
  },
  {
    id: "src-front-line-hockey-fall-pre-evaluation",
    url: "https://frontlinehockeyschool.ca/product/fall-pre-evaluation-hockey-camp/",
  },
  {
    id: "src-front-line-hockey-december-mid-season",
    url: "https://frontlinehockeyschool.ca/product/december-hockey-camp/",
  },
] as const;

export const FRONT_LINE_HOCKEY_SOURCE_IDS: readonly string[] = FRONT_LINE_HOCKEY_PRODUCTS.map(
  (product) => product.id,
);

/** July half-day product — used as the primary 9B-C1 fingerprint control. */
export const FRONT_LINE_HOCKEY_JULY_SOURCE_ID = FRONT_LINE_HOCKEY_PRODUCTS[1].id;
export const FRONT_LINE_HOCKEY_JULY_SOURCE_URL = FRONT_LINE_HOCKEY_PRODUCTS[1].url;
export const FRONT_LINE_HOCKEY_APRIL_SOURCE_ID = FRONT_LINE_HOCKEY_PRODUCTS[0].id;
export const FRONT_LINE_HOCKEY_APRIL_SOURCE_URL = FRONT_LINE_HOCKEY_PRODUCTS[0].url;

/**
 * Source ids `HttpCampSourceFetcher` is permitted to fetch. Reviewed HTML
 * pages only. Registration forms (including Google Forms) and PDFs are never allowlisted.
 */
export const CAMP_FETCH_ALLOWLIST: readonly string[] = [
  CREATIVE_KIDS_PLACE_SOURCE_ID,
  NUTTY_SCIENTISTS_SOURCE_ID,
  RIVERWOOD_CONSERVANCY_SOURCE_ID,
  ...FRONT_LINE_HOCKEY_SOURCE_IDS,
];

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

export function nuttyScientistsSource(now: Date = new Date()): CampSource {
  const timestamp = now.toISOString();
  return {
    id: NUTTY_SCIENTISTS_SOURCE_ID,
    providerId: NUTTY_SCIENTISTS_PROVIDER_ID,
    sourceType: "provider_website",
    sourceUrl: NUTTY_SCIENTISTS_SOURCE_URL,
    canonicalUrl: canonicalizeSourceUrl(NUTTY_SCIENTISTS_SOURCE_URL),
    registrationPlatform: "Google Forms",
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "daily",
    checkIntervalHours: DEFAULT_CHECK_INTERVAL_HOURS,
    nextCheckAt: null,
    extractorKey: NUTTY_SCIENTISTS_EXTRACTOR_KEY,
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

export function riverwoodConservancySource(now: Date = new Date()): CampSource {
  const timestamp = now.toISOString();
  return {
    id: RIVERWOOD_CONSERVANCY_SOURCE_ID,
    providerId: RIVERWOOD_CONSERVANCY_PROVIDER_ID,
    sourceType: "provider_website",
    sourceUrl: RIVERWOOD_CONSERVANCY_SOURCE_URL,
    canonicalUrl: canonicalizeSourceUrl(RIVERWOOD_CONSERVANCY_SOURCE_URL),
    registrationPlatform: null,
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "daily",
    checkIntervalHours: DEFAULT_CHECK_INTERVAL_HOURS,
    nextCheckAt: null,
    extractorKey: RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY,
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

function frontLineHockeySource(
  product: (typeof FRONT_LINE_HOCKEY_PRODUCTS)[number],
  now: Date,
): CampSource {
  const timestamp = now.toISOString();
  return {
    id: product.id,
    providerId: FRONT_LINE_HOCKEY_PROVIDER_ID,
    sourceType: "provider_website",
    sourceUrl: product.url,
    canonicalUrl: canonicalizeSourceUrl(product.url),
    registrationPlatform: "WooCommerce",
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "daily",
    checkIntervalHours: DEFAULT_CHECK_INTERVAL_HOURS,
    nextCheckAt: null,
    extractorKey: FRONT_LINE_HOCKEY_EXTRACTOR_KEY,
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

export function frontLineHockeySources(now: Date = new Date()): CampSource[] {
  return FRONT_LINE_HOCKEY_PRODUCTS.map((product) => frontLineHockeySource(product, now));
}

export function frontLineHockeySourceById(sourceId: string, now: Date = new Date()): CampSource {
  const product = FRONT_LINE_HOCKEY_PRODUCTS.find((row) => row.id === sourceId);
  if (!product) {
    throw new Error(`Unknown Front Line Hockey source id: ${sourceId}`);
  }
  return frontLineHockeySource(product, now);
}

export function seedCampSources(now: Date = new Date()): CampSource[] {
  return [
    creativeKidsPlaceSource(now),
    nuttyScientistsSource(now),
    riverwoodConservancySource(now),
    ...frontLineHockeySources(now),
  ];
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
