/**
 * Writes supabase/seeds/camps/camp_watch_sources.sql from the watcher CSV.
 * Opens no database connection and does not run the SQL.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { seedSqlFromFile } from "@/lib/camps/watcher/seed";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const csvPath = path.join(root, "docs/camps/watcher/camp_sources_seed.csv");
const sqlPath = path.join(root, "supabase/seeds/camps/camp_watch_sources.sql");

export function writeSeedSql(): string {
  const sql = seedSqlFromFile(csvPath);
  writeFileSync(sqlPath, sql);
  return sqlPath;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const written = writeSeedSql();
  process.stdout.write(`${written}\n`);
}
