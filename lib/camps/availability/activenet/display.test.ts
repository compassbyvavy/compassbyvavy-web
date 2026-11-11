import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatActiveNetAvailabilityDisplay } from "@/lib/camps/availability/activenet/display";
import type { ActiveNetAvailabilitySnapshot } from "@/lib/camps/availability/activenet/types";

function snapshot(
  overrides: Partial<ActiveNetAvailabilitySnapshot>,
): ActiveNetAvailabilitySnapshot {
  return {
    candidateId: "MSC-0007",
    activityId: 145871,
    activityNumber: "147884",
    retrievedAt: "2026-11-10T08:40:00.000Z",
    freshness: "fresh",
    status: "available",
    openingsRemaining: 33,
    spaceStatusRaw: "33 openings remaining",
    bookingUrl:
      "https://anc.ca.apm.activecommunities.com/activemississauga/activity/search/enroll/145871?locale=en-US",
    sourceUrl:
      "https://anc.ca.apm.activecommunities.com/activemississauga/activity/search/detail/145871",
    refreshIntervalMs: 60_000,
    error: null,
    ...overrides,
  };
}

describe("formatActiveNetAvailabilityDisplay", () => {
  it("shows as-of the retrieval time and never Live availability", () => {
    const fresh = formatActiveNetAvailabilityDisplay(snapshot({}));
    assert.match(fresh.timestampLabel ?? "", /^as of /);
    assert.equal(fresh.confirmedCurrent, true);
    assert.doesNotMatch(fresh.timestampLabel ?? "", /not confirmed current/i);
    assert.doesNotMatch(JSON.stringify(fresh), /live/i);

    const cached = formatActiveNetAvailabilityDisplay(snapshot({ freshness: "cached" }));
    assert.match(cached.timestampLabel ?? "", /^as of /);
    assert.equal(cached.confirmedCurrent, true);
    assert.doesNotMatch(JSON.stringify(cached), /live/i);

    const stale = formatActiveNetAvailabilityDisplay(
      snapshot({ freshness: "stale", error: "provider_failure" }),
    );
    assert.equal(stale.confirmedCurrent, false);
    assert.equal(stale.headline, "33 openings remaining");
    assert.match(stale.timestampLabel ?? "", /^as of /);
    assert.match(stale.timestampLabel ?? "", /not confirmed current/i);
    assert.doesNotMatch(JSON.stringify(stale), /live/i);
  });

  it("shows openings, closed, waitlist, and full from space_status", () => {
    const open = formatActiveNetAvailabilityDisplay(snapshot({}));
    assert.equal(open.headline, "33 openings remaining");
    assert.equal(open.ctaText, "Enroll Now");
    assert.match(open.ctaHref ?? "", /\/enroll\/145871/);
    assert.doesNotMatch(open.ctaHref ?? "", /147884/);

    const closed = formatActiveNetAvailabilityDisplay(
      snapshot({ status: "closed", openingsRemaining: null, spaceStatusRaw: "Closed" }),
    );
    assert.equal(closed.headline, "Closed");
    assert.equal(closed.ctaHref, null);
    assert.match(closed.timestampLabel ?? "", /^as of /);
    assert.doesNotMatch(JSON.stringify(closed), /live/i);

    const waitlist = formatActiveNetAvailabilityDisplay(
      snapshot({
        status: "waitlist",
        openingsRemaining: null,
        spaceStatusRaw: "Waitlist",
      }),
    );
    assert.equal(waitlist.headline, "Waitlist");
    assert.equal(waitlist.ctaText, "View provider waitlist");
    assert.match(waitlist.ctaHref ?? "", /\/enroll\/145871/);

    const full = formatActiveNetAvailabilityDisplay(
      snapshot({ status: "full", openingsRemaining: null, spaceStatusRaw: "Full" }),
    );
    assert.equal(full.headline, "Full");
    assert.equal(full.ctaHref, null);
    assert.notEqual(full.headline, "unknown");
  });
});
