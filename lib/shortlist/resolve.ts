/**
 * Resolve saved IDs against the public catalog.
 *
 * Catalog null (not loaded) ≠ unpublished. Missing IDs in a loaded catalog
 * must not leak names, prices, or other unpublished details.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import {
  buildSessionDetailRow,
  type CampSessionDetailRow,
} from "@/lib/camps/campDetail";
import type {
  ShortlistItem,
  ShortlistPastItem,
  ShortlistRef,
  ShortlistState,
} from "@/lib/shortlist/types";

export type PublicCatalogIndex = {
  programIds: Set<string>;
  sessionIds: Set<string>;
  programsById: Map<string, CampProgram>;
  sessionsById: Map<string, CampSession>;
  providersById: Map<string, Provider>;
  venuesById: Record<string, Venue>;
};

export function indexPublicCatalog(
  catalog: CampsCatalogBundle,
): PublicCatalogIndex {
  return {
    programIds: new Set(catalog.programs.map((p) => p.id)),
    sessionIds: new Set(catalog.sessions.map((s) => s.id)),
    programsById: new Map(catalog.programs.map((p) => [p.id, p])),
    sessionsById: new Map(catalog.sessions.map((s) => [s.id, s])),
    providersById: new Map(catalog.providers.map((p) => [p.id, p])),
    venuesById: Object.fromEntries(catalog.venues.map((v) => [v.id, v])),
  };
}

export function publicIdsFromCatalog(catalog: CampsCatalogBundle): {
  programIds: Set<string>;
  sessionIds: Set<string>;
} {
  return {
    programIds: new Set(catalog.programs.map((p) => p.id)),
    sessionIds: new Set(catalog.sessions.map((s) => s.id)),
  };
}

export type ResolvedActiveItem =
  | {
      kind: "session";
      entry: ShortlistItem;
      program: CampProgram;
      provider: Provider;
      session: CampSession;
      row: CampSessionDetailRow;
    }
  | {
      kind: "program";
      entry: ShortlistItem;
      program: CampProgram;
      provider: Provider;
      sessions: CampSession[];
    };

export type CatalogPendingItem = {
  kind: "catalog_pending";
  entry: ShortlistItem;
};

export type UnresolvedPastDisplay = {
  entry: ShortlistPastItem;
  /**
   * Public label only when the ref is still in the published catalog.
   * Unavailable / unpublished refs stay generic — never a leaked name.
   */
  publicLabel: string | null;
  href: string | null;
};

function providerForProgram(
  program: CampProgram,
  index: PublicCatalogIndex,
): Provider | null {
  return index.providersById.get(program.providerId) ?? null;
}

export function resolveActiveItem(
  entry: ShortlistItem,
  index: PublicCatalogIndex,
  options?: { now?: Date },
): ResolvedActiveItem | null {
  const program = index.programsById.get(entry.ref.programId);
  if (!program) return null;
  const provider = providerForProgram(program, index);
  if (!provider) return null;

  if (entry.ref.kind === "camp_program") {
    const sessions = [...index.sessionsById.values()].filter(
      (s) => s.programId === program.id,
    );
    return {
      kind: "program",
      entry,
      program,
      provider,
      sessions,
    };
  }

  const session = index.sessionsById.get(entry.ref.sessionId);
  if (!session || session.programId !== program.id) return null;
  return {
    kind: "session",
    entry,
    program,
    provider,
    session,
    row: buildSessionDetailRow(session, index.venuesById, { now: options?.now }),
  };
}

export function resolvePastDisplay(
  entry: ShortlistPastItem,
  index: PublicCatalogIndex | null,
): UnresolvedPastDisplay {
  if (!index) {
    return { entry, publicLabel: null, href: null };
  }
  const program = index.programsById.get(entry.ref.programId);
  if (!program) {
    return { entry, publicLabel: null, href: null };
  }
  if (entry.ref.kind === "camp_session") {
    const session = index.sessionsById.get(entry.ref.sessionId);
    if (!session || session.programId !== program.id) {
      return { entry, publicLabel: null, href: null };
    }
  }
  const provider = providerForProgram(program, index);
  return {
    entry,
    publicLabel: provider ? `${program.name} · ${provider.name}` : program.name,
    href: `/camps/${program.slug}`,
  };
}

export type ResolvedShortlist = {
  /** Catalog is not loaded — IDs stay active, facts are unavailable. */
  catalogPending: boolean;
  active: Array<ResolvedActiveItem | CatalogPendingItem>;
  past: UnresolvedPastDisplay[];
};

export function resolveShortlist(
  state: ShortlistState,
  catalog: CampsCatalogBundle | null,
  options?: { now?: Date },
): ResolvedShortlist {
  if (!catalog) {
    return {
      catalogPending: true,
      active: state.items.map((entry) => ({ kind: "catalog_pending", entry })),
      past: state.past.map((entry) => ({
        entry,
        publicLabel: null,
        href: null,
      })),
    };
  }

  const index = indexPublicCatalog(catalog);
  const active: ResolvedShortlist["active"] = [];
  for (const entry of state.items) {
    const resolved = resolveActiveItem(entry, index, options);
    if (resolved) active.push(resolved);
  }
  return {
    catalogPending: false,
    active,
    past: state.past.map((entry) => resolvePastDisplay(entry, index)),
  };
}

export function refIsPublic(
  ref: ShortlistRef,
  catalog: CampsCatalogBundle,
): boolean {
  const ids = publicIdsFromCatalog(catalog);
  if (ref.kind === "camp_program") return ids.programIds.has(ref.programId);
  return (
    ids.programIds.has(ref.programId) && ids.sessionIds.has(ref.sessionId)
  );
}
