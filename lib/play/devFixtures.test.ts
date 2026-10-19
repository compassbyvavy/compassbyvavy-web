/**
 * Tests for the Indoor Play fixture production gate.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  areIndoorPlayDevFixturesAllowed,
  loadIndoorPlayDevFixtures,
} from "@/lib/play/devFixtures";

const originalNodeEnv = process.env.NODE_ENV;

function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

afterEach(() => {
  setNodeEnv(originalNodeEnv);
});

describe("indoor play dev fixture safeguard", () => {
  it("allows fixture access when NODE_ENV is not production", () => {
    setNodeEnv("development");
    assert.equal(areIndoorPlayDevFixturesAllowed(), true);
    const soft = loadIndoorPlayDevFixtures();
    assert.ok(soft);
    assert.equal(soft.DEV_ONLY_INDOOR_PLAY_FIXTURES, true);
    assert.ok(soft.venues.length > 0);
  });

  it("soft-loads null in production", () => {
    setNodeEnv("production");
    assert.equal(areIndoorPlayDevFixturesAllowed(), false);
    assert.equal(loadIndoorPlayDevFixtures(), null);
  });
});
