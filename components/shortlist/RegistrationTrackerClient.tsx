"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useShortlist } from "@/components/shortlist/ShortlistProvider";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import {
  TRACKER_VERIFY_LABEL,
  buildRegistrationTracker,
} from "@/lib/camps/registrationTracker";
import { guestLocalSavedItemsSource } from "@/lib/shortlist/savedItemsSource";

export type RegistrationTrackerClientProps = {
  catalog: CampsCatalogBundle | null;
  nowIso?: string;
};

export function RegistrationTrackerClient({
  catalog,
  nowIso,
}: RegistrationTrackerClientProps) {
  const { state, hydrated } = useShortlist();
  const now = useMemo(
    () => (nowIso ? new Date(nowIso) : undefined),
    [nowIso],
  );

  const view = useMemo(
    () =>
      buildRegistrationTracker(guestLocalSavedItemsSource(state), catalog, {
        now,
      }),
    [state, catalog, now],
  );

  if (!hydrated) {
    return <p className="camp-card-note">Loading registration tracker…</p>;
  }

  return (
    <div className="saved-page tracker-page">
      <header className="camps-listing-intro">
        <p className="camps-listing-kicker">Saved camps</p>
        <h1>Registration Tracker</h1>
        <p className="camps-listing-lede">{view.disclaimer}</p>
      </header>

      {view.catalogPending ? (
        <p className="camps-age-filter-notice" role="status">
          Camp details are not loaded in this environment yet. Saved IDs stay
          on this device. Status unknown is not closed, full, or open.
        </p>
      ) : null}

      {view.empty ? (
        <div className="camps-empty tracker-empty" role="status">
          <h2>{view.emptyTitle}</h2>
          <p>{view.emptyBody}</p>
          <p>
            <Link href={view.emptyCtaHref}>{view.emptyCtaLabel}</Link>
          </p>
        </div>
      ) : (
        <ul className="tracker-list">
          {view.rows.map((row) => (
            <li key={row.key} className="tracker-card">
              <p className="camp-card-provider">{row.providerName}</p>
              <h2>
                <Link href={row.href}>{row.programName}</Link>
              </h2>
              {row.sessionDatesLabel ? (
                <p className="camp-card-note">{row.sessionDatesLabel}</p>
              ) : null}
              <ul className="tracker-signals">
                {row.signals.map((signal) => (
                  <li
                    key={`${row.key}-${signal.id}-${signal.text}`}
                    className={
                      signal.tone === "unknown"
                        ? "tracker-signal tracker-signal-unknown"
                        : "tracker-signal tracker-signal-known"
                    }
                  >
                    {signal.text}
                  </li>
                ))}
              </ul>
              {row.parentMarkedRegistered ? (
                <p className="camp-card-note">
                  You marked this as registered — Compass does not confirm
                  provider registration.
                </p>
              ) : null}
              <div className="tracker-card-actions">
                {row.verifyHref ? (
                  <a
                    className="camp-card-cta"
                    href={row.verifyHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {TRACKER_VERIFY_LABEL}
                  </a>
                ) : (
                  <p className="camp-card-note">
                    No provider link on file — check the camp page.
                  </p>
                )}
                <Link className="camps-text-btn" href={row.href}>
                  View camp details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
