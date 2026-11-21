import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CookSmartWinterPage } from "@/components/camps/pages/CookSmartWinterPage";
import { listingBySlug } from "@/lib/camps/pages/batch1";
import {
  COOKSMART_BOOKING_URLS,
  COOKSMART_CHECKED_SO_FAR,
  COOKSMART_DAYS,
  COOKSMART_DIRECTIONS_ADDRESS,
  COOKSMART_PAGE_META,
  COOKSMART_WINTER_SLUG,
  cooksmartBookingUrl,
  cooksmartDirectionsUrl,
  cooksmartPageMetadata,
  cooksmartTaxTotal,
  cooksmartWinter,
  sortedCooksmartPicks,
  summarizeCooksmartBar,
  withCooksmartExclusivePick,
} from "@/lib/camps/pages/cooksmartWinter";

describe("COOKSMART winter Format C", () => {
  it("sets the public page title and description (indexable like other shell pages)", () => {
    assert.equal(
      COOKSMART_PAGE_META.title,
      "COOKSMART Winter Holiday Cooking Camp, Mississauga",
    );
    assert.equal(
      COOKSMART_PAGE_META.description,
      "Screen-free cooking camp for ages 5–12: kids cook lunch, bake and learn life skills. Book single days, Dec 21–23 & 28–30, 2026.",
    );
    assert.equal(COOKSMART_PAGE_META.path, `/camps/${COOKSMART_WINTER_SLUG}`);
    const meta = cooksmartPageMetadata();
    assert.equal(meta.title, COOKSMART_PAGE_META.title);
    assert.equal(meta.description, COOKSMART_PAGE_META.description);
    assert.deepEqual(meta.robots, { index: true, follow: true });
    assert.equal(cooksmartWinter.providerLine, "COOKSMART · 1700 Mazo Crescent, Mississauga");
    assert.equal(COOKSMART_CHECKED_SO_FAR.placeLine, "COOKSMART · Mississauga");
    assert.equal(listingBySlug(COOKSMART_WINTER_SLUG)?.place, "1700 Mazo Crescent, Mississauga");
  });

  it("empty bar says Pick a day and links to #sessions", () => {
    const bar = summarizeCooksmartBar([]);
    assert.equal(bar.buttonLabel, "Pick a day");
    assert.equal(bar.href, "#sessions");
    assert.equal(bar.openInNewTab, false);
    assert.equal(bar.title, "Pick a day");
  });

  it("Dec 22 half opens its own link with HST", () => {
    const bar = summarizeCooksmartBar([{ dayId: "dec-22", kind: "half" }]);
    assert.equal(bar.href, cooksmartBookingUrl("half", "2026-12-22"));
    assert.equal(bar.title, "1 picked · $67 + HST = $75.71");
    assert.equal(bar.buttonLabel, "Book Dec 22 half day ↗");
    assert.equal(bar.openInNewTab, true);
    assert.equal(cooksmartTaxTotal(67), "75.71");
  });

  it("three days show booking list totals and the right links", () => {
    const picks = [
      { dayId: "dec-21", kind: "full" as const },
      { dayId: "dec-22", kind: "half" as const },
      { dayId: "dec-30", kind: "full" as const },
    ];
    const bar = summarizeCooksmartBar(picks);
    assert.equal(bar.title, "3 picked · $263 + HST = $297.19");
    assert.equal(bar.buttonLabel, "Book your 3 days");
    assert.equal(bar.href, "#booklist");
    assert.equal(bar.showBookingList, true);
    assert.deepEqual(
      picks.map((pick) => {
        const day = COOKSMART_DAYS.find((row) => row.id === pick.dayId)!;
        return cooksmartBookingUrl(pick.kind, day.iso);
      }),
      [
        cooksmartBookingUrl("full", "2026-12-21"),
        cooksmartBookingUrl("half", "2026-12-22"),
        cooksmartBookingUrl("full", "2026-12-30"),
      ],
    );
  });

  it("full on a date clears half on that date", () => {
    const half = withCooksmartExclusivePick([], { dayId: "dec-21", kind: "half" });
    const full = withCooksmartExclusivePick(half, { dayId: "dec-21", kind: "full" });
    assert.deepEqual(full, [{ dayId: "dec-21", kind: "full" }]);
  });

  it("booking list is in date order, not click order", () => {
    const picked = [
      { dayId: "dec-22", kind: "half" as const },
      { dayId: "dec-21", kind: "full" as const },
      { dayId: "dec-30", kind: "full" as const },
    ];
    assert.deepEqual(
      sortedCooksmartPicks(picked).map((pick) => pick.dayId),
      ["dec-21", "dec-22", "dec-30"],
    );
  });

  it("writes all 12 booking URLs with the right type and date", () => {
    assert.equal(COOKSMART_BOOKING_URLS.length, 12);
    const expected = COOKSMART_DAYS.flatMap((day) => [
      cooksmartBookingUrl("full", day.iso),
      cooksmartBookingUrl("half", day.iso),
    ]);
    assert.deepEqual([...COOKSMART_BOOKING_URLS], expected);
    for (const day of COOKSMART_DAYS) {
      const full = cooksmartBookingUrl("full", day.iso);
      const half = cooksmartBookingUrl("half", day.iso);
      assert.match(full, /appointment\/99733065\//);
      assert.match(half, /appointment\/99732924\//);
      assert.match(full, new RegExp(`datetime/${day.iso}T09`));
      assert.match(half, new RegExp(`datetime/${day.iso}T09`));
    }
  });

  it("askTheCamp questions show Ask the camp", () => {
    const asks = cooksmartWinter.questions.filter((q) => q.askTheCamp);
    assert.equal(asks.length, 7);
    for (const q of asks) {
      assert.equal(q.shortAnswer, null);
    }
    const html = renderToStaticMarkup(createElement(CookSmartWinterPage));
    assert.match(html, /class="a ask">Ask the camp</);
  });

  it("Directions URL encodes 1700 Mazo Crescent with ON", () => {
    assert.equal(
      cooksmartDirectionsUrl(),
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(COOKSMART_DIRECTIONS_ADDRESS)}`,
    );
    assert.match(cooksmartDirectionsUrl(), /Mississauga%2C%20ON%20L5J%201Y8/);
  });

  it("does not render review-only banners or Review notes", () => {
    const html = renderToStaticMarkup(createElement(CookSmartWinterPage));
    assert.doesNotMatch(html, /FORMAT C/);
    assert.doesNotMatch(html, /Review draft: not published/);
    assert.doesNotMatch(html, /Review notes \(only you see this box\)/);
    assert.doesNotMatch(html, /Save removed/);
    assert.match(html, /Your booking list|Pick a day/);
    assert.match(html, /Directions to 1700 Mazo Crescent/);
  });

  it("keeps the reference file as the design source", () => {
    const reference = readFileSync(
      new URL("../../../docs/camps/pages/reference/cooksmart-winter.html", import.meta.url),
      "utf8",
    );
    assert.match(reference, /Your booking list/);
    assert.match(reference, /Directions to 1700 Mazo Crescent/);
  });
});
