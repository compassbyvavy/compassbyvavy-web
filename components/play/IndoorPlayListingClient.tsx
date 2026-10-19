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
import { IndoorPlayCard } from "@/components/play/IndoorPlayCard";
import { IndoorPlayFilterPanel } from "@/components/play/IndoorPlayFilterPanel";
import { PlayChipRow } from "@/components/play/PlayChipRow";
import type {
  IndoorPlayAgeGroup,
  IndoorPlayArea,
  IndoorPlayVenue,
  IndoorPlayVisitMode,
} from "@/data/play/types";
import {
  AGE_GROUP_CHIP_LABELS,
  AREA_CHIP_LABELS,
  EMPTY_INDOOR_PLAY_FILTERS,
  INDOOR_PLAY_LISTING_PATH,
  PRICE_BAND_CHIP_LABELS,
  VISIT_CHIP_LABELS,
  WHEN_CHIP_LABELS,
  buildIndoorPlayHref,
  buildIndoorPlayResults,
  countActiveFilters,
  formatIndoorPlayCounts,
  indoorPlayEmptyCopy,
  listActiveFilterChips,
  parseIndoorPlayHrefSearch,
  removeActiveFilterChip,
  type IndoorPlayFilters,
  type IndoorPlayPriceBand,
  type IndoorPlayWhenWindow,
} from "@/lib/play/indoorPlayFilter";

export type IndoorPlayListingClientProps = {
  venues: IndoorPlayVenue[];
  showDevBanner?: boolean;
};

function entries<T extends string>(
  labels: Record<T, string>,
): { id: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((id) => ({ id, label: labels[id] }));
}

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function toggleOne<T>(current: T | null, next: T): T | null {
  return current === next ? null : next;
}

export function IndoorPlayListingClient({
  venues,
  showDevBanner = false,
}: IndoorPlayListingClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<IndoorPlayFilters>(
    EMPTY_INDOOR_PLAY_FILTERS,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const drawerTitleId = useId();
  const filterPanelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const filtersBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const parsed = parseIndoorPlayHrefSearch(searchParams);
    setFilters(parsed.filters);
    setUrlHydrated(true);
    // Intentionally once — subsequent edits write the URL instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!urlHydrated) return;
    if (pathname !== INDOOR_PLAY_LISTING_PATH) return;
    const href = buildIndoorPlayHref({ filters });
    const nextQs = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
    const currentQs = searchParams.toString();
    if (nextQs === currentQs) return;
    router.replace(href, { scroll: false });
  }, [urlHydrated, pathname, filters, router, searchParams]);

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

  const results = useMemo(
    () => buildIndoorPlayResults(venues, filters),
    [venues, filters],
  );
  const activeFilterCount = countActiveFilters(filters);
  const activeChips = useMemo(
    () => listActiveFilterChips(filters),
    [filters],
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_INDOOR_PLAY_FILTERS);
  }, []);

  const dismissChip = useCallback((chipId: string) => {
    setFilters((current) => removeActiveFilterChip(current, chipId));
  }, []);

  const empty = results.count === 0;

  return (
    <div className="play-listing">
      {showDevBanner ? (
        <p className="play-preview-banner" role="status">
          DEV ONLY — fictional Indoor Play fixtures via server gate. Not a
          public directory. Discover → Play stays coming soon.
        </p>
      ) : null}

      <header className="play-listing-intro">
        <p className="play-listing-kicker">Mississauga indoor play</p>
        <h1>Places you can actually take the kids this week</h1>
        <p className="play-listing-lede">
          Filter by age, price, and hours as last checked — never a live “open
          now”. Unknown prices stay as Call for price. Coverage is ongoing.
        </p>
      </header>

      <div className="play-listing-top">
        <div
          className="play-chip-block"
          role="group"
          aria-label="Combined shortcuts"
        >
          <p className="play-chip-legend">Shortcuts</p>
          <div className="play-chip-row">
            <button
              type="button"
              className={
                filters.mixedAges ? "play-chip play-chip-active" : "play-chip"
              }
              aria-pressed={filters.mixedAges}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  mixedAges: !current.mixedAges,
                }))
              }
            >
              Mixed ages
            </button>
            <button
              type="button"
              className={
                filters.rainyWeekdayMorning
                  ? "play-chip play-chip-active"
                  : "play-chip"
              }
              aria-pressed={filters.rainyWeekdayMorning}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  rainyWeekdayMorning: !current.rainyWeekdayMorning,
                }))
              }
            >
              Rainy weekday morning
            </button>
          </div>
        </div>

        <PlayChipRow<IndoorPlayAgeGroup>
          legend="Age group"
          options={entries(AGE_GROUP_CHIP_LABELS)}
          selected={filters.ageGroups}
          onToggle={(id) =>
            setFilters((current) => ({
              ...current,
              ageGroups: toggleInList(current.ageGroups, id),
            }))
          }
        />

        <PlayChipRow<IndoorPlayPriceBand>
          legend="Price per child"
          options={entries(PRICE_BAND_CHIP_LABELS)}
          selected={filters.priceBand}
          onToggle={(id) =>
            setFilters((current) => ({
              ...current,
              priceBand: toggleOne(current.priceBand, id),
            }))
          }
        />

        <PlayChipRow<IndoorPlayWhenWindow>
          legend="When"
          options={entries(WHEN_CHIP_LABELS)}
          selected={filters.when}
          onToggle={(id) =>
            setFilters((current) => ({
              ...current,
              when: toggleInList(current.when, id),
            }))
          }
        />

        <PlayChipRow<IndoorPlayVisitMode>
          legend="How to visit"
          options={entries(VISIT_CHIP_LABELS)}
          selected={filters.visitMode}
          onToggle={(id) =>
            setFilters((current) => ({
              ...current,
              visitMode: toggleOne(current.visitMode, id),
            }))
          }
        />

        <PlayChipRow<IndoorPlayArea>
          legend="Area"
          options={entries(AREA_CHIP_LABELS)}
          selected={filters.area}
          onToggle={(id) =>
            setFilters((current) => ({
              ...current,
              area: toggleOne(current.area, id),
            }))
          }
        />

        <div className="play-result-controls">
          <p className="play-result-count" aria-live="polite">
            {formatIndoorPlayCounts(results)}
          </p>
          <button
            ref={filtersBtnRef}
            type="button"
            className="play-filters-open"
            aria-expanded={drawerOpen}
            aria-controls={filterPanelId}
            onClick={() => setDrawerOpen(true)}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>

        {activeChips.length > 0 ? (
          <div className="play-active-filters" aria-label="Selected filters">
            <ul className="play-active-filter-list">
              {activeChips.map((chip) => (
                <li key={chip.id}>
                  <button
                    type="button"
                    className="play-active-filter-chip"
                    onClick={() => dismissChip(chip.id)}
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    <span>{chip.label}</span>
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="play-text-btn" onClick={resetFilters}>
              Reset all
            </button>
          </div>
        ) : null}
      </div>

      <div className="play-listing-layout">
        <aside className="play-listing-sidebar" aria-label="Indoor play filters">
          <IndoorPlayFilterPanel
            id={`${filterPanelId}-sidebar`}
            variant="sidebar"
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
          />
        </aside>

        <div className="play-listing-main">
          {empty ? (
            <div className="play-empty" role="status">
              <h2>No matching places</h2>
              <p>{indoorPlayEmptyCopy(filters)}</p>
              <button type="button" className="play-text-btn" onClick={resetFilters}>
                Reset all
              </button>
            </div>
          ) : (
            <div className="play-results-grid">
              {results.matches.map((venue) => (
                <IndoorPlayCard key={venue.code} venue={venue} />
              ))}
            </div>
          )}
        </div>
      </div>

      {drawerOpen ? (
        <div className="play-drawer-root">
          <button
            type="button"
            className="play-drawer-backdrop"
            aria-label="Close filters"
            onClick={() => {
              setDrawerOpen(false);
              filtersBtnRef.current?.focus();
            }}
          />
          <div
            className="play-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
          >
            <div className="play-drawer-head">
              <h2 id={drawerTitleId}>Filters</h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="play-text-btn"
                onClick={() => {
                  setDrawerOpen(false);
                  filtersBtnRef.current?.focus();
                }}
              >
                Close
              </button>
            </div>
            <IndoorPlayFilterPanel
              id={filterPanelId}
              variant="drawer"
              filters={filters}
              onChange={setFilters}
              onReset={resetFilters}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
