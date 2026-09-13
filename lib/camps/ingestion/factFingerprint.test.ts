/**
 * Semantic fact fingerprint — Prompt 9A.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampExtractedRecord } from "@/data/camps/ingestion/types";
import {
  FACT_FINGERPRINT_VERSION,
  buildFactFingerprintPayload,
  compareFactFingerprints,
  computeSemanticFingerprint,
  factsUnchanged,
  formatSemanticFingerprint,
  hashFactFingerprint,
  parseSemanticFingerprint,
} from "@/lib/camps/ingestion/factFingerprint";

function record(
  overrides: Partial<CampExtractedRecord> &
    Pick<CampExtractedRecord, "recordType" | "sourceIdentity" | "normalizedFields">,
): CampExtractedRecord {
  return {
    id: overrides.id ?? "rec-1",
    extractionRunId: overrides.extractionRunId ?? "run-1",
    recordType: overrides.recordType,
    sourceIdentity: overrides.sourceIdentity,
    rawFields: overrides.rawFields ?? {},
    normalizedFields: overrides.normalizedFields,
    confidence: overrides.confidence ?? 0.9,
    warnings: overrides.warnings ?? [],
  };
}

function sessionFields(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    startDate: "2026-07-06",
    endDate: "2026-07-10",
    weekIdentity: "week-1",
    weekNumber: 1,
    themeTitle: "STEM Explorers",
    themeTitleNormalized: "stem explorers",
    ageMin: 8,
    ageMax: 13,
    priceTierKey: "full_week",
    priceTierLabel: "Full Week",
    priceAmount: 350,
    currency: "CAD",
    addOnLabel: null,
    addOnFeeCad: null,
    outingLabel: null,
    ...overrides,
  };
}

describe("factFingerprint", () => {
  it("emits a versioned fingerprint string", () => {
    const fingerprint = hashFactFingerprint([
      record({
        recordType: "session",
        sourceIdentity: "ckp:session:a",
        normalizedFields: sessionFields(),
      }),
    ]);
    assert.match(fingerprint, /^camp-facts-v1:sha256:[0-9a-f]{64}$/);
    assert.equal(FACT_FINGERPRINT_VERSION, "camp-facts-v1");
    const parsed = parseSemanticFingerprint(fingerprint);
    assert.ok(parsed);
    assert.equal(parsed.version, "camp-facts-v1");
    assert.equal(parsed.algorithm, "sha256");
  });

  it("is stable across object key insertion order", () => {
    const a = record({
      recordType: "session",
      sourceIdentity: "ckp:session:a",
      normalizedFields: {
        priceAmount: 350,
        ageMin: 8,
        ageMax: 13,
        themeTitle: "STEM",
        currency: "CAD",
      },
    });
    const b = record({
      recordType: "session",
      sourceIdentity: "ckp:session:a",
      normalizedFields: {
        currency: "CAD",
        themeTitle: "STEM",
        ageMax: 13,
        ageMin: 8,
        priceAmount: 350,
      },
    });
    assert.equal(hashFactFingerprint([a]), hashFactFingerprint([b]));
  });

  it("is stable across record order", () => {
    const program = record({
      id: "a",
      recordType: "program",
      sourceIdentity: "ckp:program",
      normalizedFields: {
        name: "Summer Camp",
        marketingAgeMin: 4,
        marketingAgeMax: 12,
      },
    });
    const session = record({
      id: "b",
      recordType: "session",
      sourceIdentity: "ckp:session:full_week",
      normalizedFields: sessionFields(),
    });
    assert.equal(
      hashFactFingerprint([program, session]),
      hashFactFingerprint([session, program]),
    );
  });

  it("excludes evidence wording when normalized value is unchanged", () => {
    const base = record({
      recordType: "session",
      sourceIdentity: "ckp:session:a",
      normalizedFields: {
        ...sessionFields({ coreHoursStart: "09:00", coreHoursEnd: "16:00" }),
        observations: {
          coreHoursStart: {
            value: "09:00",
            rawValue: "Camp hours are 9am–4pm",
            observedAt: "2026-09-12T12:00:00.000Z",
            sourceSnapshotId: "snap-a",
          },
        },
      },
    });
    const reworded = record({
      id: "rec-2",
      extractionRunId: "run-2",
      recordType: "session",
      sourceIdentity: "ckp:session:a",
      normalizedFields: {
        ...sessionFields({ coreHoursStart: "09:00", coreHoursEnd: "16:00" }),
        observations: {
          coreHoursStart: {
            value: "09:00",
            rawValue: "Hours: 9:00 AM to 4:00 PM",
            observedAt: "2026-09-13T12:00:00.000Z",
            sourceSnapshotId: "snap-b",
          },
        },
      },
    });
    assert.equal(hashFactFingerprint([base]), hashFactFingerprint([reworded]));
  });

  it("excludes timestamps, generated ids, confidence, and warnings", () => {
    const a = record({
      id: "uuid-a",
      extractionRunId: "run-a",
      recordType: "session",
      sourceIdentity: "ckp:session:a",
      confidence: 0.5,
      warnings: ["warn-b", "warn-a"],
      normalizedFields: {
        ...sessionFields(),
        observations: {
          priceAmount: {
            value: 350,
            rawValue: "$350",
            observedAt: "2026-01-01T00:00:00.000Z",
            sourceSnapshotId: "snap-1",
            extractionRunId: "run-a",
            confidence: 0.5,
          },
        },
      },
    });
    const b = record({
      id: "uuid-b",
      extractionRunId: "run-b",
      recordType: "session",
      sourceIdentity: "ckp:session:a",
      confidence: 0.99,
      warnings: ["warn-a", "warn-b"],
      normalizedFields: {
        ...sessionFields(),
        observations: {
          priceAmount: {
            value: 350,
            rawValue: "CAD 350.00",
            observedAt: "2099-12-31T00:00:00.000Z",
            sourceSnapshotId: "snap-9",
            extractionRunId: "run-b",
            confidence: 0.99,
          },
        },
      },
    });
    assert.equal(hashFactFingerprint([a]), hashFactFingerprint([b]));
  });

  it("includes price in the fingerprint (identity stays separate)", () => {
    const base = record({
      recordType: "session",
      sourceIdentity: "ckp:session:week1:stem:8-13",
      normalizedFields: sessionFields({ priceAmount: 350 }),
    });
    const changed = record({
      recordType: "session",
      sourceIdentity: "ckp:session:week1:stem:8-13",
      normalizedFields: sessionFields({ priceAmount: 365 }),
    });
    assert.notEqual(hashFactFingerprint([base]), hashFactFingerprint([changed]));
  });

  it("includes ages in the fingerprint", () => {
    const base = record({
      recordType: "session",
      sourceIdentity: "ckp:session:battlebot",
      normalizedFields: sessionFields({
        themeTitle: "Battlebot Technicians",
        themeTitleNormalized: "battlebot technicians",
        ageMin: 8,
        ageMax: 13,
      }),
    });
    const changed = record({
      recordType: "session",
      sourceIdentity: "ckp:session:battlebot",
      normalizedFields: sessionFields({
        themeTitle: "Battlebot Technicians",
        themeTitleNormalized: "battlebot technicians",
        ageMin: 9,
        ageMax: 13,
      }),
    });
    assert.notEqual(hashFactFingerprint([base]), hashFactFingerprint([changed]));
  });

  it("includes program marketing ages separately from session eligibility", () => {
    const sessions = [
      record({
        recordType: "session",
        sourceIdentity: "ckp:session:a",
        normalizedFields: sessionFields({ ageMin: 4, ageMax: 13 }),
      }),
    ];
    const marketing412 = record({
      recordType: "program",
      sourceIdentity: "ckp:program",
      normalizedFields: {
        name: "Summer Camp",
        marketingAgeMin: 4,
        marketingAgeMax: 12,
        derivedAvailableAgeMin: 4,
        derivedAvailableAgeMax: 13,
      },
    });
    const marketing512 = record({
      recordType: "program",
      sourceIdentity: "ckp:program",
      normalizedFields: {
        name: "Summer Camp",
        marketingAgeMin: 5,
        marketingAgeMax: 12,
        derivedAvailableAgeMin: 4,
        derivedAvailableAgeMax: 13,
      },
    });
    assert.notEqual(
      hashFactFingerprint([marketing412, ...sessions]),
      hashFactFingerprint([marketing512, ...sessions]),
    );
  });

  it("includes shared week add-on facts", () => {
    const base = record({
      recordType: "session",
      sourceIdentity: "ckp:session:week2:a",
      normalizedFields: sessionFields({
        addOnLabel: "African Lion Safari surcharge",
        addOnFeeCad: 10,
        outingLabel: "African Lion Safari",
      }),
    });
    const changed = record({
      recordType: "session",
      sourceIdentity: "ckp:session:week2:a",
      normalizedFields: sessionFields({
        addOnLabel: "African Lion Safari surcharge",
        addOnFeeCad: 12,
        outingLabel: "African Lion Safari",
      }),
    });
    assert.notEqual(hashFactFingerprint([base]), hashFactFingerprint([changed]));
  });

  it("preserves unknown/null semantics (null ≠ false ≠ 0 ≠ \"\")", () => {
    const withNull = record({
      recordType: "session",
      sourceIdentity: "ckp:session:a",
      normalizedFields: sessionFields({ addOnFeeCad: null, addOnLabel: null }),
    });
    const withZero = record({
      recordType: "session",
      sourceIdentity: "ckp:session:a",
      normalizedFields: sessionFields({ addOnFeeCad: 0, addOnLabel: "" }),
    });
    const withFalse = record({
      recordType: "program",
      sourceIdentity: "ckp:program",
      normalizedFields: {
        name: "Summer Camp",
        policies: { nutFree: null },
      },
    });
    const withFalseBool = record({
      recordType: "program",
      sourceIdentity: "ckp:program",
      normalizedFields: {
        name: "Summer Camp",
        policies: { nutFree: false },
      },
    });
    assert.notEqual(hashFactFingerprint([withNull]), hashFactFingerprint([withZero]));
    assert.notEqual(hashFactFingerprint([withFalse]), hashFactFingerprint([withFalseBool]));
  });

  it("never treats a missing previous fingerprint as unchanged (baseline)", () => {
    const fingerprint = hashFactFingerprint([
      record({
        recordType: "provider",
        sourceIdentity: "ckp:provider",
        normalizedFields: { name: "Creative Kids Place" },
      }),
    ]);
    assert.equal(compareFactFingerprints(null, fingerprint).kind, "baseline");
    assert.equal(factsUnchanged(null, fingerprint), false);
    assert.equal(factsUnchanged(undefined, fingerprint), false);
    assert.equal(factsUnchanged(fingerprint, null), false);
  });

  it("treats legacy unversioned hashes as version_mismatch", () => {
    const next = hashFactFingerprint([
      record({
        recordType: "session",
        sourceIdentity: "ckp:session:a",
        normalizedFields: sessionFields(),
      }),
    ]);
    const legacy = `sha256:${parseSemanticFingerprint(next)!.hash}`;
    const comparison = compareFactFingerprints(legacy, next);
    assert.equal(comparison.kind, "version_mismatch");
    if (comparison.kind === "version_mismatch") {
      assert.equal(comparison.previousVersion, "legacy-unversioned");
      assert.equal(comparison.nextVersion, "camp-facts-v1");
    }
    assert.equal(factsUnchanged(legacy, next), false);
  });

  it("exposes a readable sorted payload for debugging", () => {
    const payload = buildFactFingerprintPayload([
      record({
        recordType: "program",
        sourceIdentity: "ckp:program",
        normalizedFields: { typicalAgeMin: 4, typicalAgeMax: 12, name: "Camp" },
      }),
    ]);
    assert.deepEqual(payload, [
      {
        recordType: "program",
        sortKey: "Camp|ckp:program",
        fields: { name: "Camp", typicalAgeMax: 12, typicalAgeMin: 4 },
      },
    ]);
  });

  it("format/parse round-trips through SemanticFingerprint", () => {
    const computed = computeSemanticFingerprint([
      record({
        recordType: "venue",
        sourceIdentity: "ckp:venue",
        normalizedFields: {
          name: "Square One",
          addressLine: "100 City Centre Dr",
          city: "Mississauga",
          province: "ON",
        },
      }),
    ]);
    const formatted = formatSemanticFingerprint(computed);
    assert.deepEqual(parseSemanticFingerprint(formatted), computed);
  });
});
