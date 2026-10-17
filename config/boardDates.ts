/**
 * 2026–27 instructional breaks for six GTA boards.
 *
 * Dates below were read from each board's public calendar on 2026-10-17.
 * Modified-year schools (a few Durham schools) are not this default.
 * TCDSB says some secondary schools may move one PA day — the published
 * list is what we store, with that caveat on the board.
 */

export type SchoolBoardId =
  | "tdsb"
  | "tcdsb"
  | "peel"
  | "halton"
  | "york"
  | "durham";

export type SchoolPanel = "elementary" | "secondary";

export type BoardDayKind = "pa_day" | "holiday" | "break";

export type BoardDay = {
  date: string;
  kind: BoardDayKind;
  label: string;
  /** Who is out of class. */
  panels: SchoolPanel[];
};

export type SchoolBoardCalendar = {
  id: SchoolBoardId;
  name: string;
  cycle: "2026-2027";
  sourceUrl: string;
  lastVerifiedOn: "2026-10-17";
  status: "verified";
  note: string;
  days: BoardDay[];
};

const BOTH: SchoolPanel[] = ["elementary", "secondary"];
const ELEMENTARY: SchoolPanel[] = ["elementary"];
const SECONDARY: SchoolPanel[] = ["secondary"];

function isoFromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = Date.parse(`${start}T00:00:00Z`);
  const last = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(cursor) || !Number.isFinite(last) || cursor > last) {
    return out;
  }
  while (cursor <= last) {
    out.push(isoFromUtc(cursor));
    cursor += 24 * 60 * 60 * 1000;
  }
  return out;
}

function day(
  date: string,
  kind: BoardDayKind,
  label: string,
  panels: SchoolPanel[] = BOTH,
): BoardDay {
  return { date, kind, label, panels };
}

function span(
  start: string,
  end: string,
  kind: BoardDayKind,
  label: string,
  panels: SchoolPanel[] = BOTH,
): BoardDay[] {
  return eachDate(start, end).map((date) => day(date, kind, label, panels));
}

function sharedHolidays(): BoardDay[] {
  return [
    day("2026-09-07", "holiday", "Labour Day"),
    day("2026-10-12", "holiday", "Thanksgiving"),
    ...span("2026-12-21", "2027-01-01", "break", "Winter break"),
    day("2027-02-15", "holiday", "Family Day"),
    ...span("2027-03-15", "2027-03-19", "break", "March break"),
    day("2027-03-26", "holiday", "Good Friday"),
    day("2027-03-29", "holiday", "Easter Monday"),
    day("2027-05-24", "holiday", "Victoria Day"),
  ];
}

function withDays(
  board: Omit<SchoolBoardCalendar, "days" | "cycle" | "lastVerifiedOn" | "status">,
  extra: BoardDay[],
): SchoolBoardCalendar {
  const days = [...sharedHolidays(), ...extra].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return {
    ...board,
    cycle: "2026-2027",
    lastVerifiedOn: "2026-10-17",
    status: "verified",
    days,
  };
}

export const SCHOOL_BOARDS: readonly SchoolBoardCalendar[] = [
  withDays(
    {
      id: "tdsb",
      name: "Toronto District School Board",
      sourceUrl: "https://www.tdsb.on.ca/About-Us/School-Year-Calendar",
      note: "PA days follow the board’s 2026–27 elementary and secondary list. June 1, 2027 (Ontario Day) stays an instructional day.",
    },
    [
      day("2026-09-02", "pa_day", "PA day"),
      day("2026-09-03", "pa_day", "PA day"),
      day("2026-11-20", "pa_day", "PA day"),
      day("2027-01-15", "pa_day", "PA day", ELEMENTARY),
      day("2027-02-02", "pa_day", "PA day", SECONDARY),
      day("2027-02-12", "pa_day", "PA day"),
      day("2027-06-04", "pa_day", "PA day", ELEMENTARY),
      day("2027-06-29", "pa_day", "PA day", SECONDARY),
      day("2027-06-30", "pa_day", "PA day"),
    ],
  ),
  withDays(
    {
      id: "tcdsb",
      name: "Toronto Catholic District School Board",
      sourceUrl: "https://www.tcdsb.org/page/school-year-calendar",
      note: "Published elementary and secondary PA lists. The board says some secondary schools may move one PA day to follow a parent-teacher night — check that school before you rely on a secondary date.",
    },
    [
      day("2026-09-02", "pa_day", "PA day"),
      day("2026-09-03", "pa_day", "PA day"),
      day("2026-11-20", "pa_day", "PA day"),
      day("2027-01-15", "pa_day", "PA day", ELEMENTARY),
      day("2027-02-02", "pa_day", "PA day", SECONDARY),
      day("2027-02-12", "pa_day", "PA day"),
      day("2027-06-04", "pa_day", "PA day", ELEMENTARY),
      day("2027-06-29", "pa_day", "PA day", SECONDARY),
      day("2027-06-30", "pa_day", "PA day"),
    ],
  ),
  withDays(
    {
      id: "peel",
      name: "Peel District School Board",
      sourceUrl:
        "https://www.peelschools.org/documents/2bb827ca-520e-4fc4-ae63-a06531cbb1e1/SYC_2026-2027_Regular-Elementary-and-Secondary-chart.pdf",
      note: "Regular elementary and secondary calendar. Balanced-year schools are not this list.",
    },
    [
      day("2026-09-02", "pa_day", "PA day"),
      day("2026-09-03", "pa_day", "PA day"),
      day("2026-10-26", "pa_day", "PA day"),
      day("2026-11-27", "pa_day", "PA day", ELEMENTARY),
      day("2027-01-18", "pa_day", "PA day", ELEMENTARY),
      day("2027-02-03", "pa_day", "PA day", SECONDARY),
      day("2027-02-12", "pa_day", "PA day"),
      day("2027-06-14", "pa_day", "PA day", ELEMENTARY),
      day("2027-06-29", "pa_day", "PA day", SECONDARY),
      day("2027-06-30", "pa_day", "PA day", SECONDARY),
    ],
  ),
  withDays(
    {
      id: "halton",
      name: "Halton District School Board",
      sourceUrl:
        "https://www.hdsb.ca/schools/school-year-calendar/2026-2027-school-year-calendar/",
      note: "June 30, 2027 is a secondary PA day. Elementary students are still in class that day, with an early dismissal — it is not treated as an elementary break.",
    },
    [
      day("2026-09-02", "pa_day", "PA day"),
      day("2026-09-03", "pa_day", "PA day"),
      day("2026-10-09", "pa_day", "PA day"),
      day("2026-11-27", "pa_day", "PA day"),
      day("2027-02-05", "pa_day", "PA day"),
      day("2027-04-19", "pa_day", "PA day"),
      day("2027-06-04", "pa_day", "PA day", ELEMENTARY),
      day("2027-06-30", "pa_day", "PA day", SECONDARY),
    ],
  ),
  withDays(
    {
      id: "york",
      name: "York Region District School Board",
      sourceUrl: "https://www2.yrdsb.ca/school-year-calendar",
      note: "Regular elementary and regular-start secondary calendars. June 1, 2027 stays an instructional day.",
    },
    [
      day("2026-09-02", "pa_day", "PA day"),
      day("2026-09-03", "pa_day", "PA day"),
      day("2026-10-26", "pa_day", "PA day", ELEMENTARY),
      day("2026-11-20", "pa_day", "PA day"),
      day("2027-01-15", "pa_day", "PA day", ELEMENTARY),
      day("2027-02-02", "pa_day", "PA day", SECONDARY),
      day("2027-05-03", "pa_day", "PA day", SECONDARY),
      day("2027-06-04", "pa_day", "PA day", ELEMENTARY),
      day("2027-06-29", "pa_day", "PA day", SECONDARY),
      day("2027-06-30", "pa_day", "PA day"),
    ],
  ),
  withDays(
    {
      id: "durham",
      name: "Durham District School Board",
      sourceUrl:
        "https://www.ddsb.ca/resources/school-year-calendars/school-year-key-dates/",
      note: "Regular calendar only. Modified-year schools (C.E. Broughton, Winchester, Brock, Henry Street, Maxwell Heights) have extra breaks that are not listed here.",
    },
    [
      day("2026-09-02", "pa_day", "PA day"),
      day("2026-09-03", "pa_day", "PA day"),
      day("2026-09-04", "holiday", "Board holiday"),
      day("2026-10-26", "pa_day", "PA day"),
      day("2026-11-13", "pa_day", "PA day"),
      day("2027-01-22", "pa_day", "PA day", ELEMENTARY),
      day("2027-02-12", "pa_day", "PA day", SECONDARY),
      day("2027-06-04", "pa_day", "PA day", ELEMENTARY),
      day("2027-06-29", "pa_day", "PA day", SECONDARY),
      day("2027-06-30", "pa_day", "PA day"),
    ],
  ),
];

export function schoolBoardById(
  id: string,
): SchoolBoardCalendar | undefined {
  return SCHOOL_BOARDS.find((board) => board.id === id);
}
