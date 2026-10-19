/**
 * Safety tests for the Discover example-listing review-preview dual gate.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDiscoverExampleCatalog } from "@/lib/discover/catalog";
import {
  DISCOVER_REVIEW_PREVIEW_FLAG,
  isDiscoverReviewPreviewEnabled,
  isDiscoverReviewPreviewFlagOn,
} from "@/lib/discover/reviewPreviewGate";

const PREVIEW_COMMIT_HOST =
  "fdc8c975-compassbyvavy-web.compassbyvavy.workers.dev";
const PRODUCTION_WORKERS_DEV = "compassbyvavy-web.compassbyvavy.workers.dev";

describe("COMPASS_DISCOVER_REVIEW_PREVIEW dual gate", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(value: string): void {
    Object.defineProperty(process.env, "NODE_ENV", {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  it("production + flag without a preview host stays OFF", () => {
    assert.equal(isDiscoverReviewPreviewFlagOn("true"), true);
    assert.equal(DISCOVER_REVIEW_PREVIEW_FLAG, "COMPASS_DISCOVER_REVIEW_PREVIEW");
    assert.equal(
      isDiscoverReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: "compassbyvavy.ca",
      }),
      false,
    );
    assert.equal(
      isDiscoverReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: PRODUCTION_WORKERS_DEV,
      }),
      false,
    );
  });

  it("preview host + exact flag => ON", () => {
    assert.equal(
      isDiscoverReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: PREVIEW_COMMIT_HOST,
      }),
      true,
    );
    assert.equal(
      isDiscoverReviewPreviewEnabled({
        reviewFlag: "TRUE",
        hostname: PREVIEW_COMMIT_HOST,
      }),
      false,
    );
  });

  it("soft loader stays null in production without the dual gate", () => {
    setNodeEnv("production");
    try {
      assert.equal(
        loadDiscoverExampleCatalog({ hostname: "compassbyvavy.ca" }),
        null,
      );
      assert.equal(
        loadDiscoverExampleCatalog({
          hostname: PREVIEW_COMMIT_HOST,
          reviewFlag: undefined,
        }),
        null,
      );
    } finally {
      setNodeEnv(originalNodeEnv);
    }
  });

  it("preview + flag loads examples and omits Services", () => {
    setNodeEnv("production");
    try {
      const catalog = loadDiscoverExampleCatalog({
        hostname: PREVIEW_COMMIT_HOST,
        reviewFlag: "true",
      });
      assert.ok(catalog);
      assert.ok(catalog.listings.some((row) => row.category === "play"));
      assert.equal(
        catalog.listings.some((row) => row.category === "services"),
        false,
      );
    } finally {
      setNodeEnv(originalNodeEnv);
    }
  });
});
