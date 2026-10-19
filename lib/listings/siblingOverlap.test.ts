import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSession } from "@/data/camps/types";
import { EXAMPLE_OVERLAP_LISTINGS } from "@/lib/listings/examples";
import { parseFamilyAges, uniqueWholeAges } from "@/lib/listings/familyAges";
import {
  ageFitsListingRange,
  buildSiblingMatrix,
  rowsWhereEveryAgeFits,
  sessionFitsEveryAge,
} from "@/lib/listings/siblingOverlap";

function session(partial: Partial<CampSession> & Pick<CampSession, "id">): CampSession {
  return {
    programId: "prog",
    registrationStatus: "registration_open",
    ageMin: 6,
    ageMax: 12,
    ageMinInclusive: true,
    ageMaxInclusive: true,
    ageAssessmentRule: "as_of_date",
    ageAssessedAtDate: "2026-07-01",
    ...partial,
  };
}

describe("sibling age-overlap matrix", () => {
  it("fits only when every age fits the same session", () => {
    const wide = session({ id: "wide" });
    const junior = session({ id: "junior", ageMin: 6, ageMax: 8 });
    assert.equal(sessionFitsEveryAge(wide, [6, 9], "2026-07-01"), true);
    assert.equal(sessionFitsEveryAge(junior, [6, 9], "2026-07-01"), false);
    assert.equal(sessionFitsEveryAge(wide, [6, 9], null), false);
    assert.equal(sessionFitsEveryAge(wide, [6, 9], "2026-08-01"), false);
  });

  it("does not treat a missing bound as a fit", () => {
    const listing = EXAMPLE_OVERLAP_LISTINGS[1];
    assert.equal(ageFitsListingRange(5, listing), "unknown");
    const rows = buildSiblingMatrix(
      EXAMPLE_OVERLAP_LISTINGS.map((listing) => ({ listing })),
      [4, 10],
      null,
    );
    assert.equal(rows[0].cells[0], "fit");
    assert.equal(rows[0].cells[1], "no");
    assert.equal(rows[0].all, "no");
    assert.equal(rows[1].all, "unknown");
    assert.equal(rowsWhereEveryAgeFits(rows).length, 0);
  });

  it("keeps example rows labelled and stores ages locally as whole years", () => {
    assert.equal(EXAMPLE_OVERLAP_LISTINGS[0].verification, "example");
    assert.match(EXAMPLE_OVERLAP_LISTINGS[0].exampleNote ?? "", /not a verified/i);
    assert.deepEqual(uniqueWholeAges([8, 8, 4.5, -1, 4]), [4, 8]);
    const parsed = parseFamilyAges(
      JSON.stringify({ version: 1, ages: [7, 7, 11], asOfDate: "2026-07-01" }),
    );
    assert.deepEqual(parsed.ages, [7, 11]);
    assert.equal(parsed.asOfDate, "2026-07-01");
  });
});
