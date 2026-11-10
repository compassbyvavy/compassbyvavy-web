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
  it("shows Live availability only for a successful current snapshot", () => {
    const fresh = formatActiveNetAvailabilityDisplay(snapshot({}));
    assert.equal(fresh.liveLabel, "Live availability");
    assert.equal(fresh.confirmedCurrent, true);
    assert.match(fresh.timestampLabel ?? "", /Retrieved /);
    assert.doesNotMatch(fresh.timestampLabel ?? "", /not confirmed current/i);

    const cached = formatActiveNetAvailabilityDisplay(snapshot({ freshness: "cached" }));
    assert.equal(cached.liveLabel, "Live availability");
    assert.equal(cached.confirmedCurrent, true);
    assert.match(cached.timestampLabel ?? "", /Retrieved /);
    assert.doesNotMatch(cached.timestampLabel ?? "", /not confirmed current/i);

    const stale = formatActiveNetAvailabilityDisplay(
      snapshot({ freshness: "stale", error: "provider_failure" }),
    );
    assert.equal(stale.liveLabel, null);
    assert.equal(stale.confirmedCurrent, false);
    assert.equal(stale.headline, "33 openings remaining");
    assert.match(stale.timestampLabel ?? "", /not confirmed current/i);
    assert.doesNotMatch(stale.timestampLabel ?? "", /live/i);
    assert.doesNotMatch(JSON.stringify(stale), /Live availability/);
  });

  it("shows openings, closed, and waitlist from space_status", () => {
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
    assert.equal(closed.liveLabel, "Live availability");

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
