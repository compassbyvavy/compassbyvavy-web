import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EverythingTabs } from "@/components/shell/EverythingTabs";
import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { orderForSeason, publicCategories, subcategoriesFor } from "@/lib/taxonomy/catalog";

describe("Everything on Compass", () => {
  it("prints all 99 subcategory links, and hides every panel except the first", () => {
    const categories = publicCategories().map((category) => ({
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      subs: orderForSeason(subcategoriesFor(category.id)).map((row) => ({
        slug: row.slug,
        name: row.name,
      })),
    }));
    const html = renderToStaticMarkup(createElement(EverythingTabs, { city: "ontario", categories }));
    const links = html.match(/<a /g) ?? [];
    assert.equal(links.length, 99);
    assert.equal(categories.reduce((sum, category) => sum + category.subs.length, 0), 99);
    const panels = html.match(/role="tabpanel"/g) ?? [];
    assert.equal(panels.length, 9);
    const hidden = html.match(/hidden=""/g) ?? [];
    assert.equal(hidden.length, 8);
    assert.match(html, /href="\/ontario\/camps\/pa-days"/);
    assert.match(html, /href="\/ontario\/play-fun\/indoor-playgrounds"/);
  });
});

describe("waitlist honeypot", () => {
  it("keeps Company out of the tab order and the accessibility tree", () => {
    const html = renderToStaticMarkup(
      createElement(WaitlistForm, { idPrefix: "home-waitlist", sourcePage: "/" }),
    );
    assert.match(html, /class="hp"/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /tabindex="-1"/);
    assert.match(html, /name="company"/);
    assert.doesNotMatch(html, /type="checkbox"[^>]*checked/);
  });
});
