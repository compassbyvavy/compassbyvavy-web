import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PARKS_EXAMPLES } from "@/data/discover/examples/parks";
import {
  applyReconcileUnavailable,
  applySave,
  applyToggleSave,
  isSaved,
} from "@/lib/shortlist/actions";
import { saveRefForDiscoverListing, shortlistEntryId } from "@/lib/shortlist/refs";
import { resolveShortlist } from "@/lib/shortlist/resolve";
import { parseShortlistJson, serializeShortlist } from "@/lib/shortlist/storage";
import { EMPTY_SHORTLIST } from "@/lib/shortlist/types";

const NOW = new Date("2026-08-28T16:00:00.000Z");
const park = PARKS_EXAMPLES[0];
const parkRef = saveRefForDiscoverListing(park.id);

describe("discover saves on the shared list", () => {
  it("stores the listing id and drops copied titles", () => {
    const state = applySave(EMPTY_SHORTLIST, parkRef, NOW);
    const serialized = serializeShortlist(state);
    assert.match(serialized, new RegExp(park.id));
    assert.doesNotMatch(serialized, /Cedar Playground/);
    const parsed = parseShortlistJson(serialized);
    assert.equal(parsed.items[0].ref.kind, "discover_listing");
    if (parsed.items[0].ref.kind !== "discover_listing") throw new Error("kind");
    assert.equal(parsed.items[0].ref.listingId, park.id);
    assert.equal(parsed.items[0].entryId, shortlistEntryId(parkRef));
    assert.equal(isSaved(parsed, parkRef), true);
  });

  it("resolves the place from the example catalog when camps are not loaded", () => {
    const state = applySave(EMPTY_SHORTLIST, parkRef, NOW);
    const resolved = resolveShortlist(state, null, {
      discoverListings: PARKS_EXAMPLES,
    });
    assert.equal(resolved.catalogPending, true);
    assert.equal(resolved.active.length, 1);
    assert.equal(resolved.active[0].kind, "discover");
    if (resolved.active[0].kind !== "discover") throw new Error("kind");
    assert.equal(resolved.active[0].listing.title, park.title);
  });

  it("leaves a discover save alone when only camp ids are reconciled", () => {
    const state = applySave(EMPTY_SHORTLIST, parkRef, NOW);
    const next = applyReconcileUnavailable(
      state,
      { programIds: new Set(), sessionIds: new Set() },
      NOW,
    );
    assert.equal(next.items.length, 1);
  });

  it("moves a discover save to past when it leaves the catalog", () => {
    const state = applySave(EMPTY_SHORTLIST, parkRef, NOW);
    const next = applyReconcileUnavailable(
      state,
      {
        programIds: new Set(),
        sessionIds: new Set(),
        campsCatalogLoaded: false,
        discoverListingIds: new Set(),
      },
      NOW,
    );
    assert.equal(next.items.length, 0);
    assert.equal(next.past[0].reason, "unavailable");
    assert.equal(next.past[0].ref.kind, "discover_listing");
  });

  it("toggles the same ref as a camp save would", () => {
    const saved = applyToggleSave(EMPTY_SHORTLIST, parkRef, NOW);
    assert.equal(isSaved(saved, parkRef), true);
    const removed = applyToggleSave(saved, parkRef, NOW);
    assert.equal(isSaved(removed, parkRef), false);
  });
});
