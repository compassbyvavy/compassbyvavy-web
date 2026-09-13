/**
 * Tests for the ingestion development gate and live-fetch opt-in.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  LIVE_FETCH_ENV_VAR,
  areIngestionDevFixturesAllowed,
  assertIngestionDevOnly,
  assertLiveSourceFetchEnabled,
  isLiveSourceFetchEnabled,
  isProductionRuntime,
} from "@/lib/camps/ingestion/devGate";
import {
  loadIngestionDevFixtures,
  requireIngestionDevFixtures,
} from "@/lib/camps/ingestion/devFixtures";

const originalNodeEnv = process.env.NODE_ENV;
const originalLiveFetch = process.env[LIVE_FETCH_ENV_VAR];

function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

function setLiveFetch(value: string | undefined): void {
  if (value === undefined) {
    delete process.env[LIVE_FETCH_ENV_VAR];
    return;
  }
  process.env[LIVE_FETCH_ENV_VAR] = value;
}

afterEach(() => {
  setNodeEnv(originalNodeEnv);
  setLiveFetch(originalLiveFetch);
});

describe("ingestion dev fixture gate", () => {
  it("allows fixture access outside production", () => {
    setNodeEnv("development");
    assert.equal(isProductionRuntime(), false);
    assert.equal(areIngestionDevFixturesAllowed(), true);
    const bundle = loadIngestionDevFixtures();
    assert.ok(bundle);
    assert.equal(bundle.DEV_ONLY_INGESTION_FIXTURES, true);
    assert.ok(bundle.candidates.length > 0);
    assert.ok(bundle.sources.length > 0);
  });

  it("soft-loads null in production", () => {
    setNodeEnv("production");
    assert.equal(areIngestionDevFixturesAllowed(), false);
    assert.equal(loadIngestionDevFixtures(), null);
  });

  it("hard-require throws in production", () => {
    setNodeEnv("production");
    assert.throws(
      () => requireIngestionDevFixtures(),
      /not available when NODE_ENV is production/,
    );
    assert.throws(
      () => assertIngestionDevOnly("Ingestion admin"),
      /Ingestion admin is development-only/,
    );
  });

  it("hard-require works outside production", () => {
    setNodeEnv("test");
    assert.equal(requireIngestionDevFixtures().DEV_ONLY_INGESTION_FIXTURES, true);
  });
});

describe("live source fetch gate", () => {
  it("is disabled unless explicitly enabled", () => {
    setLiveFetch(undefined);
    assert.equal(isLiveSourceFetchEnabled(), false);
    setLiveFetch("0");
    assert.equal(isLiveSourceFetchEnabled(), false);
    setLiveFetch("");
    assert.equal(isLiveSourceFetchEnabled(), false);
    assert.throws(() => assertLiveSourceFetchEnabled(), /Live camp source fetching is disabled/);
  });

  it("accepts explicit opt-in values", () => {
    for (const value of ["1", "true", "TRUE", " enabled "]) {
      setLiveFetch(value);
      assert.equal(isLiveSourceFetchEnabled(), true, `expected ${value} to enable`);
    }
    assert.doesNotThrow(() => assertLiveSourceFetchEnabled());
  });

  it("stays disabled in production unless opted in", () => {
    setNodeEnv("production");
    setLiveFetch(undefined);
    assert.equal(isLiveSourceFetchEnabled(), false);
  });
});
