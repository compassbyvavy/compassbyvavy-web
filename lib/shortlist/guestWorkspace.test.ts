import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySave } from "@/lib/shortlist/actions";
import { buildGuestWorkspaceSnapshot } from "@/lib/shortlist/guestWorkspace";
import { parseShortlistJson } from "@/lib/shortlist/storage";
import { EMPTY_SHORTLIST } from "@/lib/shortlist/types";

const NOW = new Date("2026-08-28T16:00:00.000Z");

describe("guest workspace snapshot", () => {
  it("serializes the local shortlist without copying prices", () => {
    const state = applySave(
      EMPTY_SHORTLIST,
      {
        kind: "camp_session",
        programId: "prog-dev-stem-explorers",
        sessionId: "sess-dev-stem-w1",
      },
      NOW,
    );
    const snap = buildGuestWorkspaceSnapshot(state, NOW);
    assert.equal(snap.version, 1);
    assert.doesNotMatch(snap.shortlistJson, /priceAmount|285/);
    const roundTrip = parseShortlistJson(snap.shortlistJson);
    assert.equal(roundTrip.items.length, 1);
  });
});
