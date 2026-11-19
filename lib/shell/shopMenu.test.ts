import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ShopPage from "@/app/shop/page";
import { MAIN_NAV } from "@/components/shell/SiteChrome";

describe("main menu", () => {
  it("lists Discover, Plan, Guides, Shop, Account, with Shop always present", () => {
    assert.deepEqual(
      MAIN_NAV.map((item) => item.label),
      ["Discover", "Plan", "Guides", "Shop", "Account"],
    );
    assert.equal(MAIN_NAV.find((item) => item.label === "Shop")?.href, "/shop");
  });
});

describe("shop page", () => {
  it("shows both coming products and records each product id, with no price, buy, or rating", () => {
    const html = renderToStaticMarkup(createElement(ShopPage));
    assert.match(html, /The Vavy shop/);
    assert.match(html, /Activity books and printables for family adventures\./);
    assert.match(html, /Winter Break Activity Pack/);
    assert.match(html, /Printable PDF/);
    assert.match(html, /Ages 3–10/);
    assert.match(html, /10 printables for snow days, car rides and the whole break\./);
    assert.match(html, /Coming this week/);
    assert.match(html, /name="product" value="winter-pack"/);
    assert.match(html, /Québec City Adventure Book/);
    assert.match(html, /Ages 6–8/);
    assert.match(html, /Puzzles, French words and sights for a family trip\./);
    assert.match(html, /Coming soon/);
    assert.match(html, /name="product" value="quebec-book"/);
    assert.match(html, /Notify me/);
    assert.doesNotMatch(html, /\$|Buy|price|★|☆|rating/i);
    assert.doesNotMatch(html, /type="checkbox"[^>]*checked/);
    assert.match(html, /name="company"/);
    assert.match(html, /tabindex="-1"/);
    assert.match(html, /aria-hidden="true"/);
  });
});
