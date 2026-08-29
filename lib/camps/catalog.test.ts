import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadCampsCatalog,
  resolveCatalogProgramBySlug,
} from "@/lib/camps/catalog";
import { loadCampsRealDevCatalog } from "@/lib/camps/realDevCatalog";

describe("camps real-dev catalog adapter", () => {
  it("loads only MSC-0201 Nutty Scientists in non-production", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    assert.equal(catalog.sourceLabel, "real_dev");
    assert.equal(catalog.sourceCandidateId, "MSC-0201");
    assert.equal(catalog.programs.length, 1);
    assert.equal(catalog.providers.length, 1);
    assert.equal(catalog.venues.length, 1);
    assert.equal(catalog.programs[0].slug, "nutty-summer-science-camp");
    assert.equal(catalog.providers[0].name, "Nutty Scientists Canada");
    assert.equal(catalog.sessions.length, 8);
    // No fictional fixture program ids.
    assert.ok(
      !catalog.programs.some((p) => p.id.startsWith("prog-dev-")),
    );
  });

  it("session rows keep own venue, ages, and do not invent scarcity seats", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    for (const session of catalog.sessions) {
      assert.equal(session.venueId, "venue-vic-johnson-community-centre");
      assert.ok(session.ageMin != null && session.ageMax != null);
      assert.equal(session.seatAvailability, "unknown");
      assert.ok(session.registrationUrl);
      assert.equal(session.sourceUrl, "https://nuttyscientistscanada.ca/summercamp");
    }
    const ages = new Set(
      catalog.sessions.map((s) => `${s.ageMin}-${s.ageMax}`),
    );
    assert.deepEqual([...ages].sort(), ["5-7", "8-10"]);
  });

  it("resolves detail by slug with session-owned facts", () => {
    const catalog = loadCampsCatalog();
    assert.ok(catalog);
    const detail = resolveCatalogProgramBySlug(
      catalog,
      "nutty-summer-science-camp",
    );
    assert.ok(detail);
    assert.equal(detail.sessions.length, 8);
    assert.ok(detail.venuesById["venue-vic-johnson-community-centre"]);
    assert.equal(
      resolveCatalogProgramBySlug(catalog, "stem-explorers-dev"),
      null,
    );
  });

  it("soft-loads null in production (fixture-style gate)", () => {
    const prev = process.env.NODE_ENV;
    // @ts-expect-error test override
    process.env.NODE_ENV = "production";
    try {
      assert.equal(loadCampsRealDevCatalog(), null);
      assert.equal(loadCampsCatalog(), null);
    } finally {
      // @ts-expect-error restore
      process.env.NODE_ENV = prev;
    }
  });
});
