export type SavedGuide = {
  id: string;
  title: string;
  href: string;
};

const KEY = "compass.saved.v1";
const EVENT = "compass-saved";

/**
 * One empty list for every miss. `useSyncExternalStore` compares the snapshot
 * with Object.is, so a fresh [] on each read loops the plan page (React #185).
 */
export const EMPTY_SAVED: SavedGuide[] = [];

/** Distinct from a missing key (`null`) and from any stored string. */
const STORAGE_THREW = Symbol("storage-threw");

let cachedRaw: string | null | symbol | undefined;
let cachedItems: SavedGuide[] = EMPTY_SAVED;

function isSavedGuide(item: unknown): item is SavedGuide {
  if (!item || typeof item !== "object") return false;
  const row = item as Partial<SavedGuide>;
  return Boolean(row.id && row.title && row.href);
}

function parseSaved(raw: string | null): SavedGuide[] {
  if (!raw) return EMPTY_SAVED;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_SAVED;
    const items = parsed.filter(isSavedGuide);
    return items.length === 0 ? EMPTY_SAVED : items;
  } catch {
    return EMPTY_SAVED;
  }
}

export function readSaved(): SavedGuide[] {
  if (typeof window === "undefined") return EMPTY_SAVED;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    if (cachedRaw !== STORAGE_THREW) {
      cachedRaw = STORAGE_THREW;
      cachedItems = EMPTY_SAVED;
    }
    return cachedItems;
  }

  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  cachedItems = parseSaved(raw);
  return cachedItems;
}

/** Server snapshot for `useSyncExternalStore`. Always the same array. */
export function getSavedServerSnapshot(): SavedGuide[] {
  return EMPTY_SAVED;
}

export function writeSaved(items: SavedGuide[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function toggleSaved(item: SavedGuide): SavedGuide[] {
  const current = readSaved();
  const next = current.some((row) => row.id === item.id)
    ? current.filter((row) => row.id !== item.id)
    : [...current, item];
  writeSaved(next);
  return next;
}

export function subscribeSaved(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
