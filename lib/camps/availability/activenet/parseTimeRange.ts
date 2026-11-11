/**
 * Parse ActiveNet list `time_range` values such as "9:00 AM - 4:00 PM".
 */

export type ParsedTimeRange = {
  start: string | null;
  end: string | null;
};

const CLOCK =
  /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i;

function toHHmm(hourRaw: string, minuteRaw: string | undefined, meridian: string): string {
  let hour = Number(hourRaw);
  const minute = minuteRaw ? Number(minuteRaw) : 0;
  const pm = meridian.toUpperCase() === "PM";
  if (hour === 12) hour = pm ? 12 : 0;
  else if (pm) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseActiveNetTimeRange(raw: string | null | undefined): ParsedTimeRange {
  if (raw == null || raw.trim() === "") return { start: null, end: null };
  const match = raw.trim().match(CLOCK);
  if (!match) return { start: null, end: null };
  return {
    start: toHHmm(match[1], match[2], match[3]),
    end: toHHmm(match[4], match[5], match[6]),
  };
}
