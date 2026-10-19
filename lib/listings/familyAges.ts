/**
 * Local-first sibling ages. Stored before any account exists.
 * The Plan saved list does not read this key.
 */

export const FAMILY_AGES_STORAGE_KEY = "compass.family.ages.v1";

export type FamilyAgesState = {
  version: 1;
  ages: number[];
  asOfDate: string | null;
};

export const EMPTY_FAMILY_AGES: FamilyAgesState = {
  version: 1,
  ages: [],
  asOfDate: null,
};

export function uniqueWholeAges(ages: number[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const age of ages) {
    if (!Number.isInteger(age) || age < 0 || age > 18) continue;
    if (seen.has(age)) continue;
    seen.add(age);
    out.push(age);
  }
  return out.sort((a, b) => a - b);
}

export function parseFamilyAges(raw: string | null): FamilyAgesState {
  if (!raw) return EMPTY_FAMILY_AGES;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return EMPTY_FAMILY_AGES;
    const rec = parsed as Record<string, unknown>;
    const ages = Array.isArray(rec.ages)
      ? uniqueWholeAges(
          rec.ages.filter((n): n is number => typeof n === "number"),
        )
      : [];
    const asOfDate =
      typeof rec.asOfDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rec.asOfDate)
        ? rec.asOfDate
        : null;
    return { version: 1, ages, asOfDate };
  } catch {
    return EMPTY_FAMILY_AGES;
  }
}

export function serializeFamilyAges(state: FamilyAgesState): string {
  return JSON.stringify({
    version: 1,
    ages: uniqueWholeAges(state.ages),
    asOfDate: state.asOfDate,
  });
}
