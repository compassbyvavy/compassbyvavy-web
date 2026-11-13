/**
 * Places camp venues on the map.
 *
 *   npx tsx scripts/camps/locate-venues.ts
 *
 * Reads every venue in supabase/seeds/camps/*.sql, looks each address up in
 * Natural Resources Canada's free Geolocation service, prints what matched,
 * and writes supabase/seeds/camps/venue-coordinates.sql. Venues it can't
 * place confidently are listed and left out, never guessed.
 * Needs internet access. Doesn't touch the database.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  NRCAN_LOCATE_URL,
  coordinatesSql,
  locateQuery,
  pickLocation,
  venuesFromSeedSql,
  type LocatedVenue,
  type SeedVenue,
} from "../../lib/camps/locateVenues";

const SEEDS = join(process.cwd(), "supabase/seeds/camps");
const OUT = join(SEEDS, "venue-coordinates.sql");

async function main() {
  const files = readdirSync(SEEDS).filter((f) => f.endsWith(".sql") && !f.endsWith(".publish.sql") && f !== "venue-coordinates.sql");
  const byId = new Map<string, SeedVenue>();
  for (const f of files) for (const v of venuesFromSeedSql(readFileSync(join(SEEDS, f), "utf8"))) byId.set(v.id, v);

  const located: LocatedVenue[] = [];
  const missed: string[] = [];
  for (const v of byId.values()) {
    const q = locateQuery(v);
    const res = await fetch(`${NRCAN_LOCATE_URL}?q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "CompassByVavyBot/1.0 (+https://compassbyvavy.ca; hello@compassbyvavy.ca)" },
    });
    const body = res.ok ? await res.json() : null;
    const hit = pickLocation(v, body);
    if (hit) {
      located.push(hit);
      console.log(`placed  ${v.id}  ${hit.lat}, ${hit.lng}  ← "${hit.matchedTitle}"`);
    } else {
      missed.push(`${v.id} (${q})`);
      console.log(`MISSED  ${v.id}  query "${q}"  HTTP ${res.status}  first answer: ${JSON.stringify(Array.isArray(body) ? body[0] ?? null : body)}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  writeFileSync(OUT, coordinatesSql(located, today));
  console.log(`\nWrote ${OUT}: ${located.length} placed, ${missed.length} missed.`);
  if (missed.length) console.log(`Not placed (check by hand):\n  ${missed.join("\n  ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
