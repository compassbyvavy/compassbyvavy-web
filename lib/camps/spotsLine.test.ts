import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSession } from "@/data/camps/types";
import { checkerLine, soonestSpotLine, torontoClock } from "@/lib/camps/spotsLine";

const NOW = new Date("2026-11-13T11:45:00.000Z");

function session(extra: Partial<CampSession> = {}): CampSession {
  return {
    id: "s1",
    programId: "p",
    registrationStatus: "registration_open",
    sourceCheckedDate: "2026-11-10",
    seatAvailability: "confirmed_available",
    startDate: "2026-12-21",
    ...extra,
  };
}

describe("spots line", () => {
  it("shows the count and the Toronto clock time when the reading is under 2 hours", () => {
    assert.equal(torontoClock(new Date("2026-11-13T11:15:00.000Z")), "6:15 am");
    const line = checkerLine(
      session({
        spotCheck: { spotsLeft: 8, state: "available", checkedAt: "2026-11-13T11:15:00.000Z" },
      }),
      NOW,
    );
    assert.deepEqual(line, { text: "8 spots left · checked 6:15 am", tone: "open" });
  });

  it("uses the warning tone at 5 spots and the singular at 1", () => {
    const five = checkerLine(
      session({ spotCheck: { spotsLeft: 5, state: "available", checkedAt: "2026-11-13T11:15:00.000Z" } }),
      NOW,
    );
    assert.equal(five?.text, "5 spots left · checked 6:15 am");
    assert.equal(five?.tone, "warning");
    const one = checkerLine(
      session({ spotCheck: { spotsLeft: 1, state: "available", checkedAt: "2026-11-13T11:15:00.000Z" } }),
      NOW,
    );
    assert.equal(one?.text, "1 spot left · checked 6:15 am");
    assert.equal(one?.tone, "warning");
  });

  it("does not invent a number when the page shows none", () => {
    const line = checkerLine(
      session({ spotCheck: { spotsLeft: null, state: "available", checkedAt: "2026-11-13T11:15:00.000Z" } }),
      NOW,
    );
    assert.deepEqual(line, { text: "Spots available · checked 6:15 am", tone: "open" });
  });

  it("says Full, and Full · waitlist open, without a count", () => {
    const full = checkerLine(
      session({ spotCheck: { spotsLeft: 0, state: "full", checkedAt: "2026-11-13T11:15:00.000Z" } }),
      NOW,
    );
    assert.deepEqual(full, { text: "Full · checked 6:15 am", tone: "full" });
    const wait = checkerLine(
      session({ spotCheck: { spotsLeft: null, state: "waitlist", checkedAt: "2026-11-13T11:15:00.000Z" } }),
      NOW,
    );
    assert.equal(wait?.text, "Full · waitlist open · checked 6:15 am");
  });

  it("shows the state and the date from 2 hours through 7 days", () => {
    const atTwoHours = checkerLine(
      session({ spotCheck: { spotsLeft: 8, state: "available", checkedAt: "2026-11-13T09:45:00.000Z" } }),
      NOW,
    );
    assert.equal(atTwoHours?.text, "Spots available · checked Nov 13");
    const aged = checkerLine(
      session({ spotCheck: { spotsLeft: 8, state: "available", checkedAt: "2026-11-11T11:15:00.000Z" } }),
      NOW,
    );
    assert.deepEqual(aged, { text: "Spots available · checked Nov 11", tone: "open" });
  });

  it("falls back when the reading is 7 days old or the manual date is newer", () => {
    const old = checkerLine(
      session({ spotCheck: { spotsLeft: 8, state: "available", checkedAt: "2026-11-06T11:45:00.000Z" } }),
      NOW,
    );
    assert.equal(old, null);
    const manualNewer = checkerLine(
      session({
        sourceCheckedDate: "2026-11-12",
        spotCheck: { spotsLeft: 8, state: "available", checkedAt: "2026-11-11T16:00:00.000Z" },
      }),
      NOW,
    );
    assert.equal(manualNewer, null);
  });

  it("lets a same-day checker reading win over the manual date", () => {
    const line = checkerLine(
      session({
        sourceCheckedDate: "2026-11-13",
        spotCheck: { spotsLeft: 8, state: "available", checkedAt: "2026-11-13T11:15:00.000Z" },
      }),
      NOW,
    );
    assert.equal(line?.text, "8 spots left · checked 6:15 am");
  });

  it("does not show a stored unknown", () => {
    assert.equal(
      checkerLine(
        session({ spotCheck: { spotsLeft: null, state: "unknown", checkedAt: "2026-11-13T11:15:00.000Z" } }),
        NOW,
      ),
      null,
    );
  });

  it("uses the soonest session, not a blend of counts", () => {
    const line = soonestSpotLine(
      [
        session({
          id: "later",
          startDate: "2026-12-28",
          spotCheck: { spotsLeft: 2, state: "available", checkedAt: "2026-11-13T11:15:00.000Z" },
        }),
        session({
          id: "sooner",
          startDate: "2026-12-21",
          spotCheck: { spotsLeft: 8, state: "available", checkedAt: "2026-11-13T11:15:00.000Z" },
        }),
      ],
      NOW,
    );
    assert.equal(line?.text, "8 spots left · checked 6:15 am");
  });
});
