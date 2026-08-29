/**
 * Session age eligibility tests.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSession } from "@/data/camps/types";
import {
  childMatchesSessionAge,
  formatSessionAgeBand,
  summarizeMatchingSessionAges,
} from "@/lib/camps/sessionEligibility";

function sess(
  partial: Partial<CampSession> & Pick<CampSession, "id" | "registrationStatus">,
): CampSession {
  return {
    programId: "prog-test",
    ...partial,
  };
}

const younger = sess({
  id: "younger",
  registrationStatus: "registration_open",
  startDate: "2026-07-06",
  ageMin: 4,
  ageMax: 5,
  ageMinInclusive: true,
  ageMaxInclusive: true,
  ageAssessmentRule: "as_of_date",
  ageAssessedAtDate: "2026-07-01",
});

const older = sess({
  id: "older",
  registrationStatus: "registration_open",
  startDate: "2026-07-13",
  ageMin: 7,
  ageMax: 12,
  ageMinInclusive: true,
  ageMaxInclusive: true,
  ageAssessmentRule: "as_of_date",
  ageAssessedAtDate: "2026-07-01",
});

describe("childMatchesSessionAge — different session bands", () => {
  it("age 7 matches older band only, not younger-only session", () => {
    const child = { ageYears: 7, asOfDate: "2026-07-01" };
    assert.equal(childMatchesSessionAge(younger, child), "no_match");
    assert.equal(childMatchesSessionAge(older, child), "match");
  });
});

describe("childMatchesSessionAge — inclusive/exclusive boundaries", () => {
  it("at least 4 but less than 6", () => {
    const band = sess({
      id: "bound",
      registrationStatus: "registration_open",
      ageMin: 4,
      ageMax: 6,
      ageMinInclusive: true,
      ageMaxInclusive: false,
      ageAssessmentRule: "as_of_date",
      ageAssessedAtDate: "2026-07-01",
    });
    const asOf = "2026-07-01";
    assert.equal(
      childMatchesSessionAge(band, { ageYears: 4, asOfDate: asOf }),
      "match",
    );
    assert.equal(
      childMatchesSessionAge(band, { ageYears: 5, asOfDate: asOf }),
      "match",
    );
    assert.equal(
      childMatchesSessionAge(band, { ageYears: 6, asOfDate: asOf }),
      "no_match",
    );
    assert.equal(
      childMatchesSessionAge(band, { ageYears: 3, asOfDate: asOf }),
      "no_match",
    );
  });
});

describe("childMatchesSessionAge — missing information", () => {
  it("missing bounds or inclusive flags ⇒ unknown (not eligible)", () => {
    assert.equal(
      childMatchesSessionAge(
        sess({
          id: "no-bounds",
          registrationStatus: "registration_open",
          ageAssessmentRule: "as_of_date",
          ageAssessedAtDate: "2026-07-01",
        }),
        { ageYears: 7, asOfDate: "2026-07-01" },
      ),
      "unknown",
    );

    assert.equal(
      childMatchesSessionAge(
        sess({
          id: "no-inclusive",
          registrationStatus: "registration_open",
          ageMin: 4,
          ageMax: 6,
          ageMinInclusive: null,
          ageMaxInclusive: true,
          ageAssessmentRule: "as_of_date",
          ageAssessedAtDate: "2026-07-01",
        }),
        { ageYears: 5, asOfDate: "2026-07-01" },
      ),
      "unknown",
    );
  });

  it("unknown/omit assessment rule or missing cutoff date ⇒ unknown", () => {
    assert.equal(
      childMatchesSessionAge(
        sess({
          id: "rule-unknown",
          registrationStatus: "registration_open",
          ageMin: 7,
          ageMax: 12,
          ageMinInclusive: true,
          ageMaxInclusive: true,
          ageAssessmentRule: "unknown",
          ageAssessedAtDate: "2026-07-01",
        }),
        { ageYears: 7, asOfDate: "2026-07-01" },
      ),
      "unknown",
    );

    assert.equal(
      childMatchesSessionAge(
        sess({
          id: "rule-omit",
          registrationStatus: "registration_open",
          ageMin: 7,
          ageMax: 12,
          ageMinInclusive: true,
          ageMaxInclusive: true,
        }),
        { ageYears: 7, asOfDate: "2026-07-01" },
      ),
      "unknown",
    );

    assert.equal(
      childMatchesSessionAge(
        sess({
          id: "no-cutoff",
          registrationStatus: "registration_open",
          ageMin: 7,
          ageMax: 12,
          ageMinInclusive: true,
          ageMaxInclusive: true,
          ageAssessmentRule: "as_of_date",
          ageAssessedAtDate: null,
        }),
        { ageYears: 7, asOfDate: "2026-07-01" },
      ),
      "unknown",
    );
  });
});

describe("childMatchesSessionAge — reference-date mismatch", () => {
  it("age stated for today cannot prove age at a future cutoff", () => {
    assert.equal(
      childMatchesSessionAge(older, {
        ageYears: 7,
        asOfDate: "2026-08-28",
      }),
      "unknown",
    );
    assert.equal(
      childMatchesSessionAge(older, {
        ageYears: 7,
        asOfDate: "2026-07-01",
      }),
      "match",
    );
  });

  it("as_of_session_start requires age as of startDate", () => {
    const session = sess({
      id: "start-rule",
      registrationStatus: "registration_open",
      startDate: "2026-07-06",
      ageMin: 7,
      ageMax: 12,
      ageMinInclusive: true,
      ageMaxInclusive: true,
      ageAssessmentRule: "as_of_session_start",
    });
    assert.equal(
      childMatchesSessionAge(session, {
        ageYears: 7,
        asOfDate: "2026-07-01",
      }),
      "unknown",
    );
    assert.equal(
      childMatchesSessionAge(session, {
        ageYears: 7,
        asOfDate: "2026-07-06",
      }),
      "match",
    );
  });
});

describe("childMatchesSessionAge — invalid inputs", () => {
  it("non-integer age, bad dates, contradictory ranges ⇒ unknown (never match)", () => {
    assert.equal(
      childMatchesSessionAge(older, {
        ageYears: 7.5,
        asOfDate: "2026-07-01",
      }),
      "unknown",
    );
    assert.equal(
      childMatchesSessionAge(older, {
        ageYears: -1,
        asOfDate: "2026-07-01",
      }),
      "unknown",
    );
    assert.equal(
      childMatchesSessionAge(older, {
        ageYears: 7,
        asOfDate: "2026-13-40",
      }),
      "unknown",
    );
    assert.equal(
      childMatchesSessionAge(
        sess({
          id: "contradict",
          registrationStatus: "registration_open",
          ageMin: 10,
          ageMax: 5,
          ageMinInclusive: true,
          ageMaxInclusive: true,
          ageAssessmentRule: "as_of_date",
          ageAssessedAtDate: "2026-07-01",
        }),
        { ageYears: 7, asOfDate: "2026-07-01" },
      ),
      "unknown",
    );
    assert.equal(
      childMatchesSessionAge(
        sess({
          id: "empty-exclusive",
          registrationStatus: "registration_open",
          ageMin: 5,
          ageMax: 5,
          ageMinInclusive: false,
          ageMaxInclusive: true,
          ageAssessmentRule: "as_of_date",
          ageAssessedAtDate: "2026-07-01",
        }),
        { ageYears: 5, asOfDate: "2026-07-01" },
      ),
      "unknown",
    );
  });
});

describe("summarizeMatchingSessionAges", () => {
  it("preserves disjoint bands — never Ages 4–12", () => {
    const summary = summarizeMatchingSessionAges([younger, older]);
    assert.equal(summary.kind, "known");
    if (summary.kind === "known") {
      assert.equal(summary.label, "Ages 4–5 · Ages 7–12");
      assert.doesNotMatch(summary.label, /Ages 4–12/);
    }
  });

  it("qualifies mixed known/unknown without omitting unknown sessions", () => {
    const unknownAge = sess({
      id: "unk",
      registrationStatus: "registration_open",
      ageAssessmentRule: "as_of_date",
      ageAssessedAtDate: "2026-07-01",
    });
    const summary = summarizeMatchingSessionAges([older, unknownAge]);
    assert.equal(summary.kind, "mixed");
    if (summary.kind === "mixed") {
      assert.match(summary.label, /Ages 7–12/);
      assert.match(summary.label, /some session ages to confirm/);
      assert.equal(summary.unknownCount, 1);
    }
  });

  it("empty matching sessions ⇒ unknown (no program fallback)", () => {
    const summary = summarizeMatchingSessionAges([]);
    assert.equal(summary.kind, "unknown");
    assert.equal(summary.label, null);
  });

  it("formats exclusive max as Ages 4–<6", () => {
    const band = sess({
      id: "ex",
      registrationStatus: "registration_open",
      ageMin: 4,
      ageMax: 6,
      ageMinInclusive: true,
      ageMaxInclusive: false,
    });
    assert.equal(formatSessionAgeBand(band), "Ages 4–<6");
  });
});
