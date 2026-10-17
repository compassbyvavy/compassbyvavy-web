import type { CampProgram, CampSession } from "@/data/camps/types";
import type { ShortlistRef } from "@/lib/shortlist/types";

export function shortlistEntryId(ref: ShortlistRef): string {
  switch (ref.kind) {
    case "camp_session":
      return `camp_session:${ref.programId}:${ref.sessionId}`;
    case "camp_program":
      return `camp_program:${ref.programId}`;
    case "discover_listing":
      return `discover_listing:${ref.listingId}`;
    default: {
      const neverRef: never = ref;
      return neverRef;
    }
  }
}

export function refsEqual(a: ShortlistRef, b: ShortlistRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "camp_session" && b.kind === "camp_session") {
    return a.programId === b.programId && a.sessionId === b.sessionId;
  }
  if (a.kind === "camp_program" && b.kind === "camp_program") {
    return a.programId === b.programId;
  }
  if (a.kind === "discover_listing" && b.kind === "discover_listing") {
    return a.listingId === b.listingId;
  }
  return false;
}

export function saveRefForDiscoverListing(listingId: string): ShortlistRef {
  return { kind: "discover_listing", listingId };
}

/**
 * Grouped cards (0 or 2+ matching sessions) save the program.
 * A single matching session (flat row or one-session group) saves that session.
 */
export function saveRefForCard(
  program: CampProgram,
  matchingSessions: CampSession[],
): ShortlistRef {
  if (matchingSessions.length === 1) {
    return {
      kind: "camp_session",
      programId: program.id,
      sessionId: matchingSessions[0].id,
    };
  }
  return { kind: "camp_program", programId: program.id };
}

export function saveRefForDetail(
  program: CampProgram,
  selectedSessionId: string | null,
): ShortlistRef {
  if (selectedSessionId && selectedSessionId.trim() !== "") {
    return {
      kind: "camp_session",
      programId: program.id,
      sessionId: selectedSessionId.trim(),
    };
  }
  return { kind: "camp_program", programId: program.id };
}

export function isSafePublicId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return false;
  if (trimmed.includes("://") || trimmed.includes("//")) return false;
  return true;
}
