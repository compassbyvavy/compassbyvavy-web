import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  OFFLINE_BADGE,
  PWA_CORE_ROUTES,
} from "@/lib/pwa/coreRoutes";

describe("offline cache routes", () => {
  it("names the offline badge and keeps the worker list aligned", () => {
    assert.equal(OFFLINE_BADGE, "Offline Mode - Displaying cached data");
    assert.ok(PWA_CORE_ROUTES.includes("/camps"));
    assert.ok(PWA_CORE_ROUTES.includes("/saved"));
    const worker = readFileSync("public/sw.js", "utf8");
    for (const route of PWA_CORE_ROUTES) {
      assert.ok(worker.includes(JSON.stringify(route)), route);
    }
  });
});
