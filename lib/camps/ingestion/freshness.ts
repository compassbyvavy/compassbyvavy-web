/**
 * Freshness labels for the ingestion admin surfaces.
 *
 * These are operator-facing display labels about *when Compass last looked*,
 * not product promises about how current a provider's page is. Unknown stays
 * "Unknown" — a missing check time is never rendered as fresh.
 */

import type { CampSource, FreshnessLabel } from "@/data/camps/ingestion/types";

export const FRESH_MAX_HOURS = 24;
export const RECENTLY_CHECKED_MAX_HOURS = 72;

/** Hours between an ISO timestamp and `now`; null when unusable. */
export function hoursSince(
  isoTimestamp: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!isoTimestamp) return null;
  const then = Date.parse(isoTimestamp);
  if (Number.isNaN(then)) return null;
  const elapsedMs = now.getTime() - then;
  if (elapsedMs < 0) return 0;
  return elapsedMs / 3_600_000;
}

export function freshnessLabel(
  lastCheckedAt: string | null | undefined,
  now: Date = new Date(),
): FreshnessLabel {
  const hours = hoursSince(lastCheckedAt, now);
  if (hours === null) return "Unknown";
  if (hours <= FRESH_MAX_HOURS) return "Fresh";
  if (hours <= RECENTLY_CHECKED_MAX_HOURS) return "Recently checked";
  return "Stale";
}

/** Stale enough to warrant the `source_stale` quality flag. */
export function isSourceStale(
  lastCheckedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return freshnessLabel(lastCheckedAt, now) === "Stale";
}

/**
 * Next scheduled check for a source. `checkIntervalHours` defaults to daily —
 * conservative for pages that change a few times per season.
 */
export const DEFAULT_CHECK_INTERVAL_HOURS = 24;

export function nextCheckAtFrom(
  source: Pick<CampSource, "checkIntervalHours">,
  checkedAt: Date,
): string {
  const intervalHours =
    source.checkIntervalHours && source.checkIntervalHours > 0
      ? source.checkIntervalHours
      : DEFAULT_CHECK_INTERVAL_HOURS;
  return new Date(checkedAt.getTime() + intervalHours * 3_600_000).toISOString();
}

/**
 * True when an active source is due for a check. A source with no
 * `nextCheckAt` has never been scheduled and is due immediately.
 */
export function isSourceDue(source: CampSource, now: Date = new Date()): boolean {
  if (!source.isActive) return false;
  if (!source.nextCheckAt) return true;
  const due = Date.parse(source.nextCheckAt);
  if (Number.isNaN(due)) return true;
  return due <= now.getTime();
}
