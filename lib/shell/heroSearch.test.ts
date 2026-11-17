import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHeroSearchHref } from "@/lib/shell/heroSearch";

describe("hero search href", () => {
  it("sends city, ages, and words to /discover", () => {
    const href = buildHeroSearchHref({
      citySlug: "mississauga",
      ages: "7",
      words: "splash pad",
    });
    const url = new URL(href, "http://localhost");
    assert.equal(url.pathname, "/discover");
    assert.equal(url.searchParams.get("city"), "mississauga");
    assert.equal(url.searchParams.get("ages"), "7");
    assert.equal(url.searchParams.get("q"), "splash pad");
  });

  it("omits empty fields and All of Ontario", () => {
    assert.equal(buildHeroSearchHref({ citySlug: "ontario", ages: "", words: "  " }), "/discover");
    assert.equal(buildHeroSearchHref({ citySlug: "ontario", ages: " 5 ", words: "" }), "/discover?ages=5");
    assert.equal(buildHeroSearchHref({ citySlug: "", ages: "", words: "kayak" }), "/discover?q=kayak");
  });
});
