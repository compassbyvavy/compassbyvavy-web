/**
 * Shared Camps catalog data layer.
 *
 * Listing and detail pages read from here so cards, grouped summaries, flat
 * rows, and detail sessions share one authoritative session set (shared
 * session truth).
 *
 * Non-production: gated real-dev (MSC-0201) plus gated fictional fixtures.
 * Production: published Supabase rows, anon key, server-side only.
 * Cloudflare Workers preview hosts with COMPASS_CAMPS_REVIEW_PREVIEW=true
 * still load sample fixtures only. MSC-0201 stays production-gated and is
 * never served in review mode. The site layout does not call this read.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import { loadCampsDevFixtures } from "@/lib/camps/devFixtures";
import { loadCampsRealDevCatalog } from "@/lib/camps/realDevCatalog";
import {
  fetchPublishedCampsCatalog,
  readPublicCampsSupabaseConfig,
  type PublicCampsSupabaseConfig,
} from "@/lib/camps/campsSupabase";
import {
  CAMPS_REVIEW_PREVIEW_FLAG,
  isCampsReviewPreviewEnabled,
} from "@/lib/camps/reviewPreviewGate";

export type CampsCatalogLoadOptions = {
  hostname?: string | null;
  reviewFlag?: string | null;
  nodeEnv?: string;
  /**
   * Production read settings. Undefined reads the environment.
   * Null means there are no credentials, which is a failed read.
   */
  supabase?: PublicCampsSupabaseConfig | null;
};

export type CampsCatalogSourceLabel =
  | "real_dev"
  | "dev_fixtures"
  | "mixed_dev"
  | "published";

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

export type CampsCatalogLoadResult =
  | { status: "ready"; catalog: CampsCatalogBundle }
  | { status: "empty" }
  | { status: "failed" };

/**
 * Parent-facing provenance banner for browse/detail. Always honest about
 * preview sources. Published rows have no banner.
 */
export function formatCampsCatalogBanner(
  catalog: CampsCatalogBundle,
): string | null {
  if (catalog.sourceLabel === "published") return null;
  if (catalog.sourceLabel === "real_dev") {
    return `DEV ONLY — real-data preview (candidate ${catalog.sourceCandidateId ?? "MSC-0201"}). Source-checked ${catalog.sourceCheckedDate ?? ""} from the provider site. Calendar years for listed weeks are not yet verified. Not fictional fixtures; not a full Mississauga directory.`;
  }
  if (catalog.sourceLabel === "dev_fixtures") {
    return "DEV ONLY — fictional Mississauga camps fixtures via server gate. Not production directory data. Public browsing does not require an account.";
  }
  return `DEV ONLY — preview catalog. Includes gated fictional fixtures plus real-data candidate ${catalog.sourceCandidateId ?? "MSC-0201"} (source-checked ${catalog.sourceCheckedDate ?? ""}; calendar years for those weeks are not yet verified). Not a full Mississauga directory. No account required.`;
}

function reviewPreviewEnabled(options: CampsCatalogLoadOptions): boolean {
  return isCampsReviewPreviewEnabled({
    reviewFlag:
      options.reviewFlag !== undefined
        ? options.reviewFlag
        : process.env[CAMPS_REVIEW_PREVIEW_FLAG],
    hostname: options.hostname,
  });
}

/**
 * In-memory dev and review-preview catalog. Never calls the network.
 */
function assembleLocalCampsCatalog(
  options: CampsCatalogLoadOptions = {},
): CampsCatalogBundle | null {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const reviewPreview = reviewPreviewEnabled(options);
  const real = loadCampsRealDevCatalog();
  const fixtures = loadCampsDevFixtures({
    allowReviewPreview: reviewPreview,
    nodeEnv,
  });

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
 * Site chrome. In production this returns null unless the review-preview
 * dual gate is on, and it never reads Supabase. Non-production still gets
 * the in-memory preview catalog.
 */
export function loadCampsCatalogForLayout(
  options: CampsCatalogLoadOptions = {},
): CampsCatalogBundle | null {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === "production" && !reviewPreviewEnabled(options)) return null;
  return assembleLocalCampsCatalog(options);
}

/**
 * Catalog for pages that show camps.
 *
 * Non-production and review preview stay on the in-memory gates.
 * Production reads published rows. A failed read is not an empty catalog.
 */
export async function loadCampsCatalog(
  options: CampsCatalogLoadOptions = {},
): Promise<CampsCatalogLoadResult> {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv !== "production" || reviewPreviewEnabled(options)) {
    const local = assembleLocalCampsCatalog(options);
    return local ? { status: "ready", catalog: local } : { status: "empty" };
  }
  const config =
    options.supabase !== undefined ? options.supabase : readPublicCampsSupabaseConfig();
  if (!config) return { status: "failed" };
  return fetchPublishedCampsCatalog(config);
}

/**
 * Detail-page loader: same catalog as listing (shared session truth).
 * Returns null for unknown slug, an empty published catalog, or a failed
 * read. Callers that need to tell failure from absence should use
 * loadCampsCatalog directly. Never falls back to a different program.
 */
export async function resolvePublishedCampDetail(
  slug: string,
  options: CampsCatalogLoadOptions = {},
): Promise<{
  program: CampProgram;
  provider: Provider;
  sessions: CampSession[];
  venuesById: Record<string, Venue>;
  catalog: CampsCatalogBundle;
} | null> {
  const result = await loadCampsCatalog(options);
  if (result.status !== "ready") return null;
  const detail = resolveCatalogProgramBySlug(result.catalog, slug);
  if (!detail) return null;
  return { ...detail, catalog: result.catalog };
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
