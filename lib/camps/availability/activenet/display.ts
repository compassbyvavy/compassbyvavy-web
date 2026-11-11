import type { ActiveNetAvailabilitySnapshot } from "@/lib/camps/availability/activenet/types";

export const ACTIVENET_DISPLAY_TIME_ZONE = "America/Toronto";

export type ActiveNetAvailabilityDisplay = {
  headline: string;
  /** "as of <date>" when retrievedAt is present. Never "live". */
  timestampLabel: string | null;
  confirmedCurrent: boolean;
  ctaText: string | null;
  ctaHref: string | null;
};

function formatAsOf(
  iso: string,
  timeZone: string = ACTIVENET_DISPLAY_TIME_ZONE,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return `as of ${iso}`;
  const stamp = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  return `as of ${stamp} ET`;
}

function headlineFor(snapshot: ActiveNetAvailabilitySnapshot): string {
  if (snapshot.error && !snapshot.retrievedAt) {
    if (snapshot.error === "timeout") {
      return "City of Mississauga availability timed out";
    }
    if (snapshot.error === "id_mismatch") {
      return "Provider activity did not match the stored City of Mississauga IDs";
    }
    if (snapshot.error === "malformed_response") {
      return "City of Mississauga availability could not be read";
    }
    return "City of Mississauga availability could not be retrieved";
  }
  if (snapshot.status === "available") {
    if (snapshot.openingsRemaining == null) {
      return snapshot.spaceStatusRaw?.trim() || "Openings remaining to confirm";
    }
    const n = snapshot.openingsRemaining;
    return n === 1 ? "1 opening remaining" : `${n} openings remaining`;
  }
  if (snapshot.status === "closed") return "Closed";
  if (snapshot.status === "waitlist") return "Waitlist";
  if (snapshot.status === "full") return "Full";
  if (snapshot.spaceStatusRaw?.trim()) return snapshot.spaceStatusRaw.trim();
  return "Availability to confirm with the City of Mississauga";
}

function ctaFor(
  snapshot: ActiveNetAvailabilitySnapshot,
): { text: string; href: string } | null {
  const href = snapshot.bookingUrl.trim();
  if (!href) return null;
  if (snapshot.status === "available") {
    return { text: "Enroll Now", href };
  }
  if (snapshot.status === "waitlist") {
    return { text: "View provider waitlist", href };
  }
  return null;
}

/**
 * Parent-facing copy for an ActiveNet snapshot.
 * Always includes an "as of" retrieval timestamp when one exists.
 * Openings are never presented as live.
 */
export function formatActiveNetAvailabilityDisplay(
  snapshot: ActiveNetAvailabilitySnapshot,
  options?: { timeZone?: string },
): ActiveNetAvailabilityDisplay {
  const confirmedCurrent =
    (snapshot.freshness === "fresh" || snapshot.freshness === "cached") &&
    !snapshot.error;
  const timeZone = options?.timeZone ?? ACTIVENET_DISPLAY_TIME_ZONE;
  const asOf = snapshot.retrievedAt
    ? formatAsOf(snapshot.retrievedAt, timeZone)
    : null;
  const cta = ctaFor(snapshot);
  let timestampLabel: string | null = null;
  if (asOf && confirmedCurrent) {
    timestampLabel = asOf;
  } else if (asOf) {
    timestampLabel = `${asOf} — not confirmed current`;
  }

  return {
    headline: headlineFor(snapshot),
    timestampLabel,
    confirmedCurrent,
    ctaText: cta?.text ?? null,
    ctaHref: cta?.href ?? null,
  };
}

export function snapshotForMatchingSessions(
  sessionIds: readonly string[],
  bySessionId: Readonly<Record<string, ActiveNetAvailabilitySnapshot>>,
): ActiveNetAvailabilitySnapshot | null {
  const unique: ActiveNetAvailabilitySnapshot[] = [];
  for (const id of sessionIds) {
    const snapshot = bySessionId[id];
    if (!snapshot) continue;
    if (!unique.some((item) => item.candidateId === snapshot.candidateId)) {
      unique.push(snapshot);
    }
  }
  return unique.length === 1 ? unique[0] : null;
}
