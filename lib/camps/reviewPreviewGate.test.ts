/**
 * Safety tests for the Camps Cloudflare review-preview dual gate.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAMPS_REVIEW_PREVIEW_FLAG,
  isCampsReviewPreviewEnabled,
  isCampsReviewPreviewFlagOn,
  isCloudflareWorkersPreviewHostname,
} from "@/lib/camps/reviewPreviewGate";
import {
  loadCampsCatalog,
  resolvePublishedCampDetail,
} from "@/lib/camps/catalog";
import { loadCampsRealDevCatalog } from "@/lib/camps/realDevCatalog";

const PREVIEW_COMMIT_HOST =
  "fdc8c975-compassbyvavy-web.compassbyvavy.workers.dev";
const PREVIEW_BRANCH_HOST =
  "camps-product-ui-on-ffe3ff0-compassbyvavy-web.compassbyvavy.workers.dev";
const PRODUCTION_WORKERS_DEV = "compassbyvavy-web.compassbyvavy.workers.dev";

describe("Cloudflare Workers preview hostname identity", () => {
  it("accepts versioned and aliased preview hosts for this Worker", () => {
    assert.equal(isCloudflareWorkersPreviewHostname(PREVIEW_COMMIT_HOST), true);
    assert.equal(isCloudflareWorkersPreviewHostname(PREVIEW_BRANCH_HOST), true);
    assert.equal(
      isCloudflareWorkersPreviewHostname(`${PREVIEW_COMMIT_HOST}:443`),
      true,
    );
  });

  it("rejects production workers.dev, custom domains, and empty hosts", () => {
    assert.equal(isCloudflareWorkersPreviewHostname(PRODUCTION_WORKERS_DEV), false);
    assert.equal(isCloudflareWorkersPreviewHostname("compassbyvavy.ca"), false);
    assert.equal(isCloudflareWorkersPreviewHostname("www.compassbyvavy.ca"), false);
    assert.equal(isCloudflareWorkersPreviewHostname("localhost:3000"), false);
    assert.equal(isCloudflareWorkersPreviewHostname(""), false);
    assert.equal(isCloudflareWorkersPreviewHostname(undefined), false);
  });
});

describe("COMPASS_CAMPS_REVIEW_PREVIEW dual gate", () => {
  it("production + no flag => samples OFF", () => {
    assert.equal(isCampsReviewPreviewFlagOn(undefined), false);
    assert.equal(
      isCampsReviewPreviewEnabled({
        reviewFlag: undefined,
        hostname: "compassbyvavy.ca",
      }),
      false,
    );
  });

  it("production + flag => samples OFF", () => {
    assert.equal(isCampsReviewPreviewFlagOn("true"), true);
    assert.equal(
      isCampsReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: "compassbyvavy.ca",
      }),
      false,
    );
    assert.equal(
      isCampsReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: PRODUCTION_WORKERS_DEV,
      }),
      false,
    );
  });

  it("preview + no flag => samples OFF", () => {
    assert.equal(
      isCampsReviewPreviewEnabled({
        reviewFlag: undefined,
        hostname: PREVIEW_COMMIT_HOST,
      }),
      false,
    );
    assert.equal(
      isCampsReviewPreviewEnabled({
        reviewFlag: "1",
        hostname: PREVIEW_COMMIT_HOST,
      }),
      false,
    );
    assert.equal(
      isCampsReviewPreviewEnabled({
        reviewFlag: "TRUE",
        hostname: PREVIEW_BRANCH_HOST,
      }),
      false,
    );
  });

  it("preview + flag => samples ON", () => {
    assert.equal(CAMPS_REVIEW_PREVIEW_FLAG, "COMPASS_CAMPS_REVIEW_PREVIEW");
    assert.equal(
      isCampsReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: PREVIEW_COMMIT_HOST,
      }),
      true,
    );
    assert.equal(
      isCampsReviewPreviewEnabled({
        reviewFlag: "true",
        hostname: PREVIEW_BRANCH_HOST,
      }),
      true,
    );
  });
});

describe("review preview catalog — fixtures only, never MSC-0201", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(value: string): void {
    Object.defineProperty(process.env, "NODE_ENV", {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  it("production catalog stays empty without the dual gate", () => {
    setNodeEnv("production");
    try {
      assert.equal(loadCampsCatalog({ hostname: "compassbyvavy.ca" }), null);
      assert.equal(
        loadCampsCatalog({
          hostname: PREVIEW_COMMIT_HOST,
          reviewFlag: undefined,
        }),
        null,
      );
      assert.equal(
        loadCampsCatalog({
          hostname: "compassbyvavy.ca",
          reviewFlag: "true",
        }),
        null,
      );
    } finally {
      setNodeEnv(originalNodeEnv);
    }
  });

  it("preview + flag loads sample camps and keeps MSC-0201 gated", () => {
    setNodeEnv("production");
    try {
      assert.equal(loadCampsRealDevCatalog(), null);
      const catalog = loadCampsCatalog({
        hostname: PREVIEW_COMMIT_HOST,
        reviewFlag: "true",
      });
      assert.ok(catalog);
      assert.equal(catalog.sourceLabel, "dev_fixtures");
      assert.equal(catalog.includesFictionalFixtures, true);
      assert.ok(catalog.programs.some((p) => p.slug === "stem-explorers-dev"));
      assert.equal(
        catalog.programs.some((p) => p.slug === "nutty-summer-science-camp"),
        false,
      );
      assert.ok(resolvePublishedCampDetail("stem-explorers-dev", {
        hostname: PREVIEW_COMMIT_HOST,
        reviewFlag: "true",
      }));
      assert.equal(
        resolvePublishedCampDetail("nutty-summer-science-camp", {
          hostname: PREVIEW_COMMIT_HOST,
          reviewFlag: "true",
        }),
        null,
      );
    } finally {
      setNodeEnv(originalNodeEnv);
    }
  });
});
