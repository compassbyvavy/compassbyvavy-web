import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redirectFor } from "@/lib/shell/redirects";

describe("launch redirects", () => {
  it("sends the old discover categories to the new pages", () => {
    assert.deepEqual(redirectFor("/discover/parks"), {
      destination: "/ontario/parks-nature",
      status: 301,
    });
    assert.deepEqual(redirectFor("/discover/play"), {
      destination: "/ontario/play-fun",
      status: 301,
    });
    assert.deepEqual(redirectFor("/discover/learning"), {
      destination: "/ontario/learning-culture",
      status: 301,
    });
    assert.deepEqual(redirectFor("/discover/events"), {
      destination: "/ontario/events",
      status: 301,
    });
    assert.deepEqual(redirectFor("/discover/classes"), {
      destination: "/ontario/classes-programs",
      status: 301,
    });
    assert.deepEqual(redirectFor("/discover/food"), {
      destination: "/ontario/food-treats",
      status: 301,
    });
    assert.deepEqual(redirectFor("/discover/travel"), {
      destination: "/ontario/day-trips-getaways",
      status: 301,
    });
  });

  it("parks shopping and services, and keeps the discover hub", () => {
    assert.equal(redirectFor("/discover"), null);
    assert.deepEqual(redirectFor("/discover/shopping"), { destination: "/discover", status: 302 });
    assert.deepEqual(redirectFor("/discover/services"), { destination: "/discover", status: 302 });
  });

  it("sends camps, learn, and saved to their new homes", () => {
    assert.deepEqual(redirectFor("/camps"), { destination: "/ontario/camps", status: 301 });
    assert.equal(redirectFor("/camps/admin"), null);
    assert.equal(redirectFor("/camps/admin/ingestion"), null);
    assert.equal(redirectFor("/camps/cooksmart-winter"), null);
    assert.equal(redirectFor("/camps/preview/cooksmart-winter"), null);
    assert.deepEqual(redirectFor("/camps/preview"), { destination: "/ontario/camps", status: 302 });
    assert.deepEqual(redirectFor("/camps/ksg-winter"), { destination: "/ontario/camps", status: 302 });
    assert.deepEqual(redirectFor("/camps/preview/ksg-winter"), {
      destination: "/ontario/camps",
      status: 302,
    });
    assert.deepEqual(redirectFor("/camps/ymca-mississauga-winter-break-day-camp"), {
      destination: "/ontario/camps/winter-break",
      status: 302,
    });
    assert.deepEqual(redirectFor("/camps/cooksmart-winter-holiday-cooking-camp"), {
      destination: "/ontario/camps/language-leadership-cooking",
      status: 302,
    });
    assert.deepEqual(redirectFor("/discover/play/amazing-fun-park"), {
      destination: "/ontario/play-fun/indoor-playgrounds",
      status: 302,
    });
    assert.deepEqual(redirectFor("/discover/play/sky-zone-mississauga"), {
      destination: "/ontario/play-fun/trampoline-ninja",
      status: 302,
    });
    assert.deepEqual(redirectFor("/learn"), { destination: "/guides", status: 301 });
    assert.deepEqual(redirectFor("/learn/space-mission-scavenger-hunt"), {
      destination: "/guides/printables/space-mission-scavenger-hunt",
      status: 301,
    });
    assert.deepEqual(redirectFor("/saved"), { destination: "/plan/saved", status: 301 });
    assert.deepEqual(redirectFor("/saved/tracker"), { destination: "/plan", status: 301 });
  });
});
