/**
 * Unit tests for getRegistrationAction — Node built-in test runner + assert.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSession } from "@/data/camps/types";
import { getRegistrationAction } from "@/lib/camps/registrationAction";

const FIXED_NOW = new Date("2026-08-27T16:00:00.000Z");

function session(
  partial: Partial<CampSession> & Pick<CampSession, "registrationStatus">,
): CampSession {
  return {
    id: "sess-test",
    programId: "prog-test",
    ...partial,
  };
}

describe("getRegistrationAction — five registration statuses", () => {
  it("registration_open → Register with provider when URL present", () => {
    const action = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "registration_open",
          registrationUrl: "https://example.invalid/register",
          seatAvailability: "unknown",
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(action.displayState, "registration_open");
    assert.equal(action.buttonText, "Register with provider");
    assert.equal(action.href, "https://example.invalid/register");
  });

  it("no_upcoming_dates → Check next dates with provider", () => {
    const action = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "no_upcoming_dates",
          registrationUrl: "https://example.invalid/info",
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(action.displayState, "no_upcoming_dates");
    assert.equal(action.buttonText, "Check next dates with provider");
  });

  it("waitlist → View provider waitlist (never generic Register)", () => {
    const action = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "waitlist",
          waitlistUrl: "https://example.invalid/waitlist",
          registrationUrl: "https://example.invalid/register",
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(action.displayState, "waitlist");
    assert.equal(action.buttonText, "View provider waitlist");
    assert.equal(action.href, "https://example.invalid/waitlist");
    assert.notEqual(action.buttonText, "Register with provider");
  });

  it("not_yet_open → shows confirmed opening date + provider info link", () => {
    const action = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "not_yet_open",
          registrationOpensOn: "2026-09-15",
          registrationUrl: "https://example.invalid/info",
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(action.displayState, "not_yet_open");
    assert.equal(action.label, "Registration opens September 15, 2026");
    assert.equal(action.buttonText, "View provider info");
  });

  it("availability_unknown → Check availability with provider (never generic Register)", () => {
    const action = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "availability_unknown",
          registrationUrl: "https://example.invalid/check",
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(action.displayState, "availability_unknown");
    assert.equal(action.label, "Registration availability to confirm");
    assert.equal(action.buttonText, "Check availability with provider");
    assert.notEqual(action.buttonText, "Register with provider");
    assert.doesNotMatch(action.buttonText ?? "", /^Register$/i);
  });
});

describe("getRegistrationAction — edge contexts", () => {
  it("dates_unverified → Upcoming dates not yet verified", () => {
    const action = getRegistrationAction(
      { kind: "dates_unverified" },
      { now: FIXED_NOW },
    );
    assert.equal(action.displayState, "dates_unverified");
    assert.equal(action.buttonText, null);
  });

  it("load_failed → sessions couldn't be loaded", () => {
    const action = getRegistrationAction(
      { kind: "load_failed" },
      { now: FIXED_NOW },
    );
    assert.equal(action.displayState, "load_failed");
    assert.equal(action.buttonText, null);
  });
});

describe("getRegistrationAction — closure vs capacity vs waitlist", () => {
  it("case 1: registration_closed + seats available → no Register action", () => {
    const action = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "registration_closed",
          registrationUrl: "https://example.invalid/register",
          seatAvailability: "confirmed_available",
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(action.displayState, "full_or_closed");
    assert.equal(action.buttonText, null);
  });

  it("case 2: registration_open + seats confirmed_full → no Register action", () => {
    const action = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "registration_open",
          registrationUrl: "https://example.invalid/register",
          seatAvailability: "confirmed_full",
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(action.displayState, "full_or_closed");
    assert.equal(action.buttonText, null);
  });

  it("case 3: confirmed waitlist → waitlist action only with waitlist destination", () => {
    const withUrl = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "waitlist",
          waitlistUrl: "https://example.invalid/waitlist",
          registrationUrl: "https://example.invalid/register",
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(withUrl.href, "https://example.invalid/waitlist");
    assert.notEqual(withUrl.href, "https://example.invalid/register");
  });
});

describe("getRegistrationAction — missing URLs", () => {
  it("registration_open without registration URL → no button", () => {
    const action = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "registration_open",
          registrationUrl: null,
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(action.buttonText, null);
    assert.equal(action.href, null);
  });

  it("waitlist without waitlist URL → no button", () => {
    const action = getRegistrationAction(
      {
        kind: "session",
        session: session({
          registrationStatus: "waitlist",
          waitlistUrl: " ",
          registrationUrl: "https://example.invalid/register",
        }),
      },
      { now: FIXED_NOW },
    );
    assert.equal(action.buttonText, null);
    assert.equal(action.href, null);
  });
});

describe("getRegistrationAction — failed vs confirmed-none vs unverified", () => {
  it("distinguishes load_failed, dates_unverified, and confirmed no announced dates", () => {
    const failed = getRegistrationAction({ kind: "load_failed" }, { now: FIXED_NOW });
    const unverified = getRegistrationAction(
      { kind: "dates_unverified" },
      { now: FIXED_NOW },
    );
    const confirmedNone = getRegistrationAction(
      {
        kind: "confirmed_no_announced_dates",
        infoUrl: "https://example.invalid/next",
      },
      { now: FIXED_NOW },
    );
    assert.equal(failed.displayState, "load_failed");
    assert.equal(unverified.displayState, "dates_unverified");
    assert.equal(confirmedNone.displayState, "no_upcoming_dates");
    assert.notEqual(failed.displayState, unverified.displayState);
  });
});
