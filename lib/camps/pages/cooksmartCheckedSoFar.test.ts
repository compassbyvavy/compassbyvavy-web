import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SubcategoryView } from "@/components/shell/DiscoverViews";
import {
  COOKSMART_CHECKED_SO_FAR,
  COOKSMART_WINTER_SLUG,
  cooksmartCheckedSoFarEligible,
} from "@/lib/camps/pages/cooksmartWinter";
import { categoryBySlug, subcategoryBySlug } from "@/lib/taxonomy/catalog";
import { parentCopy } from "@/lib/voice/copy";

const camps = categoryBySlug("camps")!;
const winter = subcategoryBySlug(camps.id, "winter-break")!;
const paDays = subcategoryBySlug(camps.id, "pa-days")!;

function render(input: {
  city: string;
  subcategory: typeof winter;
  show: boolean;
}): string {
  return renderToStaticMarkup(
    createElement(SubcategoryView, {
      city: input.city,
      cityName: input.city === "mississauga" ? "Mississauga" : "Ontario",
      category: camps,
      subcategory: input.subcategory,
      showCooksmartCheckedSoFar: input.show,
    }),
  );
}

describe("COOKSMART Checked so far on winter-break", () => {
  it("is eligible only for camps/winter-break in ontario or mississauga", () => {
    assert.equal(
      cooksmartCheckedSoFarEligible({
        city: "ontario",
        categorySlug: "camps",
        subcategorySlug: "winter-break",
      }),
      true,
    );
    assert.equal(
      cooksmartCheckedSoFarEligible({
        city: "mississauga",
        categorySlug: "camps",
        subcategorySlug: "winter-break",
      }),
      true,
    );
    assert.equal(
      cooksmartCheckedSoFarEligible({
        city: "toronto",
        categorySlug: "camps",
        subcategorySlug: "winter-break",
      }),
      false,
    );
    assert.equal(
      cooksmartCheckedSoFarEligible({
        city: "ontario",
        categorySlug: "camps",
        subcategorySlug: "pa-days",
      }),
      false,
    );
  });

  it("shows the card and links to /camps/cooksmart-winter when approved", () => {
    const html = render({ city: "ontario", subcategory: winter, show: true });
    assert.match(html, new RegExp(parentCopy.checkedSoFar));
    assert.match(html, new RegExp(`href="${COOKSMART_CHECKED_SO_FAR.href}"`));
    assert.match(html, new RegExp(COOKSMART_CHECKED_SO_FAR.title));
    assert.match(html, /\/camps\/cooksmart-winter/);
    assert.equal(COOKSMART_CHECKED_SO_FAR.href, `/camps/${COOKSMART_WINTER_SLUG}`);
  });

  it("omits the card when not approved", () => {
    const html = render({ city: "ontario", subcategory: winter, show: false });
    assert.doesNotMatch(html, new RegExp(parentCopy.checkedSoFar));
    assert.doesNotMatch(html, /cooksmart-winter/);
    assert.match(html, /Get a note when/);
  });

  it("omits the card on other subcategories even if show were true", () => {
    // Page never passes show=true for pa-days; prop false keeps markup unchanged.
    const html = render({ city: "ontario", subcategory: paDays, show: false });
    assert.doesNotMatch(html, new RegExp(parentCopy.checkedSoFar));
    assert.doesNotMatch(html, /cooksmart-winter/);
  });

  it("omits the card for other cities", () => {
    const html = render({ city: "toronto", subcategory: winter, show: false });
    assert.doesNotMatch(html, new RegExp(parentCopy.checkedSoFar));
  });
});
