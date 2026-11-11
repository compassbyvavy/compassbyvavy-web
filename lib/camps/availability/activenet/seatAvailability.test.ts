import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seatAvailabilityFromSpaceKind } from "@/lib/camps/availability/activenet/seatAvailability";

describe("seatAvailabilityFromSpaceKind", () => {
  it("maps Full to confirmed_full, not unknown", () => {
    assert.equal(seatAvailabilityFromSpaceKind("full"), "confirmed_full");
  });

  it("maps remaining seats to confirmed_available", () => {
    assert.equal(seatAvailabilityFromSpaceKind("available"), "confirmed_available");
  });

  it("leaves closed, waitlist, and unknown as unknown on the seat fact", () => {
    assert.equal(seatAvailabilityFromSpaceKind("closed"), "unknown");
    assert.equal(seatAvailabilityFromSpaceKind("waitlist"), "unknown");
    assert.equal(seatAvailabilityFromSpaceKind("unknown"), "unknown");
  });
});
