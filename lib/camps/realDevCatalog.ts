/**
 * Development-only real Camps catalog adapter (not fictional fixtures).
 *
 * Loads verified public facts for authorized local preview candidates
 * (MSC-0201 Nutty Scientists, MSC-0007 City of Mississauga Winter Fun).
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
  MSC_0007_CANDIDATE_ID,
  msc0007Programs,
  msc0007Providers,
  msc0007Sessions,
  msc0007Venues,
} from "@/data/camps/real/msc0007";
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
  sourceCandidateId: string;
  sourceCandidateIds: string[];
  sourceUrl: string;
  sourceCheckedDate: string;
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
    sourceCandidateIds: [REAL_DEV_SOURCE_CANDIDATE_ID, MSC_0007_CANDIDATE_ID],
    sourceUrl: REAL_DEV_SOURCE_URL,
    sourceCheckedDate: REAL_DEV_SOURCE_CHECKED_DATE,
    providers: [...realDevProviders, ...msc0007Providers],
    venues: [...realDevVenues, ...msc0007Venues],
    programs: [...realDevPrograms, ...msc0007Programs],
    sessions: [...realDevSessions, ...msc0007Sessions],
  };
}

/** Soft gate: null in production; real-dev catalog otherwise. */
export function loadCampsRealDevCatalog(): CampsRealDevCatalogBundle | null {
  if (isProductionNodeEnv()) {
    return null;
  }
  return bundle();
}
