/**
 * Enforceable production safeguard for camps development fixtures.
 *
 * Comments and DEV_ONLY markers in fixtures.dev.ts are not enough — callers
 * must load fixtures through this gate. In production the gate throws (or
 * returns null from the soft loader). The registration helper must not import
 * fixtures; this module is the only supported access path for UI previews.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import {
  DEV_ONLY_CAMPS_FIXTURES,
  campsDevPrograms,
  campsDevProviders,
  campsDevSessions,
  campsDevVenues,
} from "@/data/camps/fixtures.dev";

export type CampsDevFixturesBundle = {
  DEV_ONLY_CAMPS_FIXTURES: true;
  campsDevProviders: Provider[];
  campsDevVenues: Venue[];
  campsDevPrograms: CampProgram[];
  campsDevSessions: CampSession[];
};

function isProductionNodeEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function bundle(): CampsDevFixturesBundle {
  return {
    DEV_ONLY_CAMPS_FIXTURES,
    campsDevProviders,
    campsDevVenues,
    campsDevPrograms,
    campsDevSessions,
  };
}

/**
 * Soft gate: null in production; fixture bundle otherwise.
 * Prefer `requireCampsDevFixtures` when absence should fail loudly.
 */
export function loadCampsDevFixtures(): CampsDevFixturesBundle | null {
  if (isProductionNodeEnv()) {
    return null;
  }
  return bundle();
}

/**
 * Hard gate: throws in production so accidental use fails at runtime.
 */
export function requireCampsDevFixtures(): CampsDevFixturesBundle {
  if (isProductionNodeEnv()) {
    throw new Error(
      "Camps development fixtures are not available when NODE_ENV is production.",
    );
  }
  return bundle();
}

/** True only when the enforceable gate would allow fixture access. */
export function areCampsDevFixturesAllowed(): boolean {
  return !isProductionNodeEnv();
}
