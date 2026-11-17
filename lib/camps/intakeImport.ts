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
 * - Ages → session age_min/age_max for a clear range or "N+". An en dash or
 *   em dash counts as a hyphen. Program typical ages are set only when every
 *   break states that same range. Any other wording stays in the session notes.
 * - Venue → venues.name. No venue row when the cell is empty.
 * - Area → venues.neighbourhood. Not a city, and not a map pin.
 * - Dates → camp_sessions.timing_label, as written. start_date is the first
 *   day and end_date is the last day when every range is in one year.
 * - Single days? → session notes. Not a schedule type.
 * - Hours → the "Full day" range, or the first range if none is labelled.
 *   "9:00–4:00" is 9:00 am–4:00 pm. The full cell stays in the notes when it
 *   says more than that one range.
 * - Before care / After care → the tri-state columns only for an exact
 *   yes/no/included/extra, or one clock range. Otherwise notes, and the
 *   columns stay unknown.
 * - Price → the "Full day" amount, or the first amount. "$350 a week + tax"
 *   is 350 per week. A cell with more than one price keeps its full text in fee notes.
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
 * - Checked → source_checked_date for YYYY-MM-DD, including a sheet time
 *   suffix. A slash date is stored only when the day and month cannot be swapped.
 * - Inclusion → camp_programs.support_info
 * - #, Status, Missing, Your decision, and any Source/Checked cell that is
 *   not a URL or a date → providers.research_notes (the camp page does not read it)
 * - A cell containing "(check)", "?", or "confirming" is a research note.
 *   It is not loaded as a value.
 * - Spots → not loaded. camp_session_spots and seat_availability stay untouched.
 * - A checklist camp that matches a hand-written winter seed by provider name,
 *   website domain, or source URL reuses that seed's ids.
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

export type IntakeMatch = {
  rowNumber: number;
  camp: string;
  hits: Array<{ label: string; by: string }>;
  reused: boolean;
};

export type IntakeCoverage = {
  rowNumber: number;
  camp: string;
  breakName: string;
  ages: CoverageKind;
  dates: CoverageKind;
  hours: CoverageKind;
  price: CoverageKind;
  registrationLink: CoverageKind;
};

export type CoverageKind = "field" | "notes" | "empty" | "research note";

export type IntakeSummary = {
  rowsRead: number;
  published: number;
  unpublished: number;
  skipped: IntakeSkip[];
  matches: IntakeMatch[];
  coverage: IntakeCoverage[];
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

export type SeedCamp = {
  providerId: string;
  providerName: string;
  programId: string;
  programSlug: string;
  programName: string;
  venueId: string;
  venueName: string;
  sessionIds: string[];
  domains: string[];
  urls: string[];
};

/** Hand-written winter camps in supabase/seeds/camps. A checklist match updates these ids. */
export const WINTER_SEED_CAMPS: SeedCamp[] = [
  {
    providerId: "prov-gymnastics-mississauga",
    providerName: "Gymnastics Mississauga",
    programId: "MSC-0046",
    programSlug: "gymnastics-mississauga-holiday-camp",
    programName: "Holiday Gym Camp",
    venueId: "venue-gymnastics-mississauga-rose-cherry",
    venueName: "Gymnastics Mississauga (Paramount Fine Food Centre)",
    sessionIds: ["MSC-0046-winter-2026-27"],
    domains: ["gymmississauga.org"],
    urls: ["https://gymmississauga.org/", "https://gymmississauga.org/winter-camps/"],
  },
  {
    providerId: "prov-ymca-gta",
    providerName: "YMCA of Greater Toronto",
    programId: "MSC-0049",
    programSlug: "ymca-mississauga-winter-break-day-camp",
    programName: "Winter Break Day Camp (Variety)",
    venueId: "venue-mississauga-ymca",
    venueName: "Mississauga YMCA",
    sessionIds: ["MSC-0049-2026-12-21", "MSC-0049-2026-12-29"],
    domains: ["ymcagta.org"],
    urls: [
      "https://www.ymcagta.org/",
      "https://www.ymcagta.org/camps-and-outdoor-education/winter-and-march-break-day-camp",
      "https://anc.ca.apm.activecommunities.com/ymcagta/activity/search/detail/115093?onlineSiteId=0&locale=en-US&from_original_cui=true",
    ],
  },
  {
    providerId: "prov-magnitude-kids-centre",
    providerName: "Magnitude Kids Centre",
    programId: "MSC-0081",
    programSlug: "magnitude-holiday-camp",
    programName: "Holiday Camp",
    venueId: "venue-magnitude-kitimat",
    venueName: "Magnitude Kids Centre",
    sessionIds: ["MSC-0081-2026-12-21"],
    domains: ["magnitudewell.ca"],
    urls: ["https://www.magnitudewell.ca/", "https://www.magnitudewell.ca/holiday", "https://www.magnitudewell.ca/holiday/p/holiday-camp"],
  },
  {
    providerId: "prov-futures-gymnastics",
    providerName: "Futures Gymnastics",
    programId: "MSC-0285",
    programSlug: "futures-gymnastics-winter-camp",
    programName: "Winter Gymnastics Camp",
    venueId: "venue-futures-gymnastics-millcreek",
    venueName: "Futures Gymnastics",
    sessionIds: ["MSC-0285-2026-12-21", "MSC-0285-2026-12-28"],
    domains: ["futuresgymnastics.com"],
    urls: [
      "https://futuresgymnastics.com/",
      "https://futuresgymnastics.com/pages/upcoming-camps.html",
      "https://portal.iclasspro.com/futures/camps/135?sortBy=time",
    ],
  },
  {
    providerId: "prov-cooksmart",
    providerName: "COOKSMART",
    programId: "MSC-0381",
    programSlug: "cooksmart-winter-holiday-cooking-camp",
    programName: "Winter Holiday Cooking Camp",
    venueId: "venue-cooksmart-clarkson",
    venueName: "COOKSMART Clarkson",
    sessionIds: [
      "MSC-0381-2026-12-21-full",
      "MSC-0381-2026-12-28-full",
      "MSC-0381-2026-12-21-half",
      "MSC-0381-2026-12-28-half",
    ],
    domains: ["cooksmart.ca", "cooksmartscheduling.as.me"],
    urls: [
      "https://www.cooksmart.ca/",
      "https://www.cooksmart.ca/programs/camps-hub/winter-camp",
      "https://cooksmartscheduling.as.me/schedule/7b98e4f9/?appointmentTypeIds[]=99733065",
      "https://cooksmartscheduling.as.me/schedule/7b98e4f9/?appointmentTypeIds[]=99732924",
    ],
  },
];

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

const TIME_ANY = String.raw`(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?`;
const RANGE_SEP = String.raw`\s*(?:to|-)\s*`;

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
  lines.push(`matched: ${summary.matches.length}`);
  for (const match of summary.matches) {
    const hits = match.hits.map((hit) => `${hit.label} by ${hit.by}`).join("; ");
    lines.push(`- row ${match.rowNumber} ${match.camp} → ${hits}${match.reused ? "" : " (not reused)"}`);
  }
  lines.push("coverage:");
  for (const row of summary.coverage) {
    lines.push(
      `- row ${row.rowNumber} ${row.camp} / ${row.breakName}: ages ${row.ages}, dates ${row.dates}, hours ${row.hours}, price ${row.price}, registration link ${row.registrationLink}`,
    );
  }
  lines.push("spots column: not loaded");
  return lines.join("\n");
}

export function importIntake(csv: string, seeds: readonly SeedCamp[] = WINTER_SEED_CAMPS): IntakeImport {
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
    if (isResearchNote(camp) || isResearchNote(breakName)) {
      skipped.push({
        rowNumber,
        reason: isResearchNote(camp) ? "camp name is a research note" : "break is a research note",
      });
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
      approved: !isResearchNote(cell["Your decision"]) && cell["Your decision"].startsWith("Approved"),
      cell,
    });
  });

  const matches = matchCamps(kept, seeds);
  const summary: IntakeSummary = {
    rowsRead: data.length,
    published: kept.filter((row) => row.approved).length,
    unpublished: kept.filter((row) => !row.approved).length,
    skipped,
    matches: matches.reports,
    coverage: kept.filter((row) => row.approved).map(coverageFor),
  };
  return { sql: renderSql(kept, matches.bySlug), summary, summaryText: formatIntakeSummary(summary) };
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

function renderSql(rows: KeptRow[], matchBySlug: Map<string, SeedCamp | null>): string {
  const byCamp = new Map<string, { rows: KeptRow[]; seed: SeedCamp | null }>();
  for (const row of rows) {
    const seed = matchBySlug.get(row.campSlug) ?? null;
    const key = seed ? `seed:${seed.programId}` : `new:${row.campSlug}`;
    const group = byCamp.get(key) ?? { rows: [], seed };
    group.rows.push(row);
    byCamp.set(key, group);
  }
  const camps = [...byCamp.keys()].sort();
  const statements: string[] = [];
  for (const key of camps) {
    const { rows: group, seed } = byCamp.get(key)!;
    const approved = group.some((row) => row.approved);
    statements.push(providerSql(group, approved, seed));
    for (const venue of venuesFor(group, seed)) statements.push(venue.statement);
    statements.push(programSql(group, approved, seed));
    const sessions = [...group].sort((a, b) => a.breakSlug.localeCompare(b.breakSlug) || a.rowNumber - b.rowNumber);
    const seenSession = new Set<string>();
    for (const row of sessions) {
      const id = sessionIdFor(row, group, seed);
      if (seenSession.has(id)) continue;
      seenSession.add(id);
      statements.push(sessionSql(row, group, seed));
    }
  }
  return [
    "-- Checklist import. Generated by npm run camps:import.",
    "-- Run this yourself in the Supabase SQL editor. The app does not run it.",
    "-- Upserts intake rows in providers, venues, camp_programs, and camp_sessions.",
    "-- Does not remove rows and does not write spot counts.",
    "-- New ids are intake-{camp slug} and intake-{camp slug}--{break slug}.",
    "-- A camp that matches a hand-written winter seed reuses that seed's ids.",
    "-- Approved rows are published. Every other row stays a draft.",
    "begin;",
    ...statements,
    "commit;",
    "",
  ].join("\n");
}

function providerSql(group: KeptRow[], approved: boolean, seed: SeedCamp | null): string {
  const first = group[0];
  const source = agreed(group.map((row) => (isHttpUrl(shown(row, "Source")) ? shown(row, "Source") : "")));
  const checked = agreed(group.map((row) => parseChecked(shown(row, "Checked")) ?? ""));
  const register = agreed(group.map((row) => (isHttpUrl(shown(row, "Register link")) ? shown(row, "Register link") : "")));
  return upsert("providers", [
    ["id", sqlText(seed?.providerId ?? `intake-${first.campSlug}`)],
    ["name", sqlText(first.camp)],
    nullable("registration_info_url", sqlText(register), seed),
    nullable("contact_email", sqlText(agreed(group.map((row) => shown(row, "Email")))), seed),
    nullable("contact_phone", sqlText(agreed(group.map((row) => shown(row, "Phone")))), seed),
    nullable("source_url", sqlText(source), seed),
    nullable("source_checked_date", sqlDate(checked), seed),
    nullable("research_notes", sqlText(researchNotes(group)), seed),
    ["publication_state", publication(approved)],
    ["published_at", publishedAt(approved), "publish"],
  ]);
}

function programSql(group: KeptRow[], approved: boolean, seed: SeedCamp | null): string {
  const first = group[0];
  const programName = statedOnEveryRow(group.map((row) => shown(row, "Program name")));
  const ages = agreedAges(group);
  const name: SqlPair = programName
    ? ["name", sqlText(programName)]
    : seed
      ? ["name", sqlText(seed.programName), "keep"]
      : ["name", sqlText(first.camp)];
  return upsert("camp_programs", [
    ["id", sqlText(seed?.programId ?? `intake-${first.campSlug}`)],
    ["slug", sqlText(seed?.programSlug ?? `intake-${first.campSlug}`), seed ? "keep" : "set"],
    ["provider_id", sqlText(seed?.providerId ?? `intake-${first.campSlug}`)],
    name,
    nullable("description", sqlText(statedOnEveryRow(group.map((row) => shown(row, "What kids do")))), seed),
    nullable("primary_category", sqlText(statedOnEveryRow(group.map((row) => shown(row, "Category")))), seed),
    nullable("typical_age_min", sqlInt(ages?.min ?? null), seed),
    nullable("typical_age_max", sqlInt(ages?.max ?? null), seed),
    nullable("typical_age_min_inclusive", ages ? "true" : "null", seed),
    nullable("typical_age_max_inclusive", ages?.max != null ? "true" : "null", seed),
    nullable("support_info", sqlText(statedOnEveryRow(group.map((row) => shown(row, "Inclusion")))), seed),
    nullable("policies_summary", sqlText(statedOnEveryRow(group.map((row) => shown(row, "Refunds")))), seed),
    nullable("preparation_notes", sqlText(statedOnEveryRow(group.map((row) => shown(row, "What to bring")))), seed),
    ["publication_state", publication(approved)],
    ["published_at", publishedAt(approved), "publish"],
  ]);
}

type VenuePlan = { id: string; statement: string; matches: (row: KeptRow) => boolean };

function venuesFor(group: KeptRow[], seed: SeedCamp | null): VenuePlan[] {
  const buckets = new Map<string, KeptRow[]>();
  for (const row of group) {
    const name = shown(row, "Venue");
    if (!name) continue;
    const key = `${name}\n${shown(row, "Area")}`;
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }
  if (buckets.size === 0 && seed) {
    const approved = group.some((row) => row.approved);
    return [{
      id: seed.venueId,
      matches: () => true,
      statement: upsert("venues", [
        ["id", sqlText(seed.venueId)],
        ["name", sqlText(seed.venueName), "keep"],
        nullable("neighbourhood", "null", seed),
        ["publication_state", publication(approved)],
        ["published_at", publishedAt(approved), "publish"],
      ]),
    }];
  }
  const used = new Set<string>();
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, rows], index) => {
    const name = shown(rows[0], "Venue");
    const area = shown(rows[0], "Area");
    let id = seed && buckets.size === 1
      ? seed.venueId
      : `intake-${rows[0].campSlug}--${slugify(name) || "venue"}`;
    if (!seed || buckets.size !== 1) {
      if (area && slugify(area)) id += `--${slugify(area)}`;
      if (used.has(id)) id += `--${index + 1}`;
    }
    used.add(id);
    const approved = rows.some((row) => row.approved);
    const namePair: SqlPair = seed && id === seed.venueId ? ["name", sqlText(name)] : ["name", sqlText(name)];
    return {
      id,
      matches: (row) => shown(row, "Venue") === name && shown(row, "Area") === area,
      statement: upsert("venues", [
        ["id", sqlText(id)],
        namePair,
        nullable("neighbourhood", sqlText(area || null), seed && id === seed.venueId ? seed : null),
        ["publication_state", publication(approved)],
        ["published_at", publishedAt(approved), "publish"],
      ]),
    };
  });
}

function venueIdFor(row: KeptRow, group: KeptRow[], seed: SeedCamp | null): string | null {
  const plans = venuesFor(group, seed);
  if (!shown(row, "Venue")) return seed ? plans[0]?.id ?? seed.venueId : null;
  return plans.find((venue) => venue.matches(row))?.id ?? null;
}

function sessionSql(row: KeptRow, group: KeptRow[], seed: SeedCamp | null): string {
  const venueId = venueIdFor(row, group, seed);
  const ages = parseAges(shown(row, "Ages"));
  const hours = parseHoursCell(shown(row, "Hours"));
  const dates = parseDateRange(shown(row, "Dates"));
  const before = parseCare(shown(row, "Before care"));
  const after = parseCare(shown(row, "After care"));
  const price = parsePrice(shown(row, "Price"));
  const registration = parseRegistration(shown(row, "Registration"));
  const shared = (column: (typeof INTAKE_COLUMNS)[number]) =>
    statedOnEveryRow(group.map((item) => shown(item, column)));
  const onlyWhenSplit = (column: (typeof INTAKE_COLUMNS)[number]) => (shared(column) ? "" : shown(row, column));
  const notes = joinNotes([
    labeled("Break", row.breakName),
    labeled("Program name", onlyWhenSplit("Program name")),
    labeled("What kids do", onlyWhenSplit("What kids do")),
    labeled("Category", onlyWhenSplit("Category")),
    labeled("Area", venueId ? "" : shown(row, "Area")),
    labeled("Single days", shown(row, "Single days?")),
    labeled("Hours", hours && !hours.keepFullText ? "" : shown(row, "Hours")),
    labeled("Ages", ages ? "" : shown(row, "Ages")),
    labeled("Before care", before.keepRaw ? shown(row, "Before care") : ""),
    labeled("After care", after.keepRaw ? shown(row, "After care") : ""),
    labeled("Registration", registration.keepRaw ? shown(row, "Registration") : ""),
    labeled("What to bring", onlyWhenSplit("What to bring")),
    labeled("Food", shown(row, "Food")),
    labeled("Refunds", onlyWhenSplit("Refunds")),
    labeled("Staff", shown(row, "Staff")),
    labeled("Inclusion", onlyWhenSplit("Inclusion")),
    labeled("Trips", shown(row, "Trips")),
    labeled("Parking", shown(row, "Parking")),
  ]);
  const breakOnly = notes === labeled("Break", row.breakName);
  const careStated = (cell: string, care: Care) => Boolean(cell) && !care.keepRaw;
  const registrationStated = Boolean(shown(row, "Registration")) && !registration.keepRaw;
  return upsert("camp_sessions", [
    ["id", sqlText(sessionIdFor(row, group, seed))],
    ["program_id", sqlText(seed?.programId ?? `intake-${row.campSlug}`)],
    nullable("venue_id", sqlText(venueId), seed),
    nullable("start_date", sqlDate(dates?.start ?? null), seed),
    nullable("end_date", sqlDate(dates?.end ?? null), seed),
    nullable("timing_label", sqlText(shown(row, "Dates") || null), seed),
    nullable("core_hours_start", sqlTime(hours?.start ?? null), seed),
    nullable("core_hours_end", sqlTime(hours?.end ?? null), seed),
    triPair("before_care_offered", before.offered, careStated(shown(row, "Before care"), before), seed),
    nullable("before_care_start_time", sqlTime(before.start), seed),
    nullable("before_care_end_time", sqlTime(before.end), seed),
    triPair("before_care_separate_booking", before.separate, careStated(shown(row, "Before care"), before), seed),
    triPair("after_care_offered", after.offered, careStated(shown(row, "After care"), after), seed),
    nullable("after_care_start_time", sqlTime(after.start), seed),
    nullable("after_care_end_time", sqlTime(after.end), seed),
    triPair("after_care_separate_booking", after.separate, careStated(shown(row, "After care"), after), seed),
    nullable("price_amount", price ? sqlNumber(price.amount) : "null", seed),
    nullable("price_unit", price ? `'${price.unit}'::public.price_unit` : "null", seed),
    nullable("currency", price ? `'${price.currency}'::public.camp_currency` : "null", seed),
    nullable("fee_notes", sqlText(feeText(shown(row, "Price"), shown(row, "Fee notes"), price)), seed),
    ["registration_status", `'${registration.status}'::public.camp_registration_status`, seed && !registrationStated ? "registration" : "set"],
    nullable("registration_url", sqlText(isHttpUrl(shown(row, "Register link")) ? shown(row, "Register link") : null), seed),
    nullable("source_url", sqlText(isHttpUrl(shown(row, "Source")) ? shown(row, "Source") : null), seed),
    nullable("source_checked_date", sqlDate(parseChecked(shown(row, "Checked"))), seed),
    nullable("age_min", sqlInt(ages?.min ?? null), seed),
    nullable("age_max", sqlInt(ages?.max ?? null), seed),
    nullable("age_min_inclusive", ages ? "true" : "null", seed),
    nullable("age_max_inclusive", ages?.max != null ? "true" : "null", seed),
    ["notes", sqlText(notes), seed && breakOnly ? "keep" : "set"],
    ["publication_state", publication(row.approved)],
    ["published_at", publishedAt(row.approved), "publish"],
  ]);
}

function researchNotes(group: KeptRow[]): string | null {
  const phone = agreed(group.map((row) => shown(row, "Phone")));
  const email = agreed(group.map((row) => shown(row, "Email")));
  const blocks = group.map((row) => {
    const withheld = INTAKE_COLUMNS.filter((name) => name !== "Spots" && isResearchNote(row.cell[name]))
      .map((name) => `${name}: ${row.cell[name]}`);
    const lines = [
      ...withheld,
      shown(row, "#") ? `# ${shown(row, "#")}` : "",
      shown(row, "Status") ? `Status: ${shown(row, "Status")}` : "",
      shown(row, "Missing") ? `Missing: ${shown(row, "Missing")}` : "",
      shown(row, "Your decision") ? `Your decision: ${shown(row, "Your decision")}` : "",
      !phone && shown(row, "Phone") ? `Phone: ${shown(row, "Phone")}` : "",
      !email && shown(row, "Email") ? `Email: ${shown(row, "Email")}` : "",
      shown(row, "Register link") && !isHttpUrl(shown(row, "Register link")) ? `Register link: ${shown(row, "Register link")}` : "",
      !isHttpUrl(shown(row, "Source")) && shown(row, "Source") ? `Source: ${shown(row, "Source")}` : "",
      shown(row, "Checked") && !parseChecked(shown(row, "Checked")) ? `Checked: ${shown(row, "Checked")}` : "",
    ].filter(Boolean);
    return lines.length ? `${row.breakName}: ${lines.join("; ")}` : "";
  }).filter(Boolean);
  return blocks.length ? blocks.join("\n") : null;
}

function agreedAges(group: KeptRow[]): { min: number; max: number | null } | null {
  const raw = group.map((row) => shown(row, "Ages").trim());
  if (raw.some((value) => !value) || raw.some((value) => value !== raw[0])) return null;
  return parseAges(raw[0]);
}

type UpdateMode = "set" | "coalesce" | "keep" | "publish" | "tri" | "registration";
type SqlPair = [string, string, UpdateMode?];

function nullable(column: string, value: string, seed: SeedCamp | null): SqlPair {
  return [column, value, seed ? "coalesce" : "set"];
}

function triPair(column: string, value: Care["offered"], stated: boolean, seed: SeedCamp | null): SqlPair {
  return [column, tri(value), seed && !stated ? "tri" : "set"];
}

function upsert(table: string, pairs: SqlPair[]): string {
  const columns = pairs.map(([column]) => column);
  const values = pairs.map(([, value]) => value);
  const updates = pairs.filter(([column]) => column !== "id").map(([column, , mode = "set"]) => {
    if (mode === "publish" || column === "published_at") {
      return `  published_at = case
    when excluded.publication_state = 'published'::public.publication_state
      then coalesce(public.${table}.published_at, timezone('utc', now()))
    else null
  end`;
    }
    if (mode === "keep") return `  ${column} = public.${table}.${column}`;
    if (mode === "coalesce") return `  ${column} = coalesce(excluded.${column}, public.${table}.${column})`;
    if (mode === "tri") {
      return `  ${column} = coalesce(nullif(excluded.${column}, 'unknown'::public.confirmed_tri_state), public.${table}.${column})`;
    }
    if (mode === "registration") {
      return `  ${column} = coalesce(nullif(excluded.${column}, 'availability_unknown'::public.camp_registration_status), public.${table}.${column})`;
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

function feeText(price: string, notes: string, parsed: { keepFullText: boolean } | null): string | null {
  const parts = [!parsed || parsed.keepFullText ? price.trim() : "", notes.trim()].filter(Boolean);
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

function shown(row: KeptRow, column: (typeof INTAKE_COLUMNS)[number]): string {
  return isResearchNote(row.cell[column]) ? "" : row.cell[column];
}

function isResearchNote(value: string): boolean {
  return /\(check\)/i.test(value) || value.includes("?") || /\bconfirming\b/i.test(value);
}

function dashesToHyphen(value: string): string {
  return value.replace(/[\u2013\u2014]/g, "-");
}

function sessionIdFor(row: KeptRow, group: KeptRow[], seed: SeedCamp | null): string {
  if (seed && seed.sessionIds.length === 1 && group.length === 1) return seed.sessionIds[0];
  if (seed) return `${seed.programId}--${row.breakSlug}`;
  return `intake-${row.campSlug}--${row.breakSlug}`;
}

function normName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function namesMatch(checklist: string, seed: string): boolean {
  const left = normName(checklist);
  const right = normName(seed);
  if (!left || !right) return false;
  if (left === right) return true;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  return shorter.length >= 4 && longer.startsWith(`${shorter} `);
}

function canonicalUrl(value: string): string | null {
  if (!isHttpUrl(value)) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return `${host}${url.pathname.replace(/\/$/, "")}${url.search}`.toLowerCase();
  } catch {
    return null;
  }
}

function domainOf(value: string): string | null {
  if (!isHttpUrl(value)) return null;
  try {
    return new URL(value.trim()).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchCamps(rows: KeptRow[], seeds: readonly SeedCamp[]): { bySlug: Map<string, SeedCamp | null>; reports: IntakeMatch[] } {
  const bySlug = new Map<string, SeedCamp | null>();
  const reports: IntakeMatch[] = [];
  for (const slug of [...new Set(rows.map((row) => row.campSlug))]) {
    const group = rows.filter((row) => row.campSlug === slug);
    const first = group[0];
    const names = [first.camp, ...group.map((row) => shown(row, "Program name"))].filter(Boolean);
    const urls = group.flatMap((row) => [shown(row, "Source"), shown(row, "Register link")]).filter(isHttpUrl);
    const checklistUrls = new Set(urls.map(canonicalUrl).filter((url): url is string => Boolean(url)));
    const checklistDomains = new Set(urls.map(domainOf).filter((domain): domain is string => Boolean(domain)));
    const hits = seeds.flatMap((seed) => {
      const reasons: string[] = [];
      if (names.some((name) => namesMatch(name, seed.providerName))) reasons.push("provider name");
      const seedUrls = new Set(seed.urls.map(canonicalUrl).filter((url): url is string => Boolean(url)));
      if ([...checklistUrls].some((url) => seedUrls.has(url))) reasons.push("source URL");
      const domain = [...checklistDomains].find((item) => seed.domains.includes(item));
      if (domain) reasons.push(`website domain ${domain}`);
      return reasons.length ? [{ seed, by: reasons.join(" and ") }] : [];
    });
    bySlug.set(slug, hits.length === 1 ? hits[0].seed : null);
    if (hits.length) {
      reports.push({
        rowNumber: first.rowNumber,
        camp: first.camp,
        hits: hits.map((hit) => ({
          label: `${hit.seed.providerName} (${hit.seed.providerId} / ${hit.seed.programId})`,
          by: hit.by,
        })),
        reused: hits.length === 1,
      });
    }
  }
  return { bySlug, reports };
}

function coverageKind(original: string, parsed: boolean): CoverageKind {
  if (isResearchNote(original)) return "research note";
  if (!original.trim()) return "empty";
  return parsed ? "field" : "notes";
}

function coverageFor(row: KeptRow): IntakeCoverage {
  return {
    rowNumber: row.rowNumber,
    camp: row.camp,
    breakName: row.breakName,
    ages: coverageKind(row.cell.Ages, parseAges(shown(row, "Ages")) != null),
    dates: coverageKind(row.cell.Dates, parseDateRange(shown(row, "Dates")) != null),
    hours: coverageKind(row.cell.Hours, parseHoursCell(shown(row, "Hours")) != null),
    price: coverageKind(row.cell.Price, parsePrice(shown(row, "Price")) != null),
    registrationLink: coverageKind(row.cell["Register link"], isHttpUrl(shown(row, "Register link"))),
  };
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
  const text = dashesToHyphen(cell.trim());
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)?$/.exec(text);
  if (iso) return realDate(+iso[1], +iso[2], +iso[3]);
  const ymdSlash = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (ymdSlash) return realDate(+ymdSlash[1], +ymdSlash[2], +ymdSlash[3]);
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
  const text = dashesToHyphen(cell.trim());
  if (!text) return null;
  const exact = parseExactDateRange(text);
  if (exact) return exact;
  return parseLooseDateRange(text);
}

function parseExactDateRange(text: string): { start: string; end: string } | null {
  const isoRange = /^(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})$/i.exec(text);
  if (isoRange) {
    const start = parseChecked(isoRange[1]);
    const end = parseChecked(isoRange[2]);
    if (start && end && start <= end) return { start, end };
    return null;
  }
  const single = parseChecked(text);
  if (single) return { start: single, end: single };
  const sameMonth = new RegExp(
    `^(${MONTH_PATTERN})\\s+(\\d{1,2})\\s*-\\s*(\\d{1,2}),\\s*(\\d{4})$`,
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
    `^(${MONTH_PATTERN})\\s+(\\d{1,2}),\\s*(\\d{4})\\s*(?:to|-)\\s*(${MONTH_PATTERN})\\s+(\\d{1,2}),\\s*(\\d{4})$`,
    "i",
  ).exec(text);
  if (!cross) return null;
  const start = realDate(+cross[3], MONTHS[cross[1].toLowerCase()], +cross[2]);
  const end = realDate(+cross[6], MONTHS[cross[4].toLowerCase()], +cross[5]);
  if (start && end && start <= end) return { start, end };
  return null;
}

function parseLooseDateRange(text: string): { start: string; end: string } | null {
  const years = [...text.matchAll(/\b((?:19|20)\d{2})\b/g)].map((match) => match[1]);
  const unique = [...new Set(years)];
  if (unique.length !== 1) return null;
  const year = +unique[0];
  const pattern = new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:\\s*-\\s*(\\d{1,2}))?\\b`, "gi");
  const dates: string[] = [];
  for (const match of text.matchAll(pattern)) {
    const month = MONTHS[match[1].toLowerCase()];
    const startDay = +match[2];
    const endDay = match[3] ? +match[3] : startDay;
    if (endDay < startDay) return null;
    const start = realDate(year, month, startDay);
    const end = realDate(year, month, endDay);
    if (!start || !end) return null;
    dates.push(start, end);
  }
  if (!dates.length) return null;
  dates.sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

function clock12(hourText: string, minuteText: string | undefined, ampm: string): string | null {
  const hour = Number(hourText);
  const minute = minuteText == null || minuteText === "" ? 0 : Number(minuteText);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  let hour24 = hour % 12;
  if (ampm.toLowerCase() === "pm") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseHoursCell(cell: string): { start: string; end: string; keepFullText: boolean } | null {
  const text = dashesToHyphen(cell.trim());
  if (!text) return null;
  const parts = text.split(/\s*;\s*/).filter(Boolean);
  const parsed = parts.flatMap((part) => {
    const match = /^(.*?)(\d{1,2}(?::[0-5]\d)?\s*(?:am|pm)?\s*(?:to|-)\s*\d{1,2}(?::[0-5]\d)?\s*(?:am|pm)?)\s*$/i.exec(part);
    if (!match) return [];
    const range = parseClockRange(match[2]);
    return range ? [{ label: match[1], range }] : [];
  });
  if (!parsed.length) return null;
  const chosen = parsed.find((item) => /full\s*day/i.test(item.label)) ?? parsed[0];
  const bare = parts.length === 1 && chosen.label.trim() === "";
  return { ...chosen.range, keepFullText: !bare };
}

function parseClockRange(cell: string): { start: string; end: string } | null {
  const text = dashesToHyphen(cell.trim());
  const twelve = new RegExp(`^${TIME_ANY}${RANGE_SEP}${TIME_ANY}$`, "i").exec(text);
  if (twelve && Number(twelve[1]) <= 12 && Number(twelve[4]) <= 12) {
    const hasMeridian = Boolean(twelve[3] || twelve[6]);
    const hasMinutes = twelve[2] != null && twelve[5] != null;
    if (hasMeridian || hasMinutes) {
      const start = campClock(twelve[1], twelve[2], twelve[3]);
      const end = campClock(twelve[4], twelve[5], twelve[6]);
      if (start && end) return { start, end };
    }
  }
  const twentyFour = new RegExp(String.raw`^([01]?\d|2[0-3]):([0-5]\d)${RANGE_SEP}([01]?\d|2[0-3]):([0-5]\d)$`, "i").exec(text);
  if (!twentyFour) return null;
  return {
    start: `${twentyFour[1].padStart(2, "0")}:${twentyFour[2]}`,
    end: `${twentyFour[3].padStart(2, "0")}:${twentyFour[4]}`,
  };
}

function campClock(hourText: string, minuteText: string | undefined, ampm: string | undefined): string | null {
  const hour = Number(hourText);
  const minute = minuteText == null || minuteText === "" ? 0 : Number(minuteText);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (ampm) return clock12(hourText, minuteText, ampm);
  if (hour >= 7 && hour <= 11) return clock12(hourText, minuteText, "am");
  return clock12(hourText, minuteText, "pm");
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
  const range = parseClockRange(dashesToHyphen(text));
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

function parsePrice(cell: string): { amount: string; unit: "per_day" | "per_week" | "per_session"; currency: "CAD"; keepFullText: boolean } | null {
  const text = dashesToHyphen(cell.trim());
  if (!text) return null;
  const parts = text.split(/\s*;\s*/).filter(Boolean);
  const parsed = parts.flatMap((part) => {
    const item = parsePricePart(part);
    return item ? [item] : [];
  });
  if (!parsed.length) return null;
  const chosen = parsed.find((item) => /full\s*day/i.test(item.label)) ?? parsed[0];
  const simple = /^(?:cad\s*\$?|\$)\s*\d+(?:\.\d{1,2})?\s*(?:\/|per|a)\s*(?:day|week|session)$/i.test(text)
    || /^\d+(?:\.\d{1,2})?\s*cad\s*(?:\/|per|a)\s*(?:day|week|session)$/i.test(text);
  return { amount: chosen.amount, unit: chosen.unit, currency: "CAD", keepFullText: !simple };
}

function parsePricePart(part: string): { amount: string; unit: "per_day" | "per_week" | "per_session"; label: string } | null {
  const amountMatch = /(?:CAD\s*\$?|\$)\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*CAD/i.exec(part);
  if (!amountMatch) return null;
  const amount = amountMatch[1] || amountMatch[2];
  const unit = /\b(?:full\s*day|half\s*day|per\s*day|a\s*day|\/\s*day)\b/i.test(part)
    ? "per_day"
    : /\b(?:per\s*week|a\s*week|\/\s*week)\b/i.test(part)
      ? "per_week"
      : /\b(?:per\s*session|a\s*session|\/\s*session)\b/i.test(part)
        ? "per_session"
        : null;
  if (!unit) return null;
  return { amount, unit, label: part };
}

function parseAges(cell: string): { min: number; max: number | null } | null {
  const text = dashesToHyphen(cell.trim());
  const range = /^(?:ages?\s+)?(\d{1,2})\s*(?:-|to)\s*(\d{1,2})$/i.exec(text);
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
