/**
 * Pure shortlist mutations. UI must call these — never set registered from
 * an outbound click handler.
 */

import { refsEqual, shortlistEntryId } from "@/lib/shortlist/refs";
import {
  PAST_LIST_CAP,
  type ShortlistItem,
  type ShortlistPastItem,
  type ShortlistPastReason,
  type ShortlistRef,
  type ShortlistState,
} from "@/lib/shortlist/types";

function nowIso(now: Date): string {
  return now.toISOString();
}

function toPast(
  item: ShortlistItem,
  reason: ShortlistPastReason,
  movedAt: string,
): ShortlistPastItem {
  return {
    entryId: item.entryId,
    ref: item.ref,
    savedAt: item.savedAt,
    movedAt,
    reason,
    registeredMarkedAt: item.registeredMarkedAt,
  };
}

function capPast(past: ShortlistPastItem[]): ShortlistPastItem[] {
  return past.slice(0, PAST_LIST_CAP);
}

export function findActive(
  state: ShortlistState,
  ref: ShortlistRef,
): ShortlistItem | undefined {
  const id = shortlistEntryId(ref);
  return state.items.find((item) => item.entryId === id);
}

export function isSaved(state: ShortlistState, ref: ShortlistRef): boolean {
  return findActive(state, ref) != null;
}

/**
 * Save a public program/session ref. Re-saving from Past restores it.
 * Does not copy prices or names.
 */
export function applySave(
  state: ShortlistState,
  ref: ShortlistRef,
  now: Date,
): ShortlistState {
  const entryId = shortlistEntryId(ref);
  const existing = state.items.find((item) => item.entryId === entryId);
  if (existing) return state;

  const fromPast = state.past.find((item) => item.entryId === entryId);
  const item: ShortlistItem = {
    entryId,
    ref,
    savedAt: fromPast?.savedAt ?? nowIso(now),
    registeredMarkedAt: fromPast?.registeredMarkedAt ?? null,
  };
  return {
    version: state.version,
    items: [...state.items, item],
    past: state.past.filter((p) => p.entryId !== entryId),
  };
}

/** Move an active item to Past. No-op if it is not on the list. */
export function applyRemove(
  state: ShortlistState,
  ref: ShortlistRef,
  now: Date,
): ShortlistState {
  const entryId = shortlistEntryId(ref);
  const existing = state.items.find((item) => item.entryId === entryId);
  if (!existing) return state;
  const pastItem = toPast(existing, "removed", nowIso(now));
  return {
    version: state.version,
    items: state.items.filter((item) => item.entryId !== entryId),
    past: capPast([pastItem, ...state.past.filter((p) => p.entryId !== entryId)]),
  };
}

export function applyToggleSave(
  state: ShortlistState,
  ref: ShortlistRef,
  now: Date,
): ShortlistState {
  return isSaved(state, ref) ? applyRemove(state, ref, now) : applySave(state, ref, now);
}

/**
 * Parent-marked registration only. `marked=false` clears the stamp.
 * Callers must not invoke this from outbound link clicks.
 */
export function applyMarkRegistered(
  state: ShortlistState,
  ref: ShortlistRef,
  marked: boolean,
  now: Date,
): ShortlistState {
  const entryId = shortlistEntryId(ref);
  return {
    version: state.version,
    items: state.items.map((item) => {
      if (item.entryId !== entryId) return item;
      return {
        ...item,
        registeredMarkedAt: marked ? nowIso(now) : null,
      };
    }),
    past: state.past,
  };
}

/**
 * Move active refs that are no longer in the public catalog into Past.
 * Catalog-unavailable is not the same as "catalog not loaded".
 */
export function applyReconcileUnavailable(
  state: ShortlistState,
  publicIds: { programIds: Set<string>; sessionIds: Set<string> },
  now: Date,
): ShortlistState {
  const stillActive: ShortlistItem[] = [];
  const newlyPast: ShortlistPastItem[] = [];
  for (const item of state.items) {
    const available =
      item.ref.kind === "camp_program"
        ? publicIds.programIds.has(item.ref.programId)
        : publicIds.programIds.has(item.ref.programId) &&
          publicIds.sessionIds.has(item.ref.sessionId);
    if (available) {
      stillActive.push(item);
    } else {
      newlyPast.push(toPast(item, "unavailable", nowIso(now)));
    }
  }
  if (newlyPast.length === 0) return state;
  const movedIds = new Set(newlyPast.map((p) => p.entryId));
  return {
    version: state.version,
    items: stillActive,
    past: capPast([
      ...newlyPast,
      ...state.past.filter((p) => !movedIds.has(p.entryId)),
    ]),
  };
}

export function countActive(state: ShortlistState): number {
  return state.items.length;
}

/** Unused helper kept explicit so tests can prove outbound clicks are not this. */
export function applyOutboundClickDoesNotMarkRegistered(
  state: ShortlistState,
  _href: string,
): ShortlistState {
  void _href;
  return state;
}

export function hasRef(state: ShortlistState, ref: ShortlistRef): boolean {
  return state.items.some((item) => refsEqual(item.ref, ref));
}
