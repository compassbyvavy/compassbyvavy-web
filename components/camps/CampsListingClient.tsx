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
import {
  announceBrowseLocation,
  useLocationIndex,
} from "@/components/location/useBrowseLocation";
import { buildCampDetailHref, formatSessionDatesLabel } from "@/lib/camps/campDetail";
import {
  DATE_RANGE_OVERLAP_LABEL,
  EMPTY_LISTING_FILTERS,
  LISTING_BROWSE_CITY,
  LISTING_VIEW_OPTIONS,
  buildListingHref,
  buildListingResults,
  countActiveFilters,
  dateRangeFilterIsActive,
  formatListingCounts,
  listActiveFilterChips,
  listingDistanceAvailability,
  parseListingHrefSearch,
  removeActiveFilterChip,
  resolveFamilyAgeFilter,
  toFlatRows,
  toProviderGroups,
  type CampsListingFilters,
  type ListingSortId,
  type ListingViewId,
  type TimingShortcutId,
} from "@/lib/camps/listingFilter";
import {
  BROWSE_LOCATION_EVENT,
  browseLocationEmptyMessage,
  browseVenueIdsFor,
  browserStorage,
  buildCampsCoverage,
  isValidLocationId,
  readStoredBrowseLocation,
  resolveBrowseLocation,
  writeStoredBrowseLocation,
  type BrowseLocationEventDetail,
} from "@/lib/location/browseLocation";
import {
  locationLabel,
  nameFromLocationId,
} from "@/lib/location/ontarioLocations";

const LISTING_VIEW_KEY = "compass.camps.listingView";

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

function readListingViewFallback(): ListingViewId {
  if (typeof window === "undefined") return "program";
  try {
    const raw = window.sessionStorage.getItem(LISTING_VIEW_KEY);
    if (raw === "program" || raw === "provider" || raw === "session") {
      return raw;
    }
    if (raw === "0") return "session";
    if (raw === "1") return "program";
    return "program";
  } catch {
    return "program";
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
  const [listingView, setListingView] = useState<ListingViewId>("program");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const drawerTitleId = useId();
  const filterPanelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const filtersBtnRef = useRef<HTMLButtonElement>(null);

  // Restore listing state from URL (detail → back) once on mount.
  useEffect(() => {
    const parsed = parseListingHrefSearch(searchParams);
    // URL wins; otherwise use the location remembered from the site header.
    const whereId =
      parsed.filters.whereId ?? readStoredBrowseLocation(browserStorage());
    if (parsed.filters.whereId) {
      writeStoredBrowseLocation(browserStorage(), parsed.filters.whereId);
    }
    setFilters({ ...parsed.filters, whereId });
    setKeywordDraft(parsed.filters.keyword);
    setSort(parsed.sort);
    const hasViewParam = searchParams.has("view") || searchParams.has("group");
    setListingView(hasViewParam ? parsed.listingView : readListingViewFallback());
    setUrlHydrated(true);
    // Intentionally once — subsequent edits write the URL instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(LISTING_VIEW_KEY, listingView);
    } catch {
      /* ignore */
    }
  }, [listingView]);

  // The site header announces location changes; the listing owns the URL.
  useEffect(() => {
    const onLocation = (event: Event) => {
      const detail = (event as CustomEvent<BrowseLocationEventDetail>).detail;
      const next = detail && isValidLocationId(detail.id) ? detail.id : null;
      setFilters((current) =>
        current.whereId === next ? current : { ...current, whereId: next },
      );
    };
    window.addEventListener(BROWSE_LOCATION_EVENT, onLocation);
    return () => window.removeEventListener(BROWSE_LOCATION_EVENT, onLocation);
  }, []);

  // Keep address bar in sync so Back from detail restores filters/sort/group.
  useEffect(() => {
    if (!urlHydrated) return;
    if (pathname !== "/camps") return;
    const href = buildListingHref({
      filters: { ...filters, keyword: keywordDraft },
      sort,
      listingView,
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
    listingView,
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

  const distanceChrome = useMemo(
    () => listingDistanceAvailability(venues),
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
    return { ...filters, keyword: keywordDraft };
  }, [filters, keywordDraft]);

  const ageFilterNotice = useMemo(
    () => resolveFamilyAgeFilter(filters.childAge).notice,
    [filters.childAge],
  );

  const [locationIndex] = useLocationIndex(Boolean(filters.whereId));
  const coverage = useMemo(
    () => buildCampsCoverage(sessions, venues),
    [sessions, venues],
  );
  const browseResolution = useMemo(
    () =>
      locationIndex
        ? resolveBrowseLocation(locationIndex, filters.whereId, coverage)
        : null,
    [locationIndex, filters.whereId, coverage],
  );
  const locationPending = Boolean(filters.whereId) && !browseResolution;
  const browseLabel = !filters.whereId
    ? null
    : browseResolution &&
        browseResolution.status !== "none" &&
        browseResolution.status !== "unknown_location" &&
        locationIndex
      ? locationLabel(locationIndex, browseResolution.location)
      : nameFromLocationId(filters.whereId);
  const browseEmpty = browseResolution
    ? browseLocationEmptyMessage(browseResolution, browseLabel ?? "")
    : null;
  const clearBrowseLocation = useCallback(() => {
    setFilters((current) => ({ ...current, whereId: null }));
    announceBrowseLocation(null);
  }, []);

  const results = useMemo(
    () =>
      buildListingResults(
        { programs, providers, sessions, venuesById },
        appliedFilters,
        {
          sort,
          // While the place list loads, match nothing rather than flash
          // results from every area.
          browseVenueIds: browseResolution
            ? browseVenueIdsFor(browseResolution)
            : filters.whereId
              ? new Set<string>()
              : null,
        },
      ),
    [
      programs,
      providers,
      sessions,
      venuesById,
      appliedFilters,
      sort,
      browseResolution,
      filters.whereId,
    ],
  );

  const flatRows = useMemo(() => toFlatRows(results), [results]);
  const providerGroups = useMemo(() => toProviderGroups(results), [results]);
  const activeFilterCount = countActiveFilters(appliedFilters);
  const activeChips = useMemo(
    () => listActiveFilterChips(appliedFilters),
    [appliedFilters],
  );
  const dateRangeActive = dateRangeFilterIsActive(appliedFilters);
  const now = nowIso ? new Date(nowIso) : undefined;
  const grouped = listingView !== "session";

  const listingReturnHref = useMemo(
    () =>
      buildListingHref({
        filters: { ...filters, keyword: keywordDraft },
        sort,
        listingView,
      }),
    [filters, keywordDraft, sort, listingView],
  );

  const resetFilters = useCallback(() => {
    // "Clear all" clears refinements; the browse location stays until the
    // family changes or clears it.
    setFilters((current) => ({
      ...EMPTY_LISTING_FILTERS,
      whereId: current.whereId,
    }));
    setKeywordDraft("");
  }, []);

  const dismissChip = useCallback((chipId: string) => {
    setFilters((current) => {
      const merged = { ...current, keyword: keywordDraft };
      const next = removeActiveFilterChip(merged, chipId);
      setKeywordDraft(next.keyword);
      return next;
    });
  }, [keywordDraft]);

  const empty = results.programCount === 0 && results.awaitingDatesCount === 0;

  const renderProgramCard = (
    match: (typeof results.matches)[number],
    options?: { flatSessionId?: string; flatNote?: string | null },
  ) => {
    const matching = options?.flatSessionId
      ? match.matchingSessions.filter((s) => s.id === options.flatSessionId)
      : match.matchingSessions;
    return (
      <CampCard
        key={options?.flatSessionId ?? match.program.id}
        program={match.program}
        provider={match.provider}
        matchingSessions={matching}
        venuesById={venuesById}
        href={buildCampDetailHref(match.program.slug, {
          sessionId: options?.flatSessionId,
          returnTo: listingReturnHref,
          matchingSessionIds: match.matchingSessionIds,
        })}
        now={now}
        flatSessionNote={options?.flatNote}
        dateOverlapLabel={
          dateRangeActive && matching.length > 0
            ? DATE_RANGE_OVERLAP_LABEL
            : null
        }
        ctaLabel={
          options?.flatSessionId ? "View this session" : "View dates & details"
        }
        groupedDisclosure={!options?.flatSessionId}
      />
    );
  };

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
        <p className="camps-listing-kicker">Mississauga camps</p>
        <h1>Every camp we can verify — not just our favourites</h1>
        <p className="camps-listing-lede">
          Search and filter by the same session facts parents need: age, dates,
          venue, hours, care, and price. Coverage is ongoing — this is not a
          promise that every Mississauga camp is listed yet. No account
          required.
        </p>
      </header>

      <div className="camps-listing-top">
        <div className="camps-toolbar">
          <div className="camps-field camps-toolbar-city">
            <span id="camps-browse-location-label">Browse location</span>
            <p
              className="camps-toolbar-city-value"
              aria-labelledby="camps-browse-location-label"
            >
              {browseLabel ?? "All listed areas"}
              {filters.whereId ? (
                <button
                  type="button"
                  className="camps-text-btn"
                  onClick={clearBrowseLocation}
                >
                  Clear
                </button>
              ) : null}
            </p>
          </div>
          <p className="camps-toolbar-distance" role="note">
            <span className="camps-field">
              <span>Distance</span>
            </span>
            <span>{distanceChrome.reason}</span>
          </p>
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
        </div>
        <p className="camps-field-hint camps-toolbar-city-hint">
          {filters.whereId
            ? `Showing camps held in ${browseLabel ?? "this place"} only. Change the location in the bar at the top of the page.`
            : `Camps are listed in ${LISTING_BROWSE_CITY} so far. Choose a location at the top of the page to narrow results.`}{" "}
          We do not silently widen to another city or invent kilometres.
        </p>

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

          <fieldset className="camps-view-toggle">
            <legend className="visually-hidden">
              Group sessions by camp
            </legend>
            {LISTING_VIEW_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={
                  listingView === option.id
                    ? "camps-view-option is-active"
                    : "camps-view-option"
                }
              >
                <input
                  type="radio"
                  name="camps-listing-view"
                  value={option.id}
                  checked={listingView === option.id}
                  onChange={() => setListingView(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
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

        {activeChips.length > 0 ? (
          <div className="camps-active-filters" aria-label="Selected filters">
            <ul className="camps-active-filter-list">
              {activeChips.map((chip) => (
                <li key={chip.id}>
                  <button
                    type="button"
                    className="camps-active-filter-chip"
                    onClick={() => dismissChip(chip.id)}
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    <span>{chip.label}</span>
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="camps-text-btn" onClick={resetFilters}>
              Clear all
            </button>
          </div>
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
          {locationPending ? (
            <div className="camps-empty" role="status">
              <p>Checking listings for {browseLabel}…</p>
            </div>
          ) : browseEmpty ? (
            <div className="camps-empty" role="status">
              <h2>{browseEmpty.title}</h2>
              <p>{browseEmpty.body}</p>
              <button
                type="button"
                className="camps-text-btn"
                onClick={clearBrowseLocation}
              >
                Clear location
              </button>
            </div>
          ) : empty ? (
            <div className="camps-empty" role="status">
              <h2>No matching camps</h2>
              <p>
                Nothing matches these filters in{" "}
                {browseLabel ?? LISTING_BROWSE_CITY} for the current data. Try
                clearing a filter — we do not silently widen dates or city.
              </p>
              <button type="button" className="camps-text-btn" onClick={resetFilters}>
                Clear all
              </button>
            </div>
          ) : (
            <>
              <div
                className="camps-results-grid"
                data-view={listingView}
              >
                {listingView === "program"
                  ? results.matches.map((match) => renderProgramCard(match))
                  : listingView === "provider"
                    ? providerGroups.map((group) => (
                        <section
                          key={group.provider.id}
                          className="camps-provider-group"
                          aria-labelledby={`provider-${group.provider.id}`}
                        >
                          <header className="camps-provider-group-head">
                            <div>
                              <p className="camp-card-provider">
                                {group.provider.name}
                              </p>
                              <h2 id={`provider-${group.provider.id}`}>
                                {group.programCount}{" "}
                                {group.programCount === 1 ? "camp" : "camps"}
                                {" · "}
                                {group.matchingSessionCount} matching{" "}
                                {group.matchingSessionCount === 1
                                  ? "session"
                                  : "sessions"}
                              </h2>
                            </div>
                          </header>
                          <div className="camps-provider-group-cards">
                            {group.matches.map((match) =>
                              renderProgramCard(match),
                            )}
                          </div>
                        </section>
                      ))
                    : flatRows.map((row) =>
                        renderProgramCard(
                          {
                            program: row.program,
                            provider: row.provider,
                            matchingSessionIds: row.matchingSessionIds,
                            matchingSessions: [row.session],
                          },
                          {
                            flatSessionId: row.session.id,
                            flatNote: formatSessionDatesLabel(row.session),
                          },
                        ),
                      )}
              </div>

              {grouped && results.awaitingDatesCount > 0 ? (
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

              {!grouped && results.awaitingDatesCount > 0 ? (
                <p className="camps-awaiting-flat-note" role="note">
                  {results.awaitingDatesCount}{" "}
                  {results.awaitingDatesCount === 1 ? "camp" : "camps"} awaiting
                  verified dates {results.awaitingDatesCount === 1 ? "is" : "are"}{" "}
                  not shown as session rows — each-session mode does not invent
                  dates.{" "}
                  <button
                    type="button"
                    className="camps-text-btn"
                    onClick={() => setListingView("program")}
                  >
                    Open group-sessions-by-camp view
                  </button>
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
