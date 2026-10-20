/**
 * Discover venue catalog — where venue pages get their records.
 *
 * - Production: published, open venues read from Supabase with the public
 *   anon key (lib/discover/venuesSupabase.ts). No credentials → no venues,
 *   so every venue URL 404s rather than showing anything unverified.
 * - Development: fictional fixtures plus a preview of real records (PE-033)
 *   exactly as they would publish. Never indexed.
 */

import type { VenueRecord } from "@/data/discover/venueTypes";
import {
  fetchPublishedVenue,
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
  },
): Promise<VenueCatalog | null> {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === "production") {
    const config = options.supabase !== undefined ? options.supabase : readPublicSupabaseConfig();
    if (!config) return null;
    const record = await fetchPublishedVenue(config, options.venueSlug);
    return record ? { records: [record], sourceLabel: "published" } : null;
  }
  const [{ venuesDevRecords }, { pe033SkyZoneMississauga }] = await Promise.all([
    import("@/data/discover/venues.dev"),
    import("@/data/discover/venues/pe033SkyZoneMississauga"),
  ]);
  return {
    records: [...venuesDevRecords, previewAsPublished(pe033SkyZoneMississauga)],
    sourceLabel: "dev_preview",
  };
}
