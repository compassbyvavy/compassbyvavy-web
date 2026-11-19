import { readFileSync } from "node:fs";
import { storedAdapterParams } from "@/lib/camps/feeds/adapterParams";

export type SeedRow = {
  source_key: string;
  camp: string;
  break: string;
  intake_row: string;
  adapter: string;
  watch_url: string;
  adapter_params: string;
  check_every: string;
  notes: string;
};

/** RFC 4180. The seed has quoted cells with commas and apostrophes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...data] = rows.filter((record) => record.some((value) => value !== ""));
  if (!header) return [];
  return data.map((record) => Object.fromEntries(header.map((key, index) => [key, record[index] ?? ""])));
}

export function loadSeedRows(csvText: string): SeedRow[] {
  return parseCsv(csvText) as SeedRow[];
}

function sqlText(value: string): string {
  if (value === "") return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlInt(value: string): string {
  return /^\d+$/.test(value) ? value : "null";
}

function sqlJson(value: unknown): string {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

/**
 * SQL Vineeta can paste into the Supabase SQL editor.
 * This string is not executed here, and the script that writes it opens no connection.
 */
export function buildSeedSql(rows: SeedRow[]): string {
  const values = rows.map((row) => {
    const params = storedAdapterParams(row.adapter_params);
    return `  (${sqlText(row.source_key)}, ${sqlText(row.camp)}, ${sqlText(row.break)}, ${sqlInt(row.intake_row)}, ${sqlText(row.adapter)}, ${sqlText(row.watch_url)}, ${sqlJson(params)}, ${sqlText(row.check_every || "daily")}, true, ${sqlText(row.notes)})`;
  });
  return `-- Camp Watcher source list. Run in the Supabase SQL editor after
-- 20261115215202_camp_watch_tables.sql. Do not run this from the app,
-- and do not point it at production from a script.
-- ${rows.length} rows. Safe to run again: a re-run refreshes the descriptive
-- columns and leaves last_checked_at, last_status, and active alone.

begin;

insert into public.camp_watch_sources (
  source_key, camp, break, intake_row, adapter, watch_url, adapter_params, check_every, active, notes
)
values
${values.join(",\n")}
on conflict (source_key) do update set
  camp = excluded.camp,
  break = excluded.break,
  intake_row = excluded.intake_row,
  adapter = excluded.adapter,
  watch_url = excluded.watch_url,
  adapter_params = excluded.adapter_params,
  check_every = excluded.check_every,
  notes = excluded.notes;

commit;
`;
}

export function seedSqlFromFile(csvPath: string): string {
  return buildSeedSql(loadSeedRows(readFileSync(csvPath, "utf8")));
}
