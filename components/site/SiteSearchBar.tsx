"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { useHomePlace } from "@/components/home/useHomePlace";
import {
  DEFAULT_HEADER_CITY,
  HEADER_CITIES,
  HEADER_REGIONS,
  LOCATION_PICKER_LABEL,
  SEARCH_PLACEHOLDER,
  homePlaceById,
} from "@/lib/home/home";
import { BROWSE_LOCATION_PARAM } from "@/lib/location/browseLocation";

/**
 * Header search: city or region, a text field, and a round search button.
 * The form is a GET to /camps, the only live directory, and it works
 * before hydration. The place picker is not a required field. A region
 * does not submit a camps `where` id.
 */
export function SiteSearchBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlWhere = pathname === "/camps" ? searchParams.get(BROWSE_LOCATION_PARAM) : null;
  const [placeId, choose] = useHomePlace(urlWhere);
  const [contentQuery, setContentQuery] = useState(
    pathname === "/camps" ? (searchParams.get("q") ?? "") : "",
  );
  const place = homePlaceById(placeId);

  return (
    <form className="home-search" action="/camps" method="get" role="search">
      <PlacePicker value={place?.id ?? DEFAULT_HEADER_CITY} onChange={choose} />
      {place?.whereId ? <input type="hidden" name={BROWSE_LOCATION_PARAM} value={place.whereId} /> : null}
      <label className="home-search-query">
        <span className="visually-hidden">{SEARCH_PLACEHOLDER}</span>
        <input
          type="search"
          name="q"
          placeholder={SEARCH_PLACEHOLDER}
          value={contentQuery}
          onChange={(event) => setContentQuery(event.target.value)}
        />
      </label>
      <button type="submit" aria-label="Search">
        <SearchIcon />
      </button>
    </form>
  );
}

export function SiteSearchBarShell() {
  const place = homePlaceById(DEFAULT_HEADER_CITY);
  return (
    <form className="home-search" action="/camps" method="get" role="search">
      <PlacePicker defaultValue={DEFAULT_HEADER_CITY} />
      {place?.whereId ? <input type="hidden" name={BROWSE_LOCATION_PARAM} value={place.whereId} /> : null}
      <label className="home-search-query">
        <span className="visually-hidden">{SEARCH_PLACEHOLDER}</span>
        <input type="search" name="q" placeholder={SEARCH_PLACEHOLDER} />
      </label>
      <button type="submit" aria-label="Search">
        <SearchIcon />
      </button>
    </form>
  );
}

function PlacePicker({
  value,
  defaultValue,
  onChange,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
}) {
  return (
    <label className="home-search-city">
      <span className="home-search-city-label">{LOCATION_PICKER_LABEL}</span>
      <select
        {...(value !== undefined
          ? { value, onChange: (event: ChangeEvent<HTMLSelectElement>) => onChange?.(event.target.value) }
          : { defaultValue })}
      >
        <optgroup label="Cities">
          {HEADER_CITIES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Regions">
          {HEADER_REGIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l5 5" />
    </svg>
  );
}
