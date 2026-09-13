"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import { CampCard } from "@/components/camps/CampCard";
import { CampsFilterPanel } from "@/components/camps/CampsFilterPanel";
import { buildCampDetailHref } from "@/lib/camps/campDetail";
import {
  EMPTY_LISTING_FILTERS,
  buildListingHref,
  buildListingResults,
  countActiveFilters,
  formatListingCounts,
  parseListingHrefSearch,
  resolveChildAgeFilter,
  toFlatRows,
  type CampsListingFilters,
  type ListingSortId,
  type TimingShortcutId,
} from "@/lib/camps/listingFilter";

const GROUP_TOGGLE_KEY = "compass.camps.groupByProgram";

const TIMING_CHIPS: { id: TimingShortcutId; label: string }[] = [
  { id: "all", label: "All dates" },
  { id: "summer", label: "Summer" },
  { id: "march_break", label: "March Break" },
  { id: "winter_break", label: "Winter Break" },
  { id: "pa_days", label: "PA Days" },
  { id: "weekends", label: "Weekends" },
];

export type CampsListingClientProps = {
  programs: CampProgram[];
  providers: Provider[];
  sessions: CampSession[];
  venues: Venue[];
  /** Fixed clock for registration display in fixture previews. */
  nowIso?: string;
  /** Dev banner when serving gated fixtures. */
  showDevBanner?: boolean;
  /** Optional override for the listing provenance banner. */
  catalogBanner?: string | null;
};

function readGroupPreferenceFallback(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.sessionStorage.getItem(GROUP_TOGGLE_KEY);
    if (raw == null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function CampsListingClient({
  programs,
  providers,
  sessions,
  venues,
  nowIso,
  showDevBanner = false,
  catalogBanner = null,
}: CampsListingClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<CampsListingFilters>(EMPTY_LISTING_FILTERS);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [sort, setSort] = useState<ListingSortId>("soonest_start");
  const [groupByProgram, setGroupByProgram] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const drawerTitleId = useId();
  const filterPanelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const filtersBtnRef = useRef<HTMLButtonElement>(null);

  // Restore listing state from URL (detail → back) once on mount.
  useEffect(() => {
    const parsed = parseListingHrefSearch(searchParams);
    setFilters(parsed.filters);
    setKeywordDraft(parsed.filters.keyword);
    setSort(parsed.sort);
    const hasGroupParam = searchParams.has("group");
    setGroupByProgram(
      hasGroupParam ? parsed.groupByProgram : readGroupPreferenceFallback(),
    );
    setUrlHydrated(true);
    // Intentionally once — subsequent edits write the URL instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        GROUP_TOGGLE_KEY,
        groupByProgram ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }, [groupByProgram]);

  // Keep address bar in sync so Back from detail restores filters/sort/group.
  useEffect(() => {
    if (!urlHydrated) return;
    if (pathname !== "/camps") return;
    const href = buildListingHref({
      filters: { ...filters, keyword: keywordDraft },
      sort,
      groupByProgram,
    });
    const nextQs = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
    const currentQs = searchParams.toString();
    if (nextQs === currentQs) return;
    router.replace(href, { scroll: false });
  }, [
    urlHydrated,
    pathname,
    filters,
    keywordDraft,
    sort,
    groupByProgram,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!drawerOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        filtersBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const venuesById = useMemo(
    () => Object.fromEntries(venues.map((v) => [v.id, v])),
    [venues],
  );

  const themeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of programs) {
      if (p.primaryCategory) set.add(p.primaryCategory);
      for (const t of p.secondaryThemes ?? []) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [programs]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of venues) {
      if (v.neighbourhood) set.add(v.neighbourhood);
      if (v.city) set.add(v.city);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [venues]);

  const appliedFilters = useMemo(() => {
    const { applied } = resolveChildAgeFilter(filters.childAge);
    return { ...filters, keyword: keywordDraft, childAge: applied };
  }, [filters, keywordDraft]);

  const ageFilterNotice = useMemo(
    () => resolveChildAgeFilter(filters.childAge).notice,
    [filters.childAge],
  );

  const results = useMemo(
    () =>
      buildListingResults(
        { programs, providers, sessions, venuesById },
        appliedFilters,
        { sort },
      ),
    [programs, providers, sessions, venuesById, appliedFilters, sort],
  );

  const flatRows = useMemo(() => toFlatRows(results), [results]);
  const activeFilterCount = countActiveFilters(appliedFilters);
  const now = nowIso ? new Date(nowIso) : undefined;

  const listingReturnHref = useMemo(
    () =>
      buildListingHref({
        filters: { ...filters, keyword: keywordDraft },
        sort,
        groupByProgram,
      }),
    [filters, keywordDraft, sort, groupByProgram],
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_LISTING_FILTERS);
    setKeywordDraft("");
  }, []);

  const empty = results.programCount === 0 && results.awaitingDatesCount === 0;

  return (
    <div className="camps-listing">
      {catalogBanner ? (
        <p className="camps-preview-banner" role="status">
          {catalogBanner}
        </p>
      ) : showDevBanner ? (
        <p className="camps-preview-banner" role="status">
          DEV ONLY — fictional Mississauga camps fixtures via server gate. Not
          production directory data. Public browsing does not require an
          account.
        </p>
      ) : null}

      <header className="camps-listing-intro">
        <h1>Camps in Mississauga</h1>
        <p className="camps-listing-lede">
          Every camp we can verify — not just our favourites. Search and filter
          by the same session facts parents need: age, dates, venue, hours,
          care, and price. Coverage is ongoing.
        </p>
      </header>

      <div className="camps-listing-top">
        <form
          className="camps-search-row"
          onSubmit={(e) => {
            e.preventDefault();
          }}
          role="search"
          aria-label="Camp search"
        >
          <label className="camps-field camps-search-keyword">
            <span>Keyword</span>
            <input
              type="search"
              placeholder="Camp, provider, neighbourhood…"
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
            />
          </label>
        </form>

        <div
          className="camps-timing-chips"
          role="group"
          aria-label="Timing shortcuts"
        >
          {TIMING_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={
                filters.timingShortcut === chip.id
                  ? "camps-chip camps-chip-active"
                  : "camps-chip"
              }
              aria-pressed={filters.timingShortcut === chip.id}
              onClick={() =>
                setFilters((f) => ({ ...f, timingShortcut: chip.id }))
              }
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="camps-result-controls">
          <p className="camps-result-count" aria-live="polite">
            {formatListingCounts(results)}
          </p>

          <button
            ref={filtersBtnRef}
            type="button"
            className="camps-filters-open"
            aria-expanded={drawerOpen}
            aria-controls={filterPanelId}
            onClick={() => setDrawerOpen(true)}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>

          <label className="camps-sort">
            <span>Sort</span>
            <select
              value={sort}
              aria-label="Sort results"
              onChange={(e) => setSort(e.target.value as ListingSortId)}
            >
              <option value="soonest_start">Soonest start</option>
              <option value="price_asc">Price (low to high)</option>
              <option value="name_asc">Name A–Z</option>
            </select>
          </label>

          <label className="camps-group-toggle">
            <input
              type="checkbox"
              role="switch"
              checked={groupByProgram}
              aria-checked={groupByProgram}
              onChange={(e) => setGroupByProgram(e.target.checked)}
            />
            <span>Group sessions by camp</span>
          </label>
        </div>

        {ageFilterNotice ? (
          <p
            className="camps-age-filter-notice"
            role="status"
            aria-live="polite"
          >
            {ageFilterNotice}
          </p>
        ) : null}
      </div>

      <div className="camps-listing-layout">
        <aside className="camps-listing-sidebar" aria-label="Camp filters">
          <CampsFilterPanel
            id={`${filterPanelId}-sidebar`}
            variant="sidebar"
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            themeOptions={themeOptions}
            locationOptions={locationOptions}
          />
        </aside>

        <div className="camps-listing-main">
          {empty ? (
            <div className="camps-empty" role="status">
              <h2>No matching camps</h2>
              <p>
                Nothing matches these filters in Mississauga for the current
                data. Try clearing a filter — we do not silently widen dates or
                city.
              </p>
              <button type="button" className="camps-text-btn" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          ) : (
            <>
              <div
                className="camps-results-grid"
                data-view={groupByProgram ? "grouped" : "flat"}
              >
                {groupByProgram
                  ? results.matches.map((match) => (
                      <CampCard
                        key={match.program.id}
                        program={match.program}
                        provider={match.provider}
                        matchingSessions={match.matchingSessions}
                        venuesById={venuesById}
                        href={buildCampDetailHref(match.program.slug, {
                          returnTo: listingReturnHref,
                          matchingSessionIds: match.matchingSessionIds,
                        })}
                        now={now}
                      />
                    ))
                  : flatRows.map((row) => (
                      <CampCard
                        key={row.session.id}
                        program={row.program}
                        provider={row.provider}
                        matchingSessions={[row.session]}
                        venuesById={venuesById}
                        href={buildCampDetailHref(row.program.slug, {
                          sessionId: row.session.id,
                          returnTo: listingReturnHref,
                          matchingSessionIds: row.matchingSessionIds,
                        })}
                        now={now}
                        flatSessionNote={`Session ${row.session.id} · matching set ${row.matchingSessionIds.length}`}
                      />
                    ))}
              </div>

              {groupByProgram && results.awaitingDatesCount > 0 ? (
                <section
                  className="camps-awaiting"
                  aria-labelledby="camps-awaiting-title"
                >
                  <h2 id="camps-awaiting-title">Camps awaiting verified dates</h2>
                  <p>
                    Separately counted — no fabricated session rows.{" "}
                    {results.awaitingDatesCount}{" "}
                    {results.awaitingDatesCount === 1 ? "camp" : "camps"}.
                  </p>
                  <div className="camps-results-grid">
                    {results.awaitingDates.map((match) => (
                      <CampCard
                        key={match.program.id}
                        program={match.program}
                        provider={match.provider}
                        matchingSessions={[]}
                        venuesById={venuesById}
                        href={buildCampDetailHref(match.program.slug, {
                          returnTo: listingReturnHref,
                          matchingSessionIds: [],
                        })}
                        now={now}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {!groupByProgram && results.awaitingDatesCount > 0 ? (
                <p className="camps-awaiting-flat-note" role="note">
                  {results.awaitingDatesCount}{" "}
                  {results.awaitingDatesCount === 1 ? "camp" : "camps"} awaiting
                  verified dates {results.awaitingDatesCount === 1 ? "is" : "are"}{" "}
                  listed only in grouped view — flat mode does not invent session
                  rows.
                </p>
              ) : null}
            </>
          )}

          <section
            className="camps-collections-teaser"
            aria-labelledby="camps-collections-title"
          >
            <p className="camps-teaser-eyebrow">Supplementary</p>
            <h2 id="camps-collections-title">Collections</h2>
            <p>
              Theme collections may appear here later. They supplement the
              directory — they never replace searchable results.
            </p>
          </section>

          <footer className="camps-trust-footer">
            <h2>Coverage &amp; trust</h2>
            <p>
              Inclusion is neutral and ongoing. Source-checked facts stay
              distinct from provider-confirmed ones. Know a Mississauga camp we
              missed?{" "}
              <a href="mailto:hello@compassbyvavy.ca?subject=Camp%20we%20missed">
                Tell us
              </a>
              .
            </p>
          </footer>
        </div>
      </div>

      {drawerOpen ? (
        <div className="camps-drawer-root">
          <button
            type="button"
            className="camps-drawer-backdrop"
            aria-label="Close filters"
            onClick={() => {
              setDrawerOpen(false);
              filtersBtnRef.current?.focus();
            }}
          />
          <div
            className="camps-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
          >
            <div className="camps-drawer-head">
              <h2 id={drawerTitleId}>Filters</h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="camps-text-btn"
                onClick={() => {
                  setDrawerOpen(false);
                  filtersBtnRef.current?.focus();
                }}
              >
                Close
              </button>
            </div>
            <CampsFilterPanel
              id={filterPanelId}
              variant="drawer"
              filters={filters}
              onChange={setFilters}
              onReset={resetFilters}
              themeOptions={themeOptions}
              locationOptions={locationOptions}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
