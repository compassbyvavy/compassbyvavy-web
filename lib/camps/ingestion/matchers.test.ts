/**
 * Tests for deterministic catalog matchers.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampExtractedRecord } from "@/data/camps/ingestion/types";
import {
  exactProgramMatcher,
  exactProviderMatcher,
  exactSessionMatcher,
  exactVenueMatcher,
  isNewSessionCandidate,
  normalizeMatchText,
} from "@/lib/camps/ingestion/matchers";

function record(
  recordType: CampExtractedRecord["recordType"],
  normalizedFields: Record<string, unknown>,
): CampExtractedRecord {
  return {
    id: "ext-1",
    extractionRunId: "run-1",
    recordType,
    sourceIdentity: "test:identity",
    rawFields: {},
    normalizedFields,
    confidence: 0.9,
    warnings: [],
  };
}

const providers = [
  { id: "prov-nutty", name: "Nutty Scientists", websiteUrl: "https://www.nuttyscientists.ca/" },
  { id: "prov-ckp", name: "Creative Kids Place", websiteUrl: "https://www.creativekidsplace.com/" },
];

const programs = [
  {
    id: "prog-nutty-summer",
    providerId: "prov-nutty",
    name: "Nutty Summer Science Camp",
    slug: "nutty-summer-science-camp",
  },
  { id: "prog-science-a", providerId: "prov-a", name: "Science Camp", slug: "science-camp-a" },
  { id: "prog-science-b", providerId: "prov-b", name: "Science camp", slug: "science-camp-b" },
];

const sessions = [
  {
    id: "sess-jul-13",
    programId: "prog-nutty-summer",
    startDate: "2026-07-13",
    endDate: "2026-07-17",
    sourceUrl: "https://www.nuttyscientists.ca/summer-camp",
  },
  {
    id: "sess-jul-20",
    programId: "prog-nutty-summer",
    startDate: "2026-07-20",
    endDate: "2026-07-24",
    sourceUrl: "https://www.nuttyscientists.ca/summer-camp",
  },
];

const venues = [
  { id: "venue-square-one", name: "Square One Centre", addressLine: "100 City Centre Drive" },
  { id: "venue-lab", name: "Nutty Lab — Port Credit", addressLine: "31 Lakeshore Road East" },
];

describe("normalizeMatchText", () => {
  it("folds case, accents, and punctuation", () => {
    assert.equal(normalizeMatchText("Créative  Kids—Place!"), "creative kids place");
    assert.equal(normalizeMatchText("   "), null);
    assert.equal(normalizeMatchText(42), null);
  });
});

describe("exactProviderMatcher", () => {
  it("matches a stated catalog id with full confidence", () => {
    const result = exactProviderMatcher.match(
      record("provider", { providerId: "prov-ckp" }),
      providers,
    );
    assert.deepEqual(result, {
      catalogId: "prov-ckp",
      confidence: 1,
      reasons: ["exact_catalog_id"],
    });
  });

  it("matches by website host ignoring www and tracking", () => {
    const result = exactProviderMatcher.match(
      record("provider", { websiteUrl: "https://creativekidsplace.com/summer-camp?utm_source=x" }),
      providers,
    );
    assert.equal(result.catalogId, "prov-ckp");
    assert.deepEqual(result.reasons, ["website_host"]);
  });

  it("falls back to an exact name", () => {
    const result = exactProviderMatcher.match(
      record("provider", { name: "nutty scientists" }),
      providers,
    );
    assert.equal(result.catalogId, "prov-nutty");
  });

  it("returns no match when nothing lines up", () => {
    const result = exactProviderMatcher.match(
      record("provider", { name: "Unknown Provider" }),
      providers,
    );
    assert.deepEqual(result, { catalogId: null, confidence: 0, reasons: ["no_match"] });
  });
});

describe("exactProgramMatcher", () => {
  it("prefers a stated catalog id over names", () => {
    const result = exactProgramMatcher.match(
      record("program", { programId: "prog-nutty-summer", name: "Science Camp" }),
      programs,
    );
    assert.equal(result.catalogId, "prog-nutty-summer");
    assert.equal(result.confidence, 1);
  });

  it("matches a slug", () => {
    const result = exactProgramMatcher.match(
      record("program", { slug: "science-camp-b" }),
      programs,
    );
    assert.equal(result.catalogId, "prog-science-b");
    assert.deepEqual(result.reasons, ["slug_match"]);
  });

  it("scopes an exact name to the provider", () => {
    const result = exactProgramMatcher.match(
      record("program", {
        providerId: "prov-nutty",
        name: "Nutty Summer Science Camp",
      }),
      programs,
    );
    assert.equal(result.catalogId, "prog-nutty-summer");
    assert.deepEqual(result.reasons, ["provider_scoped_name"]);
  });

  it("refuses an ambiguous name shared by two providers", () => {
    const result = exactProgramMatcher.match(
      record("program", { name: "Science Camp" }),
      programs,
    );
    assert.equal(result.catalogId, null);
    assert.equal(result.confidence, 0.3);
    assert.deepEqual(result.reasons, ["ambiguous_unscoped_name", "candidates_2"]);
  });
});

describe("exactSessionMatcher", () => {
  it("matches an exact program plus date window", () => {
    const result = exactSessionMatcher.match(
      record("session", {
        programId: "prog-nutty-summer",
        startDate: "2026-07-13",
        endDate: "2026-07-17",
      }),
      sessions,
    );
    assert.equal(result.catalogId, "sess-jul-13");
    assert.deepEqual(result.reasons, ["program_and_date_window"]);
  });

  it("matches by canonical source URL plus start date", () => {
    const result = exactSessionMatcher.match(
      record("session", {
        sourceUrl: "https://www.nuttyscientists.ca/summer-camp/?utm_source=demo",
        startDate: "2026-07-20",
      }),
      sessions,
    );
    assert.equal(result.catalogId, "sess-jul-20");
    assert.deepEqual(result.reasons, ["source_url_and_start"]);
  });

  it("accepts a start-date-only match at lower confidence", () => {
    const result = exactSessionMatcher.match(
      record("session", { programId: "prog-nutty-summer", startDate: "2026-07-13" }),
      sessions,
    );
    assert.equal(result.catalogId, "sess-jul-13");
    assert.equal(result.confidence, 0.75);
  });

  it("returns ambiguous when two catalog sessions share the window", () => {
    const duplicated = [
      ...sessions,
      { ...sessions[0], id: "sess-jul-13-duplicate" },
    ];
    const result = exactSessionMatcher.match(
      record("session", {
        programId: "prog-nutty-summer",
        startDate: "2026-07-13",
        endDate: "2026-07-17",
      }),
      duplicated,
    );
    assert.equal(result.catalogId, null);
    assert.deepEqual(result.reasons, ["ambiguous_program_and_date_window", "candidates_2"]);
  });

  it("does not silently match when stated age band differs (8B identity)", () => {
    const catalog = [
      {
        id: "sess-battlebot-8-13",
        programId: "prog-ckp",
        startDate: "2026-06-29",
        endDate: "2026-06-30",
        ageMin: 8,
        ageMax: 13,
        themeTitle: "Creator Camp: Battlebot Technicians",
        themeTitleNormalized: "creator camp battlebot technicians",
        externalId:
          "creative_kids_place:session:2026-06-29:creator-camp-battlebot-technicians:8-13",
      },
    ];
    const result = exactSessionMatcher.match(
      record("session", {
        programId: "prog-ckp",
        startDate: "2026-06-29",
        endDate: "2026-06-30",
        ageMin: 9,
        ageMax: 13,
        themeTitle: "Creator Camp: Battlebot Technicians",
        themeTitleNormalized: "creator camp battlebot technicians",
        externalId:
          "creative_kids_place:session:2026-06-29:creator-camp-battlebot-technicians:9-13",
      }),
      catalog,
    );
    assert.equal(result.catalogId, null);
    assert.ok(!result.reasons.some((reason) => reason.includes("program_and_date_window")));
    assert.deepEqual(result.reasons, ["no_match"]);
  });

  it("matches the same offering when only price differs (ages stay in identity)", () => {
    const catalog = [
      {
        id: "sess-battlebot-8-13",
        programId: "prog-ckp",
        startDate: "2026-06-29",
        endDate: "2026-06-30",
        ageMin: 8,
        ageMax: 13,
        themeTitle: "Creator Camp: Battlebot Technicians",
        themeTitleNormalized: "creator camp battlebot technicians",
        externalId:
          "creative_kids_place:session:2026-06-29:creator-camp-battlebot-technicians:8-13",
      },
    ];
    const result = exactSessionMatcher.match(
      record("session", {
        programId: "prog-ckp",
        startDate: "2026-06-29",
        endDate: "2026-06-30",
        ageMin: 8,
        ageMax: 13,
        themeTitle: "Creator Camp: Battlebot Technicians",
        themeTitleNormalized: "creator camp battlebot technicians",
        externalId:
          "creative_kids_place:session:2026-06-29:creator-camp-battlebot-technicians:8-13",
        priceAmount: 365,
      }),
      catalog,
    );
    // Same external identity (ages unchanged) matches first via external_id.
    assert.equal(result.catalogId, "sess-battlebot-8-13");
    assert.deepEqual(result.reasons, ["external_id"]);
  });

  it("does not match Jun 29–30 to Jul 2–3 for the same theme and ages", () => {
    const catalog = [
      {
        id: "sess-battlebot-jun",
        programId: "prog-ckp",
        startDate: "2026-06-29",
        endDate: "2026-06-30",
        ageMin: 8,
        ageMax: 13,
        themeTitle: "Creator Camp: Battlebot Technicians",
        themeTitleNormalized: "creator camp battlebot technicians",
        externalId:
          "creative_kids_place:session:2026-06-29:creator-camp-battlebot-technicians:8-13",
      },
    ];
    const result = exactSessionMatcher.match(
      record("session", {
        programId: "prog-ckp",
        startDate: "2026-07-02",
        endDate: "2026-07-03",
        ageMin: 8,
        ageMax: 13,
        themeTitle: "Creator Camp: Battlebot Technicians",
        themeTitleNormalized: "creator camp battlebot technicians",
        externalId:
          "creative_kids_place:session:2026-07-02:creator-camp-battlebot-technicians:8-13",
      }),
      catalog,
    );
    assert.equal(result.catalogId, null);
    assert.deepEqual(result.reasons, ["no_match"]);
  });
});

describe("exactVenueMatcher", () => {
  it("matches name plus address, then name, then address", () => {
    assert.equal(
      exactVenueMatcher.match(
        record("venue", { name: "Square One Centre", addressLine: "100 City Centre Drive" }),
        venues,
      ).catalogId,
      "venue-square-one",
    );
    assert.equal(
      exactVenueMatcher.match(record("venue", { name: "square one centre" }), venues).catalogId,
      "venue-square-one",
    );
    assert.equal(
      exactVenueMatcher.match(
        record("venue", { addressLine: "31 Lakeshore Road East" }),
        venues,
      ).catalogId,
      "venue-lab",
    );
    assert.equal(
      exactVenueMatcher.match(record("venue", { name: "Somewhere Else" }), venues).catalogId,
      null,
    );
  });
});

describe("isNewSessionCandidate", () => {
  it("detects an unmatched week under a known program", () => {
    assert.equal(
      isNewSessionCandidate(
        record("session", {
          programId: "prog-nutty-summer",
          startDate: "2026-07-27",
          endDate: "2026-07-31",
        }),
        sessions,
      ),
      true,
    );
  });

  it("is false when the session already exists", () => {
    assert.equal(
      isNewSessionCandidate(
        record("session", {
          programId: "prog-nutty-summer",
          startDate: "2026-07-13",
          endDate: "2026-07-17",
        }),
        sessions,
      ),
      false,
    );
  });

  it("is false for an ambiguous match — that is review, not an addition", () => {
    const duplicated = [...sessions, { ...sessions[0], id: "sess-dupe" }];
    assert.equal(
      isNewSessionCandidate(
        record("session", {
          programId: "prog-nutty-summer",
          startDate: "2026-07-13",
          endDate: "2026-07-17",
        }),
        duplicated,
      ),
      false,
    );
  });

  it("is false for a dateless, idless session block", () => {
    assert.equal(
      isNewSessionCandidate(
        record("session", { programId: "prog-nutty-summer", priceAmount: 350 }),
        sessions,
      ),
      false,
    );
  });

  it("accepts an external id when dates are not stated", () => {
    assert.equal(
      isNewSessionCandidate(
        record("session", { externalId: "ckp:session:week-3" }),
        sessions,
      ),
      true,
    );
  });

  it("is false for non-session records", () => {
    assert.equal(
      isNewSessionCandidate(record("program", { startDate: "2026-07-27" }), sessions),
      false,
    );
  });
});
