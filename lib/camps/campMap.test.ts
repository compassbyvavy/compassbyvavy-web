import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampProgram, Provider, Venue } from "@/data/camps/types";
import {
  campMapPins,
  campMapQuery,
  directionsUrl,
  googleMapsBrowserKey,
  googleMapsMapId,
  mapsEmbedUrl,
  usableCoordinates,
} from "@/lib/camps/campMap";

const provider = { id: "p1", name: "COOKSMART" } as Provider;
const program = (id: string, slug: string, name: string) => ({ id, slug, name }) as CampProgram;
const venue = (id: string, lat: number | null, lng: number | null, extra: Partial<Venue> = {}) =>
  ({ id, name: `Venue ${id}`, neighbourhood: "Clarkson", city: "Mississauga", latitude: lat, longitude: lng, ...extra }) as Venue;

describe("campMap: key and URLs", () => {
  it("has no key (so no map) when the setting is missing or blank", () => {
    assert.equal(googleMapsBrowserKey({}), null);
    assert.equal(googleMapsBrowserKey({ GOOGLE_MAPS_BROWSER_KEY: "  " }), null);
    assert.equal(googleMapsBrowserKey({ GOOGLE_MAPS_BROWSER_KEY: " abc " }), "abc");
    assert.equal(googleMapsMapId({ GOOGLE_MAPS_MAP_ID: "m1" }), "m1");
  });

  it("never reads a server secret as the browser key", () => {
    assert.equal(googleMapsBrowserKey({ SUPABASE_SERVICE_ROLE_KEY: "secret" }), null);
  });

  it("builds the map query from venue name and address without repeating the name", () => {
    assert.equal(
      campMapQuery("COOKSMART Clarkson", "1700 Mazo Crescent, Mississauga, ON L5J 1Y8"),
      "COOKSMART Clarkson, 1700 Mazo Crescent, Mississauga, ON L5J 1Y8",
    );
    assert.equal(campMapQuery("Futures", "Futures, 6991 Millcreek Dr"), "Futures, 6991 Millcreek Dr");
    assert.equal(campMapQuery("Futures", null), null);
  });

  it("encodes the embed and directions URLs", () => {
    const q = "COOKSMART, 1700 Mazo Crescent, Mississauga, ON L5J 1Y8";
    assert.equal(
      mapsEmbedUrl("k&1", q),
      "https://www.google.com/maps/embed/v1/place?key=k%261&q=COOKSMART%2C%201700%20Mazo%20Crescent%2C%20Mississauga%2C%20ON%20L5J%201Y8",
    );
    assert.ok(directionsUrl(q).startsWith("https://www.google.com/maps/dir/?api=1&destination=COOKSMART%2C"));
  });
});

describe("campMap: pins", () => {
  it("rejects missing, non-finite or far-away coordinates", () => {
    assert.equal(usableCoordinates({ latitude: null, longitude: -79.6 }), null);
    assert.equal(usableCoordinates({ latitude: Number.NaN, longitude: -79.6 }), null);
    assert.equal(usableCoordinates({ latitude: 0, longitude: 0 }), null);
    assert.deepEqual(usableCoordinates({ latitude: 43.51, longitude: -79.62 }), { lat: 43.51, lng: -79.62 });
  });

  it("makes one pin per venue, lists each camp once, and counts camps it can't place", () => {
    const venuesById = {
      v1: venue("v1", 43.51, -79.62),
      v2: venue("v2", null, null),
    };
    const { pins, unmappedCamps } = campMapPins(
      [
        { program: program("A", "a", "Camp A"), provider, matchingSessions: [{ venueId: "v1" }, { venueId: "v1" }] },
        { program: program("B", "b", "Camp B"), provider, matchingSessions: [{ venueId: "v1" }] },
        { program: program("C", "c", "Camp C"), provider, matchingSessions: [{ venueId: "v2" }] },
        { program: program("D", "d", "Camp D"), provider, matchingSessions: [{ venueId: null }] },
      ],
      venuesById,
    );
    assert.equal(pins.length, 1);
    assert.deepEqual(
      pins[0].camps.map((c) => c.slug),
      ["a", "b"],
    );
    assert.equal(pins[0].area, "Clarkson, Mississauga");
    assert.equal(unmappedCamps, 2);
  });
});
