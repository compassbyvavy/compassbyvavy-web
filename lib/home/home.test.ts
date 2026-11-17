import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOUNDER_NOTE,
  HEADER_CITIES,
  HOME_CATEGORIES,
  UNBUILT_LINKS,
  headerCityId,
  waitlistEmailError,
  waitlistMailto,
} from "@/lib/home/home";

describe("home page", () => {
  it("links every category to a real route", () => {
    for (const category of HOME_CATEGORIES) {
      assert.equal(category.href.startsWith("/"), true, category.label);
      assert.notEqual(category.href, "#");
    }
    assert.equal(HOME_CATEGORIES.find((category) => category.highlight)?.label, "Camps");
  });

  it("keeps Shop and the camp-listing links unbuilt", () => {
    assert.deepEqual(
      UNBUILT_LINKS.map((link) => link.label),
      ["Shop", "List your camp for free", "Update your listing"],
    );
    assert.ok(UNBUILT_LINKS.every((link) => link.href === "#"));
  });

  it("offers the four header cities and falls back to Mississauga", () => {
    assert.deepEqual(
      HEADER_CITIES.map((city) => city.label),
      ["Mississauga", "Oakville", "Brampton", "Toronto"],
    );
    assert.equal(headerCityId(null), "mississauga--r5");
    assert.equal(headerCityId("toronto--r5"), "toronto--r5");
    assert.equal(headerCityId("richmond--r10"), "mississauga--r5");
  });

  it("uses the existing waitlist mailbox and rejects a blank email", () => {
    assert.equal(waitlistEmailError(""), "Enter an email address.");
    assert.equal(waitlistEmailError("parent@example.com"), null);
    assert.match(waitlistMailto("parent@example.com"), /^mailto:hello@compassbyvavy\.ca\?/);
    assert.match(decodeURIComponent(waitlistMailto("parent@example.com")), /early-access list/);
    assert.equal(FOUNDER_NOTE, "");
  });
});
