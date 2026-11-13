"use client";

import { useEffect, useRef, useState } from "react";
import type { CampMapPin } from "@/lib/camps/campMap";

/*
 * Pin map for the camps listing (Google Maps JavaScript API).
 * The list stays the main way in: the map only adds "where is it", and every
 * pin links to the same camp pages. If Google fails to load, the page says so
 * and the list is untouched.
 */

type LatLng = { lat: number; lng: number };
type MapInstance = { fitBounds(b: unknown, padding?: number): void; setCenter(c: LatLng): void; setZoom(z: number): void };
type InfoWindowInstance = { setContent(n: Node): void; open(o: { map: MapInstance; anchor: unknown }): void; close(): void };
type MarkerInstance = { addListener(event: string, fn: () => void): void; map: MapInstance | null };
type MapsLibrary = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => MapInstance;
  InfoWindow: new (opts?: Record<string, unknown>) => InfoWindowInstance;
};
type MarkerLibrary = {
  AdvancedMarkerElement: new (opts: Record<string, unknown>) => MarkerInstance;
};
type CoreLibrary = { LatLngBounds: new () => { extend(p: LatLng): void } };
type GoogleNs = { maps: { importLibrary(name: string): Promise<unknown> } };

declare global {
  interface Window {
    google?: GoogleNs;
    __compassMapsLoading?: Promise<void>;
    __compassMapsReady?: () => void;
  }
}

function loadGoogleMaps(key: string): Promise<void> {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (!window.__compassMapsLoading) {
    window.__compassMapsLoading = new Promise<void>((resolve, reject) => {
      window.__compassMapsReady = () => resolve();
      const script = document.createElement("script");
      script.src =
        "https://maps.googleapis.com/maps/api/js" +
        `?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__compassMapsReady`;
      script.async = true;
      script.onerror = () => {
        window.__compassMapsLoading = undefined;
        reject(new Error("Google Maps did not load"));
      };
      document.head.appendChild(script);
    });
  }
  return window.__compassMapsLoading;
}

function infoContent(pin: CampMapPin): HTMLElement {
  const box = document.createElement("div");
  box.className = "camps-map-info";
  const title = document.createElement("strong");
  title.textContent = pin.title;
  box.appendChild(title);
  if (pin.area) {
    const area = document.createElement("p");
    area.textContent = pin.area;
    box.appendChild(area);
  }
  const list = document.createElement("ul");
  for (const camp of pin.camps) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `/camps/${encodeURIComponent(camp.slug)}`;
    a.textContent = camp.name;
    li.appendChild(a);
    const by = document.createElement("span");
    by.textContent = ` by ${camp.providerName}`;
    li.appendChild(by);
    list.appendChild(li);
  }
  box.appendChild(list);
  return box;
}

export function CampsMap({
  apiKey,
  mapId,
  pins,
  unmappedCamps,
  id,
}: {
  apiKey: string;
  mapId: string | null;
  pins: CampMapPin[];
  unmappedCamps: number;
  id?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    const markers: MarkerInstance[] = [];
    (async () => {
      try {
        await loadGoogleMaps(apiKey);
        const g = window.google;
        if (!g || cancelled || !el.current) return;
        const { Map, InfoWindow } = (await g.maps.importLibrary("maps")) as MapsLibrary;
        const { AdvancedMarkerElement } = (await g.maps.importLibrary("marker")) as MarkerLibrary;
        const { LatLngBounds } = (await g.maps.importLibrary("core")) as CoreLibrary;
        if (cancelled || !el.current) return;

        const map = new Map(el.current, {
          mapId: mapId ?? "DEMO_MAP_ID",
          center: { lat: 43.589, lng: -79.644 },
          zoom: 11,
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        const info = new InfoWindow();
        const bounds = new LatLngBounds();
        for (const pin of pins) {
          const at = { lat: pin.lat, lng: pin.lng };
          bounds.extend(at);
          const marker = new AdvancedMarkerElement({
            map,
            position: at,
            title: `${pin.title}: ${pin.camps.length} ${pin.camps.length === 1 ? "camp" : "camps"}`,
            gmpClickable: true,
          });
          marker.addListener("click", () => {
            info.setContent(infoContent(pin));
            info.open({ map, anchor: marker });
          });
          markers.push(marker);
        }
        if (pins.length === 1) {
          map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
          map.setZoom(14);
        } else if (pins.length > 1) {
          map.fitBounds(bounds, 48);
        }
        setState("ready");
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
      for (const m of markers) m.map = null;
    };
  }, [apiKey, mapId, pins]);

  return (
    <section className="camps-map" id={id} aria-label="Map of the camps listed below">
      {state === "failed" ? (
        <p className="camps-map-note" role="status">
          The map couldn&apos;t load. Every camp is in the list below.
        </p>
      ) : (
        <div ref={el} className="camps-map-canvas" aria-busy={state === "loading"} />
      )}
      {unmappedCamps > 0 ? (
        <p className="camps-map-note">
          {unmappedCamps} {unmappedCamps === 1 ? "camp isn’t" : "camps aren’t"} on the map yet because we
          haven&apos;t placed {unmappedCamps === 1 ? "its" : "their"} location. {unmappedCamps === 1 ? "It’s" : "They’re"} still in the list.
        </p>
      ) : null}
    </section>
  );
}
