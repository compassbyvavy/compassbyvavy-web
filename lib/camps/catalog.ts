/**
 * Shared Camps catalog data layer.
 *
 * Listing and detail pages read from here so cards, grouped summaries, flat
 * rows, and detail sessions share one authoritative session set (shared
 * session truth).
 *
 * Non-production: gated real-dev (MSC-0201) plus gated fictional fixtures so
 * `/camps` is reviewable (dates, grouping, mixed status). Production: both
 * loaders return null — never serve fixtures or unpublished preview rows.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import { loadCampsDevFixtures } from "@/lib/camps/devFixtures";
import { loadCampsRealDevCatalog } from "@/lib/camps/realDevCatalog";

export type CampsCatalogSourceLabel = "real_dev" | "dev_fixtures" | "mixed_dev";

export type CampsCatalogBundle = {
  providers: Provider[];
  venues: Venue[];
  programs: CampProgram[];
  sessions: CampSession[];
  sourceLabel: CampsCatalogSourceLabel;
  /** True when fictional gated fixtures are part of this bundle. */
  includesFictionalFixtures: boolean;
  sourceCandidateId?: string;
  sourceUrl?: string;
  sourceCheckedDate?: string;
};

/**
 * Parent-facing provenance banner for browse/detail. Always honest about
 * preview sources. Returns null only when there is no catalog.
 */
export function formatCampsCatalogBanner(
  catalog: CampsCatalogBundle,
): string | null {
  if (catalog.sourceLabel === "real_dev") {
    return `DEV ONLY — real-data preview (candidate ${catalog.sourceCandidateId ?? "MSC-0201"}). Source-checked ${catalog.sourceCheckedDate ?? ""} from the provider site. Calendar years for listed weeks are not yet verified. Not fictional fixtures; not a full Mississauga directory.`;
  }
  if (catalog.sourceLabel === "dev_fixtures") {
    return "DEV ONLY — fictional Mississauga camps fixtures via server gate. Not production directory data. Public browsing does not require an account.";
  }
  return `DEV ONLY — preview catalog. Includes gated fictional fixtures plus real-data candidate ${catalog.sourceCandidateId ?? "MSC-0201"} (source-checked ${catalog.sourceCheckedDate ?? ""}; calendar years for those weeks are not yet verified). Not a full Mississauga directory. No account required.`;
}

/**
 * Soft load: catalog for public Camps routes, or null when unavailable
 * (production today; empty published set in the future).
 *
 * Fixtures and real-dev are each gated on NODE_ENV. They are never returned
 * when NODE_ENV is production.
 */
export function loadCampsCatalog(): CampsCatalogBundle | null {
  const real = loadCampsRealDevCatalog();
  const fixtures = loadCampsDevFixtures();

  if (!real && !fixtures) return null;

  if (real && !fixtures) {
    return {
      providers: real.providers,
      venues: real.venues,
      programs: real.programs,
      sessions: real.sessions,
      sourceLabel: "real_dev",
      includesFictionalFixtures: false,
      sourceCandidateId: real.sourceCandidateId,
      sourceUrl: real.sourceUrl,
      sourceCheckedDate: real.sourceCheckedDate,
    };
  }

  if (!real && fixtures) {
    return {
      providers: fixtures.campsDevProviders,
      venues: fixtures.campsDevVenues,
      programs: fixtures.campsDevPrograms,
      sessions: fixtures.campsDevSessions,
      sourceLabel: "dev_fixtures",
      includesFictionalFixtures: true,
    };
  }

  return {
    providers: [...real!.providers, ...fixtures!.campsDevProviders],
    venues: [...real!.venues, ...fixtures!.campsDevVenues],
    programs: [...real!.programs, ...fixtures!.campsDevPrograms],
    sessions: [...real!.sessions, ...fixtures!.campsDevSessions],
    sourceLabel: "mixed_dev",
    includesFictionalFixtures: true,
    sourceCandidateId: real!.sourceCandidateId,
    sourceUrl: real!.sourceUrl,
    sourceCheckedDate: real!.sourceCheckedDate,
  };
}

/**
 * Detail-page loader: same catalog as listing (shared session truth).
 * Returns null for unknown slug, missing catalog, or production gate —
 * callers should 404. Never falls back to a different program.
 */
export function resolvePublishedCampDetail(slug: string): {
  program: CampProgram;
  provider: Provider;
  sessions: CampSession[];
  venuesById: Record<string, Venue>;
  catalog: CampsCatalogBundle;
} | null {
  const catalog = loadCampsCatalog();
  if (!catalog) return null;
  const detail = resolveCatalogProgramBySlug(catalog, slug);
  if (!detail) return null;
  return { ...detail, catalog };
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
