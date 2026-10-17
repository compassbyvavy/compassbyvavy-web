import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampProgram, CampSession, Provider } from "@/data/camps/types";
import { schoolBoardById } from "@/config/boardDates";
import {
  isInstructionalBreak,
  singleDayCampsOnBreak,
} from "@/lib/calendar/breaks";

const tdsb = schoolBoardById("tdsb");
const halton = schoolBoardById("halton");
const durham = schoolBoardById("durham");

function session(partial: Partial<CampSession> & Pick<CampSession, "id" | "startDate">): CampSession {
  return {
    programId: "prog",
    registrationStatus: "registration_open",
    endDate: partial.startDate,
    scheduleFormat: "single_day",
    ageMin: 6,
    ageMax: 12,
    ageMinInclusive: true,
    ageMaxInclusive: true,
    ageAssessmentRule: "as_of_date",
    ageAssessedAtDate: "2026-11-20",
    ...partial,
  };
}

describe("school board breaks", () => {
  it("uses verified TDSB dates and keeps Halton June 30 secondary-only", () => {
    assert.ok(tdsb);
    assert.ok(halton);
    assert.ok(durham);
    assert.equal(isInstructionalBreak(tdsb!, "2026-11-20", "elementary"), true);
    assert.equal(isInstructionalBreak(tdsb!, "2027-06-01", "elementary"), false);
    assert.equal(isInstructionalBreak(halton!, "2027-06-30", "elementary"), false);
    assert.equal(isInstructionalBreak(halton!, "2027-06-30", "secondary"), true);
    assert.equal(isInstructionalBreak(durham!, "2026-09-04", "elementary"), true);
    assert.equal(tdsb!.lastVerifiedOn, "2026-10-17");
    assert.equal(tdsb!.status, "verified");
  });

  it("alerts with single-day camps on that break and skips age mismatches", () => {
    const programs: CampProgram[] = [
      { id: "prog", slug: "pa", providerId: "prov", name: "PA day makers (dev)" },
    ];
    const providers: Provider[] = [{ id: "prov", name: "Harbour (dev)" }];
    const sessions = [
      session({ id: "hit", startDate: "2026-11-20" }),
      session({ id: "young", startDate: "2026-11-20", ageMin: 4, ageMax: 5 }),
      session({ id: "other", startDate: "2026-11-21" }),
    ];
    const result = singleDayCampsOnBreak({
      board: tdsb!,
      isoDate: "2026-11-20",
      panel: "elementary",
      sessions,
      programs,
      providers,
      ages: [8],
      asOfDate: "2026-11-20",
    });
    assert.deepEqual(
      result.matches.map((match) => match.session.id),
      ["hit"],
    );
    assert.equal(result.skippedForAge, 1);
    const quiet = singleDayCampsOnBreak({
      board: tdsb!,
      isoDate: "2026-11-21",
      panel: "elementary",
      sessions,
      programs,
      providers,
      ages: [],
      asOfDate: null,
    });
    assert.equal(quiet.matches.length, 0);
  });
});
