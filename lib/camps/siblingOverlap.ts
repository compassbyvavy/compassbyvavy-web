/**
 * Sibling age-overlap — same session must fit every child.
 *
 * Compass does not stitch one session's band onto another. Two siblings
 * matching two different weeks is not overlap. Unknown eligibility is not a
 * match. Program typical ages are never used.
 */

import type { CampSession } from "@/data/camps/types";
import {
  childMatchesSessionAge,
  type ChildAgeStatement,
  type SessionAgeMatchResult,
} from "@/lib/camps/sessionEligibility";

export function uniqueWholeAges(ages: number[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const age of ages) {
    if (!Number.isInteger(age) || !Number.isFinite(age) || age < 0) continue;
    if (seen.has(age)) continue;
    seen.add(age);
    out.push(age);
  }
  return out;
}

export function statementsFromAges(
  ages: number[],
  asOfDate: string,
): ChildAgeStatement[] {
  return uniqueWholeAges(ages).map((ageYears) => ({ ageYears, asOfDate }));
}

/**
 * All siblings must independently match this session.
 * Empty ages ⇒ no constraint (not a match claim).
 */
export function siblingsOverlapSession(
  session: CampSession,
  children: ChildAgeStatement[],
): SessionAgeMatchResult {
  if (children.length === 0) return "match";
  let sawUnknown = false;
  for (const child of children) {
    const result = childMatchesSessionAge(session, child);
    if (result === "no_match") return "no_match";
    if (result === "unknown") sawUnknown = true;
  }
  return sawUnknown ? "unknown" : "match";
}

export function sessionFitsAllSiblings(
  session: CampSession,
  children: ChildAgeStatement[],
): boolean {
  return siblingsOverlapSession(session, children) === "match";
}
