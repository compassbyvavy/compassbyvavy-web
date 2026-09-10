/**
 * Camp detail page helpers — session rows, selection, and safe return links.
 *
 * Session facts (venue, ages, hours, care, price, registration) come only from
 * the session record + venuesById. Program typical ages and any program-level
 * venue are never used to qualify a session.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import {
  summarizeMatchingSessionHours,
  summarizeMatchingSessionPrices,
  summarizeMatchingSessionVenues,
} from "@/lib/camps/campCardSummary";
import type { CampsDevFixturesBundle } from "@/lib/camps/devFixtures";
import {
  getRegistrationAction,
  type RegistrationAction,
} from "@/lib/camps/registrationAction";
import {
  formatSessionAgeBand,
  resolveSessionAssessmentDate,
} from "@/lib/camps/sessionEligibility";

export type CampDetailBundle = {
  program: CampProgram;
  provider: Provider;
  sessions: CampSession[];
  venuesById: Record<string, Venue>;
};

export type SessionSelectionResult =
  | { kind: "none"; selectedSessionId: null; notice: null }
  | {
      kind: "selected";
      selectedSessionId: string;
      session: CampSession;
      notice: null;
    }
  | {
      kind: "invalid";
      selectedSessionId: null;
      notice: string;
    };

export type CampSessionDetailRow = {
  session: CampSession;
  venueLabel: string;
  datesLabel: string;
  ageEligibilityLabel: string;
  ageAssessmentNote: string | null;
  hoursLabel: string;
  careLabel: string;
  priceLabel: string;
  registration: RegistrationAction;
  sourceUrl: string | null;
  sourceCheckedDate: string | null;
  providerConfirmed: boolean | null;
};

/**
 * Resolve a program detail bundle from gated fixtures.
 * Returns null when the slug is unknown (caller should 404).
 */
export function resolveCampDetailBySlug(
  fixtures: CampsDevFixturesBundle,
  slug: string,
): CampDetailBundle | null {
  const program = fixtures.campsDevPrograms.find((p) => p.slug === slug);
  if (!program) return null;

  const provider = fixtures.campsDevProviders.find(
    (p) => p.id === program.providerId,
  );
  if (!provider) return null;

  const sessions = fixtures.campsDevSessions.filter(
    (s) => s.programId === program.id,
  );
  const venuesById = Object.fromEntries(
    fixtures.campsDevVenues.map((v) => [v.id, v]),
  );

  return { program, provider, sessions, venuesById };
}

/**
 * Validate a flat-listing `?session=` id against this program's sessions.
 * Invalid / foreign ids are rejected — never invent a selection.
 */
export function resolveSessionSelection(
  sessions: CampSession[],
  sessionId: string | null | undefined,
): SessionSelectionResult {
  if (sessionId == null || sessionId.trim() === "") {
    return { kind: "none", selectedSessionId: null, notice: null };
  }
  const trimmed = sessionId.trim();
  const session = sessions.find((s) => s.id === trimmed);
  if (!session) {
    return {
      kind: "invalid",
      selectedSessionId: null,
      notice:
        "That session is not part of this program. Showing all sessions instead.",
    };
  }
  return {
    kind: "selected",
    selectedSessionId: session.id,
    session,
    notice: null,
  };
}

/**
 * Allow only in-app Camps listing return paths — block open redirects.
 */
export function sanitizeCampsReturnPath(
  raw: string | null | undefined,
): string {
  const fallback = "/camps";
  if (raw == null || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/camps")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  // Stay on listing / camps preview — not arbitrary /camps/other-slug hijacks as "back".
  if (trimmed === "/camps" || trimmed.startsWith("/camps?")) return trimmed;
  return fallback;
}

export function buildCampDetailHref(
  slug: string,
  options?: {
    sessionId?: string | null;
    returnTo?: string | null;
    /** Session ids that matched the listing filters (grouped/flat handoff). */
    matchingSessionIds?: string[] | null;
  },
): string {
  const params = new URLSearchParams();
  if (options?.sessionId) params.set("session", options.sessionId);
  if (options?.matchingSessionIds) {
    params.set("matches", options.matchingSessionIds.join(","));
  }
  const ret = sanitizeCampsReturnPath(options?.returnTo ?? "/camps");
  params.set("from", ret);
  const qs = params.toString();
  return qs ? `/camps/${slug}?${qs}` : `/camps/${slug}`;
}

/**
 * Parse `matches=` from the listing handoff. Only ids that belong to `sessions`
 * are kept. When the param is absent, returns null (no match context).
 */
export function parseMatchingSessionIds(
  raw: string | null | undefined,
  sessions: CampSession[],
): string[] | null {
  if (raw == null) return null;
  const allowed = new Set(sessions.map((s) => s.id));
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((id) => id.length > 0 && allowed.has(id));
  // Preserve order of appearance; de-dupe.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function sessionMatchesListingFilters(
  sessionId: string,
  matchingSessionIds: string[] | null,
): boolean | null {
  if (matchingSessionIds == null) return null;
  return matchingSessionIds.includes(sessionId);
}

function formatIsoShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function formatSessionDatesLabel(session: CampSession): string {
  const start = session.startDate;
  const end = session.endDate;
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    // Prefer source month/day windows when the calendar year is not verified.
    const listed = session.notes?.match(/^Listed dates:\s*(.+)$/i)?.[1]?.trim();
    if (listed) return listed;
    return "Upcoming dates not yet verified";
  }
  const startLabel = formatIsoShort(start);
  if (end && /^\d{4}-\d{2}-\d{2}$/.test(end) && end !== start) {
    return `${startLabel} – ${formatIsoShort(end)}`;
  }
  return startLabel;
}

function ageAssessmentNote(session: CampSession): string | null {
  const rule = session.ageAssessmentRule ?? "unknown";
  const assessed = resolveSessionAssessmentDate(session);
  if (rule === "as_of_date" && assessed) {
    return `Age checked as of ${formatIsoShort(assessed)}`;
  }
  if (rule === "as_of_session_start" && assessed) {
    return `Age checked as of session start (${formatIsoShort(assessed)})`;
  }
  if (rule === "unknown" || !assessed) {
    return "Ask the provider how they check age";
  }
  return null;
}

function formatCareLabel(session: CampSession): string {
  const hours = summarizeMatchingSessionHours([session]);
  if (hours.careNote) return hours.careNote;
  return "Care to confirm";
}

/**
 * One table/row projection for a session. Uses shared helpers only.
 * Never reads program.typicalAge* or a program-level venue.
 */
export function buildSessionDetailRow(
  session: CampSession,
  venuesById: Record<string, Venue>,
  options?: { now?: Date },
): CampSessionDetailRow {
  const venue = summarizeMatchingSessionVenues([session], venuesById);
  const hours = summarizeMatchingSessionHours([session]);
  const price = summarizeMatchingSessionPrices([session]);
  const ageBand = formatSessionAgeBand(session);

  return {
    session,
    venueLabel: venue.label,
    datesLabel: formatSessionDatesLabel(session),
    ageEligibilityLabel: ageBand ?? "Ages to confirm",
    ageAssessmentNote: ageAssessmentNote(session),
    hoursLabel: hours.label,
    careLabel: formatCareLabel(session),
    priceLabel: price.label,
    registration: getRegistrationAction(
      { kind: "session", session },
      { now: options?.now },
    ),
    sourceUrl: session.sourceUrl?.trim() || null,
    sourceCheckedDate: session.sourceCheckedDate ?? null,
    providerConfirmed:
      typeof session.providerConfirmed === "boolean"
        ? session.providerConfirmed
        : null,
  };
}

export function buildAllSessionDetailRows(
  sessions: CampSession[],
  venuesById: Record<string, Venue>,
  options?: { now?: Date },
): CampSessionDetailRow[] {
  return sessions.map((s) => buildSessionDetailRow(s, venuesById, options));
}

/** Distinct venue labels across sessions — identity section only. */
export function summarizeProgramVenuesFromSessions(
  sessions: CampSession[],
  venuesById: Record<string, Venue>,
): { kind: "known" | "multi" | "unknown"; label: string; names: string[] } {
  const summary = summarizeMatchingSessionVenues(sessions, venuesById);
  if (summary.kind === "multi") {
    return { kind: "multi", label: summary.label, names: summary.venueNames };
  }
  if (summary.kind === "known") {
    return { kind: "known", label: summary.label, names: [summary.label] };
  }
  return { kind: "unknown", label: summary.label, names: [] };
}
