/**
 * Tests for CURRENT → PROPOSED change sets.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changeSetConfidence,
  changedFieldNames,
  generateChangeSet,
  hasMaterialChanges,
} from "@/lib/camps/ingestion/changeSet";

const catalogSession = {
  startDate: "2026-07-13",
  endDate: "2026-07-17",
  ageMin: 6,
  ageMax: 10,
  priceAmount: 399,
  registrationUrl: "https://example.com/register?session=jul13",
};

describe("generateChangeSet", () => {
  it("reports only changed fields for a price and age change", () => {
    const changes = generateChangeSet(
      catalogSession,
      { ...catalogSession, ageMax: 11, priceAmount: 425 },
      {
        confidenceByField: { ageMax: 0.92, priceAmount: 0.98 },
        sourceSnapshotId: "snap-1",
      },
    );

    assert.deepEqual(changedFieldNames(changes), ["ageMax", "priceAmount"]);
    assert.deepEqual(changes[0], {
      field: "ageMax",
      changeType: "changed",
      oldValue: 10,
      newValue: 11,
      confidence: 0.92,
      sourceSnapshotId: "snap-1",
    });
    assert.deepEqual(changes[1], {
      field: "priceAmount",
      changeType: "changed",
      oldValue: 399,
      newValue: 425,
      confidence: 0.98,
      sourceSnapshotId: "snap-1",
    });
    assert.equal(hasMaterialChanges(changes), true);
  });

  it("returns an empty set when nothing changed", () => {
    const changes = generateChangeSet(catalogSession, { ...catalogSession });
    assert.deepEqual(changes, []);
    assert.equal(hasMaterialChanges(changes), false);
    assert.equal(changeSetConfidence(changes), 1);
  });

  it("marks every proposed field added for a brand-new record", () => {
    const changes = generateChangeSet(
      null,
      { startDate: "2026-07-20", priceAmount: 425 },
      { defaultConfidence: 0.88, sourceSnapshotId: "snap-2" },
    );
    assert.deepEqual(
      changes.map((c) => [c.field, c.changeType, c.confidence]),
      [
        ["startDate", "added", 0.88],
        ["priceAmount", "added", 0.88],
      ],
    );
    assert.equal(changes[0].oldValue, undefined);
    assert.equal(changes[0].newValue, "2026-07-20");
  });

  it("marks catalog fields the source no longer states as removed", () => {
    const changes = generateChangeSet(catalogSession, {
      startDate: "2026-07-13",
      endDate: "2026-07-17",
      ageMin: 6,
      ageMax: 10,
      priceAmount: 399,
    });
    assert.deepEqual(
      changes.map((c) => [c.field, c.changeType]),
      [["registrationUrl", "removed"]],
    );
  });

  it("treats an explicit null as a proposed change, not a silent drop", () => {
    const changes = generateChangeSet({ priceAmount: 399 }, { priceAmount: null });
    assert.equal(changes.length, 1);
    assert.equal(changes[0].changeType, "changed");
    assert.equal(changes[0].newValue, null);
  });

  it("ignores undefined on either side", () => {
    assert.deepEqual(generateChangeSet({ a: undefined }, { a: undefined }), []);
    assert.deepEqual(
      generateChangeSet({ a: undefined }, { a: 1 }).map((c) => c.changeType),
      ["added"],
    );
  });

  it("includes unchanged rows only when asked", () => {
    const changes = generateChangeSet(
      catalogSession,
      { ...catalogSession, priceAmount: 425 },
      { includeUnchanged: true },
    );
    assert.equal(changes.length, Object.keys(catalogSession).length);
    assert.equal(changes.filter((c) => c.changeType === "unchanged").length, 5);
    assert.equal(hasMaterialChanges(changes), true);
  });

  it("compares arrays and nested objects structurally", () => {
    assert.deepEqual(
      generateChangeSet(
        { themes: ["STEM", "Art"], care: { offered: "yes" } },
        { themes: ["STEM", "Art"], care: { offered: "yes" } },
      ),
      [],
    );
    assert.deepEqual(
      generateChangeSet(
        { themes: ["STEM"] },
        { themes: ["STEM", "Art"] },
      ).map((c) => c.field),
      ["themes"],
    );
  });

  it("skips plumbing fields listed in ignoreFields", () => {
    const changes = generateChangeSet(
      { priceAmount: 399 },
      { priceAmount: 425, observations: { priceAmount: { value: 425 } } },
      { ignoreFields: ["observations"] },
    );
    assert.deepEqual(changedFieldNames(changes), ["priceAmount"]);
  });

  it("defaults confidence to a MEDIUM value and clamps supplied scores", () => {
    const changes = generateChangeSet(
      { priceAmount: 399, ageMax: 10 },
      { priceAmount: 425, ageMax: 11 },
      { confidenceByField: { priceAmount: 4 } },
    );
    assert.equal(changes[0].confidence, 1);
    assert.equal(changes[1].confidence, 0.8);
    assert.equal(changeSetConfidence(changes), 0.8);
  });
});
