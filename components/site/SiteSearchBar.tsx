"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useBrowseLocation } from "@/components/location/useBrowseLocation";
import {
  DEFAULT_HEADER_CITY,
  HEADER_CITIES,
  SEARCH_PLACEHOLDER,
  headerCityId,
} from "@/lib/home/home";
import { BROWSE_LOCATION_PARAM } from "@/lib/location/browseLocation";

/**
 * Header search: a city, a text field, and a round search button.
 * The form is a GET to /camps, the only live directory, and it works
 * before hydration.
 */
export function SiteSearchBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlWhere = pathname === "/camps" ? searchParams.get(BROWSE_LOCATION_PARAM) : null;
  const [selectedId, choose] = useBrowseLocation(urlWhere);
  const [contentQuery, setContentQuery] = useState(
    pathname === "/camps" ? (searchParams.get("q") ?? "") : "",
  );
  const city = headerCityId(selectedId);

  return (
    <form className="home-search" action="/camps" method="get" role="search">
      <label className="home-search-city">
        <span className="visually-hidden">City</span>
        <select
          name={BROWSE_LOCATION_PARAM}
          value={city}
          onChange={(event) => choose(event.target.value)}
        >
          {HEADER_CITIES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
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
  return (
    <form className="home-search" action="/camps" method="get" role="search">
      <label className="home-search-city">
        <span className="visually-hidden">City</span>
        <select name={BROWSE_LOCATION_PARAM} defaultValue={DEFAULT_HEADER_CITY}>
          {HEADER_CITIES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
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

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l5 5" />
    </svg>
  );
}
