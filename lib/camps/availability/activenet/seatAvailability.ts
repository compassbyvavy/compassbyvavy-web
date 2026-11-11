import type { SeatAvailabilityFact } from "@/data/camps/types";
import type { ActiveNetSpaceStatusKind } from "@/lib/camps/availability/activenet/types";

/**
 * Map connector status onto CampSession.seatAvailability.
 * Full → confirmed_full. Remaining seats → confirmed_available.
 * Closed / waitlist / unknown stay unknown on the seat fact (lifecycle
 * belongs on registrationStatus).
 */
export function seatAvailabilityFromSpaceKind(
  kind: ActiveNetSpaceStatusKind,
): SeatAvailabilityFact {
  if (kind === "full") return "confirmed_full";
  if (kind === "available") return "confirmed_available";
  return "unknown";
}
