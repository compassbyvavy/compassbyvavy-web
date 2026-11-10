import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FetchLike } from "@/lib/camps/availability/activenet/fetchDetail";
import {
  getActiveNetAvailability,
  resetActiveNetAvailabilityCacheForTests,
} from "@/lib/camps/availability/activenet/service";
import { formatActiveNetAvailabilityDisplay } from "@/lib/camps/availability/activenet/display";
import type { ActiveNetAvailabilityConfig } from "@/lib/camps/availability/activenet/types";

const CONFIG: ActiveNetAvailabilityConfig = {
  refreshIntervalMs: 60_000,
  timeoutMs: 1_000,
  minOriginIntervalMs: 5_000,
};

function payload(space_status: string, extra: Record<string, unknown> = {}) {
  return {
    headers: { response_code: "0000", response_message: "Successful" },
    body: {
      detail: {
        activity_id: 145871,
        activity_number: "147884",
        activity_name: "Camp: Winter Fun",
        space_status,
        ...extra,
      },
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function countingFetch(
  responder: (call: number) => Response | Promise<Response>,
): { fetchImpl: FetchLike; state: { calls: number } } {
  const state = { calls: 0 };
  const fetchImpl: FetchLike = async () => {
    state.calls += 1;
    return responder(state.calls);
  };
  return { fetchImpl, state };
}

describe("getActiveNetAvailability", () => {
  it("returns available openings for MSC-0007", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const { fetchImpl, state } = countingFetch(() =>
      jsonResponse(payload("33 openings remaining")),
    );
    const snapshot = await getActiveNetAvailability("MSC-0007", {
      fetchImpl,
      config: CONFIG,
      now: () => new Date("2026-11-10T08:40:00.000Z"),
    });
    assert.equal(state.calls, 1);
    assert.equal(snapshot.status, "available");
    assert.equal(snapshot.openingsRemaining, 33);
    assert.equal(snapshot.freshness, "fresh");
    assert.equal(snapshot.activityId, 145871);
    assert.equal(snapshot.activityNumber, "147884");
    assert.match(snapshot.bookingUrl, /\/enroll\/145871/);
    assert.doesNotMatch(snapshot.bookingUrl, /147884/);
    const copy = formatActiveNetAvailabilityDisplay(snapshot);
    assert.equal(copy.headline, "33 openings remaining");
    assert.match(copy.timestampLabel ?? "", /Retrieved /);
    assert.doesNotMatch(copy.timestampLabel ?? "", /live/i);
    assert.equal(copy.confirmedCurrent, true);
  });

  it("preserves Closed and Waitlist", async () => {
    resetActiveNetAvailabilityCacheForTests();
    let snapshot = await getActiveNetAvailability("MSC-0007", {
      fetchImpl: async () => jsonResponse(payload("Closed")),
      config: CONFIG,
    });
    assert.equal(snapshot.status, "closed");
    assert.equal(formatActiveNetAvailabilityDisplay(snapshot).ctaHref, null);

    resetActiveNetAvailabilityCacheForTests();
    snapshot = await getActiveNetAvailability("MSC-0007", {
      fetchImpl: async () => jsonResponse(payload("Waitlist")),
      config: CONFIG,
    });
    assert.equal(snapshot.status, "waitlist");
    const copy = formatActiveNetAvailabilityDisplay(snapshot);
    assert.equal(copy.headline, "Waitlist");
    assert.equal(copy.ctaText, "View provider waitlist");
    assert.match(copy.ctaHref ?? "", /\/enroll\/145871/);
  });

  it("returns malformed_response without inventing openings", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const snapshot = await getActiveNetAvailability("MSC-0007", {
      fetchImpl: async () => jsonResponse({ body: {} }),
      config: CONFIG,
    });
    assert.equal(snapshot.error, "malformed_response");
    assert.equal(snapshot.status, "unknown");
    assert.equal(snapshot.openingsRemaining, null);
    assert.equal(snapshot.freshness, "unavailable");
    const copy = formatActiveNetAvailabilityDisplay(snapshot);
    assert.doesNotMatch(copy.headline, /live/i);
    assert.equal(copy.confirmedCurrent, false);
  });

  it("returns provider_failure on HTTP 500", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const snapshot = await getActiveNetAvailability("MSC-0007", {
      fetchImpl: async () => jsonResponse({}, 500),
      config: CONFIG,
    });
    assert.equal(snapshot.error, "provider_failure");
    assert.equal(snapshot.freshness, "unavailable");
  });

  it("returns id_mismatch when the public number does not match", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const snapshot = await getActiveNetAvailability("MSC-0007", {
      fetchImpl: async () =>
        jsonResponse(payload("33 openings remaining", { activity_number: "149897" })),
      config: CONFIG,
    });
    assert.equal(snapshot.error, "id_mismatch");
    assert.equal(snapshot.openingsRemaining, null);
  });

  it("rate-limits origin fetches and does not label cached copies live", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const { fetchImpl, state } = countingFetch(() =>
      jsonResponse(payload("33 openings remaining")),
    );
    const t0 = new Date("2026-11-10T08:40:00.000Z");
    const first = await getActiveNetAvailability("MSC-0007", {
      fetchImpl,
      config: CONFIG,
      now: () => t0,
    });
    const second = await getActiveNetAvailability("MSC-0007", {
      fetchImpl,
      config: CONFIG,
      now: () => new Date(t0.getTime() + 1_000),
    });
    assert.equal(state.calls, 1);
    assert.equal(first.freshness, "fresh");
    assert.equal(second.freshness, "cached");
    const copy = formatActiveNetAvailabilityDisplay(second);
    assert.equal(copy.confirmedCurrent, true);
    assert.match(copy.timestampLabel ?? "", /Retrieved /);
    assert.doesNotMatch(copy.timestampLabel ?? "", /not confirmed current/i);
    assert.doesNotMatch(JSON.stringify(copy), /live/i);
  });

  it("marks a previous snapshot stale after a later provider failure", async () => {
    resetActiveNetAvailabilityCacheForTests();
    let n = 0;
    const fetchImpl: FetchLike = async () => {
      n += 1;
      if (n === 1) return jsonResponse(payload("33 openings remaining"));
      return jsonResponse({}, 500);
    };
    const t0 = new Date("2026-11-10T08:40:00.000Z");
    await getActiveNetAvailability("MSC-0007", {
      fetchImpl,
      config: CONFIG,
      now: () => t0,
    });
    const failed = await getActiveNetAvailability("MSC-0007", {
      fetchImpl,
      config: CONFIG,
      now: () => new Date(t0.getTime() + 10_000),
      force: true,
    });
    assert.equal(failed.error, "provider_failure");
    assert.equal(failed.freshness, "stale");
    assert.equal(failed.openingsRemaining, 33);
    const copy = formatActiveNetAvailabilityDisplay(failed);
    assert.equal(copy.confirmedCurrent, false);
    assert.match(copy.timestampLabel ?? "", /not confirmed current/i);
    assert.doesNotMatch(copy.timestampLabel ?? "", /live/i);
  });
});
