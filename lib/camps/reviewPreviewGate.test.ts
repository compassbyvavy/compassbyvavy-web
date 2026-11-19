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

describe("preview catalog — staging rows, never fixtures", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(value: string): void {
    Object.defineProperty(process.env, "NODE_ENV", {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  it("production catalog does not serve dev data without the dual gate", async () => {
    setNodeEnv("production");
    let calls = 0;
    const supabase = {
      url: "https://proj.supabase.co",
      anonKey: "anon-key",
      fetchImpl: async () => {
        calls += 1;
        return new Response("[]", { headers: { "Content-Range": "*/0" } });
      },
    };
    try {
      const production = await loadCampsCatalog({
        hostname: "compassbyvavy.ca",
        reviewFlag: "true",
        supabase,
        stagingSupabase: {
          url: "https://staging.supabase.co",
          anonKey: "staging-anon",
          fetchImpl: async () => {
            throw new Error("production must not read staging");
          },
        },
      });
      assert.equal(production.status, "empty");
      const previewWithoutStaging = await loadCampsCatalog({
        hostname: PREVIEW_COMMIT_HOST,
        reviewFlag: "true",
        supabase,
        stagingSupabase: null,
      });
      assert.equal(previewWithoutStaging.status, "failed");
      const flagWithoutPreviewHost = await loadCampsCatalog({
        hostname: "compassbyvavy.ca",
        reviewFlag: "true",
        supabase,
      });
      assert.equal(flagWithoutPreviewHost.status, "empty");
      assert.equal(calls, 2);
      for (const result of [production, previewWithoutStaging, flagWithoutPreviewHost]) {
        assert.notEqual(result.status, "ready");
      }
    } finally {
      setNodeEnv(originalNodeEnv);
    }
  });

  it("preview reads staging and never the fixture camps", async () => {
    setNodeEnv("production");
    const seen: string[] = [];
    const staging = {
      url: "https://staging.supabase.co",
      anonKey: "staging-anon",
      fetchImpl: async (url: string) => {
        seen.push(url);
        return new Response("[]", { headers: { "Content-Range": "*/0" } });
      },
    };
    const productionSupabase = {
      url: "https://proj.supabase.co",
      anonKey: "anon-key",
      fetchImpl: async () => {
        throw new Error("preview must not read the production project");
      },
    };
    try {
      assert.equal(loadCampsRealDevCatalog(), null);
      const result = await loadCampsCatalog({
        hostname: PREVIEW_COMMIT_HOST,
        reviewFlag: "true",
        supabase: productionSupabase,
        stagingSupabase: staging,
      });
      assert.equal(seen.length, 1);
      assert.match(seen[0], /^https:\/\/staging\.supabase\.co\//);
      assert.equal(result.status, "empty");
      assert.equal(
        await resolvePublishedCampDetail("stem-explorers-dev", {
          hostname: PREVIEW_COMMIT_HOST,
          reviewFlag: "true",
          stagingSupabase: staging,
        }),
        null,
      );
      const branchPreview = await loadCampsCatalog({
        hostname: PREVIEW_BRANCH_HOST,
        reviewFlag: undefined,
        supabase: productionSupabase,
        stagingSupabase: null,
      });
      assert.equal(branchPreview.status, "failed");
    } finally {
      setNodeEnv(originalNodeEnv);
    }
  });
});
