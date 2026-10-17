/**
 * Keyboard and open/close state for the location combobox.
 *
 * Pure so it can be tested without a DOM. The component owns side effects
 * (selecting, focusing, scrolling the active option into view) and asks this
 * module what each key means.
 *
 * Follows the WAI-ARIA editable combobox with list autocomplete pattern:
 * focus stays in the input, aria-activedescendant points at the active option.
 */

export type LocationComboboxState = {
  open: boolean;
  /** What the user has typed. Separate from the content-search query. */
  query: string;
  /** Highlighted option, or null when nothing is highlighted. */
  activeIndex: number | null;
};

export const CLOSED_COMBOBOX: LocationComboboxState = {
  open: false,
  query: "",
  activeIndex: null,
};

export type ComboboxKeyContext = {
  /** Options currently rendered in the list. */
  optionCount: number;
  /** Label of the currently selected location, restored on Escape. */
  selectedLabel: string;
};

export type ComboboxKeyResult = {
  state: LocationComboboxState;
  /** Option index to select, when the key commits a choice. */
  selectIndex: number | null;
  /** True when the component should preventDefault the key event. */
  handled: boolean;
};

export function openCombobox(
  state: LocationComboboxState,
): LocationComboboxState {
  return state.open ? state : { ...state, open: true };
}

export function closeCombobox(
  state: LocationComboboxState,
  selectedLabel: string,
): LocationComboboxState {
  return { open: false, query: selectedLabel, activeIndex: null };
}

/**
 * Typing replaces the query and opens the list. `autoIndex` is the option to
 * pre-highlight (see autoHighlightIndex) — null for ambiguous names.
 */
export function typeInCombobox(
  query: string,
  autoIndex: number | null,
): LocationComboboxState {
  return { open: true, query, activeIndex: autoIndex };
}

/** After choosing an option: close, and show the chosen place in the field. */
export function selectedCombobox(label: string): LocationComboboxState {
  return { open: false, query: label, activeIndex: null };
}

function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

export function comboboxKeyDown(
  state: LocationComboboxState,
  key: string,
  ctx: ComboboxKeyContext,
): ComboboxKeyResult {
  const none = { state, selectIndex: null, handled: false };
  const count = ctx.optionCount;

  switch (key) {
    case "ArrowDown": {
      if (!state.open) {
        return {
          state: { ...state, open: true, activeIndex: count > 0 ? 0 : null },
          selectIndex: null,
          handled: true,
        };
      }
      if (count === 0) return { ...none, handled: true };
      const next =
        state.activeIndex === null ? 0 : wrap(state.activeIndex + 1, count);
      return { state: { ...state, activeIndex: next }, selectIndex: null, handled: true };
    }
    case "ArrowUp": {
      if (!state.open) {
        return {
          state: { ...state, open: true, activeIndex: count > 0 ? count - 1 : null },
          selectIndex: null,
          handled: true,
        };
      }
      if (count === 0) return { ...none, handled: true };
      const prev =
        state.activeIndex === null
          ? count - 1
          : wrap(state.activeIndex - 1, count);
      return { state: { ...state, activeIndex: prev }, selectIndex: null, handled: true };
    }
    case "Home":
    case "End": {
      // Only while the list is open and an option is active; otherwise the
      // key keeps its normal caret behaviour in the text field.
      if (!state.open || state.activeIndex === null || count === 0) return none;
      return {
        state: { ...state, activeIndex: key === "Home" ? 0 : count - 1 },
        selectIndex: null,
        handled: true,
      };
    }
    case "Enter": {
      if (!state.open) return none;
      // Enter commits only a highlighted option — never a guess by name.
      if (state.activeIndex === null || state.activeIndex >= count) {
        return { ...none, handled: true };
      }
      return {
        state: { ...state, open: false },
        selectIndex: state.activeIndex,
        handled: true,
      };
    }
    case "Escape": {
      if (state.open) {
        return {
          state: closeCombobox(state, ctx.selectedLabel),
          selectIndex: null,
          handled: true,
        };
      }
      if (state.query !== ctx.selectedLabel) {
        return {
          state: { ...state, query: ctx.selectedLabel },
          selectIndex: null,
          handled: true,
        };
      }
      return none;
    }
    case "Tab": {
      if (!state.open) return none;
      // Leave focus moving; just close without committing.
      return {
        state: closeCombobox(state, ctx.selectedLabel),
        selectIndex: null,
        handled: false,
      };
    }
    default:
      return none;
  }
}

/** Stable DOM id for option `index` of the listbox `listboxId`. */
export function optionDomId(listboxId: string, index: number): string {
  return `${listboxId}-opt-${index}`;
}
