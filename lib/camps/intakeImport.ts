/**
 * Checklist → catalog SQL.
 *
 * Camps already enter Supabase as hand-written seed SQL
 * (`scripts/camps/build-winter-2026-seeds.py` → `supabase/seeds/camps/`)
 * that upserts `providers`, `venues`, `camp_programs`, and `camp_sessions`.
 * `lib/camps/ingestion` only proposes facts. It does not publish, so this
 * importer does not write those tables.
 *
 * Ids are `intake-{camp slug}` and `intake-{camp slug}--{break slug}`.
 * They do not reuse the MSC-* ids of the hand-written winter seeds.
 * Re-running updates those intake rows and never removes a row.
 *
 * Column mapping (empty cells stay null; nothing is guessed):
 * - Camp → providers.name. Also camp_programs.name when Program name is empty
 *   or the breaks do not all state the same program name.
 * - Break → session id; also a note, since sessions have no break column.
 * - What kids do, Category, Refunds, What to bring, Inclusion → the program
 *   column only when every break states the same text. A blank break does not
 *   inherit another break's text. Split or single-break wording stays on that session.
 * - Ages → session age_min/age_max only for a clear range or "N+".
 *   Program typical ages are set only when every break states that same range.
 *   Any other wording stays in the session notes.
 * - Venue → venues.name. No venue row when the cell is empty.
 * - Area → venues.neighbourhood. Not a city, and not a geocode.
 * - Dates → camp_sessions.timing_label. start_date/end_date only when the
 *   whole cell is one unambiguous range that includes a year.
 * - Single days? → session notes. Not schedule_format.
 * - Hours → core_hours_start/end only when the whole cell is one clock range
 *   with am/pm or 24-hour times. Otherwise the wording stays in notes.
 * - Before care / After care → the tri-state columns only for an exact
 *   yes/no/included/extra, or one clock range. Otherwise notes, and the
 *   columns stay unknown.
 * - Price → price_amount, price_unit, and CAD only when the whole cell is
 *   one amount with day, week, or session. Otherwise the cell stays in fee_notes.
 * - Fee notes → camp_sessions.fee_notes
 * - What to bring → camp_programs.preparation_notes. Not camp_packing_items
 *   (that table has no stable key, and required vs suggested would be a guess).
 * - Food, Staff, Trips, Parking → session notes
 * - Refunds → camp_programs.policies_summary
 * - Register link → registration_url when the whole cell is one http(s) URL
 * - Registration → registration_status only for an exact enum phrase
 * - Phone / Email → providers.contact_phone / contact_email when the filled
 *   cells agree. A blank cell does not erase a number stated on another break.
 * - Source → source_url on the session, and on the provider when the filled
 *   cells are the same http(s) URL. A sentence is kept in research notes.
 * - Checked → source_checked_date only when the cell is a real date
 * - Inclusion → camp_programs.support_info
 * - #, Status, Missing, Your decision, and any Source/Checked cell that is
 *   not a URL or a date → providers.research_notes (the camp page does not read it)
 * - Spots → not loaded. camp_session_spots and seat_availability stay untouched.
 * - Your decision → published only when the trimmed cell starts with "Approved".
 *   Every other cell, including a blank one, stays draft with published_at null.
 */

export const INTAKE_COLUMNS = [
  "#",
  "Camp",
  "Break",
  "Status",
  "Program name",
  "What kids do",
  "Category",
  "Ages",
  "Venue",
  "Area",
  "Dates",
  "Single days?",
  "Hours",
  "Before care",
  "After care",
  "Price",
  "Fee notes",
  "What to bring",
  "Food",
  "Refunds",
  "Register link",
  "Registration",
  "Phone",
  "Email",
  "Source",
  "Checked",
  "Staff",
  "Inclusion",
  "Trips",
  "Parking",
  "Spots",
  "Missing",
  "Your decision",
] as const;

export class IntakeImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntakeImportError";
  }
}

export type IntakeSkip = { rowNumber: number; reason: string };

export type IntakeSummary = {
  rowsRead: number;
  published: number;
  unpublished: number;
  skipped: IntakeSkip[];
};

export type IntakeImport = {
  sql: string;
  summary: IntakeSummary;
  summaryText: string;
};

type Cell = Record<(typeof INTAKE_COLUMNS)[number], string>;

type KeptRow = {
  rowNumber: number;
  camp: string;
  breakName: string;
  campSlug: string;
  breakSlug: string;
  approved: boolean;
  cell: Cell;
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

const MONTH_PATTERN = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");

const REGISTRATION: Record<string, string> = {
  open: "registration_open",
  "registration open": "registration_open",
  closed: "registration_closed",
  "registration closed": "registration_closed",
  waitlist: "waitlist",
  "wait list": "waitlist",
  "not yet open": "not_yet_open",
  "not open yet": "not_yet_open",
  "no upcoming dates": "no_upcoming_dates",
};

const TIME_12 = String.raw`(\d{1,2})(?::([0-5]\d))?\s*(am|pm)`;
const RANGE_SEP = String.raw`\s*(?:to|[-–—])\s*`;

export function formatIntakeSummary(summary: IntakeSummary): string {
  const lines = [
    `rows read: ${summary.rowsRead}`,
    `published: ${summary.published}`,
    `unpublished: ${summary.unpublished}`,
    `skipped: ${summary.skipped.length}`,
  ];
  for (const skip of summary.skipped) {
    lines.push(`- row ${skip.rowNumber}: ${skip.reason}`);
  }
  lines.push("spots column: not loaded");
  return lines.join("\n");
}

export function importIntake(csv: string): IntakeImport {
  const table = parseCsv(csv);
  if (table.length === 0) throw new IntakeImportError("The checklist has no header row.");
  const header = table[0].map((cell) => cell.trim());
  const missing = INTAKE_COLUMNS.filter((name) => !header.includes(name));
  if (missing.length) {
    throw new IntakeImportError(`The checklist is missing ${missing.map((name) => `"${name}"`).join(", ")}.`);
  }
  const index = new Map(header.map((name, i) => [name, i]));
  const data = table.slice(1).filter((record) => record.some((cell) => cell.trim() !== ""));
  const skipped: IntakeSkip[] = [];
  const kept: KeptRow[] = [];
  const seen = new Map<string, { rowNumber: number; camp: string; breakName: string }>();
  const campSlugOwner = new Map<string, { rowNumber: number; camp: string }>();

  data.forEach((record, i) => {
    const rowNumber = i + 2;
    const cell = Object.fromEntries(
      INTAKE_COLUMNS.map((name) => [name, (record[index.get(name) ?? -1] ?? "").trim()]),
    ) as Cell;
    const camp = cell.Camp;
    const breakName = cell.Break;
    if (!camp || !breakName) {
      skipped.push({ rowNumber, reason: !camp ? "missing camp" : "missing break" });
      return;
    }
    const campSlug = slugify(camp);
    const breakSlug = slugify(breakName);
    if (!campSlug || !breakSlug) {
      skipped.push({
        rowNumber,
        reason: !campSlug ? "camp name has no letters or numbers" : "break has no letters or numbers",
      });
      return;
    }
    const owner = campSlugOwner.get(campSlug);
    if (owner && owner.camp !== camp) {
      skipped.push({
        rowNumber,
        reason: `"${camp}" uses the same slug as "${owner.camp}" on row ${owner.rowNumber}`,
      });
      return;
    }
    if (!owner) campSlugOwner.set(campSlug, { rowNumber, camp });
    const key = `${campSlug}--${breakSlug}`;
    const first = seen.get(key);
    if (first) {
      skipped.push({
        rowNumber,
        reason: `duplicate of "${first.camp}" + "${first.breakName}" (kept row ${first.rowNumber})`,
      });
      return;
    }
    seen.set(key, { rowNumber, camp, breakName });
    kept.push({
      rowNumber,
      camp,
      breakName,
      campSlug,
      breakSlug,
      approved: cell["Your decision"].startsWith("Approved"),
      cell,
    });
  });

  const summary: IntakeSummary = {
    rowsRead: data.length,
    published: kept.filter((row) => row.approved).length,
    unpublished: kept.filter((row) => !row.approved).length,
    skipped,
  };
  return { sql: renderSql(kept), summary, summaryText: formatIntakeSummary(summary) };
}

function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((record, index) => index === 0 || record.some((value) => value.trim() !== ""));
}

function renderSql(rows: KeptRow[]): string {
  const byCamp = new Map<string, KeptRow[]>();
  for (const row of rows) {
    const list = byCamp.get(row.campSlug) ?? [];
    list.push(row);
    byCamp.set(row.campSlug, list);
  }
  const camps = [...byCamp.keys()].sort();
  const statements: string[] = [];
  for (const slug of camps) {
    const group = byCamp.get(slug)!;
    const approved = group.some((row) => row.approved);
    statements.push(providerSql(group, approved));
    for (const venue of venuesFor(group)) statements.push(venue.statement);
    statements.push(programSql(group, approved));
    const sessions = [...group].sort((a, b) => a.breakSlug.localeCompare(b.breakSlug));
    for (const row of sessions) statements.push(sessionSql(row, group));
  }
  return [
    "-- Checklist import. Generated by npm run camps:import.",
    "-- Run this yourself in the Supabase SQL editor. The app does not run it.",
    "-- Upserts intake rows in providers, venues, camp_programs, and camp_sessions.",
    "-- Does not remove rows and does not write spot counts.",
    "-- Ids are intake-{camp slug} and intake-{camp slug}--{break slug}.",
    "-- Approved rows are published. Every other row stays a draft.",
    "begin;",
    ...statements,
    "commit;",
    "",
  ].join("\n");
}

function providerSql(group: KeptRow[], approved: boolean): string {
  const first = group[0];
  const source = agreed(group.map((row) => (isHttpUrl(row.cell.Source) ? row.cell.Source : "")));
  const checked = agreed(group.map((row) => parseChecked(row.cell.Checked) ?? ""));
  const register = agreed(group.map((row) => (isHttpUrl(row.cell["Register link"]) ? row.cell["Register link"] : "")));
  return upsert("providers", [
    ["id", sqlText(`intake-${first.campSlug}`)],
    ["name", sqlText(first.camp)],
    ["registration_info_url", sqlText(register)],
    ["contact_email", sqlText(agreed(group.map((row) => row.cell.Email)))],
    ["contact_phone", sqlText(agreed(group.map((row) => row.cell.Phone)))],
    ["source_url", sqlText(source)],
    ["source_checked_date", sqlDate(checked)],
    ["research_notes", sqlText(researchNotes(group))],
    ["publication_state", publication(approved)],
    ["published_at", publishedAt(approved)],
  ]);
}

function programSql(group: KeptRow[], approved: boolean): string {
  const first = group[0];
  const programName = statedOnEveryRow(group.map((row) => row.cell["Program name"]));
  const ages = agreedAges(group);
  return upsert("camp_programs", [
    ["id", sqlText(`intake-${first.campSlug}`)],
    ["slug", sqlText(`intake-${first.campSlug}`)],
    ["provider_id", sqlText(`intake-${first.campSlug}`)],
    ["name", sqlText(programName ?? first.camp)],
    ["description", sqlText(statedOnEveryRow(group.map((row) => row.cell["What kids do"])))],
    ["primary_category", sqlText(statedOnEveryRow(group.map((row) => row.cell.Category)))],
    ["typical_age_min", sqlInt(ages?.min ?? null)],
    ["typical_age_max", sqlInt(ages?.max ?? null)],
    ["typical_age_min_inclusive", ages ? "true" : "null"],
    ["typical_age_max_inclusive", ages?.max != null ? "true" : "null"],
    ["support_info", sqlText(statedOnEveryRow(group.map((row) => row.cell.Inclusion)))],
    ["policies_summary", sqlText(statedOnEveryRow(group.map((row) => row.cell.Refunds)))],
    ["preparation_notes", sqlText(statedOnEveryRow(group.map((row) => row.cell["What to bring"])))],
    ["publication_state", publication(approved)],
    ["published_at", publishedAt(approved)],
  ]);
}

type VenuePlan = { id: string; statement: string; matches: (row: KeptRow) => boolean };

function venuesFor(group: KeptRow[]): VenuePlan[] {
  const buckets = new Map<string, KeptRow[]>();
  for (const row of group) {
    if (!row.cell.Venue) continue;
    const key = `${row.cell.Venue}\n${row.cell.Area}`;
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }
  const used = new Set<string>();
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, rows]) => {
    const name = rows[0].cell.Venue;
    const area = rows[0].cell.Area;
    let id = `intake-${rows[0].campSlug}--${slugify(name) || "venue"}`;
    if (area && slugify(area)) id += `--${slugify(area)}`;
    if (used.has(id)) id += `--${used.size + 1}`;
    used.add(id);
    const approved = rows.some((row) => row.approved);
    return {
      id,
      matches: (row) => row.cell.Venue === name && row.cell.Area === area,
      statement: upsert("venues", [
        ["id", sqlText(id)],
        ["name", sqlText(name)],
        ["neighbourhood", sqlText(area || null)],
        ["publication_state", publication(approved)],
        ["published_at", publishedAt(approved)],
      ]),
    };
  });
}

function venueIdFor(row: KeptRow, group: KeptRow[]): string | null {
  if (!row.cell.Venue) return null;
  const plan = venuesFor(group).find((venue) => venue.matches(row));
  return plan?.id ?? null;
}

function sessionSql(row: KeptRow, group: KeptRow[]): string {
  const venueId = venueIdFor(row, group);
  const ages = parseAges(row.cell.Ages);
  const hours = parseClockRange(row.cell.Hours);
  const dates = parseDateRange(row.cell.Dates);
  const before = parseCare(row.cell["Before care"]);
  const after = parseCare(row.cell["After care"]);
  const price = parsePrice(row.cell.Price);
  const registration = parseRegistration(row.cell.Registration);
  const shared = (column: (typeof INTAKE_COLUMNS)[number]) =>
    statedOnEveryRow(group.map((item) => item.cell[column]));
  const onlyWhenSplit = (column: (typeof INTAKE_COLUMNS)[number]) => (shared(column) ? "" : row.cell[column]);
  const notes = joinNotes([
    labeled("Break", row.breakName),
    labeled("Program name", onlyWhenSplit("Program name")),
    labeled("What kids do", onlyWhenSplit("What kids do")),
    labeled("Category", onlyWhenSplit("Category")),
    labeled("Area", venueId ? "" : row.cell.Area),
    labeled("Single days", row.cell["Single days?"]),
    labeled("Hours", hours ? "" : row.cell.Hours),
    labeled("Ages", ages ? "" : row.cell.Ages),
    labeled("Before care", before.keepRaw ? row.cell["Before care"] : ""),
    labeled("After care", after.keepRaw ? row.cell["After care"] : ""),
    labeled("Registration", registration.keepRaw ? row.cell.Registration : ""),
    labeled("What to bring", onlyWhenSplit("What to bring")),
    labeled("Food", row.cell.Food),
    labeled("Refunds", onlyWhenSplit("Refunds")),
    labeled("Staff", row.cell.Staff),
    labeled("Inclusion", onlyWhenSplit("Inclusion")),
    labeled("Trips", row.cell.Trips),
    labeled("Parking", row.cell.Parking),
  ]);
  return upsert("camp_sessions", [
    ["id", sqlText(`intake-${row.campSlug}--${row.breakSlug}`)],
    ["program_id", sqlText(`intake-${row.campSlug}`)],
    ["venue_id", sqlText(venueId)],
    ["start_date", sqlDate(dates?.start ?? null)],
    ["end_date", sqlDate(dates?.end ?? null)],
    ["timing_label", sqlText(row.cell.Dates || null)],
    ["core_hours_start", sqlTime(hours?.start ?? null)],
    ["core_hours_end", sqlTime(hours?.end ?? null)],
    ["before_care_offered", tri(before.offered)],
    ["before_care_start_time", sqlTime(before.start)],
    ["before_care_end_time", sqlTime(before.end)],
    ["before_care_separate_booking", tri(before.separate)],
    ["after_care_offered", tri(after.offered)],
    ["after_care_start_time", sqlTime(after.start)],
    ["after_care_end_time", sqlTime(after.end)],
    ["after_care_separate_booking", tri(after.separate)],
    ["price_amount", price ? sqlNumber(price.amount) : "null"],
    ["price_unit", price ? `'${price.unit}'::public.price_unit` : "null"],
    ["currency", price ? `'${price.currency}'::public.camp_currency` : "null"],
    ["fee_notes", sqlText(feeText(row.cell.Price, row.cell["Fee notes"], price != null))],
    ["registration_status", `'${registration.status}'::public.camp_registration_status`],
    ["registration_url", sqlText(isHttpUrl(row.cell["Register link"]) ? row.cell["Register link"] : null)],
    ["source_url", sqlText(isHttpUrl(row.cell.Source) ? row.cell.Source : null)],
    ["source_checked_date", sqlDate(parseChecked(row.cell.Checked))],
    ["age_min", sqlInt(ages?.min ?? null)],
    ["age_max", sqlInt(ages?.max ?? null)],
    ["age_min_inclusive", ages ? "true" : "null"],
    ["age_max_inclusive", ages?.max != null ? "true" : "null"],
    ["notes", sqlText(notes)],
    ["publication_state", publication(row.approved)],
    ["published_at", publishedAt(row.approved)],
  ]);
}

function researchNotes(group: KeptRow[]): string | null {
  const phone = agreed(group.map((row) => row.cell.Phone));
  const email = agreed(group.map((row) => row.cell.Email));
  const blocks = group.map((row) => {
    const lines = [
      row.cell["#"] ? `# ${row.cell["#"]}` : "",
      row.cell.Status ? `Status: ${row.cell.Status}` : "",
      row.cell.Missing ? `Missing: ${row.cell.Missing}` : "",
      row.cell["Your decision"] ? `Your decision: ${row.cell["Your decision"]}` : "",
      !phone && row.cell.Phone ? `Phone: ${row.cell.Phone}` : "",
      !email && row.cell.Email ? `Email: ${row.cell.Email}` : "",
      row.cell["Register link"] && !isHttpUrl(row.cell["Register link"]) ? `Register link: ${row.cell["Register link"]}` : "",
      !isHttpUrl(row.cell.Source) && row.cell.Source ? `Source: ${row.cell.Source}` : "",
      row.cell.Checked && !parseChecked(row.cell.Checked) ? `Checked: ${row.cell.Checked}` : "",
    ].filter(Boolean);
    return lines.length ? `${row.breakName}: ${lines.join("; ")}` : "";
  }).filter(Boolean);
  return blocks.length ? blocks.join("\n") : null;
}

function agreedAges(group: KeptRow[]): { min: number; max: number | null } | null {
  const raw = group.map((row) => row.cell.Ages.trim());
  if (raw.some((value) => !value) || raw.some((value) => value !== raw[0])) return null;
  return parseAges(raw[0]);
}

function upsert(table: string, pairs: Array<[string, string]>): string {
  const columns = pairs.map(([column]) => column);
  const values = pairs.map(([, value]) => value);
  const updates = columns.filter((column) => column !== "id").map((column) => {
    if (column === "published_at") {
      return `  published_at = case
    when excluded.publication_state = 'published'::public.publication_state
      then coalesce(public.${table}.published_at, timezone('utc', now()))
    else null
  end`;
    }
    return `  ${column} = excluded.${column}`;
  });
  updates.push("  updated_at = timezone('utc', now())");
  return `insert into public.${table} (
${columns.map((column) => `  ${column}`).join(",\n")}
) values (
${values.map((value) => `  ${value}`).join(",\n")}
)
on conflict (id) do update set
${updates.join(",\n")};`;
}

function publication(approved: boolean): string {
  return approved
    ? "'published'::public.publication_state"
    : "'draft'::public.publication_state";
}

function publishedAt(approved: boolean): string {
  return approved ? "timezone('utc', now())" : "null";
}

function tri(value: "yes" | "no" | "unknown"): string {
  return `'${value}'::public.confirmed_tri_state`;
}

function feeText(price: string, notes: string, structured: boolean): string | null {
  const parts = [structured ? "" : price.trim(), notes.trim()].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function labeled(label: string, value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  return `${label}: ${/[.!?]$/.test(text) ? text : `${text}.`}`;
}

function joinNotes(parts: Array<string | null>): string | null {
  const notes = parts.filter((part): part is string => Boolean(part));
  return notes.length ? notes.join(" ") : null;
}

function agreed(values: string[]): string | null {
  const filled = values.map((value) => value.trim()).filter(Boolean);
  if (!filled.length) return null;
  return filled.every((value) => value === filled[0]) ? filled[0] : null;
}

function statedOnEveryRow(values: string[]): string | null {
  const trimmed = values.map((value) => value.trim());
  if (trimmed.some((value) => !value)) return null;
  return trimmed.every((value) => value === trimmed[0]) ? trimmed[0] : null;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function realDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseChecked(cell: string): string | null {
  const text = cell.trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return realDate(+iso[1], +iso[2], +iso[3]);
  const named = new RegExp(`^(${MONTH_PATTERN})\\s+(\\d{1,2}),\\s*(\\d{4})$`, "i").exec(text);
  if (named) return realDate(+named[3], MONTHS[named[1].toLowerCase()], +named[2]);
  const dayFirst = new RegExp(`^(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(\\d{4})$`, "i").exec(text);
  if (dayFirst) return realDate(+dayFirst[3], MONTHS[dayFirst[2].toLowerCase()], +dayFirst[1]);
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!slash) return null;
  const a = +slash[1];
  const b = +slash[2];
  const year = +slash[3];
  if (a > 12 && b <= 12) return realDate(year, b, a);
  if (b > 12 && a <= 12) return realDate(year, a, b);
  return null;
}

function parseDateRange(cell: string): { start: string; end: string } | null {
  const text = cell.trim();
  if (!text) return null;
  const isoRange = /^(\d{4}-\d{2}-\d{2})\s*(?:to|[-–—])\s*(\d{4}-\d{2}-\d{2})$/i.exec(text);
  if (isoRange) {
    const start = parseChecked(isoRange[1]);
    const end = parseChecked(isoRange[2]);
    if (start && end && start <= end) return { start, end };
    return null;
  }
  const single = parseChecked(text);
  if (single) return { start: single, end: single };
  const sameMonth = new RegExp(
    `^(${MONTH_PATTERN})\\s+(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2}),\\s*(\\d{4})$`,
    "i",
  ).exec(text);
  if (sameMonth) {
    const month = MONTHS[sameMonth[1].toLowerCase()];
    const start = realDate(+sameMonth[4], month, +sameMonth[2]);
    const end = realDate(+sameMonth[4], month, +sameMonth[3]);
    if (start && end && start <= end) return { start, end };
    return null;
  }
  const cross = new RegExp(
    `^(${MONTH_PATTERN})\\s+(\\d{1,2}),\\s*(\\d{4})\\s*(?:to|[-–—])\\s*(${MONTH_PATTERN})\\s+(\\d{1,2}),\\s*(\\d{4})$`,
    "i",
  ).exec(text);
  if (!cross) return null;
  const start = realDate(+cross[3], MONTHS[cross[1].toLowerCase()], +cross[2]);
  const end = realDate(+cross[6], MONTHS[cross[4].toLowerCase()], +cross[5]);
  if (start && end && start <= end) return { start, end };
  return null;
}

function clock12(hourText: string, minuteText: string | undefined, ampm: string): string | null {
  const hour = Number(hourText);
  const minute = minuteText == null || minuteText === "" ? 0 : Number(minuteText);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  let hour24 = hour % 12;
  if (ampm.toLowerCase() === "pm") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseClockRange(cell: string): { start: string; end: string } | null {
  const text = cell.trim();
  const twelve = new RegExp(`^${TIME_12}${RANGE_SEP}${TIME_12}$`, "i").exec(text);
  if (twelve) {
    const start = clock12(twelve[1], twelve[2], twelve[3]);
    const end = clock12(twelve[4], twelve[5], twelve[6]);
    if (start && end) return { start, end };
    return null;
  }
  const twentyFour = new RegExp(String.raw`^([01]?\d|2[0-3]):([0-5]\d)${RANGE_SEP}([01]?\d|2[0-3]):([0-5]\d)$`, "i").exec(text);
  if (!twentyFour) return null;
  return {
    start: `${twentyFour[1].padStart(2, "0")}:${twentyFour[2]}`,
    end: `${twentyFour[3].padStart(2, "0")}:${twentyFour[4]}`,
  };
}

type Care = {
  offered: "yes" | "no" | "unknown";
  start: string | null;
  end: string | null;
  separate: "yes" | "no" | "unknown";
  keepRaw: boolean;
};

function parseCare(cell: string): Care {
  const text = cell.trim();
  const unknown: Care = { offered: "unknown", start: null, end: null, separate: "unknown", keepRaw: false };
  if (!text) return unknown;
  if (/^(yes|y|offered|available)$/i.test(text)) return { ...unknown, offered: "yes" };
  if (/^(no|n|none|not offered)$/i.test(text)) return { ...unknown, offered: "no" };
  if (/^(included|included in (?:the )?price)$/i.test(text)) return { ...unknown, offered: "yes", separate: "no" };
  if (/^(extra|additional fee|additional cost)$/i.test(text)) return { ...unknown, offered: "yes", separate: "yes" };
  const range = parseClockRange(text);
  if (range) return { offered: "yes", start: range.start, end: range.end, separate: "unknown", keepRaw: false };
  const noted = /^(.+?)\s*,\s*(included|extra|additional fee)$/i.exec(text);
  if (noted) {
    const times = parseClockRange(noted[1]);
    if (times) {
      return {
        offered: "yes",
        start: times.start,
        end: times.end,
        separate: /included/i.test(noted[2]) ? "no" : "yes",
        keepRaw: false,
      };
    }
  }
  return { ...unknown, keepRaw: true };
}

function parsePrice(cell: string): { amount: string; unit: "per_day" | "per_week" | "per_session"; currency: "CAD" } | null {
  const text = cell.trim();
  const match = /^(?:CAD\s*\$?|\$)(\d+(?:\.\d{1,2})?)\s*(?:\/|per|a)\s*(day|week|session)$/i.exec(text)
    ?? /^(\d+(?:\.\d{1,2})?)\s*CAD\s*(?:\/|per|a)\s*(day|week|session)$/i.exec(text);
  if (!match) return null;
  const unit = match[2].toLowerCase();
  const units = { day: "per_day", week: "per_week", session: "per_session" } as const;
  if (!(unit in units)) return null;
  return { amount: match[1], unit: units[unit as keyof typeof units], currency: "CAD" };
}

function parseAges(cell: string): { min: number; max: number | null } | null {
  const text = cell.trim();
  const range = /^(?:ages?\s+)?(\d{1,2})\s*(?:[-–—]|to)\s*(\d{1,2})$/i.exec(text);
  if (range) {
    const min = +range[1];
    const max = +range[2];
    if (min <= max && min >= 0) return { min, max };
    return null;
  }
  const plus = /^(\d{1,2})\+$/.exec(text);
  if (!plus) return null;
  return { min: +plus[1], max: null };
}

function parseRegistration(cell: string): { status: string; keepRaw: boolean } {
  const text = cell.trim();
  if (!text) return { status: "availability_unknown", keepRaw: false };
  const status = REGISTRATION[text.toLowerCase()];
  if (!status) return { status: "availability_unknown", keepRaw: true };
  return { status, keepRaw: false };
}

function sqlText(value: string | null): string {
  if (value == null || value === "") return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlDate(value: string | null): string {
  if (value == null) return "null";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new IntakeImportError("Refusing to write a date that is not YYYY-MM-DD.");
  return `'${value}'::date`;
}

function sqlTime(value: string | null): string {
  if (value == null) return "null";
  if (!/^\d{2}:\d{2}$/.test(value)) throw new IntakeImportError("Refusing to write a time that is not HH:MM.");
  return `'${value}'::time`;
}

function sqlInt(value: number | null): string {
  if (value == null) return "null";
  if (!Number.isInteger(value) || value < 0) throw new IntakeImportError("Refusing to write an age that is not a whole number.");
  return String(value);
}

function sqlNumber(value: string): string {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new IntakeImportError("Refusing to write a price that is not a number.");
  return value;
}
