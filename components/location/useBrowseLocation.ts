"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BROWSE_LOCATION_EVENT,
  browserStorage,
  isValidLocationId,
  readStoredBrowseLocation,
  writeStoredBrowseLocation,
  type BrowseLocationEventDetail,
} from "@/lib/location/browseLocation";
import {
  loadOntarioLocationIndex,
  type LocationIndex,
} from "@/lib/location/ontarioLocations";

/** Tell every listener (header pickers, an open listing) about a new choice. */
export function announceBrowseLocation(id: string | null): void {
  writeStoredBrowseLocation(browserStorage(), id);
  window.dispatchEvent(
    new CustomEvent<BrowseLocationEventDetail>(BROWSE_LOCATION_EVENT, {
      detail: { id },
    }),
  );
}

/**
 * The family's chosen browse location, shared by the header and listings.
 * `urlId` (the listing's `where` param) wins over the remembered choice.
 */
export function useBrowseLocation(urlId?: string | null) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = isValidLocationId(urlId) ? urlId : null;
    setId(fromUrl ?? readStoredBrowseLocation(browserStorage()));
  }, [urlId]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<BrowseLocationEventDetail>).detail;
      setId(detail && isValidLocationId(detail.id) ? detail.id : null);
    };
    window.addEventListener(BROWSE_LOCATION_EVENT, onChange);
    return () => window.removeEventListener(BROWSE_LOCATION_EVENT, onChange);
  }, []);

  const choose = useCallback((next: string | null) => {
    setId(next);
    announceBrowseLocation(next);
  }, []);

  return [id, choose] as const;
}

/** Load the Ontario location list once `wanted` turns true. */
export function useLocationIndex(wanted: boolean) {
  const [index, setIndex] = useState<LocationIndex | null>(null);
  const [requested, setRequested] = useState(wanted);

  useEffect(() => {
    if (wanted) setRequested(true);
  }, [wanted]);

  useEffect(() => {
    if (!requested || index) return;
    let alive = true;
    loadOntarioLocationIndex()
      .then((loaded) => {
        if (alive) setIndex(loaded);
      })
      .catch(() => {
        /* list stays in its loading state; the rest of the page still works */
      });
    return () => {
      alive = false;
    };
  }, [requested, index]);

  const request = useCallback(() => setRequested(true), []);
  return [index, request] as const;
}
