/**
 * Safety tests for the Indoor Play Cloudflare review-preview dual gate.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadIndoorPlayDevFixtures } from "@/lib/play/devFixtures";
import {
  PLAY_REVIEW_PREVIEW_FLAG,
  isPlayReviewPreviewEnabled,
  isPlayReviewPreviewFlagOn,
} from "@/lib/play/reviewPreviewGate";

const PREVIEW_COMMIT_HOST =
  "fdc8c975-compassbyvavy-web.compassbyvavy.workers.dev";
const PREVIEW_BRANCH_HOST =
  "cursor-indoor-play-filters-be21-compassbyvavy-web.compassbyvavy.workers.dev";
const PRODUCTION_WORKERS_DEV = "compassbyvavy-web.compassbyvavy.workers.dev";

describe("COMPASS_PLAY_REVIEW_PREVIEW dual gate", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(value: string): void {
    Object.defineProperty(process.env, "NODE_ENV", {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  it("production + no flag => fixtures OFF", () => {
    assert.equal(isPlayReviewPreviewFlagOn(undefined), false);
    assert.equal(
      isPlayReviewPreviewEnabled({
        reviewFlag: undefined,
        hostname: "compassbyvavy.ca",
      }),
      false,
    );
  });

  it("production + flag => fixtures still OFF", () => {
    assert.equal(isPlayReviewPreviewFlagOn("true"), true);
    assert.equal(
      isPlayReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: "compassbyvavy.ca",
      }),
      false,
    );
    assert.equal(
      isPlayReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: PRODUCTION_WORKERS_DEV,
      }),
      false,
    );
  });

  it("preview + no flag => fixtures OFF", () => {
    assert.equal(
      isPlayReviewPreviewEnabled({
        reviewFlag: undefined,
        hostname: PREVIEW_COMMIT_HOST,
      }),
      false,
    );
    assert.equal(
      isPlayReviewPreviewEnabled({
        reviewFlag: "1",
        hostname: PREVIEW_COMMIT_HOST,
      }),
      false,
    );
    assert.equal(
      isPlayReviewPreviewEnabled({
        reviewFlag: "TRUE",
        hostname: PREVIEW_BRANCH_HOST,
      }),
      false,
    );
  });

  it("preview + flag => fixtures ON", () => {
    assert.equal(PLAY_REVIEW_PREVIEW_FLAG, "COMPASS_PLAY_REVIEW_PREVIEW");
    assert.equal(
      isPlayReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: PREVIEW_COMMIT_HOST,
      }),
      true,
    );
    assert.equal(
      isPlayReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: PREVIEW_BRANCH_HOST,
      }),
      true,
    );
  });

  it("soft loader stays null in production without the dual gate", () => {
    setNodeEnv("production");
    try {
      assert.equal(loadIndoorPlayDevFixtures({ hostname: "compassbyvavy.ca" }), null);
      assert.equal(
        loadIndoorPlayDevFixtures({
          hostname: PREVIEW_COMMIT_HOST,
          reviewFlag: undefined,
        }),
        null,
      );
      assert.equal(
        loadIndoorPlayDevFixtures({
          hostname: "compassbyvavy.ca",
          reviewFlag: "true",
        }),
        null,
      );
    } finally {
      setNodeEnv(originalNodeEnv);
    }
  });

  it("preview + flag loads fictional fixtures in production", () => {
    setNodeEnv("production");
    try {
      const fixtures = loadIndoorPlayDevFixtures({
        hostname: PREVIEW_COMMIT_HOST,
        reviewFlag: "true",
      });
      assert.ok(fixtures);
      assert.equal(fixtures.DEV_ONLY_INDOOR_PLAY_FIXTURES, true);
      assert.ok(fixtures.venues.some((venue) => venue.code.startsWith("PE-9")));
    } finally {
      setNodeEnv(originalNodeEnv);
    }
  });
});
