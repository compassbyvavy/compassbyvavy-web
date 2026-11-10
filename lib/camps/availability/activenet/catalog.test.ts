import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MSC_0007_ACTIVITY_ID,
  MSC_0007_ACTIVITY_NUMBER,
  MSC_0007_PROGRAM_SLUG,
  MSC_0007_SESSION_ID,
} from "@/data/camps/real/msc0007";
import { loadCampsRealDevCatalog } from "@/lib/camps/realDevCatalog";
import { getActiveNetMappingBySessionId } from "@/lib/camps/availability/activenet/registry";
import { urlsForMapping } from "@/lib/camps/availability/activenet/urls";

describe("MSC-0007 catalog mapping", () => {
  it("stores public activity_number separately from internal activity_id", () => {
    const catalog = loadCampsRealDevCatalog();
    assert.ok(catalog);
    const program = catalog.programs.find((p) => p.slug === MSC_0007_PROGRAM_SLUG);
    const session = catalog.sessions.find((s) => s.id === MSC_0007_SESSION_ID);
    assert.ok(program);
    assert.ok(session);
    assert.equal(session.seatAvailability, "unknown");
    assert.equal(session.registrationStatus, "availability_unknown");
    assert.doesNotMatch(JSON.stringify(session), /33 openings remaining/i);

    const mapping = getActiveNetMappingBySessionId(session.id);
    assert.ok(mapping);
    assert.equal(mapping.activityId, MSC_0007_ACTIVITY_ID);
    assert.equal(mapping.activityNumber, MSC_0007_ACTIVITY_NUMBER);
    assert.notEqual(String(mapping.activityId), mapping.activityNumber);

    const urls = urlsForMapping(mapping);
    assert.equal(session.registrationUrl, urls.bookingUrl);
    assert.equal(session.sourceUrl, urls.sourceUrl);
    assert.match(session.registrationUrl ?? "", /\/enroll\/145871/);
    assert.doesNotMatch(session.registrationUrl ?? "", /\/enroll\/147884/);
    assert.match(session.notes ?? "", /147884/);
  });
});
