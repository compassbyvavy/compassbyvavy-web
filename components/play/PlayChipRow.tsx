"use client";

export type PlayChipOption<T extends string> = {
  id: T;
  label: string;
};

type PlayChipRowProps<T extends string> = {
  legend: string;
  options: ReadonlyArray<PlayChipOption<T>>;
  /** Multi-select ids, or a single selected id. */
  selected: readonly T[] | T | null;
  onToggle: (id: T) => void;
};

function isSelected<T extends string>(
  selected: readonly T[] | T | null,
  id: T,
): boolean {
  if (selected == null) return false;
  return Array.isArray(selected) ? selected.includes(id) : selected === id;
}

export function PlayChipRow<T extends string>({
  legend,
  options,
  selected,
  onToggle,
}: PlayChipRowProps<T>) {
  return (
    <div className="play-chip-block">
      <p className="play-chip-legend">{legend}</p>
      <div className="play-chip-row" role="group" aria-label={legend}>
        {options.map((option) => {
          const pressed = isSelected(selected, option.id);
          return (
            <button
              key={option.id}
              type="button"
              className={pressed ? "play-chip play-chip-active" : "play-chip"}
              aria-pressed={pressed}
              onClick={() => onToggle(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
