/**
 * Writes two files from the PE-001 TypeScript record (no database is touched):
 *   supabase/seeds/discover/pe-001-sky-zone-mississauga.sql          loads it as a draft
 *   supabase/seeds/discover/pe-001-sky-zone-mississauga.publish.sql  publishes it (apply on purpose)
 *
 *   npx tsx scripts/discover/build-venue-seed.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pe001SkyZoneMississauga } from "@/data/discover/venues/pe001SkyZoneMississauga";
import { buildVenuePublishSql, buildVenueSeedSql } from "@/lib/discover/venueSeedSql";

const out = join(process.cwd(), "supabase/seeds/discover/pe-001-sky-zone-mississauga.sql");
const sql = buildVenueSeedSql(pe001SkyZoneMississauga, {
  id: "mississauga",
  country: "Canada",
  provinceState: "Ontario",
  cityTown: "Mississauga",
  slug: "mississauga",
  // Provincial Tourism regions dataset: Mississauga is Region 5.
  tourismRegion: "5",
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, sql);
const publishOut = out.replace(/\.sql$/, ".publish.sql");
writeFileSync(publishOut, buildVenuePublishSql(pe001SkyZoneMississauga));
console.log(`Wrote ${out}\nWrote ${publishOut}`);
