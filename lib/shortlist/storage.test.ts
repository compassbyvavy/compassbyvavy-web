import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMarkRegistered,
  applyOutboundClickDoesNotMarkRegistered,
  applyReconcileUnavailable,
  applyRemove,
  applySave,
  applyToggleSave,
  isSaved,
} from "@/lib/shortlist/actions";
import { saveRefForCard, saveRefForDetail, shortlistEntryId } from "@/lib/shortlist/refs";
import {
  parseShortlistJson,
  serializeShortlist,
} from "@/lib/shortlist/storage";
import { EMPTY_SHORTLIST, type ShortlistRef } from "@/lib/shortlist/types";
import type { CampProgram, CampSession } from "@/data/camps/types";

const NOW = new Date("2026-08-28T16:00:00.000Z");

const sessionRef: ShortlistRef = {
  kind: "camp_session",
  programId: "prog-dev-stem-explorers",
  sessionId: "sess-dev-stem-w1",
};

const programRef: ShortlistRef = {
  kind: "camp_program",
  programId: "prog-dev-stem-explorers",
};

describe("shortlist storage", () => {
  it("stores stable public IDs and drops copied prices/names", () => {
    const dirty = JSON.stringify({
      version: 1,
      items: [
        {
          ref: {
            kind: "camp_session",
            programId: "prog-dev-stem-explorers",
            sessionId: "sess-dev-stem-w1",
            priceAmount: 285,
            priceUnit: "per_week",
            currency: "CAD",
            name: "STEM Explorers",
          },
          savedAt: "2026-08-20T12:00:00.000Z",
          programName: "STEM Explorers",
          priceAmount: 999,
        },
      ],
      past: [],
    });
    const parsed = parseShortlistJson(dirty);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].ref.kind, "camp_session");
    if (parsed.items[0].ref.kind !== "camp_session") throw new Error("kind");
    assert.equal(parsed.items[0].ref.sessionId, "sess-dev-stem-w1");
    assert.equal(parsed.items[0].ref.programId, "prog-dev-stem-explorers");
    assert.equal(
      parsed.items[0].entryId,
      "camp_session:prog-dev-stem-explorers:sess-dev-stem-w1",
    );
    const serialized = serializeShortlist(parsed);
    assert.doesNotMatch(serialized, /285|999|STEM Explorers|per_week/);
    assert.match(serialized, /sess-dev-stem-w1/);
  });

  it("treats invalid JSON as an empty guest list", () => {
    const empty = parseShortlistJson("{not json");
    assert.equal(empty.items.length, 0);
    assert.equal(empty.past.length, 0);
  });

  it("rejects unsafe ids and unknown kinds", () => {
    const parsed = parseShortlistJson(
      JSON.stringify({
        items: [
          { ref: { kind: "camp_session", programId: "http://evil", sessionId: "x" } },
          { ref: { kind: "place", programId: "p1" } },
        ],
      }),
    );
    assert.equal(parsed.items.length, 0);
  });
});

describe("shortlist save / remove / registered", () => {
  it("saves and removes without requiring an account", () => {
    let state = applySave(EMPTY_SHORTLIST, sessionRef, NOW);
    assert.equal(isSaved(state, sessionRef), true);
    assert.equal(state.items[0].registeredMarkedAt, null);
    state = applyRemove(state, sessionRef, NOW);
    assert.equal(isSaved(state, sessionRef), false);
    assert.equal(state.past.length, 1);
    assert.equal(state.past[0].reason, "removed");
  });

  it("restores a removed ref without duplicating it", () => {
    let state = applySave(EMPTY_SHORTLIST, programRef, NOW);
    state = applyRemove(state, programRef, NOW);
    state = applySave(state, programRef, NOW);
    assert.equal(state.items.length, 1);
    assert.equal(state.past.length, 0);
    state = applyToggleSave(state, programRef, NOW);
    assert.equal(state.items.length, 0);
  });

  it("marks registered only via the parent-marked helper", () => {
    let state = applySave(EMPTY_SHORTLIST, sessionRef, NOW);
    const afterClick = applyOutboundClickDoesNotMarkRegistered(
      state,
      "https://example.invalid/oakridge/stem",
    );
    assert.equal(afterClick.items[0].registeredMarkedAt, null);
    state = applyMarkRegistered(state, sessionRef, true, NOW);
    assert.equal(state.items[0].registeredMarkedAt, NOW.toISOString());
    state = applyMarkRegistered(state, sessionRef, false, NOW);
    assert.equal(state.items[0].registeredMarkedAt, null);
  });

  it("moves missing public IDs to Past as unavailable", () => {
    let state = applySave(EMPTY_SHORTLIST, sessionRef, NOW);
    state = applyReconcileUnavailable(
      state,
      {
        programIds: new Set(["other-program"]),
        sessionIds: new Set(["other-session"]),
      },
      NOW,
    );
    assert.equal(state.items.length, 0);
    assert.equal(state.past[0].reason, "unavailable");
    assert.equal(state.past[0].entryId, shortlistEntryId(sessionRef));
  });
});

describe("shortlist card/detail refs", () => {
  const program = { id: "prog-a", slug: "a", providerId: "p", name: "A" } as CampProgram;
  const s1 = { id: "sess-1", programId: "prog-a", registrationStatus: "registration_open" } as CampSession;
  const s2 = { id: "sess-2", programId: "prog-a", registrationStatus: "waitlist" } as CampSession;

  it("saves a session from a one-session (flat) card and a program from grouped cards", () => {
    const flat = saveRefForCard(program, [s1]);
    assert.deepEqual(flat, {
      kind: "camp_session",
      programId: "prog-a",
      sessionId: "sess-1",
    });
    const grouped = saveRefForCard(program, [s1, s2]);
    assert.deepEqual(grouped, { kind: "camp_program", programId: "prog-a" });
    const awaiting = saveRefForCard(program, []);
    assert.deepEqual(awaiting, { kind: "camp_program", programId: "prog-a" });
  });

  it("saves the selected detail session, or the program when none is selected", () => {
    assert.deepEqual(saveRefForDetail(program, "sess-1"), {
      kind: "camp_session",
      programId: "prog-a",
      sessionId: "sess-1",
    });
    assert.deepEqual(saveRefForDetail(program, null), {
      kind: "camp_program",
      programId: "prog-a",
    });
  });
});
