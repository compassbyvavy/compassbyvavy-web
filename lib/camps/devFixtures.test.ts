/**
 * Tests for the enforceable camps fixture production gate.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  areCampsDevFixturesAllowed,
  loadCampsDevFixtures,
  requireCampsDevFixtures,
} from "@/lib/camps/devFixtures";

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

describe("camps dev fixture safeguard", () => {
  it("allows fixture access when NODE_ENV is not production", () => {
    setNodeEnv("development");
    assert.equal(areCampsDevFixturesAllowed(), true);
    const soft = loadCampsDevFixtures();
    assert.ok(soft);
    assert.equal(soft.DEV_ONLY_CAMPS_FIXTURES, true);
    assert.ok(soft.campsDevSessions.length > 0);
  });

  it("soft-loads null in production", () => {
    setNodeEnv("production");
    assert.equal(areCampsDevFixturesAllowed(), false);
    assert.equal(loadCampsDevFixtures(), null);
  });

  it("hard-require throws in production", () => {
    setNodeEnv("production");
    assert.throws(
      () => requireCampsDevFixtures(),
      /not available when NODE_ENV is production/,
    );
  });
});
