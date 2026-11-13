/**
 * Which spots line a parent sees. Times are Toronto clock times, never
 * "12 min ago", because the catalog is cached. A checker reading older than
 * 7 days, or a manual check dated later, falls back to seat_availability.
 */
import type { CampSession } from "@/data/camps/types";

export type SpotTone = "open" | "full" | "unknown" | "warning";

export type SpotLine = {
  text: string;
  tone: SpotTone;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Today's date in Toronto, YYYY-MM-DD. */
export function torontoDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** "6:15 am" in Toronto. */
export function torontoClock(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(instant);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const period = (parts.find((part) => part.type === "dayPeriod")?.value ?? "").toLowerCase();
  return `${hour}:${minute} ${period}`.replace(/\s+/g, " ").trim();
}

function shortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[(month ?? 1) - 1]} ${day}`;
}

function manualSeatLine(session: CampSession): SpotLine | null {
  const when = session.sourceCheckedDate ? ` · checked ${shortDate(session.sourceCheckedDate)}` : "";
  if (session.seatAvailability === "confirmed_full" || session.registrationStatus === "waitlist") {
    return {
      text: `Full${session.waitlistUrl ? ", waitlist" : ""}${when}`,
      tone: "full",
    };
  }
  if (session.seatAvailability === "confirmed_available") {
    return { text: `Spots available${when}`, tone: "open" };
  }
  return null;
}

/**
 * The checker's line when it is the one to show. Null means use the manual
 * seat line (or nothing, when that line has no seat fact).
 */
export function checkerLine(session: CampSession, now: Date): SpotLine | null {
  const reading = session.spotCheck;
  if (!reading || reading.state === "unknown") return null;
  if (reading.spotsLeft != null && reading.spotsLeft < 0) return null;
  const checked = new Date(reading.checkedAt);
  if (Number.isNaN(checked.getTime())) return null;
  const checkerDay = torontoDate(checked);
  if (session.sourceCheckedDate && session.sourceCheckedDate > checkerDay) return null;
  const age = now.getTime() - checked.getTime();
  if (age >= SEVEN_DAYS_MS) return null;

  const fresh = age < TWO_HOURS_MS;
  const suffix = ` · checked ${fresh ? torontoClock(checked) : shortDate(checkerDay)}`;
  const noSeats = reading.state === "full" || (reading.state === "available" && reading.spotsLeft === 0);
  if (noSeats) return { text: `Full${suffix}`, tone: "full" };
  if (reading.state === "waitlist") return { text: `Full · waitlist open${suffix}`, tone: "full" };
  if (!fresh || reading.spotsLeft == null) return { text: `Spots available${suffix}`, tone: "open" };
  const count = reading.spotsLeft;
  return {
    text: `${count} ${count === 1 ? "spot" : "spots"} left${suffix}`,
    tone: count <= 5 ? "warning" : "open",
  };
}

/** Soonest session's spots line: the checker when it wins, otherwise the manual seat line. */
export function soonestSpotLine(sessions: CampSession[], now: Date): SpotLine | null {
  const soonest = [...sessions].sort(
    (a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999") || a.id.localeCompare(b.id),
  )[0];
  if (!soonest) return null;
  return checkerLine(soonest, now) ?? manualSeatLine(soonest);
}
