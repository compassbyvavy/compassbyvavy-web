/**
 * Search-area chrome for /camps — labels, copy, and existing filter wiring.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CampsSearchArea,
  SEARCH_AREA_HEADING,
  SEARCH_AREA_LEDE,
  TIMING_CHIPS,
} from "@/components/camps/CampsSearchArea";
import {
  EMPTY_LISTING_FILTERS,
  type CampsListingFilters,
  type ListingFilterChip,
} from "@/lib/camps/listingFilter";

function render(
  props: Partial<Parameters<typeof CampsSearchArea>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(CampsSearchArea, {
      filters: EMPTY_LISTING_FILTERS,
      keywordDraft: "",
      onChange: () => {},
      onKeywordChange: () => {},
      onReset: () => {},
      onWhereChange: () => {},
      themeOptions: ["Arts", "STEM"],
      browseLabel: null,
      locationIndex: null,
      onRequestLocationIndex: () => {},
      ageFilterNotice: null,
      activeChips: [],
      onDismissChip: () => {},
      distanceReason: "Map and kilometre distance are not available yet.",
      ...props,
    }),
  );
}

describe("camps search area markup", () => {
  it("renders the search heading, lede, and four labelled controls", () => {
    const html = render();
    assert.match(html, new RegExp(`<h1>${SEARCH_AREA_HEADING}</h1>`));
    assert.match(html, new RegExp(SEARCH_AREA_LEDE.replace("'", "&#x27;")));
    assert.match(html, /Child's age|Child&#x27;s age/);
    assert.match(html, /When do you need camp\?/);
    assert.match(html, />Where\?</);
    assert.match(html, /What do they enjoy\?/);
    assert.match(html, /role="search"/);
    assert.match(html, /Whole years/);
    assert.match(html, /Age as of/);
  });

  it("keeps school-break shortcuts on the existing timing filter", () => {
    const html = render({
      filters: {
        ...EMPTY_LISTING_FILTERS,
        timingShortcut: "march_break",
      },
    });
    assert.match(html, /aria-label="School-break shortcuts"/);
    for (const chip of TIMING_CHIPS) {
      assert.match(html, new RegExp(chip.label));
    }
    assert.match(html, /aria-pressed="true"[^>]*>March Break/);
  });

  it("shows active filter chips and Clear all from the shared chip list", () => {
    const chips: ListingFilterChip[] = [
      { id: "timing", label: "Summer" },
      { id: "theme:STEM", label: "STEM" },
    ];
    const html = render({ activeChips: chips });
    assert.match(html, /aria-label="Selected filters"/);
    assert.match(html, /Remove filter Summer/);
    assert.match(html, /Remove filter STEM/);
    assert.match(html, />Clear all</);
  });

  it("does not invent a distance or availability control", () => {
    const html = render();
    assert.match(html, /kilometre distance are not available yet/);
    assert.doesNotMatch(html, /open now|seats left|available today/i);
    assert.doesNotMatch(html, /date of birth|grade 3/i);
    assert.match(html, /do not guess birthdays/);
  });

  it("binds enjoy and date controls to the existing filter fields", () => {
    const filters: CampsListingFilters = {
      ...EMPTY_LISTING_FILTERS,
      themes: ["STEM"],
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      keyword: "",
    };
    const html = render({
      filters,
      keywordDraft: "harbour",
    });
    assert.match(html, /<option[^>]*value="STEM"[^>]*selected[^>]*>STEM<\/option>|<option[^>]*selected[^>]*value="STEM"[^>]*>STEM<\/option>/);
    assert.match(html, /value="2026-07-01"/);
    assert.match(html, /value="2026-07-31"/);
    assert.match(html, /value="harbour"/);
  });
});
