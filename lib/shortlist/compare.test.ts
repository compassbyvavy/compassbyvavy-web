import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  campsDevPrograms,
  campsDevProviders,
  campsDevSessions,
  campsDevVenues,
} from "@/data/camps/fixtures.dev";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import {
  buildCompareHref,
  buildCompareTable,
  parseCompareSessionIds,
} from "@/lib/shortlist/compare";

const NOW = new Date("2026-08-28T16:00:00.000Z");

const catalog: CampsCatalogBundle = {
  providers: campsDevProviders,
  venues: campsDevVenues,
  programs: campsDevPrograms,
  sessions: campsDevSessions,
  sourceLabel: "dev_fixtures",
  includesFictionalFixtures: true,
};

describe("compare session selection", () => {
  it("requires 2–4 unique session ids", () => {
    assert.equal(parseCompareSessionIds("").kind, "empty");
    assert.equal(parseCompareSessionIds("only-one").kind, "too_few");
    assert.equal(
      parseCompareSessionIds("a,b,c,d,e").kind,
      "too_many",
    );
    const ok = parseCompareSessionIds("sess-a,sess-b,sess-a");
    assert.equal(ok.kind, "ok");
    if (ok.kind !== "ok") throw new Error("kind");
    assert.deepEqual(ok.sessionIds, ["sess-a", "sess-b"]);
    assert.match(buildCompareHref(["sess-a", "sess-b"]), /sessions=sess-a%2Csess-b/);
  });
});

describe("compare table", () => {
  it("places dates, eligibility, hours, care, venue, fees, registration, and evidence side by side", () => {
    const table = buildCompareTable(
      catalog,
      "sess-dev-stem-w1,sess-dev-stem-w2",
      { now: NOW },
    );
    assert.equal(table.kind, "ready");
    if (table.kind !== "ready") throw new Error("kind");
    assert.equal(table.columns.length, 2);
    assert.equal(table.columns[0].sessionId, "sess-dev-stem-w1");
    assert.equal(table.columns[1].sessionId, "sess-dev-stem-w2");
    assert.match(table.columns[0].row.datesLabel, /Jul 6/);
    assert.match(table.columns[0].row.ageEligibilityLabel, /7/);
    assert.match(table.columns[0].row.hoursLabel, /09:00/);
    assert.match(table.columns[0].row.careLabel, /07:30|Care/i);
    assert.match(table.columns[0].row.venueLabel, /Oakridge|Venue/i);
    assert.equal(table.columns[0].currencyLabel, "CAD");
    assert.equal(table.columns[0].unitLabel, "per week");
    assert.equal(
      table.columns[0].row.registration.displayState,
      "registration_open",
    );
    assert.equal(table.columns[1].row.registration.displayState, "waitlist");
    assert.equal(table.columns[0].evidenceDate, "2026-08-01");
    assert.equal(table.priceNote.kind, "comparable");
  });

  it("does not rank mixed price units", () => {
    const table = buildCompareTable(
      catalog,
      "sess-dev-weekend-1,sess-dev-pa-1",
      { now: NOW },
    );
    assert.equal(table.kind, "ready");
    if (table.kind !== "ready") throw new Error("kind");
    assert.equal(table.priceNote.kind, "incomparable");
    assert.match(table.priceNote.label, /does not rank/i);
    const labels = table.columns.map((c) => c.row.priceLabel);
    assert.equal(labels.length, 2);
    // Preserve selection order — weekend session first, not cheaper-first.
    assert.equal(table.columns[0].sessionId, "sess-dev-weekend-1");
    assert.equal(table.columns[1].sessionId, "sess-dev-pa-1");
  });

  it("keeps unknown prices explicit and does not treat them as zero", () => {
    const table = buildCompareTable(
      catalog,
      "sess-dev-stem-w1,sess-dev-nature-sparse",
      { now: NOW },
    );
    assert.equal(table.kind, "ready");
    if (table.kind !== "ready") throw new Error("kind");
    assert.equal(table.priceNote.kind, "unknown");
    assert.match(table.columns[1].row.priceLabel, /check with provider/i);
    assert.doesNotMatch(table.columns[1].row.priceLabel, /^\$0|CAD \$0/);
    assert.match(table.columns[1].row.ageEligibilityLabel, /to confirm/i);
    assert.match(table.columns[1].row.venueLabel, /to confirm/i);
  });

  it("does not invent columns for unpublished session ids", () => {
    const table = buildCompareTable(
      catalog,
      "sess-dev-stem-w1,sess-unpublished-secret",
      { now: NOW },
    );
    assert.equal(table.kind, "ready");
    if (table.kind !== "ready") throw new Error("kind");
    assert.deepEqual(table.missingIds, ["sess-unpublished-secret"]);
    assert.equal(table.columns.length, 1);
    assert.doesNotMatch(JSON.stringify(table.columns), /unpublished-secret/);
  });

  it("waits when the public catalog is not loaded", () => {
    const table = buildCompareTable(null, "sess-dev-stem-w1,sess-dev-stem-w2");
    assert.equal(table.kind, "catalog_pending");
  });
});
