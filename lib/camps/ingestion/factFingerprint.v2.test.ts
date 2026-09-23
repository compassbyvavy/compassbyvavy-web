/**
 * camp-facts-v2 fingerprint completeness (Phase A1).
 *
 * Additive structured session facts, version isolation from v1, and
 * order-independent array canonicalization. Does not change matcher grain.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampExtractedRecord } from "@/data/camps/ingestion/types";
import {
  FACT_FINGERPRINT_VERSION,
  FACT_FINGERPRINT_VERSION_V1,
  FACT_FINGERPRINT_VERSION_V2,
  PROGRAM_FACT_KEYS_V1,
  PROGRAM_FACT_KEYS_V2,
  SESSION_FACT_KEYS_V1,
  SESSION_FACT_KEYS_V2,
  buildFactFingerprintPayload,
  compareFactFingerprints,
  factsUnchanged,
  hashFactFingerprint,
  needsFingerprintRebaseline,
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

function sessionRecord(fields: Record<string, unknown> = {}): CampExtractedRecord {
  return record({
    recordType: "session",
    sourceIdentity: "ckp:session:a",
    normalizedFields: sessionFields(fields),
  });
}

describe("camp-facts-v2 fingerprint completeness", () => {
  it("sets the current fingerprint version to camp-facts-v2", () => {
    assert.equal(FACT_FINGERPRINT_VERSION, FACT_FINGERPRINT_VERSION_V2);
    assert.equal(FACT_FINGERPRINT_VERSION_V1, "camp-facts-v1");
    const fingerprint = hashFactFingerprint([sessionRecord()]);
    assert.match(fingerprint, /^camp-facts-v2:sha256:[0-9a-f]{64}$/);
  });

  it("keeps v1 session keys as a frozen subset of v2", () => {
    for (const key of SESSION_FACT_KEYS_V1) {
      assert.ok(SESSION_FACT_KEYS_V2.includes(key));
    }
    assert.deepEqual([...PROGRAM_FACT_KEYS_V1], [...PROGRAM_FACT_KEYS_V2]);
    assert.ok(SESSION_FACT_KEYS_V2.includes("scheduleFormat"));
    assert.ok(SESSION_FACT_KEYS_V2.includes("gradeMin"));
    assert.ok(SESSION_FACT_KEYS_V2.includes("gradeMax"));
    assert.ok(SESSION_FACT_KEYS_V2.includes("ageBands"));
    assert.ok(SESSION_FACT_KEYS_V2.includes("seatAvailability"));
    assert.ok(SESSION_FACT_KEYS_V2.includes("registrationStatus"));
    assert.ok(SESSION_FACT_KEYS_V2.includes("enrolmentCapPerWeek"));
    assert.ok(SESSION_FACT_KEYS_V2.includes("beforeCare"));
    assert.ok(SESSION_FACT_KEYS_V2.includes("afterCare"));
    assert.ok(SESSION_FACT_KEYS_V2.includes("priceOptions"));
  });

  it("never treats a v1 string as the same semantic projection as v2", () => {
    const records = [sessionRecord({ gradeMin: 1, gradeMax: 6 })];
    const v1 = hashFactFingerprint(records, FACT_FINGERPRINT_VERSION_V1);
    const v2 = hashFactFingerprint(records, FACT_FINGERPRINT_VERSION_V2);
    assert.match(v1, /^camp-facts-v1:sha256:/);
    assert.match(v2, /^camp-facts-v2:sha256:/);
    assert.notEqual(v1, v2);
    const comparison = compareFactFingerprints(v1, v2);
    assert.equal(comparison.kind, "version_mismatch");
    if (comparison.kind === "version_mismatch") {
      assert.equal(comparison.previousVersion, "camp-facts-v1");
      assert.equal(comparison.nextVersion, "camp-facts-v2");
    }
    assert.equal(factsUnchanged(v1, v2), false);

    const sameHexRelabeled = v2.replace("camp-facts-v2:", "camp-facts-v1:");
    assert.equal(parseSemanticFingerprint(sameHexRelabeled)?.hash, parseSemanticFingerprint(v2)?.hash);
    assert.equal(compareFactFingerprints(sameHexRelabeled, v2).kind, "version_mismatch");
    assert.equal(factsUnchanged(sameHexRelabeled, v2), false);
  });

  it("v1 projection ignores gradeMin; v2 does not", () => {
    const grades16 = [sessionRecord({ gradeMin: 1, gradeMax: 6, ageMin: null, ageMax: null })];
    const grades15 = [sessionRecord({ gradeMin: 1, gradeMax: 5, ageMin: null, ageMax: null })];
    assert.equal(
      hashFactFingerprint(grades16, FACT_FINGERPRINT_VERSION_V1),
      hashFactFingerprint(grades15, FACT_FINGERPRINT_VERSION_V1),
    );
    assert.notEqual(hashFactFingerprint(grades16), hashFactFingerprint(grades15));
  });

  it("fingerprints seatAvailability, registrationStatus, and capacity independently", () => {
    const base = sessionRecord({
      seatAvailability: "confirmed_full",
      registrationStatus: null,
      enrolmentCapPerWeek: 16,
    });
    const availability = sessionRecord({
      seatAvailability: null,
      registrationStatus: null,
      enrolmentCapPerWeek: 16,
    });
    const registration = sessionRecord({
      seatAvailability: "confirmed_full",
      registrationStatus: "open",
      enrolmentCapPerWeek: 16,
    });
    const capacity = sessionRecord({
      seatAvailability: "confirmed_full",
      registrationStatus: null,
      enrolmentCapPerWeek: 20,
    });
    const hashes = [
      hashFactFingerprint([base]),
      hashFactFingerprint([availability]),
      hashFactFingerprint([registration]),
      hashFactFingerprint([capacity]),
    ];
    assert.equal(new Set(hashes).size, 4);
  });

  it("fingerprints scheduleFormat without treating it as identity", () => {
    const fullDay = sessionRecord({ scheduleFormat: "full_day" });
    const halfDay = sessionRecord({ scheduleFormat: "half_day" });
    assert.equal(fullDay.sourceIdentity, halfDay.sourceIdentity);
    assert.notEqual(hashFactFingerprint([fullDay]), hashFactFingerprint([halfDay]));
    const payload = buildFactFingerprintPayload([fullDay]);
    assert.equal(payload[0]?.fields.scheduleFormat, "full_day");
  });

  it("fingerprints structured care offered / not offered / unknown and start/end/fee", () => {
    const unknown = sessionRecord({ beforeCare: null, afterCare: null });
    const notOffered = sessionRecord({
      beforeCare: { offered: "no" },
      afterCare: { offered: "no" },
    });
    const offered = sessionRecord({
      beforeCare: { offered: "yes", start: "08:00", end: "09:00", fee: 10 },
      afterCare: { offered: "yes", start: "16:30", end: "18:00", fee: 10 },
    });
    const offeredHoursChanged = sessionRecord({
      beforeCare: { offered: "yes", start: "07:30", end: "09:00", fee: 10 },
      afterCare: { offered: "yes", start: "16:30", end: "18:00", fee: 10 },
    });
    assert.notEqual(hashFactFingerprint([unknown]), hashFactFingerprint([notOffered]));
    assert.notEqual(hashFactFingerprint([notOffered]), hashFactFingerprint([offered]));
    assert.notEqual(hashFactFingerprint([offered]), hashFactFingerprint([offeredHoursChanged]));
  });

  it("ageBands sort by semantic values and ignore display order and copy chrome", () => {
    const a = sessionRecord({
      ageBands: [
        { ageMin: 10, ageMax: 14, hoursStart: "11:30", hoursEnd: "13:00", copy: "10-14 later" },
        { ageMin: 5, ageMax: 9, hoursStart: "10:00", hoursEnd: "11:30", copy: "5-9 first" },
      ],
    });
    const b = sessionRecord({
      ageBands: [
        { ageMin: 5, ageMax: 9, hoursStart: "10:00", hoursEnd: "11:30", copy: "ages 5–9 (10:00–11:30)" },
        { ageMin: 10, ageMax: 14, hoursStart: "11:30", hoursEnd: "13:00", copy: "ages 10–14" },
      ],
    });
    assert.equal(hashFactFingerprint([a]), hashFactFingerprint([b]));
    const hoursChanged = sessionRecord({
      ageBands: [
        { ageMin: 5, ageMax: 9, hoursStart: "10:30", hoursEnd: "11:30", copy: "5-9 first" },
        { ageMin: 10, ageMax: 14, hoursStart: "11:30", hoursEnd: "13:00", copy: "10-14 later" },
      ],
    });
    assert.notEqual(hashFactFingerprint([a]), hashFactFingerprint([hoursChanged]));
  });

  it("priceOptions sort by semantic values and ignore display order", () => {
    const a = sessionRecord({
      priceOptions: [
        { key: "goalie", label: "Goalie", amount: 100, unit: null, currency: "unknown" },
        { key: "player", label: "Player", amount: 395, unit: null, currency: "unknown" },
      ],
    });
    const b = sessionRecord({
      priceOptions: [
        { key: "player", label: "Player", amount: 395, unit: null, currency: "unknown" },
        { key: "goalie", label: "Goalie", amount: 100, unit: null, currency: "unknown" },
      ],
    });
    assert.equal(hashFactFingerprint([a]), hashFactFingerprint([b]));
    const goalieChanged = sessionRecord({
      priceOptions: [
        { key: "player", label: "Player", amount: 395, unit: null, currency: "unknown" },
        { key: "goalie", label: "Goalie", amount: 125, unit: null, currency: "unknown" },
      ],
    });
    assert.notEqual(hashFactFingerprint([a]), hashFactFingerprint([goalieChanged]));
  });

  it("continues to exclude observations, warnings, sourceUrl, and timestamps", () => {
    const base = sessionRecord({
      sourceUrl: "https://example.test/a?utm_source=nav",
      observations: {
        soldOut: { value: true, rawValue: "SOLD OUT", observedAt: "2026-01-01T00:00:00.000Z" },
      },
    });
    const chrome = record({
      id: "rec-2",
      extractionRunId: "run-2",
      recordType: "session",
      sourceIdentity: "ckp:session:a",
      warnings: ["sold_out_mapped_to_confirmed_full_not_registration_closed"],
      normalizedFields: sessionFields({
        sourceUrl: "https://example.test/b?utm_campaign=header",
        observations: {
          soldOut: { value: true, rawValue: "No spots left", observedAt: "2099-01-01T00:00:00.000Z" },
        },
      }),
    });
    assert.equal(hashFactFingerprint([base]), hashFactFingerprint([chrome]));
    const payload = buildFactFingerprintPayload([base]);
    assert.equal("observations" in (payload[0]?.fields ?? {}), false);
    assert.equal("sourceUrl" in (payload[0]?.fields ?? {}), false);
  });

  it("does not fingerprint occurrence/season lineage keys", () => {
    const withoutLineage = sessionRecord();
    const withLineage = sessionRecord({
      season: "2026",
      occurrenceId: "occ-1",
      sourceEpoch: "2026",
      inferredYear: 2026,
    });
    assert.equal(hashFactFingerprint([withoutLineage]), hashFactFingerprint([withLineage]));
  });

  it("needsFingerprintRebaseline is true only for known older stored versions", () => {
    const v2 = hashFactFingerprint([sessionRecord()]);
    const v1 = hashFactFingerprint([sessionRecord()], FACT_FINGERPRINT_VERSION_V1);
    assert.equal(needsFingerprintRebaseline(v1), true);
    assert.equal(needsFingerprintRebaseline(v2), false);
    assert.equal(needsFingerprintRebaseline(null), false);
    assert.equal(needsFingerprintRebaseline("not-a-fingerprint"), false);
    assert.equal(
      needsFingerprintRebaseline(
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
      true,
    );
    assert.equal(
      needsFingerprintRebaseline(
        "camp-facts-v9:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
      false,
    );
    const future = "camp-facts-v9:sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const current = hashFactFingerprint([sessionRecord()]);
    const mismatch = compareFactFingerprints(future, current);
    assert.equal(mismatch.kind, "version_mismatch");
    if (mismatch.kind === "version_mismatch") {
      assert.equal(mismatch.previousVersion, "camp-facts-v9");
      assert.equal(mismatch.nextVersion, "camp-facts-v2");
    }
    assert.equal(factsUnchanged(future, current), false);
  });
});
