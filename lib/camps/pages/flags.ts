/**
 * The eight review flags. Code only: no model call, no guessed fix.
 */
import { STALE_BEFORE, type CampListing, type WatcherSignal } from "@/lib/camps/pages/types";
import { isStaleCheck } from "@/lib/camps/pages/view";

export type LinkCheck = { httpStatus: number | null };

const KEYS = [
  ["dates", "Dates"],
  ["price", "Price"],
  ["hours", "Hours"],
  ["ages", "Ages"],
] as const;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function saysPerDay(phrase: string): boolean {
  return /per\s+day|a\s+day|\/\s*day/i.test(phrase);
}

function saysPerWeek(phrase: string): boolean {
  return /per\s+week|a\s+week|\/\s*week/i.test(phrase);
}

export function flagsForCamp(
  listing: CampListing,
  options: {
    today: string;
    /** Prices already collected for this break, including this camp when it has one. */
    breakPrices: number[];
    watcher?: WatcherSignal | null;
    /** Omit to skip the register-link rule (the review pack passes a real check). */
    link?: LinkCheck | null;
  },
): string[] {
  const flags: string[] = [];

  for (const [key, label] of KEYS) {
    const value = listing[key].value;
    if (value == null || value.trim() === "") flags.push(`Missing ${label.toLowerCase()}.`);
  }
  if (!listing.registerUrl) flags.push("Missing register link.");

  const sourced = [listing.ages, listing.dates, listing.price, listing.hours, listing.care, listing.lunch];
  const stale = sourced.filter((item) => item.value && isStaleCheck(item.checkedOn));
  if (stale.length) {
    flags.push(`A fact was last checked before ${STALE_BEFORE}.`);
  }

  const byField = new Map<string, Map<string, string[]>>();
  for (const row of listing.locationFields) {
    const values = byField.get(row.field) ?? new Map<string, string[]>();
    const places = values.get(row.value) ?? [];
    places.push(row.location);
    values.set(row.value, places);
    byField.set(row.field, values);
  }
  for (const [field, values] of byField) {
    if (values.size < 2) continue;
    const parts = [...values.entries()].map(([value, places]) => `${places.join(", ")} ${value}`);
    flags.push(`${field} differs between locations: ${parts.join("; ")}.`);
  }

  const mid = median(options.breakPrices);
  if (listing.comparePrice != null && mid != null && mid > 0) {
    if (listing.comparePrice > mid * 2 || listing.comparePrice < mid / 2) {
      flags.push(
        `Price $${listing.comparePrice} is more than double or less than half the $${mid} median for this break.`,
      );
    }
  }

  const day = listing.carePhrases.some(saysPerDay);
  const week = listing.carePhrases.some(saysPerWeek);
  if (day && week) {
    flags.push("Care pricing says per day in one place and per week in another.");
  }

  if (options.watcher?.pendingChange) flags.push("A Camp Watcher change for this camp is still pending.");
  if ((options.watcher?.unreachableNights ?? 0) >= 2) {
    flags.push("A source has been unreachable 2 nights in a row.");
  }

  if (options.link && listing.registerUrl && options.link.httpStatus !== 200) {
    const status = options.link.httpStatus == null ? "no response" : `HTTP ${options.link.httpStatus}`;
    flags.push(`Register link did not return HTTP 200 (${status}).`);
  }

  return flags;
}

export function breakPrices(listings: CampListing[], breakId: CampListing["breakId"]): number[] {
  return listings.filter((item) => item.breakId === breakId && item.comparePrice != null).map((item) => item.comparePrice!);
}
