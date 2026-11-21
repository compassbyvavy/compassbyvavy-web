import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import bundledReviewState from "@/data/camps/pages/review-state.json";
import { SubcategoryView } from "@/components/shell/DiscoverViews";
import {
  COOKSMART_CHECKED_SO_FAR,
  COOKSMART_WINTER_SLUG,
} from "@/lib/camps/pages/cooksmartWinter";
import {
  campPublishedOn,
  decideCamp,
  emptyReviewState,
  isCampLive,
  publishBatch,
  type ReviewState,
} from "@/lib/camps/pages/review";
import {
  readReviewState,
  resetReviewStateCacheForTests,
  writeReviewState,
} from "@/lib/camps/pages/store";
import { categoryBySlug, subcategoryBySlug } from "@/lib/taxonomy/catalog";
import { parentCopy } from "@/lib/voice/copy";

const today = "2026-11-21";
const camps = categoryBySlug("camps")!;
const winter = subcategoryBySlug(camps.id, "winter-break")!;

function winterBreakHtml(show: boolean): string {
  return renderToStaticMarkup(
    createElement(SubcategoryView, {
      city: "ontario",
      cityName: "Ontario",
      category: camps,
      subcategory: winter,
      showCooksmartCheckedSoFar: show,
    }),
  );
}

describe("bundled review-state for Worker deploys", () => {
  it("bundles a readable review state, and an empty state keeps COOKSMART hidden", () => {
    // The committed file holds real approvals, so only check its shape here.
    assert.ok(bundledReviewState && typeof bundledReviewState === "object");
    assert.ok(
      bundledReviewState.decisions &&
        typeof bundledReviewState.decisions === "object",
    );
    const empty = emptyReviewState();
    assert.equal(isCampLive(empty, COOKSMART_WINTER_SLUG), false);
    const html = winterBreakHtml(isCampLive(empty, COOKSMART_WINTER_SLUG));
    assert.doesNotMatch(html, new RegExp(parentCopy.checkedSoFar));
  });

  it("shows the live page gate and winter-break card when COOKSMART is approved and published", () => {
    const approved = decideCamp(emptyReviewState(), {
      slug: COOKSMART_WINTER_SLUG,
      status: "approved",
      today,
    });
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    const published = publishBatch(approved.state, {
      slugs: [COOKSMART_WINTER_SLUG],
      today,
    });
    assert.equal(published.ok, true);
    if (!published.ok) return;

    assert.equal(isCampLive(published.state, COOKSMART_WINTER_SLUG), true);
    assert.equal(
      campPublishedOn(published.state, COOKSMART_WINTER_SLUG),
      today,
    );

    const html = winterBreakHtml(
      isCampLive(published.state, COOKSMART_WINTER_SLUG),
    );
    assert.match(html, new RegExp(parentCopy.checkedSoFar));
    assert.match(html, new RegExp(`href="${COOKSMART_CHECKED_SO_FAR.href}"`));
  });

  it("keeps the in-memory copy after writeReviewState so local approve needs no restart", () => {
    // writeReviewState writes the real data/camps/pages/review-state.json, which holds
    // live approvals. Save it first and put it back byte for byte afterwards.
    const file = path.join(process.cwd(), "data/camps/pages/review-state.json");
    const original = readFileSync(file, "utf8");
    try {
      resetReviewStateCacheForTests();
      const approved = decideCamp(emptyReviewState(), {
        slug: COOKSMART_WINTER_SLUG,
        status: "approved",
        today,
      });
      assert.equal(approved.ok, true);
      if (!approved.ok) return;
      const published = publishBatch(approved.state, {
        slugs: [COOKSMART_WINTER_SLUG],
        today,
      });
      assert.equal(published.ok, true);
      if (!published.ok) return;

      writeReviewState(published.state);
      // Same process: memory must already have the publish without re-reading the file.
      assert.equal(isCampLive(readReviewState(), COOKSMART_WINTER_SLUG), true);
    } finally {
      writeFileSync(file, original);
      resetReviewStateCacheForTests();
    }
  });
});
