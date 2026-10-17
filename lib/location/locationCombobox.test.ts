import assert from "node:assert/strict";
import { describe, it } from "node:test";
import rawData from "@/data/discover/ontario-location-data.json";
import { suggestionsFor } from "@/components/location/LocationCombobox";
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
  buildLocationIndex,
  locationLabel,
  type OntarioLocationData,
} from "@/lib/location/ontarioLocations";

const index = buildLocationIndex(rawData as OntarioLocationData);
const ctx = (optionCount: number, selectedLabel = "Mississauga") => ({
  optionCount,
  selectedLabel,
});
const open = (activeIndex: number | null, query = "oak"): LocationComboboxState => ({
  open: true,
  query,
  activeIndex,
});

describe("combobox keyboard", () => {
  it("ArrowDown opens a closed list on the first option", () => {
    const r = comboboxKeyDown(CLOSED_COMBOBOX, "ArrowDown", ctx(5));
    assert.equal(r.handled, true);
    assert.equal(r.state.open, true);
    assert.equal(r.state.activeIndex, 0);
  });

  it("ArrowUp opens a closed list on the last option", () => {
    const r = comboboxKeyDown(CLOSED_COMBOBOX, "ArrowUp", ctx(5));
    assert.equal(r.state.open, true);
    assert.equal(r.state.activeIndex, 4);
  });

  it("arrows move through options and wrap at both ends", () => {
    assert.equal(comboboxKeyDown(open(null), "ArrowDown", ctx(3)).state.activeIndex, 0);
    assert.equal(comboboxKeyDown(open(0), "ArrowDown", ctx(3)).state.activeIndex, 1);
    assert.equal(comboboxKeyDown(open(2), "ArrowDown", ctx(3)).state.activeIndex, 0);
    assert.equal(comboboxKeyDown(open(0), "ArrowUp", ctx(3)).state.activeIndex, 2);
    assert.equal(comboboxKeyDown(open(null), "ArrowUp", ctx(3)).state.activeIndex, 2);
  });

  it("Home and End jump only while an option is active", () => {
    assert.equal(comboboxKeyDown(open(1), "End", ctx(4)).state.activeIndex, 3);
    assert.equal(comboboxKeyDown(open(2), "Home", ctx(4)).state.activeIndex, 0);
    const caret = comboboxKeyDown(open(null), "Home", ctx(4));
    assert.equal(caret.handled, false, "Home keeps moving the text caret");
  });

  it("Enter selects the highlighted option and closes", () => {
    const r = comboboxKeyDown(open(2), "Enter", ctx(4));
    assert.equal(r.selectIndex, 2);
    assert.equal(r.state.open, false);
    assert.equal(r.handled, true);
  });

  it("Enter with nothing highlighted selects nothing", () => {
    const r = comboboxKeyDown(open(null, "Richmond"), "Enter", ctx(2));
    assert.equal(r.selectIndex, null);
    assert.equal(r.state.open, true, "list stays open so the family can choose");
    assert.equal(r.handled, true, "the form is not submitted either");
  });

  it("Escape closes the list and restores the selected place", () => {
    const r = comboboxKeyDown(open(1, "brant"), "Escape", ctx(4, "Mississauga"));
    assert.deepEqual(r.state, { open: false, query: "Mississauga", activeIndex: null });
    assert.equal(r.selectIndex, null);
  });

  it("a second Escape restores leftover text, then does nothing", () => {
    const typed = { open: false, query: "bra", activeIndex: null };
    const r = comboboxKeyDown(typed, "Escape", ctx(0, "Oakville"));
    assert.equal(r.state.query, "Oakville");
    const again = comboboxKeyDown(r.state, "Escape", ctx(0, "Oakville"));
    assert.equal(again.handled, false);
  });

  it("Tab closes without selecting and lets focus move on", () => {
    const r = comboboxKeyDown(open(1), "Tab", ctx(4));
    assert.equal(r.state.open, false);
    assert.equal(r.selectIndex, null);
    assert.equal(r.handled, false);
  });

  it("other keys pass through untouched", () => {
    const state = open(1);
    const r = comboboxKeyDown(state, "a", ctx(4));
    assert.equal(r.handled, false);
    assert.equal(r.state, state);
  });

  it("outside click closes without committing", () => {
    assert.deepEqual(closeCombobox(open(2, "brant"), "Oakville"), {
      open: false,
      query: "Oakville",
      activeIndex: null,
    });
  });

  it("builds stable option ids for aria-activedescendant", () => {
    assert.equal(optionDomId("loc-list-1", 3), "loc-list-1-opt-3");
  });
});

describe("typing and choosing a place", () => {
  it("typing an ambiguous name leaves nothing highlighted, so Enter cannot guess", () => {
    const options = suggestionsFor(index, "Richmond", "Mississauga", "mississauga--r5");
    const state = typeInCombobox("Richmond", autoHighlightIndex(index, "Richmond", options));
    assert.equal(state.activeIndex, null);
    const enter = comboboxKeyDown(state, "Enter", ctx(options.length));
    assert.equal(enter.selectIndex, null);
  });

  it("arrowing to a specific Richmond and pressing Enter picks that region", () => {
    const options = suggestionsFor(index, "Richmond", "", null);
    let state = typeInCombobox("Richmond", null);
    const target = options.findIndex((s) => s.location.id === "richmond--r10");
    for (let i = 0; i <= target; i += 1) {
      state = comboboxKeyDown(state, "ArrowDown", ctx(options.length)).state;
    }
    const enter = comboboxKeyDown(state, "Enter", ctx(options.length));
    assert.equal(options[enter.selectIndex!].location.id, "richmond--r10");
  });

  it("an empty field opens on the starter places, with the current choice first", () => {
    const starters = suggestionsFor(index, "", "", null).map((s) => s.location.id);
    assert.deepEqual(starters, ["mississauga--r5", "oakville--r3", "brampton--r5"]);
    const withCurrent = suggestionsFor(index, "Milton", "Milton", "milton--r3");
    assert.equal(withCurrent[0].location.id, "milton--r3");
    assert.equal(withCurrent.length, 4);
  });

  it("selecting shows the place in the location field only", () => {
    const options = suggestionsFor(index, "Oakville", "", null);
    const choice = options[0].location;
    const state = selectedCombobox(locationLabel(index, choice));
    assert.deepEqual(state, { open: false, query: "Oakville", activeIndex: null });
  });
});

describe("mobile picker selection", () => {
  it("opens with the list showing, types, arrows and selects without closing the list early", () => {
    // The sheet variant keeps open = true; the component forces it after each key.
    let state: LocationComboboxState = openCombobox({ ...CLOSED_COMBOBOX, query: "" });
    const initial = suggestionsFor(index, state.query, "", null);
    assert.equal(initial.length, 3, "starter places are listed as soon as it opens");

    const query = "port cred";
    const options = suggestionsFor(index, query, "", null);
    state = typeInCombobox(query, autoHighlightIndex(index, query, options));
    assert.equal(options[0].location.name, "Port Credit");

    state = comboboxKeyDown(state, "ArrowDown", ctx(options.length)).state;
    state = { ...state, open: true };
    const enter = comboboxKeyDown(state, "Enter", ctx(options.length));
    assert.equal(options[enter.selectIndex!].location.id, "port-credit--r5");
  });

  it("tapping an option selects the same place as keyboard selection", () => {
    const options = suggestionsFor(index, "brampton", "", null);
    // A tap commits options[i] directly — same data path as Enter.
    const tapped = options[0].location;
    assert.equal(tapped.id, "brampton--r5");
    assert.equal(selectedCombobox(locationLabel(index, tapped)).query, "Brampton");
  });
});
