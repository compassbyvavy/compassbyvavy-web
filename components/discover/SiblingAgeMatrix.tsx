"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CampSession } from "@/data/camps/types";
import {
  EMPTY_FAMILY_AGES,
  FAMILY_AGES_STORAGE_KEY,
  parseFamilyAges,
  serializeFamilyAges,
  uniqueWholeAges,
  type FamilyAgesState,
} from "@/lib/listings/familyAges";
import {
  buildSiblingMatrix,
  rowsWhereEveryAgeFits,
  type AgeFit,
  type SiblingMatrixRow,
} from "@/lib/listings/siblingOverlap";
import type { CompassListing } from "@/lib/listings/types";

const QUICK_AGES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

export type SiblingAgeMatrixProps = {
  campSources: { listing: CompassListing; session: CampSession }[];
  exampleListings: CompassListing[];
};

function fitLabel(fit: AgeFit): string {
  if (fit === "fit") return "Fits";
  if (fit === "no") return "No";
  return "Unknown";
}

function verifiedLabel(row: SiblingMatrixRow): string {
  if (row.verification === "example") return "Example — not verified";
  if (!row.lastVerifiedOn) return "Last verified date unknown";
  if (row.verification === "provider_confirmed") {
    return `Last verified ${row.lastVerifiedOn} · provider confirmed`;
  }
  if (row.verification === "source_checked") {
    return `Last verified ${row.lastVerifiedOn} · source checked, not provider-confirmed`;
  }
  return `Last verified ${row.lastVerifiedOn}`;
}

function MatrixTable({
  rows,
  ages,
}: {
  rows: SiblingMatrixRow[];
  ages: number[];
}) {
  if (rows.length === 0) {
    return <p className="ages-empty">No rows in this group.</p>;
  }
  return (
    <div className="ages-scroll">
      <table className="ages-table">
        <thead>
          <tr>
            <th className="ages-row-label" scope="col">
              Listing
            </th>
            {ages.map((age) => (
              <th key={age} scope="col">
                Age {age}
              </th>
            ))}
            <th scope="col">Every child</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th className="ages-row-label" scope="row">
                <Link href={row.href}>{row.title}</Link>
                <span className="ages-meta">
                  {row.providerName ? `${row.providerName} · ` : ""}
                  {row.areaLabel ?? "Area unknown"}
                  {" · "}
                  {verifiedLabel(row)}
                </span>
                {row.exampleNote ? (
                  <span className="ages-example">{row.exampleNote}</span>
                ) : null}
              </th>
              {row.cells.map((cell, index) => (
                <td key={`${row.id}-${ages[index]}`} data-fit={cell}>
                  {fitLabel(cell)}
                </td>
              ))}
              <td data-fit={row.all}>{fitLabel(row.all)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SiblingAgeMatrix({
  campSources,
  exampleListings,
}: SiblingAgeMatrixProps) {
  const [family, setFamily] = useState<FamilyAgesState>(EMPTY_FAMILY_AGES);
  const [draft, setDraft] = useState("");
  const [onlyFits, setOnlyFits] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFamily(parseFamilyAges(window.localStorage.getItem(FAMILY_AGES_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      FAMILY_AGES_STORAGE_KEY,
      serializeFamilyAges(family),
    );
  }, [family, hydrated]);

  const toggleAge = (age: number) => {
    setFamily((current) => {
      const has = current.ages.includes(age);
      const ages = has
        ? current.ages.filter((n) => n !== age)
        : uniqueWholeAges([...current.ages, age]);
      return { ...current, ages };
    });
  };

  const addDraft = () => {
    const n = Number(draft);
    if (!Number.isInteger(n) || n < 0 || n > 18) return;
    toggleAge(n);
    setDraft("");
  };

  const campRows = useMemo(
    () =>
      buildSiblingMatrix(campSources, family.ages, family.asOfDate),
    [campSources, family.ages, family.asOfDate],
  );
  const exampleRows = useMemo(
    () =>
      buildSiblingMatrix(
        exampleListings.map((listing) => ({ listing })),
        family.ages,
        family.asOfDate,
      ),
    [exampleListings, family.ages, family.asOfDate],
  );

  const shownCamps = onlyFits ? rowsWhereEveryAgeFits(campRows) : campRows;
  const shownExamples = onlyFits
    ? rowsWhereEveryAgeFits(exampleRows)
    : exampleRows;

  return (
    <div className="ages-page">
      <header className="ages-intro">
        <p className="ages-kicker">Discover</p>
        <h1>Sibling age overlap</h1>
        <p>
          Add each child&apos;s age. A row stays only when every age fits that
          same listing — Compass does not stitch one session for one child onto
          another session for a sibling. This is not the Plan list.
        </p>
      </header>

      <div className="ages-toolbar" role="group" aria-label="Sibling ages">
        {QUICK_AGES.map((age) => {
          const on = family.ages.includes(age);
          return (
            <button
              key={age}
              type="button"
              className={on ? "ages-badge is-on" : "ages-badge"}
              aria-pressed={on}
              onClick={() => toggleAge(age)}
            >
              {age}
            </button>
          );
        })}
      </div>

      <form
        className="ages-add"
        onSubmit={(event) => {
          event.preventDefault();
          addDraft();
        }}
      >
        <label>
          <span>Other age (whole years)</span>
          <input
            inputMode="numeric"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button type="submit">Add age</button>
        <label>
          <span>Age as of</span>
          <input
            type="date"
            value={family.asOfDate ?? ""}
            onChange={(event) =>
              setFamily((current) => ({
                ...current,
                asOfDate: event.target.value || null,
              }))
            }
          />
        </label>
        <label className="ages-only">
          <input
            type="checkbox"
            checked={onlyFits}
            onChange={(event) => setOnlyFits(event.target.checked)}
          />
          <span>Only rows where every child fits</span>
        </label>
      </form>

      {family.ages.length === 0 ? (
        <p className="ages-note" role="status">
          Tap an age to start. Nothing is filtered until you do.
        </p>
      ) : !family.asOfDate ? (
        <p className="ages-note" role="status">
          Camp sessions need the age-as-of date before they can count as a fit.
          A missing assessment date stays Unknown.
        </p>
      ) : null}

      <section aria-labelledby="ages-camps-title">
        <h2 id="ages-camps-title">Camp sessions</h2>
        <MatrixTable rows={shownCamps} ages={family.ages} />
      </section>

      <section aria-labelledby="ages-example-title">
        <h2 id="ages-example-title">Example rows</h2>
        <p className="ages-note">
          These two rows show how a non-camp listing would sit in the same
          matrix. They are examples, not places you can visit from Compass.
        </p>
        <MatrixTable rows={shownExamples} ages={family.ages} />
      </section>
    </div>
  );
}
