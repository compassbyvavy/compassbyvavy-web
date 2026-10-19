"use client";

import { PlayChipRow } from "@/components/play/PlayChipRow";
import type {
  IndoorPlayActivity,
  IndoorPlayAgeGroup,
  IndoorPlayArea,
  IndoorPlaySessionType,
  IndoorPlayVisitMode,
} from "@/data/play/types";
import {
  ACTIVITY_CHIP_LABELS,
  ADULTS_CHIP_LABELS,
  AGE_GROUP_CHIP_LABELS,
  AREA_CHIP_LABELS,
  FOOD_CHIP_LABELS,
  PRICE_BAND_CHIP_LABELS,
  SESSION_CHIP_LABELS,
  SOCKS_CHIP_LABELS,
  VISIT_CHIP_LABELS,
  WHEN_CHIP_LABELS,
  type IndoorPlayAdultsFact,
  type IndoorPlayFilters,
  type IndoorPlayFoodOption,
  type IndoorPlayPriceBand,
  type IndoorPlaySocksOption,
  type IndoorPlayWhenWindow,
} from "@/lib/play/indoorPlayFilter";

export type IndoorPlayFilterPanelProps = {
  id: string;
  filters: IndoorPlayFilters;
  onChange: (next: IndoorPlayFilters) => void;
  onReset: () => void;
  variant: "sidebar" | "drawer";
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

export function IndoorPlayFilterPanel({
  id,
  filters,
  onChange,
  onReset,
  variant,
}: IndoorPlayFilterPanelProps) {
  const patch = (partial: Partial<IndoorPlayFilters>) =>
    onChange({ ...filters, ...partial });

  return (
    <div className="play-filter-panel" id={id} data-variant={variant}>
      <div className="play-filter-panel-head">
        <h2 className="play-filter-panel-title">Filters</h2>
        <button type="button" className="play-text-btn" onClick={onReset}>
          Reset all
        </button>
      </div>

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
            onClick={() => patch({ mixedAges: !filters.mixedAges })}
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
              patch({ rainyWeekdayMorning: !filters.rainyWeekdayMorning })
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
          patch({ ageGroups: toggleInList(filters.ageGroups, id) })
        }
      />

      <PlayChipRow<IndoorPlayPriceBand>
        legend="Price per child"
        options={entries(PRICE_BAND_CHIP_LABELS)}
        selected={filters.priceBand}
        onToggle={(id) =>
          patch({ priceBand: toggleOne(filters.priceBand, id) })
        }
      />

      <PlayChipRow<IndoorPlayWhenWindow>
        legend="When"
        options={entries(WHEN_CHIP_LABELS)}
        selected={filters.when}
        onToggle={(id) => patch({ when: toggleInList(filters.when, id) })}
      />

      <PlayChipRow<IndoorPlayVisitMode>
        legend="How to visit"
        options={entries(VISIT_CHIP_LABELS)}
        selected={filters.visitMode}
        onToggle={(id) =>
          patch({ visitMode: toggleOne(filters.visitMode, id) })
        }
      />

      <PlayChipRow<IndoorPlayArea>
        legend="Area"
        options={entries(AREA_CHIP_LABELS)}
        selected={filters.area}
        onToggle={(id) => patch({ area: toggleOne(filters.area, id) })}
      />

      <details className="play-more-filters">
        <summary>More filters</summary>
        <div className="play-more-filters-body">
          <PlayChipRow<IndoorPlayActivity>
            legend="Activity"
            options={entries(ACTIVITY_CHIP_LABELS)}
            selected={filters.activities}
            onToggle={(id) =>
              patch({ activities: toggleInList(filters.activities, id) })
            }
          />

          <div className="play-toggle-row">
            <button
              type="button"
              className={
                filters.goodForToddlers
                  ? "play-chip play-chip-active"
                  : "play-chip"
              }
              aria-pressed={filters.goodForToddlers}
              onClick={() =>
                patch({ goodForToddlers: !filters.goodForToddlers })
              }
            >
              Good for toddlers
            </button>
            <button
              type="button"
              className={
                filters.parties ? "play-chip play-chip-active" : "play-chip"
              }
              aria-pressed={filters.parties}
              onClick={() => patch({ parties: !filters.parties })}
            >
              Hosts birthday parties
            </button>
            <button
              type="button"
              className={
                filters.sensoryFriendly
                  ? "play-chip play-chip-active"
                  : "play-chip"
              }
              aria-pressed={filters.sensoryFriendly}
              onClick={() =>
                patch({ sensoryFriendly: !filters.sensoryFriendly })
              }
            >
              Sensory-friendly
            </button>
          </div>

          <PlayChipRow<IndoorPlayAdultsFact>
            legend="Adults"
            options={entries(ADULTS_CHIP_LABELS)}
            selected={filters.adults}
            onToggle={(id) => patch({ adults: toggleOne(filters.adults, id) })}
          />

          <PlayChipRow<IndoorPlayFoodOption>
            legend="Food"
            options={entries(FOOD_CHIP_LABELS)}
            selected={filters.food}
            onToggle={(id) => patch({ food: toggleInList(filters.food, id) })}
          />

          <PlayChipRow<IndoorPlaySocksOption>
            legend="Socks"
            options={entries(SOCKS_CHIP_LABELS)}
            selected={filters.socks}
            onToggle={(id) => patch({ socks: toggleInList(filters.socks, id) })}
          />

          <PlayChipRow<IndoorPlaySessionType>
            legend="Visit length"
            options={entries(SESSION_CHIP_LABELS)}
            selected={filters.sessionType}
            onToggle={(id) =>
              patch({ sessionType: toggleOne(filters.sessionType, id) })
            }
          />
        </div>
      </details>
    </div>
  );
}
