import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseActiveNetSpaceStatus } from "@/lib/camps/availability/activenet/parseSpaceStatus";

describe("parseActiveNetSpaceStatus", () => {
  it("parses numerical openings remaining", () => {
    const parsed = parseActiveNetSpaceStatus("33 openings remaining");
    assert.equal(parsed.kind, "available");
    assert.equal(parsed.openingsRemaining, 33);
    assert.equal(parsed.raw, "33 openings remaining");
  });

  it("parses a singular opening remaining", () => {
    const parsed = parseActiveNetSpaceStatus("1 opening remaining");
    assert.equal(parsed.kind, "available");
    assert.equal(parsed.openingsRemaining, 1);
  });

  it("preserves Closed without treating it as zero openings", () => {
    const parsed = parseActiveNetSpaceStatus("Closed");
    assert.equal(parsed.kind, "closed");
    assert.equal(parsed.openingsRemaining, null);
    assert.notEqual(parsed.openingsRemaining, 0);
    assert.equal(parsed.raw, "Closed");
  });

  it("preserves Waitlist and Waiting List without inventing zero openings", () => {
    const waitlist = parseActiveNetSpaceStatus("Waitlist");
    assert.equal(waitlist.kind, "waitlist");
    assert.equal(waitlist.openingsRemaining, null);
    assert.notEqual(waitlist.openingsRemaining, 0);
    assert.equal(parseActiveNetSpaceStatus("Waiting List").kind, "waitlist");
    assert.equal(parseActiveNetSpaceStatus("+ Waiting List").kind, "waitlist");
  });

  it("prefers waitlist when closed and waitlist appear together", () => {
    const parsed = parseActiveNetSpaceStatus("Closed — waiting list");
    assert.equal(parsed.kind, "waitlist");
  });

  it("maps Full to kind full, not unknown or zero openings", () => {
    const parsed = parseActiveNetSpaceStatus("Full");
    assert.equal(parsed.kind, "full");
    assert.equal(parsed.openingsRemaining, null);
    assert.notEqual(parsed.openingsRemaining, 0);
    assert.equal(parsed.raw, "Full");
  });

  it("does not treat non-string or empty values as openings", () => {
    assert.equal(parseActiveNetSpaceStatus(null).kind, "unknown");
    assert.equal(parseActiveNetSpaceStatus(33).kind, "unknown");
    assert.equal(parseActiveNetSpaceStatus("").kind, "unknown");
    assert.equal(parseActiveNetSpaceStatus("Almost full").kind, "unknown");
    assert.equal(parseActiveNetSpaceStatus("Almost full").openingsRemaining, null);
  });
});
