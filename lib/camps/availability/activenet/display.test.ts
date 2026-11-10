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
  it("never uses the word live, and only warns when the snapshot is stale", () => {
    const cached = formatActiveNetAvailabilityDisplay(snapshot({ freshness: "cached" }));
    assert.equal(cached.confirmedCurrent, true);
    assert.match(cached.timestampLabel ?? "", /Retrieved /);
    assert.doesNotMatch(cached.timestampLabel ?? "", /not confirmed current/i);
    assert.doesNotMatch(cached.timestampLabel ?? "", /live/i);

    const stale = formatActiveNetAvailabilityDisplay(
      snapshot({ freshness: "stale", error: "provider_failure" }),
    );
    assert.equal(stale.confirmedCurrent, false);
    assert.match(stale.timestampLabel ?? "", /not confirmed current/i);
    assert.doesNotMatch(stale.timestampLabel ?? "", /live/i);
  });

  it("shows openings, closed, and waitlist from space_status", () => {
    const open = formatActiveNetAvailabilityDisplay(snapshot({}));
    assert.equal(open.headline, "33 openings remaining");
    assert.equal(open.confirmedCurrent, true);
    assert.match(open.timestampLabel ?? "", /Retrieved /);
    assert.doesNotMatch(open.timestampLabel ?? "", /live/i);

    const closed = formatActiveNetAvailabilityDisplay(
      snapshot({ status: "closed", openingsRemaining: null, spaceStatusRaw: "Closed" }),
    );
    assert.equal(closed.headline, "Closed");
    assert.equal(closed.ctaHref, null);

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
  });
});
