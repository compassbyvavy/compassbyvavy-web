import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  campsDevPrograms,
  campsDevProviders,
  campsDevSessions,
  campsDevVenues,
} from "@/data/camps/fixtures.dev";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import { applySave } from "@/lib/shortlist/actions";
import { EMPTY_SHORTLIST } from "@/lib/shortlist/types";
import {
  resolvePastDisplay,
  resolveShortlist,
} from "@/lib/shortlist/resolve";

const NOW = new Date("2026-08-28T16:00:00.000Z");

const catalog: CampsCatalogBundle = {
  providers: campsDevProviders,
  venues: campsDevVenues,
  programs: campsDevPrograms,
  sessions: campsDevSessions,
  sourceLabel: "dev_fixtures",
  includesFictionalFixtures: true,
};

describe("shortlist resolve", () => {
  it("resolves public session facts from the catalog instead of stored prices", () => {
    let state = applySave(
      EMPTY_SHORTLIST,
      {
        kind: "camp_session",
        programId: "prog-dev-stem-explorers",
        sessionId: "sess-dev-stem-w1",
      },
      NOW,
    );
    const resolved = resolveShortlist(state, catalog, { now: NOW });
    assert.equal(resolved.catalogPending, false);
    assert.equal(resolved.active.length, 1);
    const item = resolved.active[0];
    assert.equal(item.kind, "session");
    if (item.kind !== "session") throw new Error("kind");
    assert.match(item.row.priceLabel, /285|CAD/i);
    assert.match(item.row.datesLabel, /Jul/);
    assert.equal(item.row.registration.displayState, "registration_open");
  });

  it("does not treat a missing catalog as unpublished", () => {
    const state = applySave(
      EMPTY_SHORTLIST,
      {
        kind: "camp_session",
        programId: "prog-dev-stem-explorers",
        sessionId: "sess-dev-stem-w1",
      },
      NOW,
    );
    const resolved = resolveShortlist(state, null);
    assert.equal(resolved.catalogPending, true);
    assert.equal(resolved.active.length, 1);
    assert.equal(resolved.active[0].kind, "catalog_pending");
  });

  it("hides unpublished names for unavailable past refs", () => {
    const past = resolvePastDisplay(
      {
        entryId: "camp_session:secret:sess-secret",
        ref: {
          kind: "camp_session",
          programId: "secret-program",
          sessionId: "sess-secret",
        },
        savedAt: NOW.toISOString(),
        movedAt: NOW.toISOString(),
        reason: "unavailable",
        registeredMarkedAt: null,
      },
      {
        programIds: new Set(catalog.programs.map((p) => p.id)),
        sessionIds: new Set(catalog.sessions.map((s) => s.id)),
        programsById: new Map(catalog.programs.map((p) => [p.id, p])),
        sessionsById: new Map(catalog.sessions.map((s) => [s.id, s])),
        providersById: new Map(catalog.providers.map((p) => [p.id, p])),
        venuesById: Object.fromEntries(catalog.venues.map((v) => [v.id, v])),
      },
    );
    assert.equal(past.publicLabel, null);
    assert.equal(past.href, null);
  });
});
