import assert from "node:assert/strict";
import test from "node:test";
import { MISSISSAUGA_WINTER_2026_LISTED } from "@/data/camps/real/mississaugaWinter2026EligibleList";
import { WINTER_2026_INTERNAL_IDS } from "@/data/camps/real/winter2026.ids";
import {
  getActiveNetMappingByCandidateId,
  getActiveNetMappingBySessionId,
  listActiveNetMappings,
} from "@/lib/camps/availability/activenet/registry";
import { winter2026AdditionalSessions } from "@/data/camps/real/winter2026.dev";

test("30 Winter 2026 sessions have unique verified public/internal ID pairs", () => {
  const mappings = listActiveNetMappings();
  assert.equal(mappings.length, 30);
  assert.equal(MISSISSAUGA_WINTER_2026_LISTED.length, 30);
  assert.equal(new Set(mappings.map((m) => m.sessionId)).size, 30);
  assert.equal(new Set(mappings.map((m) => m.activityNumber)).size, 30);
  assert.equal(new Set(mappings.map((m) => m.activityId)).size, 30);
  for (const row of MISSISSAUGA_WINTER_2026_LISTED) {
    const mapping = mappings.find((m) => m.activityNumber === row.publicActivityNumber);
    assert.ok(mapping);
    assert.equal(mapping.activityId, WINTER_2026_INTERNAL_IDS[row.publicActivityNumber]);
    assert.deepEqual(getActiveNetMappingBySessionId(mapping.sessionId), mapping);
    assert.deepEqual(getActiveNetMappingByCandidateId(mapping.candidateId), mapping);
  }
});

test("Malton legacy MSC-0007 alias remains bound to its own session", () => {
  const mapping = getActiveNetMappingByCandidateId("MSC-0007");
  assert.equal(mapping?.sessionId, "sess-msc-0007-winter-fun-malton-dec-21");
  assert.equal(mapping?.activityNumber, "147884");
  assert.equal(mapping?.activityId, 145871);
  assert.equal(getActiveNetMappingBySessionId("not-a-session"), null);
});

test("29 additional dev-only sessions do not duplicate Malton and have correct links", () => {
  assert.equal(winter2026AdditionalSessions.length, 29);
  for (const session of winter2026AdditionalSessions) {
    const mapping = getActiveNetMappingBySessionId(session.id);
    assert.ok(mapping);
    assert.ok(session.registrationUrl?.includes("/enroll/" + mapping.activityId));
    assert.equal(session.programId, mapping.programId);
  }
});
