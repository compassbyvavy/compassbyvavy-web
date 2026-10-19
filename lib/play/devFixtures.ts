/**
 * Enforceable production safeguard for Indoor Play development fixtures.
 *
 * Comments and DEV_ONLY markers in fixtures.dev.ts are not enough — callers
 * must load fixtures through this gate. Public Discover play stays
 * coming_soon; this module is the only supported access path for UI previews.
 */

import {
  DEV_ONLY_INDOOR_PLAY_FIXTURES,
  indoorPlayDevVenues,
} from "@/data/play/fixtures.dev";
import type { IndoorPlayVenue } from "@/data/play/types";

export type IndoorPlayDevFixturesBundle = {
  DEV_ONLY_INDOOR_PLAY_FIXTURES: true;
  venues: IndoorPlayVenue[];
};

export type IndoorPlayDevFixtureLoadOptions = {
  nodeEnv?: string;
};

function isProductionNodeEnv(nodeEnv?: string): boolean {
  return (nodeEnv ?? process.env.NODE_ENV) === "production";
}

function bundle(): IndoorPlayDevFixturesBundle {
  return {
    DEV_ONLY_INDOOR_PLAY_FIXTURES,
    venues: indoorPlayDevVenues,
  };
}

/** Soft gate: null in production; fixture bundle otherwise. */
export function loadIndoorPlayDevFixtures(
  options: IndoorPlayDevFixtureLoadOptions = {},
): IndoorPlayDevFixturesBundle | null {
  if (isProductionNodeEnv(options.nodeEnv)) return null;
  return bundle();
}

export function areIndoorPlayDevFixturesAllowed(): boolean {
  return !isProductionNodeEnv();
}
