"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useShortlist } from "@/components/shortlist/ShortlistProvider";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import { formatSessionDatesLabel } from "@/lib/camps/campDetail";
import { buildCompareHref } from "@/lib/shortlist/compare";
import { publicIdsFromCatalog, resolveShortlist } from "@/lib/shortlist/resolve";
import { COMPARE_MAX, COMPARE_MIN } from "@/lib/shortlist/types";

export type SavedListClientProps = {
  catalog: CampsCatalogBundle | null;
  nowIso?: string;
};

export function SavedListClient({ catalog, nowIso }: SavedListClientProps) {
  const {
    state,
    hydrated,
    remove,
    markRegistered,
    reconcileUnavailable,
  } = useShortlist();
  const now = useMemo(
    () => (nowIso ? new Date(nowIso) : undefined),
    [nowIso],
  );
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  useEffect(() => {
    if (!hydrated || !catalog) return;
    reconcileUnavailable(publicIdsFromCatalog(catalog));
  }, [hydrated, catalog, reconcileUnavailable, state.items.length]);

  const resolved = useMemo(
    () => resolveShortlist(state, catalog, { now }),
    [state, catalog, now],
  );

  const selectableSessionIds = useMemo(() => {
    const ids: string[] = [];
    for (const item of resolved.active) {
      if (item.kind === "session") ids.push(item.session.id);
      if (item.kind === "program") {
        for (const session of item.sessions) ids.push(session.id);
      }
    }
    return new Set(ids);
  }, [resolved.active]);

  useEffect(() => {
    setSelectedSessionIds((current) => {
      const next = current.filter((id) => selectableSessionIds.has(id));
      if (
        next.length === current.length &&
        next.every((id, index) => id === current[index])
      ) {
        return current;
      }
      return next;
    });
  }, [selectableSessionIds]);

  const toggleSession = (sessionId: string, checked: boolean) => {
    setSelectedSessionIds((current) => {
      if (checked) {
        if (current.includes(sessionId)) return current;
        if (current.length >= COMPARE_MAX) return current;
        return [...current, sessionId];
      }
      return current.filter((id) => id !== sessionId);
    });
  };

  const compareReady =
    selectedSessionIds.length >= COMPARE_MIN &&
    selectedSessionIds.length <= COMPARE_MAX;

  if (!hydrated) {
    return <p className="camp-card-note">Loading your saved list…</p>;
  }

  return (
    <div className="saved-page">
      <header className="camps-listing-intro">
        <p className="camps-listing-kicker">Your list</p>
        <h1>Saved camps</h1>
        <p className="camps-listing-lede">
          One shortlist on this device — no account needed. Compass stores
          public camp IDs, not copied prices. Marking a camp as registered is
          yours to do; opening a provider link never does it for you.
        </p>
      </header>

      {resolved.catalogPending ? (
        <p className="camps-age-filter-notice" role="status">
          Camp details are not loaded in this environment yet. Your saved IDs
          stay on this device. Unknown is not the same as removed.
        </p>
      ) : null}

      <div className="saved-compare-bar" role="region" aria-label="Compare sessions">
        <p>
          Select {COMPARE_MIN}–{COMPARE_MAX} sessions to compare dates,
          eligibility, hours, care, venue, and cost side by side. Compass does
          not rank incomparable prices.
        </p>
        {compareReady ? (
          <a className="camp-card-cta" href={buildCompareHref(selectedSessionIds)}>
            Compare {selectedSessionIds.length} sessions
          </a>
        ) : (
          <p className="camp-card-note">
            {selectedSessionIds.length} selected — choose at least {COMPARE_MIN}
            {selectedSessionIds.length >= COMPARE_MAX
              ? `, and no more than ${COMPARE_MAX}.`
              : "."}
          </p>
        )}
      </div>

      {resolved.active.length === 0 ? (
        <div className="camps-empty" role="status">
          <h2>Nothing saved yet</h2>
          <p>
            Heart a camp card or a selected session to keep it here. Browsing
            does not require an account.
          </p>
          <p>
            <Link href="/camps">Browse camps</Link>
          </p>
        </div>
      ) : (
        <ul className="saved-list">
          {resolved.active.map((item) => {
            if (item.kind === "catalog_pending") {
              return (
                <li key={item.entry.entryId} className="saved-item">
                  <h2>Saved camp ID</h2>
                  <p className="camp-card-note">
                    Details to load. Compass is not showing unpublished names
                    or prices for this saved ID.
                  </p>
                  <button
                    type="button"
                    className="camps-text-btn"
                    onClick={() => remove(item.entry.ref)}
                  >
                    Remove from list
                  </button>
                </li>
              );
            }

            if (item.kind === "program") {
              return (
                <li key={item.entry.entryId} className="saved-item">
                  <div className="saved-item-head">
                    <div>
                      <p className="camp-card-provider">{item.provider.name}</p>
                      <h2>
                        <Link href={`/camps/${item.program.slug}`}>
                          {item.program.name}
                        </Link>
                      </h2>
                      <p className="camp-card-note">
                        Saved as a camp — pick a session below to compare.
                      </p>
                    </div>
                  </div>
                  {item.sessions.length === 0 ? (
                    <p className="camp-card-note">
                      Upcoming dates not yet verified. No session rows are
                      invented for compare.
                    </p>
                  ) : (
                    <ul className="saved-session-picks">
                      {item.sessions.map((session) => (
                        <li key={session.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedSessionIds.includes(session.id)}
                              disabled={
                                !selectedSessionIds.includes(session.id) &&
                                selectedSessionIds.length >= COMPARE_MAX
                              }
                              onChange={(e) =>
                                toggleSession(session.id, e.target.checked)
                              }
                            />
                            <span>
                              {formatSessionDatesLabel(session)} · compare
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="saved-registered">
                    <input
                      type="checkbox"
                      checked={item.entry.registeredMarkedAt != null}
                      onChange={(e) =>
                        markRegistered(item.entry.ref, e.target.checked)
                      }
                    />
                    <span>Mark as registered (parent-marked only)</span>
                  </label>
                  <button
                    type="button"
                    className="camps-text-btn"
                    onClick={() => remove(item.entry.ref)}
                  >
                    Remove from list
                  </button>
                </li>
              );
            }

            return (
              <li
                key={item.entry.entryId}
                className="saved-item"
                data-session-id={item.session.id}
              >
                <div className="saved-item-head">
                  <div>
                    <p className="camp-card-provider">{item.provider.name}</p>
                    <h2>
                      <Link href={item.row ? `/camps/${item.program.slug}?session=${item.session.id}` : `/camps/${item.program.slug}`}>
                        {item.program.name}
                      </Link>
                    </h2>
                  </div>
                  <label className="saved-compare-pick">
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.includes(item.session.id)}
                      disabled={
                        !selectedSessionIds.includes(item.session.id) &&
                        selectedSessionIds.length >= COMPARE_MAX
                      }
                      onChange={(e) =>
                        toggleSession(item.session.id, e.target.checked)
                      }
                    />
                    <span>Compare</span>
                  </label>
                </div>
                <dl className="camp-card-meta">
                  <div className="camp-card-meta-row">
                    <dt>Dates</dt>
                    <dd>{item.row.datesLabel}</dd>
                  </div>
                  <div className="camp-card-meta-row">
                    <dt>Eligibility</dt>
                    <dd>{item.row.ageEligibilityLabel}</dd>
                  </div>
                  <div className="camp-card-meta-row">
                    <dt>Venue</dt>
                    <dd>{item.row.venueLabel}</dd>
                  </div>
                  <div className="camp-card-meta-row">
                    <dt>Price</dt>
                    <dd>{item.row.priceLabel}</dd>
                  </div>
                </dl>
                <label className="saved-registered">
                  <input
                    type="checkbox"
                    checked={item.entry.registeredMarkedAt != null}
                    onChange={(e) =>
                      markRegistered(item.entry.ref, e.target.checked)
                    }
                  />
                  <span>Mark as registered (parent-marked only)</span>
                </label>
                <button
                  type="button"
                  className="camps-text-btn"
                  onClick={() => remove(item.entry.ref)}
                >
                  Remove from list
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {resolved.past.length > 0 ? (
        <section className="saved-past" aria-labelledby="saved-past-title">
          <h2 id="saved-past-title">Past</h2>
          <p>
            Removed or no longer listed items stay here. Unpublished details
            are not shown.
          </p>
          <ul className="saved-past-list">
            {resolved.past.map((item) => (
              <li key={`${item.entry.entryId}-${item.entry.movedAt}`}>
                {item.publicLabel && item.href ? (
                  <>
                    <Link href={item.href}>{item.publicLabel}</Link>
                    <span className="camp-card-note">
                      {" "}
                      ·{" "}
                      {item.entry.reason === "removed"
                        ? "Removed from your list"
                        : "No longer listed"}
                    </span>
                  </>
                ) : (
                  <span>
                    A saved camp is no longer listed.
                    {item.entry.reason === "removed"
                      ? " You removed it earlier."
                      : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
