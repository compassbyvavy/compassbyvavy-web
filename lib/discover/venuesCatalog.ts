/**
 * Discover venue catalog — where venue pages get their records.
 *
 * Mirrors lib/camps/catalog.ts: non-production loads gated, clearly
 * fictional dev fixtures; production returns null (no public Supabase read
 * path is wired for places yet), so every venue page 404s rather than showing
 * sample facts.
 */

import type { VenueRecord } from "@/data/discover/venueTypes";

export type VenueCatalog = {
  records: VenueRecord[];
  sourceLabel: "dev_fixtures";
};

export const VENUE_DEV_BANNER =
  "DEV ONLY — fictional venue fixtures (example.org sources). Not real venue data; production shows no venue pages until published records are wired.";

export async function loadVenueCatalog(
  options: { nodeEnv?: string } = {},
): Promise<VenueCatalog | null> {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === "production") return null;
  const { venuesDevRecords } = await import("@/data/discover/venues.dev");
  return { records: venuesDevRecords, sourceLabel: "dev_fixtures" };
}
