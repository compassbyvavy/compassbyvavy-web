"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import { buildCompareTable } from "@/lib/shortlist/compare";

export type CompareClientProps = {
  catalog: CampsCatalogBundle | null;
  nowIso?: string;
};

export function CompareClient({ catalog, nowIso }: CompareClientProps) {
  const searchParams = useSearchParams();
  const now = nowIso ? new Date(nowIso) : undefined;
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
          Each column is one session. Facts stay on that session — Compass
          does not stitch hours from one week onto the price of another.
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
                  <th scope="col">Fact</th>
                  {columns.map((col) => (
                    <th key={col.sessionId} scope="col">
                      <Link href={col.href}>{col.programName}</Link>
                      <span className="camp-card-note">{col.providerName}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Dates</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>{col.row.datesLabel}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Eligibility</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>
                      {col.row.ageEligibilityLabel}
                      {col.row.ageAssessmentNote ? (
                        <span className="camp-card-note">
                          {" "}
                          · {col.row.ageAssessmentNote}
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Hours</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>{col.row.hoursLabel}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Care</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>{col.row.careLabel}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Venue</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>{col.row.venueLabel}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Price</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>{col.row.priceLabel}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Currency</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>{col.currencyLabel}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Unit</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>{col.unitLabel}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Fees</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>
                      {col.feeNotes ?? "Fee notes to confirm"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Registration</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>
                      <p>{col.row.registration.label}</p>
                      {col.row.registration.buttonText &&
                      col.row.registration.href ? (
                        <a
                          className="camp-card-cta"
                          href={col.row.registration.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {col.row.registration.buttonText}
                        </a>
                      ) : (
                        <p className="camp-card-note">
                          No verified outbound registration link.
                        </p>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Evidence date</th>
                  {columns.map((col) => (
                    <td key={col.sessionId}>
                      {col.evidenceDate
                        ? `Source checked ${col.evidenceDate}`
                        : "Source check date to confirm"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
