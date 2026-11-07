/**
 * Discover venue catalog — where venue pages get their records.
 *
 * - Production: published, open venues read from Supabase with the public
 *   anon key (lib/discover/venuesSupabase.ts). No credentials → no venues,
 *   so every venue URL 404s rather than showing anything unverified.
 * - Development: fictional fixtures plus a preview of real records (PE-001, PE-002, PE-033)
 *   exactly as they would publish. Never indexed.
 * - Cloudflare preview URLs (the same dual gate as Discover examples: the
 *   COMPASS_DISCOVER_REVIEW_PREVIEW flag AND a verified preview hostname):
 *   when Supabase has no published record, the development preview is shown,
 *   bannered and never indexed. The production site never takes this path.
 */

import type { VenueRecord } from "@/data/discover/venueTypes";
import {
  DISCOVER_REVIEW_PREVIEW_FLAG,
  isDiscoverReviewPreviewEnabled,
} from "@/lib/discover/reviewPreviewGate";
import { dbCategoriesFor } from "@/lib/discover/categories";
import { isVenuePubliclyViewable } from "@/lib/discover/venueDetail";
import {
  fetchPublishedVenue,
  fetchPublishedVenuesInCategories,
  readPublicSupabaseConfig,
  type PublicSupabaseConfig,
} from "@/lib/discover/venuesSupabase";

export type VenueSourceLabel = "published" | "dev_preview";

export type VenueCatalog = {
  records: VenueRecord[];
  sourceLabel: VenueSourceLabel;
};

export const VENUE_DEV_BANNER =
  "DEV PREVIEW — fictional fixtures (example.org sources) plus real records shown as they would publish. Not indexed.";

/** Only real published records may be indexed by search engines. */
export function venueIndexable(label: VenueSourceLabel): boolean {
  return label === "published";
}

/** Show a draft real record as it would look once its seed publishes it. */
export function previewAsPublished(record: VenueRecord): VenueRecord {
  return {
    ...record,
    place: {
      ...record.place,
      publicationState: "published",
      publishedAt: record.place.publishedAt ?? "1970-01-01T00:00:00Z",
    },
  };
}

export async function loadVenueCatalog(
  options: {
    venueSlug: string;
    nodeEnv?: string;
    supabase?: PublicSupabaseConfig | null;
    /** Incoming Host header only — never X-Forwarded-Host. */
    hostname?: string | null;
    reviewFlag?: string | null;
  },
): Promise<VenueCatalog | null> {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === "production") {
    const config = options.supabase !== undefined ? options.supabase : readPublicSupabaseConfig();
    const record = config ? await fetchPublishedVenue(config, options.venueSlug) : null;
    if (record) return { records: [record], sourceLabel: "published" };
    const reviewFlag =
      options.reviewFlag !== undefined ? options.reviewFlag : process.env[DISCOVER_REVIEW_PREVIEW_FLAG];
    return isDiscoverReviewPreviewEnabled({ reviewFlag, hostname: options.hostname })
      ? previewCatalog()
      : null;
  }
  return previewCatalog();
}

/**
 * Venues for a Discover category page, with the same rules as venue pages:
 * production lists published, open venues from Supabase; development and
 * gated Cloudflare previews list the preview catalog. Null when there is
 * nothing to list, so the page can fall back to "coming soon".
 */
export async function loadCategoryVenues(
  options: {
    categorySlug: string;
    nodeEnv?: string;
    supabase?: PublicSupabaseConfig | null;
    hostname?: string | null;
    reviewFlag?: string | null;
  },
): Promise<VenueCatalog | null> {
  const categories = dbCategoriesFor(options.categorySlug);
  if (categories.length === 0) return null;
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === "production") {
    const config = options.supabase !== undefined ? options.supabase : readPublicSupabaseConfig();
    const records = config ? await fetchPublishedVenuesInCategories(config, categories) : [];
    const listable = records.filter((r) => categories.includes(r.place.category) && isVenuePubliclyViewable(r));
    if (listable.length > 0) return { records: listable, sourceLabel: "published" };
    const reviewFlag =
      options.reviewFlag !== undefined ? options.reviewFlag : process.env[DISCOVER_REVIEW_PREVIEW_FLAG];
    if (!isDiscoverReviewPreviewEnabled({ reviewFlag, hostname: options.hostname })) return null;
  }
  const preview = await previewCatalog();
  const listable = preview.records.filter(
    (r) => categories.includes(r.place.category) && isVenuePubliclyViewable(r),
  );
  return listable.length > 0 ? { records: listable, sourceLabel: preview.sourceLabel } : null;
}

async function previewCatalog(): Promise<VenueCatalog> {
  const [{ venuesDevRecords }, { pe033SkyZoneMississauga }, { pe001AmazingFunPark }, { pe002BooglesPlayhouse }] =
    await Promise.all([
      import("@/data/discover/venues.dev"),
      import("@/data/discover/venues/pe033SkyZoneMississauga"),
      import("@/data/discover/venues/pe001AmazingFunPark"),
      import("@/data/discover/venues/pe002BooglesPlayhouse"),
    ]);
  return {
    records: [
      ...venuesDevRecords,
      previewAsPublished(pe001AmazingFunPark),
      previewAsPublished(pe002BooglesPlayhouse),
      previewAsPublished(pe033SkyZoneMississauga),
    ],
    sourceLabel: "dev_preview",
  };
}
