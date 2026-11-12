/**
 * Writes two files per real venue record (no database is touched):
 *   supabase/seeds/discover/<id>-<slug>.sql          loads it as a draft
 *   supabase/seeds/discover/<id>-<slug>.publish.sql  publishes it (apply on purpose)
 *
 *   npx tsx scripts/discover/build-venue-seed.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { VenueRecord } from "@/data/discover/venueTypes";
import { REAL_VENUE_RECORDS } from "@/data/discover/venues";
import { buildVenuePublishSql, buildVenueSeedSql, type SeedCity } from "@/lib/discover/venueSeedSql";

const MISSISSAUGA: SeedCity = {
  id: "mississauga",
  country: "Canada",
  provinceState: "Ontario",
  cityTown: "Mississauga",
  slug: "mississauga",
  // Provincial Tourism regions dataset: Mississauga is Region 5.
  tourismRegion: "5",
};

const RECORDS: readonly VenueRecord[] = REAL_VENUE_RECORDS;

for (const record of RECORDS) {
  const name = `${record.place.id.toLowerCase()}-${record.place.slug}`;
  const out = join(process.cwd(), `supabase/seeds/discover/${name}.sql`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buildVenueSeedSql(record, MISSISSAUGA));
  const publishOut = out.replace(/\.sql$/, ".publish.sql");
  writeFileSync(publishOut, buildVenuePublishSql(record));
  console.log(`Wrote ${out}\nWrote ${publishOut}`);
}
