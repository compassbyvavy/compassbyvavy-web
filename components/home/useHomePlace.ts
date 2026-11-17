"use client";

import { useCallback, useEffect, useState } from "react";
import { announceBrowseLocation } from "@/components/location/useBrowseLocation";
import {
  DEFAULT_HEADER_CITY,
  homePlaceById,
} from "@/lib/home/home";
import {
  BROWSE_LOCATION_EVENT,
  browserStorage,
  readStoredBrowseLocation,
  type BrowseLocationEventDetail,
} from "@/lib/location/browseLocation";

export const HOME_PLACE_STORAGE_KEY = "compass.homePlace.v1";
export const HOME_PLACE_EVENT = "compass:home-place";

function remember(id: string) {
  try {
    browserStorage()?.setItem(HOME_PLACE_STORAGE_KEY, id);
  } catch {
    /* storage can be blocked; the open page still updates */
  }
}

function readHomePlace(): string {
  try {
    const raw = browserStorage()?.getItem(HOME_PLACE_STORAGE_KEY) ?? null;
    if (homePlaceById(raw)) return raw!;
  } catch {
    /* fall through */
  }
  const browse = readStoredBrowseLocation(browserStorage());
  if (homePlaceById(browse)?.kind === "city") return browse!;
  return DEFAULT_HEADER_CITY;
}

/**
 * The header's city or region. Cities also update the camps browse location.
 * Regions are not browse locations, so they only change links on this site.
 */
export function useHomePlace(urlCityId?: string | null) {
  const [id, setId] = useState(DEFAULT_HEADER_CITY);

  useEffect(() => {
    if (urlCityId && homePlaceById(urlCityId)?.kind === "city") {
      setId(urlCityId);
      remember(urlCityId);
      return;
    }
    setId(readHomePlace());
  }, [urlCityId]);

  useEffect(() => {
    const onHome = (event: Event) => {
      const next = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (homePlaceById(next)) setId(next!);
    };
    const onBrowse = (event: Event) => {
      const next = (event as CustomEvent<BrowseLocationEventDetail>).detail?.id;
      if (homePlaceById(next)?.kind === "city") setId(next!);
    };
    window.addEventListener(HOME_PLACE_EVENT, onHome);
    window.addEventListener(BROWSE_LOCATION_EVENT, onBrowse);
    return () => {
      window.removeEventListener(HOME_PLACE_EVENT, onHome);
      window.removeEventListener(BROWSE_LOCATION_EVENT, onBrowse);
    };
  }, []);

  const choose = useCallback((nextId: string) => {
    const place = homePlaceById(nextId);
    if (!place) return;
    setId(place.id);
    remember(place.id);
    window.dispatchEvent(new CustomEvent(HOME_PLACE_EVENT, { detail: { id: place.id } }));
    if (place.kind === "city" && place.whereId) announceBrowseLocation(place.whereId);
  }, []);

  return [id, choose] as const;
}
