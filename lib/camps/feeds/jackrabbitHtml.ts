/**
 * Jackrabbit HTML openings table, as the spots checker already reads it.
 * Holiday-camp day rows only. Before/after care is ignored. The watcher does
 * not use this parser; it reads OpeningsJson.
 */

export type HolidayOpeningsReading = {
  spots_left: number | null;
  state: "available" | "full" | "waitlist";
  source_url: string;
};

type DayRow = { openings: string };

function dayRows(body: string): DayRow[] {
  const rows: DayRow[] = [];
  for (const chunk of body.split(/<tr\b/i)) {
    if (!/Holiday Camp,/i.test(chunk)) continue;
    if (/After Care|Before Care/i.test(chunk)) continue;
    if (!/data-title="Cat3"[^>]*>\s*Dec\s*</i.test(chunk)) continue;
    const openings = /data-openings="([^"]*)"/i.exec(chunk)?.[1];
    if (openings == null) continue;
    rows.push({ openings });
  }
  return rows;
}

export function parseJackrabbitHolidayHtml(
  body: string,
  sourceUrl: string,
): HolidayOpeningsReading | { error: string } {
  const days = dayRows(body);
  if (days.length === 0) return { error: "no holiday camp rows" };
  const labels = days.map((day) => day.openings.trim());
  if (labels.every((label) => /^wait list$/i.test(label))) {
    return { spots_left: null, state: "waitlist", source_url: sourceUrl };
  }
  const numbers = labels.map((label) => (/^\d+$/.test(label) ? Number(label) : null));
  if (numbers.every((count) => count != null) && new Set(numbers).size === 1) {
    const count = numbers[0] ?? 0;
    if (count === 0) return { spots_left: 0, state: "full", source_url: sourceUrl };
    return { spots_left: count, state: "available", source_url: sourceUrl };
  }
  return { spots_left: null, state: "available", source_url: sourceUrl };
}
