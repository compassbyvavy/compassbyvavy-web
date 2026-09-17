/**
 * Core-hours normalization to 24-hour `HH:MM`.
 *
 * Camp pages routinely write "9:00 - 4:00" with no meridiem. Rejecting those
 * would drop a fact every listing states, so a documented daytime-clock
 * assumption is applied and always reported as `meridiem_inferred`: hours 1–6
 * read as afternoon, 7–12 as morning, and an end that lands before the start is
 * pushed to the afternoon.
 */

import {
  normalizationFailure,
  type NormalizationResult,
} from "@/lib/camps/ingestion/normalize/types";

export type NormalizedTimeRange = {
  startTime: string | null;
  endTime: string | null;
};

const EMPTY: NormalizedTimeRange = { startTime: null, endTime: null };

type ParsedTime = { hour: number; minute: number; meridiem: "am" | "pm" | null };

const TIME_PATTERN =
  /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?(?![\d:])/gi;

export function normalizeTimeRange(rawInput: string): NormalizationResult<NormalizedTimeRange> {
  const raw = rawInput.trim();
  if (raw === "") return normalizationFailure(raw, EMPTY, "time_not_stated");

  const text = raw.toLowerCase().replace(/\s+/g, " ").replace(/\bnoon\b/g, "12:00 pm").replace(/\bmidnight\b/g, "12:00 am");

  const parsed: ParsedTime[] = [];
  for (const match of text.matchAll(TIME_PATTERN)) {
    const hour = Number(match[1]);
    const minute = match[2] === undefined ? 0 : Number(match[2]);
    if (hour > 24 || minute > 59) continue;
    // A bare 1- or 2-digit number with no colon and no meridiem is not a time.
    if (match[2] === undefined && match[3] === undefined) continue;
    const meridiemRaw = match[3]?.replace(/\./g, "");
    parsed.push({
      hour,
      minute,
      meridiem: meridiemRaw === "am" ? "am" : meridiemRaw === "pm" ? "pm" : null,
    });
  }

  if (parsed.length === 0) {
    return normalizationFailure(raw, EMPTY, "time_range_not_recognized");
  }

  const warnings: string[] = [];
  if (parsed.length === 1) {
    const only = parsed[0];
    const inferred = only.meridiem === null;
    if (inferred) warnings.push("meridiem_inferred");
    warnings.push("single_time_stated");
    return {
      value: { startTime: toClock(resolveHour(only)), endTime: null },
      raw,
      confidence: inferred ? 0.55 : 0.7,
      warnings,
    };
  }

  const [startRaw, endRaw] = parsed;
  const inferred = startRaw.meridiem === null || endRaw.meridiem === null;
  const startHour = resolveHour(startRaw);
  let endHour = resolveHour(endRaw);

  if (endHour.total <= startHour.total && endRaw.meridiem === null && endHour.hour < 12) {
    endHour = { ...endHour, hour: endHour.hour + 12, total: endHour.total + 720 };
  }
  if (endHour.total <= startHour.total) {
    warnings.push("end_time_not_after_start");
  }
  if (inferred) warnings.push("meridiem_inferred");
  if (parsed.length > 2) warnings.push("extra_times_ignored");

  return {
    value: { startTime: toClock(startHour), endTime: toClock(endHour) },
    raw,
    confidence: inferred ? 0.8 : 0.95,
    warnings,
  };
}

type ResolvedTime = { hour: number; minute: number; total: number };

function resolveHour(time: ParsedTime): ResolvedTime {
  let hour = time.hour;
  if (time.meridiem === "pm") {
    hour = hour === 12 ? 12 : hour + 12;
  } else if (time.meridiem === "am") {
    hour = hour === 12 ? 0 : hour;
  } else if (hour >= 1 && hour <= 6) {
    // Daytime-clock assumption: camps do not run at 3 in the morning.
    hour += 12;
  } else if (hour === 24) {
    hour = 0;
  }
  const normalizedHour = hour % 24;
  return {
    hour: normalizedHour,
    minute: time.minute,
    total: normalizedHour * 60 + time.minute,
  };
}

function toClock(time: ResolvedTime): string {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}
