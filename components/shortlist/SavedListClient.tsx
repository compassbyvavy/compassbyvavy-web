"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useShortlist } from "@/components/shortlist/ShortlistProvider";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import { formatSessionDatesLabel } from "@/lib/camps/campDetail";
import {
  buildCompareHref,
  latestVerifiedStatusLabel,
} from "@/lib/shortlist/compare";
import { getDiscoverCategory } from "@/lib/discover/categories";
import {
  displayCost,
  displayProviderHref,
  displayText,
  latestVerifiedLabel,
} from "@/lib/discover/display";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";
import { publicIdsFromCatalog, resolveShortlist } from "@/lib/shortlist/resolve";
import { COMPARE_MAX, COMPARE_MIN } from "@/lib/shortlist/types";

export type SavedListClientProps = {
  catalog: CampsCatalogBundle | null;
  discoverListings?: readonly DiscoverPlaceListing[];
  nowIso?: string;
};

export function SavedListClient({
  catalog,
  discoverListings = [],
  nowIso,
}: SavedListClientProps) {
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
  const discoverListingIds = useMemo(
    () => new Set(discoverListings.map((listing) => listing.id)),
    [discoverListings],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!catalog) {
      reconcileUnavailable({
        programIds: new Set(),
        sessionIds: new Set(),
        campsCatalogLoaded: false,
        discoverListingIds,
      });
      return;
    }
    reconcileUnavailable({
      ...publicIdsFromCatalog(catalog),
      discoverListingIds,
    });
  }, [
    hydrated,
    catalog,
    reconcileUnavailable,
    state.items.length,
    discoverListingIds,
  ]);

  const resolved = useMemo(
    () => resolveShortlist(state, catalog, { now, discoverListings }),
    [state, catalog, now, discoverListings],
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
        <h1>Saved</h1>
        <p className="camps-listing-lede">
          One list on this device — camps and, later, anywhere else you tap
          a heart. No account. Compass stores ids, then reads dates, price,
          and status from the same session record as the listing. Mark as
          registered is your note, not a booking.
        </p>
        <p className="tracker-saved-entry">
          <Link href="/saved/tracker">Registration Tracker</Link>
          {" — "}
          opens-on dates and lifecycle notes on file for these saved camps.
          Not live seat inventory.
        </p>
      </header>

      {resolved.catalogPending ? (
        <p className="camps-age-filter-notice" role="status">
          Camp details are not loaded in this environment yet. Your saved IDs
          stay on this device. Unknown is not the same as removed.
        </p>
      ) : null}

      <div className="saved-compare-dock" role="region" aria-label="Compare sessions">
        <span>
          {selectedSessionIds.length} selected
          {selectedSessionIds.length < COMPARE_MIN
            ? ` — choose ${COMPARE_MIN} to ${COMPARE_MAX}`
            : ""}
          {selectedSessionIds.length >= COMPARE_MAX ? " — four is the limit" : ""}
        </span>
        {compareReady ? (
          <a className="saved-compare-go" href={buildCompareHref(selectedSessionIds)}>
            Compare
          </a>
        ) : (
          <span className="saved-compare-wait">Compare</span>
        )}
      </div>
      <div className="saved-compare-dock-spacer" />

      {resolved.active.length === 0 ? (
        <div className="camps-empty" role="status">
          <h2>Nothing saved yet</h2>
          <p>
            Heart a camp or a Discover listing (when preview examples are on)
            to keep it here. Browsing does not require an account.
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

            if (item.kind === "discover") {
              const providerHref = displayProviderHref(item.listing.providerUrl);
              const kind =
                getDiscoverCategory(item.listing.category)?.title ?? "Place";
              return (
                <li key={item.entry.entryId} className="saved-item" data-listing-id={item.listing.id}>
                  <div className="saved-item-head">
                    <div>
                      <p className="camp-card-provider">{kind}</p>
                      <h2>
                        <Link href={item.listing.href}>{item.listing.title}</Link>
                      </h2>
                      <p className="camp-card-note">
                        {displayText(item.listing.areaLabel)}
                        {item.listing.verification === "example"
                          ? " · Example data"
                          : ""}
                      </p>
                    </div>
                  </div>
                  <p className="camp-status-chip camp-status-muted">
                    {latestVerifiedLabel(item.listing.lastVerifiedOn)}
                  </p>
                  <dl className="camp-card-meta">
                    <div className="camp-card-meta-row">
                      <dt>Provider</dt>
                      <dd>{displayText(item.listing.providerName)}</dd>
                    </div>
                    <div className="camp-card-meta-row">
                      <dt>Cost</dt>
                      <dd>{displayCost(item.listing)}</dd>
                    </div>
                  </dl>
                  {providerHref ? (
                    <a
                      className="camp-card-cta"
                      href={providerHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Continue on the provider site
                    </a>
                  ) : (
                    <p className="camp-card-note">Provider link: Unknown</p>
                  )}
                  <label className="saved-registered">
                    <input
                      type="checkbox"
                      checked={item.entry.registeredMarkedAt != null}
                      onChange={(event) =>
                        markRegistered(item.entry.ref, event.target.checked)
                      }
                    />
                    <span>Mark as done (parent-marked only)</span>
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

            const registered = item.entry.registeredMarkedAt != null;
            const statusLabel = latestVerifiedStatusLabel(
              item.row.registration.label,
              item.row.sourceCheckedDate,
            );
            const venueKnown = !/to confirm/i.test(item.row.venueLabel);
            return (
              <li
                key={item.entry.entryId}
                className="saved-item"
                data-session-id={item.session.id}
              >
                <div className="saved-item-top">
                  <input
                    type="checkbox"
                    className="saved-item-check"
                    aria-label={`Select ${item.program.name} to compare`}
                    checked={selectedSessionIds.includes(item.session.id)}
                    disabled={
                      !selectedSessionIds.includes(item.session.id) &&
                      selectedSessionIds.length >= COMPARE_MAX
                    }
                    onChange={(e) =>
                      toggleSession(item.session.id, e.target.checked)
                    }
                  />
                  <div className="saved-item-body">
                    <p className="saved-item-kind">Camp</p>
                    <h2>
                      <Link href={`/camps/${item.program.slug}?session=${item.session.id}`}>
                        {item.program.name}
                      </Link>
                    </h2>
                    <p className="saved-item-meta">
                      {item.provider.name}
                      {" · "}
                      {venueKnown ? item.row.venueLabel : "Unknown"}
                    </p>
                    <span
                      className={
                        registered
                          ? "saved-status-pill is-registered"
                          : "saved-status-pill"
                      }
                    >
                      {registered ? "Marked as registered" : statusLabel}
                    </span>
                    {registered ? (
                      <p className="camp-card-note">{statusLabel}</p>
                    ) : null}
                    <div className="saved-item-actions">
                      <button
                        type="button"
                        className="saved-action"
                        onClick={() =>
                          markRegistered(item.entry.ref, !registered)
                        }
                      >
                        {registered
                          ? "Clear registered mark"
                          : "Mark as registered"}
                      </button>
                      <button
                        type="button"
                        className="saved-action"
                        onClick={() => remove(item.entry.ref)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
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
                    {item.entry.ref.kind === "discover_listing"
                      ? "A saved place is no longer listed."
                      : "A saved camp is no longer listed."}
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
