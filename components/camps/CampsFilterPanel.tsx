"use client";

import type { CampsListingFilters } from "@/lib/camps/listingFilter";
import { UNSUPPORTED_LISTING_FILTERS } from "@/lib/camps/listingFilter";

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

type GroupKey =
  | "age"
  | "dates"
  | "theme"
  | "schedule"
  | "audience"
  | "accessibility"
  | "location"
  | "practical"
  | "unsupported";

const GROUP_LABELS: Record<GroupKey, string> = {
  age: "Age",
  dates: "Dates",
  theme: "Theme / activity",
  schedule: "Schedule / format",
  audience: "Audience",
  accessibility: "Accessibility & support",
  location: "Location",
  practical: "Practical needs",
  unsupported: "Not available yet",
};

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
  const patch = (partial: Partial<CampsListingFilters>) =>
    onChange({ ...filters, ...partial });

  return (
    <div className="camps-filter-panel" id={id} data-variant={variant}>
      <div className="camps-filter-panel-head">
        <h2 className="camps-filter-panel-title">Filters</h2>
        <button type="button" className="camps-text-btn" onClick={onReset}>
          Reset
        </button>
      </div>

      <details className="camps-filter-group" open>
        <summary>{GROUP_LABELS.age}</summary>
        <div className="camps-filter-group-body">
          <label className="camps-field">
            <span>Child age (whole years)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="e.g. 7"
              value={
                filters.childAge?.ageYears != null &&
                !Number.isNaN(filters.childAge.ageYears)
                  ? filters.childAge.ageYears
                  : ""
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  const asOf = filters.childAge?.asOfDate ?? null;
                  patch({
                    childAge: asOf
                      ? { ageYears: null, asOfDate: asOf }
                      : null,
                  });
                  return;
                }
                // Blank → null (above). Non-empty invalid parse → NaN so the
                // resolver can distinguish blank from invalid without raw strings.
                const ageYears = Number(raw);
                patch({
                  childAge: {
                    ageYears: Number.isFinite(ageYears)
                      ? ageYears
                      : Number.NaN,
                    asOfDate: filters.childAge?.asOfDate ?? null,
                  },
                });
              }}
            />
          </label>
          <label className="camps-field">
            <span>Age as of (YYYY-MM-DD)</span>
            <input
              type="date"
              value={filters.childAge?.asOfDate ?? ""}
              onChange={(e) => {
                const asOfDate = e.target.value || null;
                const ageYears = filters.childAge?.ageYears ?? null;
                if (asOfDate == null && ageYears == null) {
                  patch({ childAge: null });
                  return;
                }
                patch({
                  childAge: {
                    ageYears,
                    asOfDate,
                  },
                });
              }}
            />
          </label>
          <p className="camps-field-hint">
            Age is evaluated only when this date matches the provider’s session
            assessment date. “Age 7 today” does not prove eligibility at a
            future cutoff. Unknown assessment dates never count as a match.
          </p>
        </div>
      </details>

      <details className="camps-filter-group" open>
        <summary>{GROUP_LABELS.dates}</summary>
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
        <summary>{GROUP_LABELS.theme}</summary>
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
        <summary>{GROUP_LABELS.schedule}</summary>
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
        </div>
      </details>

      <details className="camps-filter-group">
        <summary>{GROUP_LABELS.audience}</summary>
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
        <summary>{GROUP_LABELS.accessibility}</summary>
        <div className="camps-filter-group-body">
          <p className="camps-field-hint">
            Only provider-confirmed support tags on a program are searchable.
            Empty tags never invent inclusion.
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
        <summary>{GROUP_LABELS.location}</summary>
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
        <summary>{GROUP_LABELS.practical}</summary>
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
        <summary>{GROUP_LABELS.unsupported}</summary>
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
