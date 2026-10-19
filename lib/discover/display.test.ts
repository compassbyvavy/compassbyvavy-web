import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PARKS_EXAMPLES } from "@/data/discover/examples/parks";
import {
  displayCost,
  displayProviderHref,
  displayText,
  latestVerifiedLabel,
  listingFactRows,
} from "@/lib/discover/display";

describe("discover display", () => {
  it("labels a seed date and an unknown check without calling either live", () => {
    const dated = latestVerifiedLabel("2026-08-28");
    const unknown = latestVerifiedLabel(null);
    assert.match(dated, /^Latest verified /);
    assert.match(dated, /2026/);
    assert.equal(unknown, "Latest verified Unknown");
    assert.doesNotMatch(`${dated} ${unknown}`, /\blive\b/i);
  });

  it("renders missing text as Unknown", () => {
    assert.equal(displayText(null), "Unknown");
    assert.equal(displayText("  "), "Unknown");
    assert.equal(displayText("Example Harbour"), "Example Harbour");
  });

  it("does not invent a currency when only an amount is missing", () => {
    const beach = PARKS_EXAMPLES.find((row) => row.slug === "example-west-beach");
    assert.ok(beach);
    assert.equal(displayCost(beach), "Unknown");
  });

  it("keeps a full example price when amount, currency, and unit are all set", () => {
    const conservation = PARKS_EXAMPLES.find(
      (row) => row.slug === "example-quiet-conservation",
    );
    assert.ok(conservation);
    assert.equal(displayCost(conservation), "CAD 8 (per visit)");
  });

  it("rejects non-https provider links", () => {
    assert.equal(displayProviderHref(null), null);
    assert.equal(displayProviderHref("http://example.com/parks"), null);
    assert.equal(displayProviderHref("javascript:alert(1)"), null);
    assert.equal(
      displayProviderHref("https://example.com/parks/cedar-playground"),
      "https://example.com/parks/cedar-playground",
    );
  });

  it("shows Unknown for unfilled park facts", () => {
    const trail = PARKS_EXAMPLES.find((row) => row.slug === "example-ridge-trail");
    assert.ok(trail);
    const facts = Object.fromEntries(
      listingFactRows(trail).map((row) => [row.label, row.value]),
    );
    assert.equal(facts.City, "Unknown");
    assert.equal(facts.Washrooms, "Unknown");
    assert.equal(facts.Provider, "Example Ridge Conservancy");
    assert.equal(facts.Kind, "Trails");
  });
});
