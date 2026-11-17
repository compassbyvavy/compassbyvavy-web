import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INTAKE_COLUMNS, IntakeImportError, importIntake } from "@/lib/camps/intakeImport";

function csv(rows: Array<Partial<Record<(typeof INTAKE_COLUMNS)[number], string>>>): string {
  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const lines = [
    INTAKE_COLUMNS.join(","),
    ...rows.map((row) => INTAKE_COLUMNS.map((column) => escape(row[column] ?? "")).join(",")),
  ];
  return lines.join("\n");
}

const source = "https://example.com/camps";
const checked = "2026-11-13";

describe("camp intake import", () => {
  it("publishes a row only when the decision starts with Approved", () => {
    const result = importIntake(csv([
      {
        "#": "2",
        Camp: "Kids' Art",
        Break: "Winter",
        "Program name": "Holiday art",
        "What kids do": "Paint and draw.",
        Category: "Art",
        Ages: "6-12",
        Venue: "Clarkson studio",
        Area: "Clarkson",
        Dates: "Dec 21-23, 2026",
        "Single days?": "yes",
        Hours: "9:00am-4:00pm",
        "Before care": "8:00am-9:00am, included",
        "After care": "no",
        Price: "$80/day",
        "Fee notes": "plus HST",
        "What to bring": "Closed shoes.",
        Food: "Snack included.",
        Refunds: "Cancel in writing.",
        "Register link": "https://example.com/register",
        Registration: "open",
        Phone: "905-555-0100",
        Email: "camps@example.com",
        Source: source,
        Checked: checked,
        Staff: "Two teachers in the room.",
        Inclusion: "Ask about support.",
        Trips: "No trips.",
        Parking: "Free lot.",
        Spots: "SPOTS-CELL-4-LEFT",
        Missing: "MISSING-NOTE",
        "Your decision": "Approved after a call",
      },
      {
        Camp: "Kids' Art",
        Break: "March Break",
        Source: source,
        Checked: "Nov 13, 2026",
        "Your decision": "Needs a look",
      },
      {
        Camp: "Kids' Art",
        Break: "PA Day",
        "Your decision": "",
      },
    ]));

    assert.equal(result.summary.rowsRead, 3);
    assert.equal(result.summary.published, 1);
    assert.equal(result.summary.unpublished, 2);
    assert.equal(result.summary.skipped.length, 0);
    assert.match(result.summaryText, /rows read: 3/);
    assert.match(result.sql, /insert into public\.providers/);
    assert.match(result.sql, /insert into public\.venues/);
    assert.match(result.sql, /insert into public\.camp_programs/);
    assert.match(result.sql, /insert into public\.camp_sessions/);
    assert.match(result.sql, /on conflict \(id\) do update set/);
    assert.equal(/\bdelete\b/i.test(result.sql), false);
    assert.equal(result.sql.includes("camp_session_spots"), false);
    assert.equal(result.sql.includes("seat_availability"), false);
    assert.equal(result.sql.includes("camp_packing_items"), false);
    assert.equal(result.sql.includes("SPOTS-CELL-4-LEFT"), false);
    assert.match(result.sql, /'Kids'' Art'/);
    assert.match(result.sql, /'intake-kids-art'/);
    assert.match(result.sql, /'intake-kids-art--winter'/);
    assert.match(result.sql, /'published'::public\.publication_state/);
    assert.match(result.sql, /'draft'::public\.publication_state/);
    assert.match(result.sql, /'https:\/\/example\.com\/camps'/);
    assert.match(result.sql, /'2026-11-13'::date/);
    assert.match(result.sql, /'2026-12-21'::date/);
    assert.match(result.sql, /'2026-12-23'::date/);
    assert.match(result.sql, /'09:00'::time/);
    assert.match(result.sql, /'16:00'::time/);
    assert.match(result.sql, /80/);
    assert.match(result.sql, /'per_day'::public\.price_unit/);
    assert.match(result.sql, /'CAD'::public\.camp_currency/);
    assert.match(result.sql, /'registration_open'::public\.camp_registration_status/);
    assert.match(result.sql, /Paint and draw\./);
    assert.match(result.sql, /Closed shoes\./);
    assert.match(result.sql, /MISSING-NOTE/);
    assert.match(result.sql, /coalesce\(public\.camp_sessions\.published_at/);
    const winter = result.sql.split("intake-kids-art--winter")[1] ?? "";
    assert.match(winter, /'published'::public\.publication_state/);
    const march = result.sql.split("intake-kids-art--march-break")[1] ?? "";
    assert.match(march, /'draft'::public\.publication_state/);
    assert.equal(result.sql.includes("null"), true);
  });

  it("leaves unclear cells empty and keeps the camp's wording", () => {
    const result = importIntake(csv([
      {
        Camp: "River Camp",
        Break: "Winter",
        Ages: "JK to grade 2",
        Hours: "9-4",
        "Before care": "call to ask",
        Price: "From $210",
        "Fee notes": "",
        Dates: "TBD",
        Checked: "last Tuesday",
        Source: "see the binder",
        Registration: "opens sometime",
        "Your decision": "Approved",
      },
    ]));
    const session = result.sql.split("insert into public.camp_sessions")[1] ?? "";
    const program = result.sql.split("insert into public.camp_programs")[1]?.split("insert into")[0] ?? "";
    assert.match(session, /Ages: JK to grade 2\./);
    assert.match(session, /Hours: 9-4\./);
    assert.match(session, /Before care: call to ask\./);
    assert.match(session, /'From \$210'/);
    assert.equal(/\n  210\b/.test(session), false);
    assert.equal(session.includes("'per_day'"), false);
    assert.equal(session.includes("::date"), false);
    assert.equal(session.includes("::time"), false);
    assert.equal(session.includes("'yes'::public.confirmed_tri_state"), false);
    assert.match(session, /'TBD'/);
    assert.match(session, /Registration: opens sometime\./);
    assert.equal(session.includes("see the binder"), false);
    assert.equal(result.sql.split("see the binder").length - 1, 1);
    assert.match(result.sql, /Checked: last Tuesday/);
    assert.equal(program.includes("JK"), false);
  });

  it("skips rows that have no stable key and keeps the first duplicate", () => {
    const result = importIntake(csv([
      { Camp: "North Camp", Break: "Winter", "Your decision": "Approved" },
      { Camp: "North Camp", Break: "Winter", "Your decision": "Approved again" },
      { Camp: "", Break: "Winter", "Your decision": "Approved" },
      { Camp: "???", Break: "Winter", "Your decision": "Approved" },
    ]));
    assert.equal(result.summary.rowsRead, 4);
    assert.equal(result.summary.published, 1);
    assert.equal(result.summary.unpublished, 0);
    assert.equal(result.summary.skipped.length, 3);
    assert.match(result.summaryText, /duplicate of "North Camp" \+ "Winter" \(kept row 2\)/);
    assert.match(result.summaryText, /missing camp/);
    assert.match(result.summaryText, /camp name has no letters or numbers/);
    assert.equal(result.sql.split("intake-north-camp--winter").length - 1, 1);
  });

  it("does not publish the camp when no break is approved", () => {
    const result = importIntake(csv([
      { Camp: "Quiet Camp", Break: "Winter", Venue: "Hall", "Your decision": "Hold" },
    ]));
    assert.equal(result.summary.published, 0);
    assert.equal(result.summary.unpublished, 1);
    assert.equal(result.sql.includes("'published'::public.publication_state,"), false);
    assert.match(result.sql, /'draft'::public\.publication_state/);
  });

  it("keeps one break's ages on that session when another break left ages empty", () => {
    const result = importIntake(csv([
      { Camp: "Age Camp", Break: "Winter", Ages: "6-12", "Your decision": "Approved" },
      { Camp: "Age Camp", Break: "March Break", "Your decision": "Approved" },
    ]));
    const program = result.sql.split("insert into public.camp_programs")[1]?.split("insert into")[0] ?? "";
    assert.match(program, /'Age Camp',\n  null,\n  null,\n  null,\n  null,\n  null,\n  null/);
    assert.match(result.sql, /\n  6,\n  12,/);
  });

  it("refuses a checklist that is missing a column", () => {
    assert.throws(() => importIntake("Camp,Break\nA,Winter\n"), IntakeImportError);
  });

  it("keeps a quoted comma inside one cell", () => {
    const result = importIntake(csv([
      { Camp: "Comma Camp", Break: "Winter", "What to bring": "Water bottle.", Food: "Lunch, snack, and water.", "Your decision": "Approved" },
    ]));
    assert.match(result.sql, /Lunch, snack, and water\./);
    const program = result.sql.split("insert into public.camp_programs")[1]?.split("insert into")[0] ?? "";
    assert.match(program, /Water bottle\./);
    assert.equal(result.summary.rowsRead, 1);
  });

  it("writes the same SQL on a second run", () => {
    const text = csv([{ Camp: "Same Camp", Break: "Winter", "Your decision": "Approved", Source: source, Checked: checked }]);
    assert.equal(importIntake(text).sql, importIntake(text).sql);
  });
});
