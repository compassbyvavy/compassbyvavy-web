/**
 * Side-by-side compare of 2–4 saved camp sessions.
 *
 * Reuses camp detail / registration helpers. Does not rank incomparable prices.
 */

import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import {
  buildCampDetailHref,
  buildSessionDetailRow,
  type CampSessionDetailRow,
} from "@/lib/camps/campDetail";
import { COMPARE_MAX, COMPARE_MIN } from "@/lib/shortlist/types";
import { indexPublicCatalog } from "@/lib/shortlist/resolve";

export type CompareParseResult =
  | { kind: "ok"; sessionIds: string[] }
  | { kind: "too_few"; sessionIds: string[] }
  | { kind: "too_many"; sessionIds: string[] }
  | { kind: "empty" };

export function parseCompareSessionIds(
  raw: string | null | undefined,
): CompareParseResult {
  if (raw == null || raw.trim() === "") return { kind: "empty" };
  const seen = new Set<string>();
  const sessionIds: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    sessionIds.push(id);
  }
  if (sessionIds.length < COMPARE_MIN) {
    return { kind: "too_few", sessionIds };
  }
  if (sessionIds.length > COMPARE_MAX) {
    return { kind: "too_many", sessionIds };
  }
  return { kind: "ok", sessionIds };
}

export function buildCompareHref(sessionIds: string[]): string {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of sessionIds) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return `/saved/compare?sessions=${encodeURIComponent(unique.join(","))}`;
}

export type ComparePriceNote = {
  kind: "comparable" | "incomparable" | "unknown";
  label: string;
};

export type CompareColumn = {
  sessionId: string;
  programId: string;
  programName: string;
  providerName: string;
  href: string;
  row: CampSessionDetailRow;
  currencyLabel: string;
  unitLabel: string;
  feeNotes: string | null;
  evidenceDate: string | null;
};

export type CompareBuildResult =
  | {
      kind: "ready";
      columns: CompareColumn[];
      missingIds: string[];
      priceNote: ComparePriceNote;
    }
  | { kind: "catalog_pending" }
  | { kind: "invalid"; parse: CompareParseResult };

function unitLabel(unit: string | null | undefined): string {
  if (!unit || unit === "unknown") return "Unit to confirm";
  if (unit === "per_day") return "per day";
  if (unit === "per_week") return "per week";
  if (unit === "full_program") return "full program";
  if (unit === "per_session") return "per session";
  return "Other unit";
}

function currencyLabel(currency: string | null | undefined): string {
  if (!currency || currency === "unknown") return "Currency to confirm";
  return currency;
}

export function comparePriceNoteForSessions(
  columns: CompareColumn[],
): ComparePriceNote {
  const known = columns.filter((col) => {
    const session = col.row.session;
    return (
      typeof session.priceAmount === "number" &&
      session.priceUnit &&
      session.priceUnit !== "unknown" &&
      session.currency &&
      session.currency !== "unknown"
    );
  });

  if (known.length !== columns.length || known.length === 0) {
    return {
      kind: "unknown",
      label:
        "At least one price is unknown. Compass does not treat unknown as zero, and does not rank these sessions by cost.",
    };
  }

  const units = new Set(known.map((c) => c.row.session.priceUnit));
  const currencies = new Set(known.map((c) => c.row.session.currency));
  if (units.size > 1 || currencies.size > 1) {
    return {
      kind: "incomparable",
      label:
        "These prices use different units or currencies, so Compass does not rank them.",
    };
  }

  return {
    kind: "comparable",
    label:
      "Prices share a currency and unit. Figures are shown as listed — Compass does not rank camps.",
  };
}

export function buildCompareTable(
  catalog: CampsCatalogBundle | null,
  sessionIdsInput: string | string[] | null | undefined,
  options?: { now?: Date },
): CompareBuildResult {
  const raw =
    Array.isArray(sessionIdsInput)
      ? sessionIdsInput.join(",")
      : sessionIdsInput;
  const parsed = parseCompareSessionIds(raw);
  if (parsed.kind !== "ok") {
    return { kind: "invalid", parse: parsed };
  }
  if (!catalog) {
    return { kind: "catalog_pending" };
  }

  const index = indexPublicCatalog(catalog);
  const columns: CompareColumn[] = [];
  const missingIds: string[] = [];

  for (const sessionId of parsed.sessionIds) {
    const session = index.sessionsById.get(sessionId);
    if (!session) {
      missingIds.push(sessionId);
      continue;
    }
    const program = index.programsById.get(session.programId);
    const provider = program
      ? index.providersById.get(program.providerId)
      : undefined;
    if (!program || !provider) {
      missingIds.push(sessionId);
      continue;
    }
    const row = buildSessionDetailRow(session, index.venuesById, {
      now: options?.now,
    });
    columns.push({
      sessionId,
      programId: program.id,
      programName: program.name,
      providerName: provider.name,
      href: buildCampDetailHref(program.slug, { sessionId }),
      row,
      currencyLabel: currencyLabel(session.currency),
      unitLabel: unitLabel(session.priceUnit),
      feeNotes: session.feeNotes?.trim() || null,
      evidenceDate: row.sourceCheckedDate,
    });
  }

  // Preserve requested order. Never sort by price.
  return {
    kind: "ready",
    columns,
    missingIds,
    priceNote: comparePriceNoteForSessions(columns),
  };
}
