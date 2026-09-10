/**
 * Parse / serialize guest shortlist state. Strips copied prices and names.
 */

import { isSafePublicId, shortlistEntryId } from "@/lib/shortlist/refs";
import {
  EMPTY_SHORTLIST,
  PAST_LIST_CAP,
  SHORTLIST_STORAGE_KEY,
  SHORTLIST_VERSION,
  type ShortlistItem,
  type ShortlistPastItem,
  type ShortlistPastReason,
  type ShortlistRef,
  type ShortlistState,
} from "@/lib/shortlist/types";

const DROPPED_MUTABLE_KEYS = [
  "priceAmount",
  "priceUnit",
  "currency",
  "feeNotes",
  "name",
  "programName",
  "providerName",
  "label",
  "title",
] as const;

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

function parseRef(raw: unknown): ShortlistRef | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (rec.kind === "camp_session") {
    if (!isSafePublicId(rec.programId) || !isSafePublicId(rec.sessionId)) {
      return null;
    }
    return {
      kind: "camp_session",
      programId: rec.programId.trim(),
      sessionId: rec.sessionId.trim(),
    };
  }
  if (rec.kind === "camp_program") {
    if (!isSafePublicId(rec.programId)) return null;
    return { kind: "camp_program", programId: rec.programId.trim() };
  }
  return null;
}

function parseItem(raw: unknown): ShortlistItem | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const ref = parseRef(rec.ref);
  if (!ref) return null;
  const savedAt = isIsoTimestamp(rec.savedAt)
    ? rec.savedAt
    : new Date(0).toISOString();
  const registeredMarkedAt = isIsoTimestamp(rec.registeredMarkedAt)
    ? rec.registeredMarkedAt
    : null;
  return {
    entryId: shortlistEntryId(ref),
    ref,
    savedAt,
    registeredMarkedAt,
  };
}

function parsePastReason(value: unknown): ShortlistPastReason | null {
  if (value === "removed" || value === "unavailable") return value;
  return null;
}

function parsePastItem(raw: unknown): ShortlistPastItem | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const ref = parseRef(rec.ref);
  const reason = parsePastReason(rec.reason);
  if (!ref || !reason) return null;
  const savedAt = isIsoTimestamp(rec.savedAt)
    ? rec.savedAt
    : new Date(0).toISOString();
  const movedAt = isIsoTimestamp(rec.movedAt)
    ? rec.movedAt
    : savedAt;
  const registeredMarkedAt = isIsoTimestamp(rec.registeredMarkedAt)
    ? rec.registeredMarkedAt
    : null;
  return {
    entryId: shortlistEntryId(ref),
    ref,
    savedAt,
    movedAt,
    reason,
    registeredMarkedAt,
  };
}

function dedupeByEntryId<T extends { entryId: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.entryId)) continue;
    seen.add(row.entryId);
    out.push(row);
  }
  return out;
}

function stripMutableCopies(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripMutableCopies);
  if (!value || typeof value !== "object") return value;
  const rec = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(rec)) {
    if ((DROPPED_MUTABLE_KEYS as readonly string[]).includes(key)) continue;
    next[key] = stripMutableCopies(nested);
  }
  return next;
}

/**
 * Parse untrusted localStorage JSON. Invalid payloads become an empty list.
 * Copied prices/names are dropped even if present.
 */
export function parseShortlistJson(raw: string | null | undefined): ShortlistState {
  if (raw == null || raw.trim() === "") return { ...EMPTY_SHORTLIST, items: [], past: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY_SHORTLIST, items: [], past: [] };
  }
  const stripped = stripMutableCopies(parsed);
  if (!stripped || typeof stripped !== "object") {
    return { ...EMPTY_SHORTLIST, items: [], past: [] };
  }
  const rec = stripped as Record<string, unknown>;
  const items = Array.isArray(rec.items)
    ? dedupeByEntryId(rec.items.map(parseItem).filter((x): x is ShortlistItem => x != null))
    : [];
  const past = Array.isArray(rec.past)
    ? dedupeByEntryId(
        rec.past.map(parsePastItem).filter((x): x is ShortlistPastItem => x != null),
      ).slice(0, PAST_LIST_CAP)
    : [];
  const activeIds = new Set(items.map((i) => i.entryId));
  return {
    version: SHORTLIST_VERSION,
    items,
    past: past.filter((p) => !activeIds.has(p.entryId)),
  };
}

export function serializeShortlist(state: ShortlistState): string {
  const payload: ShortlistState = {
    version: SHORTLIST_VERSION,
    items: state.items.map((item) => ({
      entryId: item.entryId,
      ref: item.ref,
      savedAt: item.savedAt,
      registeredMarkedAt: item.registeredMarkedAt,
    })),
    past: state.past.slice(0, PAST_LIST_CAP).map((item) => ({
      entryId: item.entryId,
      ref: item.ref,
      savedAt: item.savedAt,
      movedAt: item.movedAt,
      reason: item.reason,
      registeredMarkedAt: item.registeredMarkedAt,
    })),
  };
  return JSON.stringify(payload);
}

export function readShortlistFromStorage(
  storage: Pick<Storage, "getItem"> | null | undefined,
): ShortlistState {
  if (!storage) return { ...EMPTY_SHORTLIST, items: [], past: [] };
  try {
    return parseShortlistJson(storage.getItem(SHORTLIST_STORAGE_KEY));
  } catch {
    return { ...EMPTY_SHORTLIST, items: [], past: [] };
  }
}

export function writeShortlistToStorage(
  storage: Pick<Storage, "setItem"> | null | undefined,
  state: ShortlistState,
): void {
  if (!storage) return;
  try {
    storage.setItem(SHORTLIST_STORAGE_KEY, serializeShortlist(state));
  } catch {
    /* quota / private mode — guest list stays in memory for this session */
  }
}
