/**
 * Shared Camps catalog data layer.
 *
 * Listing and detail pages read from here so cards, grouped summaries, flat
 * rows, and detail sessions share one authoritative session set (shared
 * session truth). Development currently uses the real-dev adapter (MSC-0201
 * only). Fictional fixtures stay behind lib/camps/devFixtures for /camps/preview
 * only — they are never merged into this catalog.
 *
 * Production: returns null until a published Supabase (or equivalent) source
 * is wired. Do not fall back to fictional fixtures in production.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import { loadCampsRealDevCatalog } from "@/lib/camps/realDevCatalog";

export type CampsCatalogBundle = {
  providers: Provider[];
  venues: Venue[];
  programs: CampProgram[];
  sessions: CampSession[];
  /** Provenance label for UI banners — never fictional fixtures. */
  sourceLabel: "real_dev";
  sourceCandidateId?: string;
  sourceUrl?: string;
  sourceCheckedDate?: string;
};

/**
 * Soft load: catalog for public Camps routes, or null when unavailable
 * (production today; empty published set in the future).
 */
export function loadCampsCatalog(): CampsCatalogBundle | null {
  const real = loadCampsRealDevCatalog();
  if (!real) return null;

  return {
    providers: real.providers,
    venues: real.venues,
    programs: real.programs,
    sessions: real.sessions,
    sourceLabel: "real_dev",
    sourceCandidateId: real.sourceCandidateId,
    sourceUrl: real.sourceUrl,
    sourceCheckedDate: real.sourceCheckedDate,
  };
}

export function resolveCatalogProgramBySlug(
  catalog: CampsCatalogBundle,
  slug: string,
): {
  program: CampProgram;
  provider: Provider;
  sessions: CampSession[];
  venuesById: Record<string, Venue>;
} | null {
  const program = catalog.programs.find((p) => p.slug === slug);
  if (!program) return null;
  const provider = catalog.providers.find((p) => p.id === program.providerId);
  if (!provider) return null;
  const sessions = catalog.sessions.filter((s) => s.programId === program.id);
  const venuesById = Object.fromEntries(catalog.venues.map((v) => [v.id, v]));
  return { program, provider, sessions, venuesById };
}
