/**
 * Guest shortlist — device-local saved refs.
 *
 * Store stable public IDs only. Never persist copied mutable prices, names,
 * or unpublished details. Account sync is out of scope for this increment.
 */

export const SHORTLIST_STORAGE_KEY = "compass.shortlist.v1";
export const SHORTLIST_VERSION = 1 as const;

export type ShortlistRef =
  | { kind: "camp_session"; programId: string; sessionId: string }
  | { kind: "camp_program"; programId: string };

export type ShortlistItem = {
  /** Deterministic from the ref — not a catalog id. */
  entryId: string;
  ref: ShortlistRef;
  /** ISO timestamp when the parent saved this ref. */
  savedAt: string;
  /**
   * Parent-marked only. Null until the parent marks the session/program.
   * Outbound registration clicks must never set this.
   */
  registeredMarkedAt: string | null;
};

export type ShortlistPastReason = "removed" | "unavailable";

export type ShortlistPastItem = {
  entryId: string;
  ref: ShortlistRef;
  savedAt: string;
  movedAt: string;
  reason: ShortlistPastReason;
  registeredMarkedAt: string | null;
};

export type ShortlistState = {
  version: typeof SHORTLIST_VERSION;
  items: ShortlistItem[];
  past: ShortlistPastItem[];
};

export const EMPTY_SHORTLIST: ShortlistState = {
  version: SHORTLIST_VERSION,
  items: [],
  past: [],
};

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;
export const PAST_LIST_CAP = 40;
