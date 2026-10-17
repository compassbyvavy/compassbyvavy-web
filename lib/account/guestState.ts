/**
 * Guest state kept on the device until an account sync ack.
 * Local copies are not cleared by this module.
 */

import {
  SHORTLIST_STORAGE_KEY,
  type ShortlistState,
} from "@/lib/shortlist/types";
import { parseShortlistJson } from "@/lib/shortlist/storage";

export const VIEW_HISTORY_KEY = "compass.viewHistory.v1";
export const FAMILY_AGES_KEY = "compass.family.ages.v1";
export const COMPARE_IDS_KEY = "compass.compare.ids.v1";

export const GUEST_STATE_VERSION = 1 as const;

export type ViewHistoryEntry = {
  listingId: string;
  href: string;
  viewedAt: string;
};

export type GuestStateSnapshot = {
  version: typeof GUEST_STATE_VERSION;
  capturedAt: string;
  shortlist: ShortlistState;
  viewHistory: ViewHistoryEntry[];
  compareSessionIds: string[];
  familyAges: { ages: number[]; asOfDate: string | null };
};

function readJson(storage: Pick<Storage, "getItem">, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function readViewHistory(
  storage: Pick<Storage, "getItem"> | null,
): ViewHistoryEntry[] {
  if (!storage) return [];
  const parsed = readJson(storage, VIEW_HISTORY_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const rec = entry as Record<string, unknown>;
    if (typeof rec.listingId !== "string" || typeof rec.viewedAt !== "string") {
      return [];
    }
    return [
      {
        listingId: rec.listingId,
        href: typeof rec.href === "string" ? rec.href : "",
        viewedAt: rec.viewedAt,
      },
    ];
  });
}

export function rememberView(
  storage: Pick<Storage, "getItem" | "setItem">,
  entry: ViewHistoryEntry,
): void {
  const current = readViewHistory(storage).filter(
    (item) => item.listingId !== entry.listingId,
  );
  const next = [entry, ...current].slice(0, 40);
  storage.setItem(VIEW_HISTORY_KEY, JSON.stringify(next));
}

function readFamilyAges(storage: Pick<Storage, "getItem">): GuestStateSnapshot["familyAges"] {
  const parsed = readJson(storage, FAMILY_AGES_KEY);
  if (!parsed || typeof parsed !== "object") {
    return { ages: [], asOfDate: null };
  }
  const rec = parsed as Record<string, unknown>;
  const ages = Array.isArray(rec.ages)
    ? rec.ages.filter((age): age is number => Number.isInteger(age) && (age as number) >= 0)
    : [];
  const asOfDate =
    typeof rec.asOfDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rec.asOfDate)
      ? rec.asOfDate
      : null;
  return { ages, asOfDate };
}

function readCompareIds(storage: Pick<Storage, "getItem">): string[] {
  const raw = storage.getItem(COMPARE_IDS_KEY);
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function captureGuestState(
  local: Pick<Storage, "getItem">,
  session: Pick<Storage, "getItem"> | null,
  now: Date,
): GuestStateSnapshot {
  return {
    version: GUEST_STATE_VERSION,
    capturedAt: now.toISOString(),
    shortlist: parseShortlistJson(local.getItem(SHORTLIST_STORAGE_KEY)),
    viewHistory: readViewHistory(local),
    compareSessionIds: readCompareIds(session ?? local),
    familyAges: readFamilyAges(local),
  };
}

export function ackClearsLocalCopy(ack: {
  ok?: unknown;
  acceptedAt?: unknown;
}): boolean {
  return ack.ok === true && typeof ack.acceptedAt === "string" && ack.acceptedAt.length > 0;
}

export function clearSyncedGuestCopies(
  local: Pick<Storage, "removeItem">,
  session: Pick<Storage, "removeItem"> | null,
): void {
  local.removeItem(SHORTLIST_STORAGE_KEY);
  local.removeItem(VIEW_HISTORY_KEY);
  local.removeItem(FAMILY_AGES_KEY);
  session?.removeItem(COMPARE_IDS_KEY);
}
