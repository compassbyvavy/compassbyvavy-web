import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSession } from "@/data/camps/types";
import {
  sessionFitsAllSiblings,
  siblingsOverlapSession,
  uniqueWholeAges,
} from "@/lib/camps/siblingOverlap";

function sess(
  partial: Partial<CampSession> & Pick<CampSession, "id" | "registrationStatus">,
): CampSession {
  return { programId: "prog-test", ...partial };
}

const junior = sess({
  id: "junior",
  registrationStatus: "registration_open",
  ageMin: 4,
  ageMax: 5,
  ageMinInclusive: true,
  ageMaxInclusive: true,
  ageAssessmentRule: "as_of_date",
  ageAssessedAtDate: "2026-07-01",
});

const senior = sess({
  id: "senior",
  registrationStatus: "registration_open",
  ageMin: 7,
  ageMax: 12,
  ageMinInclusive: true,
  ageMaxInclusive: true,
  ageAssessmentRule: "as_of_date",
  ageAssessedAtDate: "2026-07-01",
});

const wide = sess({
  id: "wide",
  registrationStatus: "registration_open",
  ageMin: 5,
  ageMax: 10,
  ageMinInclusive: true,
  ageMaxInclusive: true,
  ageAssessmentRule: "as_of_date",
  ageAssessedAtDate: "2026-07-01",
});

const AS_OF = "2026-07-01";

describe("sibling age-overlap — same session", () => {
  it("does not treat two sessions as one overlapping camp for mixed sibling ages", () => {
    const kids = [
      { ageYears: 4, asOfDate: AS_OF },
      { ageYears: 7, asOfDate: AS_OF },
    ];
    assert.equal(siblingsOverlapSession(junior, kids), "no_match");
    assert.equal(siblingsOverlapSession(senior, kids), "no_match");
    assert.equal(sessionFitsAllSiblings(junior, kids), false);
    assert.equal(sessionFitsAllSiblings(senior, kids), false);
  });

  it("matches only when every sibling fits the same session band", () => {
    const kids = [
      { ageYears: 5, asOfDate: AS_OF },
      { ageYears: 8, asOfDate: AS_OF },
    ];
    assert.equal(siblingsOverlapSession(wide, kids), "match");
    assert.equal(siblingsOverlapSession(junior, kids), "no_match");
  });

  it("unknown eligibility is not a match — never uses a naive min/max skip", () => {
    const unknownBand = sess({
      id: "unk",
      registrationStatus: "availability_unknown",
    });
    const kids = [{ ageYears: 8, asOfDate: AS_OF }];
    assert.equal(siblingsOverlapSession(unknownBand, kids), "unknown");
    assert.equal(sessionFitsAllSiblings(unknownBand, kids), false);
  });

  it("dedupes whole-year ages and ignores invalid entries", () => {
    assert.deepEqual(uniqueWholeAges([7, 7, 5, 5.5, -1, 8]), [7, 5, 8]);
  });
});
