import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ackClearsLocalCopy,
  captureGuestState,
  clearSyncedGuestCopies,
  rememberView,
} from "@/lib/account/guestState";
import { syncGuestState } from "@/lib/account/sync";
import { SHORTLIST_STORAGE_KEY } from "@/lib/shortlist/types";

function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => data.delete(key),
    setItem: (key, value) => data.set(key, value),
  };
}

describe("opt-in guest sync", () => {
  it("keeps local copies until the server ack", async () => {
    const local = memory();
    local.setItem(
      SHORTLIST_STORAGE_KEY,
      JSON.stringify({ version: 1, items: [], past: [] }),
    );
    rememberView(local, {
      listingId: "prog-1",
      href: "/camps/example",
      viewedAt: "2026-10-17T00:00:00.000Z",
    });
    const failed = await syncGuestState({
      localStorage: local,
      sessionStorage: memory(),
      now: new Date("2026-10-17T12:00:00.000Z"),
      post: async () => new Response(JSON.stringify({ ok: false }), { status: 500 }),
    });
    assert.equal(failed.ok, false);
    assert.ok(local.getItem(SHORTLIST_STORAGE_KEY));
    const snapshot = captureGuestState(local, null, new Date("2026-10-17T12:00:00.000Z"));
    assert.equal(snapshot.viewHistory[0]?.listingId, "prog-1");

    const ok = await syncGuestState({
      localStorage: local,
      sessionStorage: null,
      post: async () =>
        new Response(
          JSON.stringify({ ok: true, acceptedAt: "2026-10-17T12:01:00.000Z" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });
    assert.equal(ok.ok, true);
    assert.equal(local.getItem(SHORTLIST_STORAGE_KEY), null);
    assert.equal(ackClearsLocalCopy({ ok: true, acceptedAt: "" }), false);
  });

  it("does not clear when the ack flag is missing", () => {
    const local = memory();
    local.setItem(SHORTLIST_STORAGE_KEY, "{}");
    assert.equal(ackClearsLocalCopy({ ok: true }), false);
    if (!ackClearsLocalCopy({ ok: false, acceptedAt: "x" })) {
      /* leave it */
    } else {
      clearSyncedGuestCopies(local, null);
    }
    assert.equal(local.getItem(SHORTLIST_STORAGE_KEY), "{}");
  });
});
