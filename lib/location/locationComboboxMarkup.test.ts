import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import rawData from "@/data/discover/ontario-location-data.json";
import { LocationCombobox } from "@/components/location/LocationCombobox";
import {
  buildLocationIndex,
  type OntarioLocationData,
} from "@/lib/location/ontarioLocations";

const index = buildLocationIndex(rawData as OntarioLocationData);

function render(props: Partial<Parameters<typeof LocationCombobox>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(LocationCombobox, {
      index,
      selectedId: "mississauga--r5",
      onSelect: () => {},
      ...props,
    }),
  );
}

const attr = (html: string, tag: RegExp, name: string) =>
  html.match(tag)?.[0].match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe("location combobox semantics", () => {
  it("renders an editable combobox wired to its listbox", () => {
    const html = render();
    const input = /<input[^>]*role="combobox"[^>]*>/;
    assert.match(html, input);
    const controls = attr(html, input, "aria-controls");
    assert.ok(controls);
    assert.match(html, new RegExp(`<ul[^>]*id="${controls}"[^>]*role="listbox"`));
    assert.equal(attr(html, input, "aria-autocomplete"), "list");
    assert.equal(attr(html, input, "aria-expanded"), "false");
    assert.equal(attr(html, input, "value"), "Mississauga");
    assert.match(html, /<label[^>]*for="[^"]+"[^>]*>[\s\S]*Location<\/span><\/label>/);
  });

  it("hides the inline list until opened", () => {
    assert.match(render(), /class="location-combobox-popup" hidden=""/);
  });

  it("shows the mobile picker list immediately, with region subtitles", () => {
    const html = render({ variant: "sheet", selectedId: null });
    const input = /<input[^>]*role="combobox"[^>]*>/;
    assert.equal(attr(html, input, "aria-expanded"), "true");
    assert.doesNotMatch(html, /location-combobox-popup" hidden/);
    const options = html.match(/role="option"/g) ?? [];
    assert.equal(options.length, 3);
    assert.match(html, /Mississauga[\s\S]*Region 5 · Greater Toronto Area/);
    assert.match(html, /Oakville[\s\S]*Region 3 · Hamilton, Halton and Brant/);
    assert.match(html, /aria-live="polite"/);
  });

  it("shows a loading status instead of an empty list before data arrives", () => {
    const html = render({ index: null, variant: "sheet", selectedId: "oakville--r3" });
    assert.match(html, /Loading Ontario places/);
    assert.equal(attr(html, /<input[^>]*role="combobox"[^>]*>/, "value"), "Oakville");
  });
});
