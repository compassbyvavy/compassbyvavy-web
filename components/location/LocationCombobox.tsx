"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CLOSED_COMBOBOX,
  closeCombobox,
  comboboxKeyDown,
  openCombobox,
  optionDomId,
  selectedCombobox,
  typeInCombobox,
  type LocationComboboxState,
} from "@/lib/location/locationCombobox";
import {
  autoHighlightIndex,
  getLocationById,
  locationLabel,
  nameFromLocationId,
  searchLocations,
  starterSuggestions,
  type LocationIndex,
  type LocationSuggestion,
  type OntarioLocation,
} from "@/lib/location/ontarioLocations";

export type LocationComboboxProps = {
  /** Null while the location list is loading. */
  index: LocationIndex | null;
  selectedId: string | null;
  onSelect: (location: OntarioLocation) => void;
  /** Called when the field is focused, so the parent can start loading data. */
  onRequestData?: () => void;
  /**
   * inline: header field with a dropdown list.
   * sheet: mobile picker — the list is always shown under the field.
   */
  variant?: "inline" | "sheet";
  autoFocus?: boolean;
  /** Escape with the list already closed (sheet: closes the picker). */
  onEscapeClosed?: () => void;
  label?: string;
};

/** Suggestions shown for the current text, before limits. */
export function suggestionsFor(
  index: LocationIndex | null,
  query: string,
  selectedLabel: string,
  selectedId: string | null,
): LocationSuggestion[] {
  if (!index) return [];
  // An untouched field shows starting suggestions, with the current choice first.
  if (query.trim() === "" || query === selectedLabel) {
    const starters = starterSuggestions(index);
    const current = getLocationById(index, selectedId);
    if (current && !starters.some((s) => s.location.id === current.id)) {
      const [first] = searchLocations(index, current.name).filter(
        (s) => s.location.id === current.id,
      );
      if (first) return [first, ...starters];
    }
    return starters;
  }
  return searchLocations(index, query);
}

export function LocationCombobox({
  index,
  selectedId,
  onSelect,
  onRequestData,
  variant = "inline",
  autoFocus = false,
  onEscapeClosed,
  label = "Location",
}: LocationComboboxProps) {
  const sheet = variant === "sheet";
  const reactId = useId();
  const inputId = `loc-input-${reactId}`;
  const listboxId = `loc-list-${reactId}`;
  const statusId = `loc-status-${reactId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = index ? getLocationById(index, selectedId) : null;
  const selectedLabel =
    selected && index
      ? locationLabel(index, selected)
      : selectedId
        ? nameFromLocationId(selectedId)
        : "";

  const [state, setState] = useState<LocationComboboxState>(() => ({
    ...CLOSED_COMBOBOX,
    open: sheet,
    query: selectedLabel,
  }));

  // Keep the field in step with choices made elsewhere (the other picker, the
  // listing's "clear location") without overwriting text the user is typing.
  const shownLabelRef = useRef(selectedLabel);
  useEffect(() => {
    const previous = shownLabelRef.current;
    shownLabelRef.current = selectedLabel;
    setState((s) =>
      s.query === previous || !s.open ? { ...s, query: selectedLabel } : s,
    );
  }, [selectedLabel]);

  const open = sheet || state.open;
  const suggestions = useMemo(
    () => suggestionsFor(index, state.query, selectedLabel, selectedId),
    [index, state.query, selectedLabel, selectedId],
  );
  const untouched = state.query.trim() === "" || state.query === selectedLabel;

  const commit = useCallback(
    (i: number) => {
      const choice = suggestions[i];
      if (!choice || !index) return;
      setState(selectedCombobox(locationLabel(index, choice.location)));
      onSelect(choice.location);
    },
    [index, onSelect, suggestions],
  );

  // Outside click closes the inline list without committing.
  useEffect(() => {
    if (sheet || !state.open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setState((s) => closeCombobox(s, selectedLabel));
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [sheet, state.open, selectedLabel]);

  // Keep the highlighted option visible while arrowing through a long list.
  useEffect(() => {
    if (state.activeIndex === null) return;
    const el = document.getElementById(optionDomId(listboxId, state.activeIndex));
    el?.scrollIntoView?.({ block: "nearest" });
  }, [state.activeIndex, listboxId]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const activeId =
    open && state.activeIndex !== null && suggestions[state.activeIndex]
      ? optionDomId(listboxId, state.activeIndex)
      : undefined;

  const statusText = !index
    ? "Loading Ontario places…"
    : suggestions.length === 0
      ? "No matching Ontario places. Try another spelling or a nearby town."
      : untouched
        ? "Suggested places"
        : `${suggestions.length} ${suggestions.length === 1 ? "place" : "places"} found`;

  return (
    <div
      ref={rootRef}
      className={`location-combobox${sheet ? " location-combobox-sheet" : ""}`}
    >
      <label htmlFor={inputId} className="location-combobox-label">
        <svg
          aria-hidden="true"
          className="location-pin"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        <span className="visually-hidden">{label}</span>
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className="location-combobox-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        aria-describedby={statusId}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="City or region"
        value={state.query}
        onFocus={(e) => {
          onRequestData?.();
          setState((s) => openCombobox(s));
          if (!sheet) e.currentTarget.select();
        }}
        onChange={(e) => {
          const query = e.target.value;
          const next = suggestionsFor(index, query, selectedLabel, selectedId);
          setState(
            typeInCombobox(query, index ? autoHighlightIndex(index, query, next) : null),
          );
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (sheet && e.key === "Escape") {
            // In the mobile picker, Escape closes the whole picker.
            e.preventDefault();
            onEscapeClosed?.();
            return;
          }
          const result = comboboxKeyDown(
            { ...state, open },
            e.key,
            { optionCount: suggestions.length, selectedLabel },
          );
          if (result.handled) e.preventDefault();
          if (result.selectIndex !== null) {
            commit(result.selectIndex);
            return;
          }
          setState(sheet ? { ...result.state, open: true } : result.state);
        }}
      />
      {!sheet ? (
        <button
          type="button"
          className="location-combobox-toggle"
          aria-label={open ? "Hide location suggestions" : "Show location suggestions"}
          aria-controls={listboxId}
          aria-expanded={open}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onRequestData?.();
            inputRef.current?.focus();
            setState((s) => (s.open ? closeCombobox(s, selectedLabel) : openCombobox(s)));
          }}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
      ) : null}

      <div
        className="location-combobox-popup"
        hidden={!open}
      >
        <p id={statusId} className="location-combobox-status" aria-live="polite">
          {statusText}
        </p>
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="location-combobox-list"
        >
          {suggestions.map((s, i) => {
            const active = i === state.activeIndex;
            const current = s.location.id === selectedId;
            return (
              <li
                key={s.location.id}
                id={optionDomId(listboxId, i)}
                role="option"
                aria-selected={active}
                data-current={current || undefined}
                className={`location-option${active ? " is-active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => {
                  if (state.activeIndex !== i) {
                    setState((st) => ({ ...st, activeIndex: i }));
                  }
                }}
                onClick={() => commit(i)}
              >
                <span className="location-option-name">
                  {s.location.name}
                  {current ? <span className="location-option-current"> · current</span> : null}
                </span>
                <span className="location-option-region">{s.subtitle}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
