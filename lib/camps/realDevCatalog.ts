/**
 * Development-only real Camps catalog adapter (not fictional fixtures).
 *
 * Loads verified public facts for the authorized MSC-0201 local preview.
 * Soft-loads null when NODE_ENV is production — same safeguard pattern as
 * fixtures, but a separate module so fictional data cannot leak in by merge.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import {
  DEV_ONLY_REAL_CAMPS_CATALOG,
  REAL_DEV_SOURCE_CANDIDATE_ID,
  REAL_DEV_SOURCE_CHECKED_DATE,
  REAL_DEV_SOURCE_URL,
  realDevPrograms,
  realDevProviders,
  realDevSessions,
  realDevVenues,
} from "@/data/camps/real.dev";

export type CampsRealDevCatalogBundle = {
  kind: "real_dev";
  DEV_ONLY_REAL_CAMPS_CATALOG: true;
  sourceCandidateId: typeof REAL_DEV_SOURCE_CANDIDATE_ID;
  sourceUrl: typeof REAL_DEV_SOURCE_URL;
  sourceCheckedDate: typeof REAL_DEV_SOURCE_CHECKED_DATE;
  providers: Provider[];
  venues: Venue[];
  programs: CampProgram[];
  sessions: CampSession[];
};

function isProductionNodeEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function bundle(): CampsRealDevCatalogBundle {
  return {
    kind: "real_dev",
    DEV_ONLY_REAL_CAMPS_CATALOG,
    sourceCandidateId: REAL_DEV_SOURCE_CANDIDATE_ID,
    sourceUrl: REAL_DEV_SOURCE_URL,
    sourceCheckedDate: REAL_DEV_SOURCE_CHECKED_DATE,
    providers: realDevProviders,
    venues: realDevVenues,
    programs: realDevPrograms,
    sessions: realDevSessions,
  };
}

/** Soft gate: null in production; real-dev catalog otherwise. */
export function loadCampsRealDevCatalog(): CampsRealDevCatalogBundle | null {
  if (isProductionNodeEnv()) {
    return null;
  }
  return bundle();
}

export function areCampsRealDevCatalogAllowed(): boolean {
  return !isProductionNodeEnv();
}
