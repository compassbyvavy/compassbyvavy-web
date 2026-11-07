"use client";

import { useEffect, useState } from "react";
import { LocationCombobox } from "@/components/location/LocationCombobox";
import {
  DATE_RANGE_OVERLAP_LABEL,
  LISTING_BROWSE_CITY,
  draftAgeYears,
  type CampsListingFilters,
  type ListingAgeDraft,
  type ListingFilterChip,
  type TimingShortcutId,
} from "@/lib/camps/listingFilter";
import type { LocationIndex } from "@/lib/location/ontarioLocations";

export const SEARCH_AREA_HEADING = "Find a camp that fits your child";
export const SEARCH_AREA_LEDE =
  "Explore Mississauga camps by age, dates, interests and your family's schedule.";

export const TIMING_CHIPS: { id: TimingShortcutId; label: string }[] = [
  { id: "all", label: "All dates" },
  { id: "summer", label: "Summer" },
  { id: "march_break", label: "March Break" },
  { id: "winter_break", label: "Winter Break" },
  { id: "pa_days", label: "PA Days" },
  { id: "weekends", label: "Weekends" },
];

export type CampsSearchAreaProps = {
  filters: CampsListingFilters;
  keywordDraft: string;
  onChange: (next: CampsListingFilters) => void;
  onKeywordChange: (keyword: string) => void;
  onReset: () => void;
  onWhereChange: (whereId: string | null) => void;
  themeOptions: string[];
  browseLabel: string | null;
  locationIndex: LocationIndex | null;
  onRequestLocationIndex: () => void;
  ageFilterNotice: string | null;
  activeChips: ListingFilterChip[];
  onDismissChip: (chipId: string) => void;
  distanceReason: string;
};

function withPrimaryAge(
  draft: ListingAgeDraft | null,
  ageYears: number | null,
): ListingAgeDraft | null {
  const extras = draftAgeYears(draft).slice(1);
  const asOfDate = draft?.asOfDate ?? null;
  if (ageYears == null && extras.length === 0 && !asOfDate) return null;
  return { ageYears, siblingAges: extras, asOfDate };
}

function withAsOfDate(
  draft: ListingAgeDraft | null,
  asOfDate: string | null,
): ListingAgeDraft | null {
  const ages = draftAgeYears(draft);
  if (!asOfDate && ages.length === 0) return null;
  const [ageYears, ...siblingAges] = ages;
  return {
    ageYears: ageYears ?? draft?.ageYears ?? null,
    siblingAges,
    asOfDate,
  };
}

function removeDraftAge(
  draft: ListingAgeDraft | null,
  age: number,
): ListingAgeDraft | null {
  const remaining = draftAgeYears(draft).filter((value) => value !== age);
  const asOfDate = draft?.asOfDate ?? null;
  if (remaining.length === 0 && !asOfDate) return null;
  if (remaining.length === 0) {
    return { ageYears: null, siblingAges: [], asOfDate };
  }
  const [ageYears, ...siblingAges] = remaining;
  return { ageYears, siblingAges, asOfDate };
}

function parsedAgeInput(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function CampsSearchArea({
  filters,
  keywordDraft,
  onChange,
  onKeywordChange,
  onReset,
  onWhereChange,
  themeOptions,
  browseLabel,
  locationIndex,
  onRequestLocationIndex,
  ageFilterNotice,
  activeChips,
  onDismissChip,
  distanceReason,
}: CampsSearchAreaProps) {
  const patch = (partial: Partial<CampsListingFilters>) =>
    onChange({ ...filters, ...partial });

  const primaryAge = filters.childAge?.ageYears;
  const [ageDraft, setAgeDraft] = useState(() =>
    typeof primaryAge === "number" && !Number.isNaN(primaryAge)
      ? String(primaryAge)
      : "",
  );

  useEffect(() => {
    if (typeof primaryAge === "number" && Number.isInteger(primaryAge) && primaryAge >= 0) {
      setAgeDraft(String(primaryAge));
      return;
    }
    if (primaryAge == null) setAgeDraft("");
  }, [primaryAge]);

  const siblingAges = draftAgeYears(filters.childAge);
  const themeSelectValue =
    filters.themes.length === 1 ? filters.themes[0] : "";

  return (
    <div className="camps-search-area">
      <header className="camps-listing-intro camps-search-intro">
        <p className="camps-listing-kicker">Mississauga camps</p>
        <h1>{SEARCH_AREA_HEADING}</h1>
        <p className="camps-listing-lede">{SEARCH_AREA_LEDE}</p>
      </header>

      <form
        className="camps-search-form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
        role="search"
        aria-label="Camp search"
      >
        <div className="camps-search-grid">
          <fieldset className="camps-search-control">
            <legend className="camps-search-control-label">Child's age</legend>
            <div className="camps-search-control-stack">
              <label className="camps-field">
                <span>Whole years</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="e.g. 8"
                  value={ageDraft}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setAgeDraft(raw);
                    patch({
                      childAge: withPrimaryAge(
                        filters.childAge,
                        parsedAgeInput(raw),
                      ),
                    });
                  }}
                />
              </label>
              <label className="camps-field">
                <span>Age as of</span>
                <input
                  type="date"
                  value={filters.childAge?.asOfDate ?? ""}
                  onChange={(e) =>
                    patch({
                      childAge: withAsOfDate(
                        filters.childAge,
                        e.target.value || null,
                      ),
                    })
                  }
                />
              </label>
            </div>
            {siblingAges.length > 1 ? (
              <div className="camps-age-badges" role="group" aria-label="Sibling ages">
                {siblingAges.map((age) => (
                  <button
                    key={age}
                    type="button"
                    className="camps-chip camps-chip-active"
                    onClick={() =>
                      patch({ childAge: removeDraftAge(filters.childAge, age) })
                    }
                    aria-label={`Remove age ${age}`}
                  >
                    {age} ×
                  </button>
                ))}
              </div>
            ) : null}
            <p className="camps-field-hint">
              Whole years only, on the provider’s assessment date. Age is not
              applied until both a year and that date are set — we do not guess
              birthdays or project eligibility.
            </p>
          </fieldset>

          <fieldset className="camps-search-control">
            <legend className="camps-search-control-label">
              When do you need camp?
            </legend>
            <div className="camps-search-control-stack">
              <label className="camps-field">
                <span>From</span>
                <input
                  type="date"
                  value={filters.dateFrom ?? ""}
                  onChange={(e) =>
                    patch({ dateFrom: e.target.value || null })
                  }
                />
              </label>
              <label className="camps-field">
                <span>To</span>
                <input
                  type="date"
                  value={filters.dateTo ?? ""}
                  onChange={(e) => patch({ dateTo: e.target.value || null })}
                />
              </label>
            </div>
            <p className="camps-field-hint">
              {DATE_RANGE_OVERLAP_LABEL} Unknown session dates never count as a
              match, and this is not a school-calendar lookup.
            </p>
          </fieldset>

          <fieldset className="camps-search-control camps-search-where">
            <legend className="camps-search-control-label">Where?</legend>
            <div className="camps-search-where-row">
              <LocationCombobox
                index={locationIndex}
                selectedId={filters.whereId}
                onSelect={(location) => onWhereChange(location.id)}
                onRequestData={onRequestLocationIndex}
                label="Where?"
              />
              {filters.whereId ? (
                <button
                  type="button"
                  className="camps-text-btn"
                  onClick={() => onWhereChange(null)}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <p className="camps-field-hint">
              {filters.whereId
                ? `Showing camps held in ${browseLabel ?? "this place"} only.`
                : `Camps are listed in ${LISTING_BROWSE_CITY} so far. Choose a place to narrow results.`}{" "}
              We do not silently widen to another city. {distanceReason}
            </p>
          </fieldset>

          <fieldset className="camps-search-control">
            <legend className="camps-search-control-label">
              What do they enjoy?
            </legend>
            <div className="camps-search-control-stack">
              <label className="camps-field">
                <span>Interest</span>
                <select
                  value={themeSelectValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    patch({ themes: value ? [value] : [] });
                  }}
                >
                  <option value="">
                    {filters.themes.length > 1
                      ? `${filters.themes.length} interests selected`
                      : "Any interest"}
                  </option>
                  {themeOptions.map((theme) => (
                    <option key={theme} value={theme}>
                      {theme}
                    </option>
                  ))}
                </select>
              </label>
              <label className="camps-field">
                <span>Camp or provider</span>
                <input
                  type="search"
                  placeholder="Name or neighbourhood…"
                  value={keywordDraft}
                  onChange={(e) => onKeywordChange(e.target.value)}
                />
              </label>
            </div>
            <p className="camps-field-hint">
              Interests match a camp’s listed category or theme. Extra interests
              stay in Filters. Name search is separate and does not invent
              availability.
            </p>
          </fieldset>
        </div>
      </form>

      <div
        className="camps-timing-chips"
        role="group"
        aria-label="School-break shortcuts"
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
            onClick={() => patch({ timingShortcut: chip.id })}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <p className="camps-field-hint">
        School-break shortcuts match the session’s verified seasonal label.
        Unknown labels never count as Summer, March Break, or PA Days.
      </p>

      {ageFilterNotice ? (
        <p className="camps-age-filter-notice" role="status" aria-live="polite">
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
                  onClick={() => onDismissChip(chip.id)}
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <span>{chip.label}</span>
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="camps-text-btn" onClick={onReset}>
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}
