import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE_NAV_LINKS, isSiteNavActive } from "@/lib/site/siteNav";

describe("site navigation", () => {
  it("shows exactly Discover, Plan, Learn and Account, in that order", () => {
    assert.deepEqual(
      SITE_NAV_LINKS.map((link) => link.label),
      ["Discover", "Plan", "Learn", "Account"],
    );
  });

  it("does not list later or out-of-scope sections", () => {
    const labels = SITE_NAV_LINKS.map((link) => link.label).join(" ");
    for (const later of ["Profile", "Services", "Community", "Camps", "Tracker"]) {
      assert.equal(labels.includes(later), false, later);
    }
  });

  it("highlights the section a page belongs to", () => {
    assert.equal(isSiteNavActive("/camps", "discover"), true);
    assert.equal(isSiteNavActive("/camps/some-camp", "discover"), true);
    assert.equal(isSiteNavActive("/discover/play", "discover"), true);
    assert.equal(isSiteNavActive("/saved", "plan"), true);
    assert.equal(isSiteNavActive("/saved/tracker", "plan"), true);
    assert.equal(isSiteNavActive("/calendar", "plan"), true);
    assert.equal(isSiteNavActive("/learn", "learn"), true);
    assert.equal(isSiteNavActive("/account", "account"), true);
  });

  it("highlights nothing on the home page and does not match look-alike paths", () => {
    for (const link of SITE_NAV_LINKS) {
      assert.equal(isSiteNavActive("/", link.id), false, link.id);
    }
    assert.equal(isSiteNavActive("/savedsearch", "plan"), false);
    assert.equal(isSiteNavActive("/learning", "learn"), false);
  });
});
