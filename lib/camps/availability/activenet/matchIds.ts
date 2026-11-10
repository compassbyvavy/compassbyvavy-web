import type { ActiveNetListItem } from "@/lib/camps/availability/activenet/listClient";

/**
 * Match the public activity numbers printed in City documents (for example
 * the Winter 2026 Eligible Camp List) to ActiveNet internal activity IDs.
 *
 * Matching is by the list row's public `number` only. A public number must
 * never be used as an internal ID: on activemississauga, internal id 147884 is
 * a swim class while public number 147884 is Winter Fun at Malton (internal
 * 145871).
 */

export type ActivityIdMatch = {
  activityNumber: string;
  activityId: number;
  name: string;
  locationLabel: string | null;
  dateRangeStart: string | null;
};

export type ActivityIdMatchReport = {
  matched: ActivityIdMatch[];
  /** Public numbers not in the list results (closed, other keyword, or a typo in the source). */
  missing: string[];
  /** Public numbers that appear on more than one row with different internal IDs. */
  ambiguous: Array<{ activityNumber: string; activityIds: number[] }>;
  /** Expected names that don't match the row's name (possible wrong number in the source). */
  nameWarnings: Array<{ activityNumber: string; expected: string; actual: string }>;
};

export type ExpectedActivity = {
  activityNumber: string;
  /** Text the row's name should contain, e.g. "Winter Fun". Optional. */
  nameIncludes?: string;
  /** If set, the row's name must NOT contain this, e.g. "Jr" for the 6–12 camp. */
  nameExcludes?: string;
};

function norm(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchActivityNumbers(
  items: readonly ActiveNetListItem[],
  expected: readonly ExpectedActivity[],
): ActivityIdMatchReport {
  const byNumber = new Map<string, ActiveNetListItem[]>();
  for (const item of items) {
    const list = byNumber.get(item.activityNumber) ?? [];
    if (!list.some((x) => x.activityId === item.activityId)) list.push(item);
    byNumber.set(item.activityNumber, list);
  }

  const report: ActivityIdMatchReport = { matched: [], missing: [], ambiguous: [], nameWarnings: [] };
  const seen = new Set<string>();
  for (const want of expected) {
    const number = want.activityNumber.trim();
    if (seen.has(number)) continue;
    seen.add(number);
    const rows = byNumber.get(number) ?? [];
    if (rows.length === 0) {
      report.missing.push(number);
      continue;
    }
    if (rows.length > 1) {
      report.ambiguous.push({ activityNumber: number, activityIds: rows.map((r) => r.activityId) });
      continue;
    }
    const row = rows[0];
    const name = norm(row.name);
    const includesOk = !want.nameIncludes || name.includes(norm(want.nameIncludes));
    const excludesOk = !want.nameExcludes || !new RegExp(`\\b${norm(want.nameExcludes)}\\b`).test(name);
    if (!includesOk || !excludesOk) {
      report.nameWarnings.push({
        activityNumber: number,
        expected: [want.nameIncludes, want.nameExcludes ? `not "${want.nameExcludes}"` : null]
          .filter(Boolean)
          .join(", "),
        actual: row.name,
      });
    }
    report.matched.push({
      activityNumber: number,
      activityId: row.activityId,
      name: row.name,
      locationLabel: row.locationLabel,
      dateRangeStart: row.dateRangeStart,
    });
  }
  return report;
}
