/**
 * Google Maps for camps: the small map on a camp page (Maps Embed API, free
 * and unlimited) and the pin map on the listing (Maps JavaScript API).
 *
 * One browser key serves both. In Google Cloud it is restricted to the
 * compassbyvavy.ca websites and to those two APIs, so it is safe in the page.
 * No key → no map anywhere, and the page reads exactly as before.
 *
 * Pins use the coordinates stored on `venues`, which come from Natural
 * Resources Canada (open licence), never copied from Google.
 */
import type { CampProgram, Provider, Venue } from "@/data/camps/types";

type Env = Record<string, string | undefined>;

function clean(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/** The browser key, read on the server. Null hides every map. */
export function googleMapsBrowserKey(env: Env = process.env): string | null {
  return clean(env.GOOGLE_MAPS_BROWSER_KEY);
}

/** Map ID from Google Cloud (needed for the listing's pins). */
export function googleMapsMapId(env: Env = process.env): string | null {
  return clean(env.GOOGLE_MAPS_MAP_ID);
}

/** What the map searches for: the venue's name and full address. */
export function campMapQuery(venueName: string | null | undefined, address: string | null | undefined): string | null {
  const addr = address?.trim();
  if (!addr) return null;
  const name = venueName?.trim();
  return name && !addr.toLowerCase().startsWith(name.toLowerCase()) ? `${name}, ${addr}` : addr;
}

/** Maps Embed API "place" mode. */
export function mapsEmbedUrl(key: string, query: string): string {
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}`;
}

/** Google Maps directions. Needs no key and works without the map. */
export function directionsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export type CampMapPin = {
  venueId: string;
  lat: number;
  lng: number;
  title: string;
  area: string | null;
  camps: Array<{ name: string; providerName: string; slug: string }>;
};

/** Coordinates that can be pinned in or near Mississauga (GTA box). */
export function usableCoordinates(venue: Pick<Venue, "latitude" | "longitude">): { lat: number; lng: number } | null {
  const lat = venue.latitude;
  const lng = venue.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 43.0 || lat > 44.5 || lng < -80.5 || lng > -78.5) return null;
  return { lat, lng };
}

type PinMatch = {
  program: CampProgram;
  provider: Provider;
  matchingSessions: Array<{ venueId?: string | null }>;
};

/**
 * One pin per venue among the camps the parent is looking at. A camp at two
 * venues gets two pins. Camps whose venue has no coordinates are counted, so
 * the page can say they aren't on the map, but are never guessed.
 */
export function campMapPins(
  matches: readonly PinMatch[],
  venuesById: Readonly<Record<string, Venue | undefined>>,
): { pins: CampMapPin[]; unmappedCamps: number } {
  const pins = new Map<string, CampMapPin>();
  let unmappedCamps = 0;
  for (const m of matches) {
    const venueIds = [...new Set(m.matchingSessions.map((s) => s.venueId).filter((v): v is string => Boolean(v)))];
    let pinned = false;
    for (const id of venueIds) {
      const venue = venuesById[id];
      const at = venue ? usableCoordinates(venue) : null;
      if (!venue || !at) continue;
      pinned = true;
      const pin =
        pins.get(id) ??
        ({
          venueId: id,
          lat: at.lat,
          lng: at.lng,
          title: venue.name,
          area: [venue.neighbourhood, venue.city].filter(Boolean).join(", ") || null,
          camps: [],
        } satisfies CampMapPin);
      if (!pin.camps.some((c) => c.slug === m.program.slug)) {
        pin.camps.push({ name: m.program.name, providerName: m.provider.name, slug: m.program.slug });
      }
      pins.set(id, pin);
    }
    if (!pinned) unmappedCamps += 1;
  }
  return { pins: [...pins.values()], unmappedCamps };
}
