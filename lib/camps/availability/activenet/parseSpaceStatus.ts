import type { ParsedSpaceStatus } from "@/lib/camps/availability/activenet/types";

const OPENINGS_REMAINING = /(\d+)\s+openings?\s+remaining/i;
const WAITLIST = /\bwait(?:ing)?\s*list\b/i;
const CLOSED = /\bclosed\b/i;
const FULL = /^full$/i;

/**
 * Parse ActiveNet `body.detail.space_status`.
 *
 * Numeric remaining seats are taken only from "{n} opening(s) remaining".
 * Closed, waitlist, and Full are preserved as distinct statuses. Waitlist
 * wins when both closed and waitlist appear in the same string. "Full" is
 * not zero openings and is not "unknown".
 */
export function parseActiveNetSpaceStatus(raw: unknown): ParsedSpaceStatus {
  if (typeof raw !== "string") {
    return { kind: "unknown", openingsRemaining: null, raw: null };
  }
  const text = raw.trim();
  if (text === "") {
    return { kind: "unknown", openingsRemaining: null, raw: "" };
  }

  const openings = text.match(OPENINGS_REMAINING);
  if (openings) {
    return {
      kind: "available",
      openingsRemaining: Number(openings[1]),
      raw: text,
    };
  }
  if (WAITLIST.test(text)) {
    return { kind: "waitlist", openingsRemaining: null, raw: text };
  }
  if (CLOSED.test(text)) {
    return { kind: "closed", openingsRemaining: null, raw: text };
  }
  if (FULL.test(text)) {
    return { kind: "full", openingsRemaining: null, raw: text };
  }
  return { kind: "unknown", openingsRemaining: null, raw: text };
}
