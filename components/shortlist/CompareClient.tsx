"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import {
  PLAN_COMPARE_ROWS,
  buildCompareTable,
  planCompareCells,
} from "@/lib/shortlist/compare";

export type CompareClientProps = {
  catalog: CampsCatalogBundle | null;
  nowIso?: string;
};

export function CompareClient({ catalog, nowIso }: CompareClientProps) {
  const searchParams = useSearchParams();
  const now = useMemo(
    () => (nowIso ? new Date(nowIso) : undefined),
    [nowIso],
  );
  const raw = searchParams.get("sessions");

  const table = useMemo(
    () => buildCompareTable(catalog, raw, { now }),
    [catalog, raw, now],
  );

  if (table.kind === "invalid") {
    const parse = table.parse;
    let message = "Choose 2 to 4 sessions from your saved list to compare.";
    if (parse.kind === "too_few") {
      message = "Compare needs at least two sessions. Compass will not invent a second column.";
    } else if (parse.kind === "too_many") {
      message = "Compare is limited to four sessions at a time.";
    }
    return (
      <div className="saved-page">
        <p className="camps-age-filter-notice" role="status">
          {message}
        </p>
        <p>
          <Link href="/saved">Back to saved list</Link>
        </p>
      </div>
    );
  }

  if (table.kind === "catalog_pending") {
    return (
      <div className="saved-page">
        <p className="camps-age-filter-notice" role="status">
          Session facts are not loaded in this environment yet, so compare
          cannot show dates, prices, or registration actions. Your saved IDs
          are unchanged.
        </p>
        <p>
          <Link href="/saved">Back to saved list</Link>
        </p>
      </div>
    );
  }

  const { columns, missingIds, priceNote } = table;

  return (
    <div className="saved-page saved-compare-page">
      <nav className="camp-detail-nav" aria-label="Saved breadcrumb">
        <Link href="/saved">← Back to saved list</Link>
      </nav>
      <header className="camps-listing-intro">
        <p className="camps-listing-kicker">Compare</p>
        <h1>Side by side</h1>
        <p className="camps-listing-lede">
          Dates, exact eligibility, hours, care, venue, total cost, and
          status. A missing fact says Unknown. Compass does not guess a
          family package or rank prices.
        </p>
      </header>

      {missingIds.length > 0 ? (
        <p className="camps-age-filter-notice" role="status">
          {missingIds.length === 1
            ? "One selected session is no longer listed."
            : `${missingIds.length} selected sessions are no longer listed.`}{" "}
          Unpublished details are not shown.
        </p>
      ) : null}

      {columns.length < 2 ? (
        <div className="camps-empty" role="status">
          <h2>Not enough listed sessions to compare</h2>
          <p>
            Compare needs two sessions that are still in the public catalog.
          </p>
          <p>
            <Link href="/saved">Return to your list</Link>
          </p>
        </div>
      ) : (
        <>
          <p className="saved-price-note" role="note">
            {priceNote.label}
          </p>
          <div className="saved-compare-scroll">
            <table className="saved-compare-table">
              <thead>
                <tr>
                  <th className="saved-compare-label" scope="col" />
                  {columns.map((col) => (
                    <th key={col.sessionId} scope="col">
                      <Link href={col.href}>{col.programName}</Link>
                      <span className="camp-card-note">{col.providerName}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLAN_COMPARE_ROWS.map((fact) => (
                  <tr key={fact.id}>
                    <th className="saved-compare-label" scope="row">
                      {fact.label}
                    </th>
                    {columns.map((col) => {
                      const cell = planCompareCells(col)[fact.id];
                      return (
                        <td
                          key={col.sessionId}
                          className={cell.unknown ? "is-unknown" : undefined}
                        >
                          {cell.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
