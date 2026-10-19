/**
 * Sibling age-overlap matrix.
 *
 * A row fits only when every selected age fits that same row.
 * Unknown bounds are not a fit. Empty ages are not a match claim.
 * Camp sessions use the existing session eligibility helper so program
 * typical ages and a missing assessment date cannot become a fit.
 */

import type { CampSession } from "@/data/camps/types";
import {
  childMatchesSessionAge,
  type ChildAgeStatement,
} from "@/lib/camps/sessionEligibility";
import { statementsFromAges } from "@/lib/camps/siblingOverlap";
import type { CompassListing } from "@/lib/listings/types";

export type AgeFit = "fit" | "no" | "unknown";

export type SiblingMatrixRow = {
  id: string;
  title: string;
  href: string;
  category: CompassListing["category"];
  providerName: string | null;
  areaLabel: string | null;
  lastVerifiedOn: string | null;
  verification: CompassListing["verification"];
  exampleNote: string | null;
  cells: AgeFit[];
  all: AgeFit;
};

function worse(a: AgeFit, b: AgeFit): AgeFit {
  if (a === "no" || b === "no") return "no";
  if (a === "unknown" || b === "unknown") return "unknown";
  return "fit";
}

export function summarizeFits(cells: AgeFit[]): AgeFit {
  if (cells.length === 0) return "unknown";
  return cells.reduce(worse, "fit" as AgeFit);
}

/**
 * Inclusive range check for non-session rows (example listings).
 * A missing bound or inclusive flag is unknown, never a fit.
 */
export function ageFitsListingRange(
  ageYears: number,
  listing: Pick<
    CompassListing,
    "ageMin" | "ageMax" | "ageMinInclusive" | "ageMaxInclusive"
  >,
): AgeFit {
  if (!Number.isInteger(ageYears) || ageYears < 0) return "unknown";
  if (
    listing.ageMin == null ||
    listing.ageMax == null ||
    listing.ageMinInclusive == null ||
    listing.ageMaxInclusive == null
  ) {
    return "unknown";
  }
  const minOk = listing.ageMinInclusive
    ? ageYears >= listing.ageMin
    : ageYears > listing.ageMin;
  const maxOk = listing.ageMaxInclusive
    ? ageYears <= listing.ageMax
    : ageYears < listing.ageMax;
  return minOk && maxOk ? "fit" : "no";
}

function sessionCell(
  session: CampSession,
  ageYears: number,
  asOfDate: string | null,
): AgeFit {
  if (!asOfDate) return "unknown";
  const child: ChildAgeStatement = { ageYears, asOfDate };
  const result = childMatchesSessionAge(session, child);
  if (result === "match") return "fit";
  if (result === "no_match") return "no";
  return "unknown";
}

export function matrixCellsForSession(
  session: CampSession,
  ages: number[],
  asOfDate: string | null,
): AgeFit[] {
  return ages.map((age) => sessionCell(session, age, asOfDate));
}

export function matrixCellsForListing(
  listing: CompassListing,
  ages: number[],
): AgeFit[] {
  return ages.map((age) => ageFitsListingRange(age, listing));
}

export function sessionFitsEveryAge(
  session: CampSession,
  ages: number[],
  asOfDate: string | null,
): boolean {
  if (!asOfDate || ages.length === 0) return false;
  const children = statementsFromAges(ages, asOfDate);
  if (children.length !== ages.length) return false;
  return matrixCellsForSession(session, ages, asOfDate).every(
    (cell) => cell === "fit",
  );
}

export type MatrixSource = {
  listing: CompassListing;
  /** When set, eligibility uses session rules instead of the plain range. */
  session?: CampSession | null;
};

export function buildSiblingMatrix(
  sources: MatrixSource[],
  ages: number[],
  asOfDate: string | null,
): SiblingMatrixRow[] {
  return sources.map(({ listing, session }) => {
    const cells = session
      ? matrixCellsForSession(session, ages, asOfDate)
      : matrixCellsForListing(listing, ages);
    return {
      id: listing.id,
      title: listing.title,
      href: listing.href,
      category: listing.category,
      providerName: listing.providerName,
      areaLabel: listing.areaLabel,
      lastVerifiedOn: listing.lastVerifiedOn,
      verification: listing.verification,
      exampleNote: listing.exampleNote,
      cells,
      all: summarizeFits(cells),
    };
  });
}

export function rowsWhereEveryAgeFits(
  rows: SiblingMatrixRow[],
): SiblingMatrixRow[] {
  return rows.filter((row) => row.all === "fit");
}
