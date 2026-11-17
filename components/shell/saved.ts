export type SavedGuide = {
  id: string;
  title: string;
  href: string;
};

const KEY = "compass.saved.v1";
const EVENT = "compass-saved";

export function readSaved(): SavedGuide[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as SavedGuide[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.title && item.href) : [];
  } catch {
    return [];
  }
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
