"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LocationCombobox } from "@/components/location/LocationCombobox";
import {
  useBrowseLocation,
  useLocationIndex,
} from "@/components/location/useBrowseLocation";
import { BROWSE_LOCATION_PARAM } from "@/lib/location/browseLocation";
import {
  getLocationById,
  locationLabel,
  nameFromLocationId,
} from "@/lib/location/ontarioLocations";

const SEARCH_PLACEHOLDER = "Search camps, providers or themes";

/**
 * Site-wide header bar: browse location beside the separate content search.
 *
 * Choosing a location never touches the content-search text. The search form
 * is a plain GET to /camps (the only live directory) carrying `where`, so it
 * works before hydration too.
 */
export function SiteSearchBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlWhere =
    pathname === "/camps" ? searchParams.get(BROWSE_LOCATION_PARAM) : null;
  const [selectedId, choose] = useBrowseLocation(urlWhere);
  const [index, requestIndex] = useLocationIndex(Boolean(selectedId));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contentQuery, setContentQuery] = useState(
    pathname === "/camps" ? (searchParams.get("q") ?? "") : "",
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetTitleId = useId();

  const selected = index ? getLocationById(index, selectedId) : null;
  const selectedLabel =
    selected && index
      ? locationLabel(index, selected)
      : selectedId
        ? nameFromLocationId(selectedId)
        : null;

  // Mobile picker: lock page scroll while open, return focus on close.
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  const closeSheet = () => {
    setSheetOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="site-search-bar">
      {/* Desktop and tablet: inline location field */}
      <div className="site-location site-location-inline">
        <LocationCombobox
          index={index}
          selectedId={selectedId}
          onSelect={(location) => choose(location.id)}
          onRequestData={requestIndex}
        />
        {selectedId ? (
          <button
            type="button"
            className="site-location-clear"
            aria-label={`Clear location${selectedLabel ? ` (${selectedLabel})` : ""}`}
            onClick={() => choose(null)}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>

      {/* Phones: the location control opens a full-screen picker */}
      <button
        ref={triggerRef}
        type="button"
        className="site-location-trigger"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        onClick={() => {
          requestIndex();
          setSheetOpen(true);
        }}
      >
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
        <span className="site-location-trigger-label">
          {selectedLabel ?? "Choose a location"}
        </span>
        <span className="visually-hidden">, change location</span>
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
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <span className="site-search-divider" aria-hidden="true" />

      <form
        className="site-content-search"
        action="/camps"
        method="get"
        role="search"
        aria-label="Search Compass"
      >
        <label className="site-content-search-field">
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="visually-hidden">Search camps</span>
          <input
            type="search"
            name="q"
            placeholder={SEARCH_PLACEHOLDER}
            value={contentQuery}
            onChange={(e) => setContentQuery(e.target.value)}
          />
        </label>
        {selectedId ? (
          <input type="hidden" name={BROWSE_LOCATION_PARAM} value={selectedId} />
        ) : null}
        <button type="submit" className="site-content-search-submit">
          Search
        </button>
      </form>

      {/* Portal: the sticky header's backdrop-filter would otherwise trap a
          fixed-position picker inside the header's box. */}
      {sheetOpen && typeof document !== "undefined" ? createPortal(
        <div className="location-sheet-backdrop" onClick={closeSheet}>
          <div
            className="location-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={sheetTitleId}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              // Keep keyboard focus inside the open picker.
              if (e.key !== "Tab") return;
              const focusable = Array.from(
                e.currentTarget.querySelectorAll<HTMLElement>(
                  "input, button:not([disabled])",
                ),
              );
              if (focusable.length === 0) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
          >
            <div className="location-sheet-head">
              <h2 id={sheetTitleId}>Choose a location</h2>
              <button
                type="button"
                className="location-sheet-close"
                onClick={closeSheet}
              >
                Close
              </button>
            </div>
            <LocationCombobox
              index={index}
              selectedId={selectedId}
              variant="sheet"
              autoFocus
              onRequestData={requestIndex}
              onEscapeClosed={closeSheet}
              onSelect={(location) => {
                choose(location.id);
                closeSheet();
              }}
            />
            {selectedId ? (
              <button
                type="button"
                className="location-sheet-clear"
                onClick={() => {
                  choose(null);
                  closeSheet();
                }}
              >
                Clear location
              </button>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

/** Server/fallback shell with the same layout, before hydration. */
export function SiteSearchBarShell() {
  return (
    <div className="site-search-bar">
      <div className="site-location site-location-inline">
        <div className="location-combobox">
          <span className="location-combobox-label" aria-hidden="true" />
          <input
            className="location-combobox-input"
            type="text"
            aria-label="Location"
            placeholder="Town, city or region"
            disabled
          />
        </div>
      </div>
      <button type="button" className="site-location-trigger" disabled>
        <span className="site-location-trigger-label">Choose a location</span>
      </button>
      <span className="site-search-divider" aria-hidden="true" />
      <form
        className="site-content-search"
        action="/camps"
        method="get"
        role="search"
        aria-label="Search Compass"
      >
        <label className="site-content-search-field">
          <span className="visually-hidden">Search camps</span>
          <input type="search" name="q" placeholder={SEARCH_PLACEHOLDER} />
        </label>
        <button type="submit" className="site-content-search-submit">
          Search
        </button>
      </form>
    </div>
  );
}
