"use client";

import { useState } from "react";
import type {
  CampsListingFilters,
  ListingAgeDraft,
} from "@/lib/camps/listingFilter";
import {
  REGISTRATION_FILTER_HELPER,
  REGISTRATION_FILTER_OPTIONS,
  UNSUPPORTED_LISTING_FILTERS,
  draftAgeYears,
  type RegistrationFilterId,
  type TimingShortcutId,
} from "@/lib/camps/listingFilter";

export type CampsFilterPanelProps = {
  id: string;
  filters: CampsListingFilters;
  onChange: (next: CampsListingFilters) => void;
  onReset: () => void;
  themeOptions: string[];
  locationOptions: string[];
  /** When true, render as drawer panel chrome (close control provided by parent). */
  variant: "sidebar" | "drawer";
};

function uniqueDraftAges(draft: ListingAgeDraft | null): number[] {
  return draftAgeYears(draft);
}

function removeDraftAge(
  draft: ListingAgeDraft | null,
  age: number,
): ListingAgeDraft | null {
  const remaining = uniqueDraftAges(draft).filter((a) => a !== age);
  const asOfDate = draft?.asOfDate ?? null;
  if (remaining.length === 0 && !asOfDate) return null;
  if (remaining.length === 0) {
    return { ageYears: null, siblingAges: [], asOfDate };
  }
  const [ageYears, ...siblingAges] = remaining;
  return { ageYears, siblingAges, asOfDate };
}

function addDraftAge(
  draft: ListingAgeDraft | null,
  age: number,
): ListingAgeDraft {
  const ages = uniqueDraftAges(draft);
  if (!ages.includes(age)) ages.push(age);
  const [ageYears, ...siblingAges] = ages;
  return {
    ageYears,
    siblingAges,
    asOfDate: draft?.asOfDate ?? null,
  };
}

const TIMING_CHIPS: { id: TimingShortcutId; label: string }[] = [
  { id: "all", label: "All dates" },
  { id: "summer", label: "Summer" },
  { id: "march_break", label: "March Break" },
  { id: "winter_break", label: "Winter Break" },
  { id: "pa_days", label: "PA Days" },
  { id: "weekends", label: "Weekends" },
];

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function CampsFilterPanel({
  id,
  filters,
  onChange,
  onReset,
  themeOptions,
  locationOptions,
  variant,
}: CampsFilterPanelProps) {
  const [ageDraft, setAgeDraft] = useState("");
  const patch = (partial: Partial<CampsListingFilters>) =>
    onChange({ ...filters, ...partial });

  const addAge = () => {
    const n = Number(ageDraft);
    if (!Number.isInteger(n) || n < 0) return;
    patch({ childAge: addDraftAge(filters.childAge, n) });
    setAgeDraft("");
  };

  return (
    <div className="camps-filter-panel" id={id} data-variant={variant}>
      <div className="camps-filter-panel-head">
        <h2 className="camps-filter-panel-title">Filters</h2>
        <button type="button" className="camps-text-btn" onClick={onReset}>
          Clear all
        </button>
      </div>

      <details className="camps-filter-group camps-filter-group-priority" open>
        <summary>Your kids</summary>
        <div className="camps-filter-group-body">
          <p className="camps-filter-kicker">Ages first — same session</p>
          <p className="camps-field-hint">
            Add each child. A camp session must fit every age on that session
            — we do not combine one week for one sibling with another week for
            another.
          </p>
          <div className="camps-age-badges" role="group" aria-label="Sibling ages">
            {uniqueDraftAges(filters.childAge).map((age) => (
              <button
                key={age}
                type="button"
                className="camps-chip camps-chip-active"
                onClick={() =>
                  patch({
                    childAge: removeDraftAge(filters.childAge, age),
                  })
                }
                aria-label={`Remove age ${age}`}
              >
                {age} ×
              </button>
            ))}
          </div>
          <label className="camps-field">
            <span>Add a child age (whole years)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="e.g. 8"
              value={ageDraft}
              onChange={(e) => setAgeDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAge();
                }
              }}
            />
          </label>
          <button type="button" className="camps-text-btn" onClick={addAge}>
            Add age
          </button>
          <label className="camps-field">
            <span>Age as of (YYYY-MM-DD)</span>
            <input
              type="date"
              value={filters.childAge?.asOfDate ?? ""}
              onChange={(e) => {
                const asOfDate = e.target.value || null;
                const ages = uniqueDraftAges(filters.childAge);
                if (asOfDate == null && ages.length === 0) {
                  patch({ childAge: null });
                  return;
                }
                const [ageYears, ...siblingAges] = ages;
                patch({
                  childAge: {
                    ageYears: ageYears ?? null,
                    siblingAges,
                    asOfDate,
                  },
                });
              }}
            />
          </label>
          <p className="camps-field-hint">
            Age is evaluated only when this date matches the provider’s session
            assessment date. “Age 8 today” does not prove eligibility at a
            future cutoff. Unknown assessment dates never count as a match.
          </p>
        </div>
      </details>

      <details className="camps-filter-group camps-filter-group-priority" open>
        <summary>Registration</summary>
        <div className="camps-filter-group-body">
          <fieldset className="camps-radio-fieldset">
            <legend className="visually-hidden">Registration status</legend>
            {REGISTRATION_FILTER_OPTIONS.map((option) => (
              <label key={option.id} className="camps-check">
                <input
                  type="radio"
                  name={`${id}-registration`}
                  checked={filters.registrationFilter === option.id}
                  onChange={() =>
                    patch({
                      registrationFilter: option.id as RegistrationFilterId,
                    })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <p className="camps-field-hint">{REGISTRATION_FILTER_HELPER}</p>
        </div>
      </details>

      <details className="camps-filter-group" open>
        <summary>Season / timing</summary>
        <div className="camps-filter-group-body">
          <div
            className="camps-timing-chips camps-timing-chips-stacked"
            role="group"
            aria-label="Season and timing"
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
                  patch({ timingShortcut: chip.id })
                }
              >
                {chip.label}
              </button>
            ))}
          </div>
          <p className="camps-field-hint">
            Timing matches the session’s verified seasonal label. Unknown
            labels never count as Summer, March Break, or PA Days.
          </p>
        </div>
      </details>

      <details className="camps-filter-group" open>
        <summary>Dates</summary>
        <div className="camps-filter-group-body">
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
      </details>

      <details className="camps-filter-group">
        <summary>Theme / activity</summary>
        <div className="camps-filter-group-body camps-check-list">
          {themeOptions.map((theme) => (
            <label key={theme} className="camps-check">
              <input
                type="checkbox"
                checked={filters.themes.includes(theme)}
                onChange={() =>
                  patch({ themes: toggleInList(filters.themes, theme) })
                }
              />
              <span>{theme}</span>
            </label>
          ))}
        </div>
      </details>

      <details className="camps-filter-group">
        <summary>Schedule / format</summary>
        <div className="camps-filter-group-body camps-check-list">
          {(
            [
              ["full_day", "Full day"],
              ["half_day", "Half day"],
              ["short_session", "Short session"],
              ["single_day", "Single day"],
              ["weekly", "Weekly"],
              ["multiweek", "Multi-week"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="camps-check">
              <input
                type="checkbox"
                checked={filters.scheduleFormats.includes(value)}
                onChange={() =>
                  patch({
                    scheduleFormats: toggleInList(
                      filters.scheduleFormats,
                      value,
                    ),
                  })
                }
              />
              <span>{label}</span>
            </label>
          ))}
          <p className="camps-field-hint">
            Stay type is separate from day length. Unknown stay type never
            matches a day or overnight filter.
          </p>
          {(
            [
              ["day", "Day camp"],
              ["overnight", "Overnight"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="camps-check">
              <input
                type="checkbox"
                checked={filters.stayTypes.includes(value)}
                onChange={() =>
                  patch({
                    stayTypes: toggleInList(filters.stayTypes, value),
                  })
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </details>

      <details className="camps-filter-group">
        <summary>Audience</summary>
        <div className="camps-filter-group-body camps-check-list">
          {(
            [
              ["child_only", "Child only"],
              ["parent_and_child", "Parent & child"],
              ["family", "Family"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="camps-check">
              <input
                type="checkbox"
                checked={filters.audiences.includes(value)}
                onChange={() =>
                  patch({
                    audiences: toggleInList(filters.audiences, value),
                  })
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </details>

      <details className="camps-filter-group">
        <summary>Accessibility &amp; support</summary>
        <div className="camps-filter-group-body">
          <p className="camps-field-hint">
            Only provider-confirmed support tags on a program are searchable.
            Empty tags never invent inclusion, and there is no generic Inclusive
            badge.
          </p>
          <label className="camps-field">
            <span>Required tag</span>
            <input
              type="text"
              placeholder="Type a confirmed tag"
              value={filters.accessibilityTags[0] ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                patch({ accessibilityTags: v ? [v] : [] });
              }}
            />
          </label>
        </div>
      </details>

      <details className="camps-filter-group" open>
        <summary>City / neighbourhood</summary>
        <div className="camps-filter-group-body camps-check-list">
          {locationOptions.map((loc) => (
            <label key={loc} className="camps-check">
              <input
                type="checkbox"
                checked={filters.locations.includes(loc)}
                onChange={() =>
                  patch({
                    locations: toggleInList(filters.locations, loc),
                  })
                }
              />
              <span>{loc}</span>
            </label>
          ))}
        </div>
      </details>

      <details className="camps-filter-group" open>
        <summary>Practical needs</summary>
        <div className="camps-filter-group-body">
          <label className="camps-field">
            <span>Max price</span>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="e.g. 300"
              value={filters.priceMax ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                patch({
                  priceMax: raw === "" ? null : Number(raw),
                  priceUnit:
                    raw === ""
                      ? null
                      : filters.priceUnit ?? "per_week",
                });
              }}
            />
          </label>
          <label className="camps-field">
            <span>Price unit</span>
            <select
              value={filters.priceUnit ?? ""}
              onChange={(e) =>
                patch({
                  priceUnit: (e.target.value || null) as
                    | CampsListingFilters["priceUnit"],
                })
              }
            >
              <option value="">Any known unit</option>
              <option value="per_day">Per day</option>
              <option value="per_week">Per week</option>
              <option value="per_session">Per session</option>
              <option value="full_program">Full program</option>
            </select>
          </label>
          <label className="camps-field">
            <span>Core start by</span>
            <input
              type="time"
              value={filters.coreHoursStartMax ?? ""}
              onChange={(e) =>
                patch({ coreHoursStartMax: e.target.value || null })
              }
            />
          </label>
          <label className="camps-field">
            <span>Core end from</span>
            <input
              type="time"
              value={filters.coreHoursEndMin ?? ""}
              onChange={(e) =>
                patch({ coreHoursEndMin: e.target.value || null })
              }
            />
          </label>
          <label className="camps-check">
            <input
              type="checkbox"
              checked={filters.requireBeforeCare}
              onChange={(e) =>
                patch({ requireBeforeCare: e.target.checked })
              }
            />
            <span>Before care offered</span>
          </label>
          <label className="camps-check">
            <input
              type="checkbox"
              checked={filters.requireAfterCare}
              onChange={(e) =>
                patch({ requireAfterCare: e.target.checked })
              }
            />
            <span>After care offered</span>
          </label>
        </div>
      </details>

      <details className="camps-filter-group">
        <summary>Not available yet</summary>
        <ul className="camps-unsupported-list">
          {UNSUPPORTED_LISTING_FILTERS.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>
              <span>{item.reason}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
