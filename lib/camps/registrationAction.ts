/**
 * Single source of truth for camps registration display state → action.
 *
 * Cards, flat rows, detail sessions, and (later) grouped summaries must call this
 * helper rather than hardcoding status copy. Grouped aggregation of per-session
 * results is out of scope here — future grouped summaries should aggregate
 * per-session results from this helper, not invent a program-level "Open" claim.
 *
 * Does not import fixtures. Load/error and unverified-dates contexts are explicit
 * inputs — never stored in CampRegistrationStatus.
 */

import type { CampSession, SeatAvailabilityFact } from "@/data/camps/types";

/** Stable display-state ids for UI chips / actions (includes non-enum edge cases). */
export type RegistrationDisplayStateId =
  | "registration_open"
  | "no_upcoming_dates"
  | "waitlist"
  | "not_yet_open"
  | "availability_unknown"
  | "full_or_closed"
  | "dates_unverified"
  | "load_failed";

export type RegistrationAction = {
  /** Stable identifier for chips and tests — not free-form copy. */
  displayState: RegistrationDisplayStateId;
  /** Primary status / guidance text shown to parents. */
  label: string;
  /** CTA label when an actionable outbound (or in-app) control exists; otherwise null. */
  buttonText: string | null;
  /** Real destination URL only — never invented. Null when no verified link. */
  href: string | null;
  /** True when href points to an external provider destination. */
  linksOut: boolean;
};

/**
 * Explicit input context. Do not invent a CampSession for load failure or
 * unverified dates. Confirmed-no-announced-dates may use either a session with
 * registrationStatus "no_upcoming_dates" or kind "confirmed_no_announced_dates".
 */
export type RegistrationActionInput =
  | { kind: "session"; session: CampSession }
  | { kind: "load_failed" }
  | { kind: "dates_unverified" }
  | { kind: "confirmed_no_announced_dates"; infoUrl?: string | null };

export type GetRegistrationActionOptions = {
  /**
   * Current time for deterministic date comparisons (e.g. registrationOpensOn).
   * Callers must pass this when date logic matters; defaults to Date.now() only
   * when omitted so tests stay deterministic by supplying a fixed `now`.
   */
  now?: Date;
};

function nonEmptyUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isConfirmedFull(
  seat: SeatAvailabilityFact | null | undefined,
): boolean {
  return seat === "confirmed_full";
}

function outbound(
  displayState: RegistrationDisplayStateId,
  label: string,
  buttonText: string | null,
  href: string | null,
): RegistrationAction {
  const safeHref = nonEmptyUrl(href);
  if (!safeHref || !buttonText) {
    return {
      displayState,
      label,
      buttonText: null,
      href: null,
      linksOut: false,
    };
  }
  return {
    displayState,
    label,
    buttonText,
    href: safeHref,
    linksOut: true,
  };
}

function labelOnly(
  displayState: RegistrationDisplayStateId,
  label: string,
): RegistrationAction {
  return {
    displayState,
    label,
    buttonText: null,
    href: null,
    linksOut: false,
  };
}

function formatOpensOn(isoDate: string | null | undefined): string | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

function waitlistAction(
  waitlistUrl: string | null | undefined,
): RegistrationAction {
  return outbound(
    "waitlist",
    "Provider offers a waitlist",
    "View provider waitlist",
    nonEmptyUrl(waitlistUrl),
  );
}

function fullOrClosedAction(session: CampSession): RegistrationAction {
  const waitlistUrl = nonEmptyUrl(session.waitlistUrl);
  if (waitlistUrl) {
    return waitlistAction(waitlistUrl);
  }
  return labelOnly("full_or_closed", "This session is full or closed");
}

function actionForSession(session: CampSession, now: Date): RegistrationAction {
  const registrationUrl = nonEmptyUrl(session.registrationUrl);
  const waitlistUrl = nonEmptyUrl(session.waitlistUrl);

  // Capacity full suppresses generic Register — waitlist only when known.
  // Registration closure is a lifecycle fact (registration_closed), not seats.
  if (isConfirmedFull(session.seatAvailability)) {
    return fullOrClosedAction(session);
  }

  switch (session.registrationStatus) {
    case "registration_open":
      return outbound(
        "registration_open",
        "Registration open with provider — a seat is not guaranteed",
        "Register with provider",
        registrationUrl,
      );

    case "registration_closed":
      // Closed lifecycle with remaining seats still suppresses Register.
      return fullOrClosedAction(session);

    case "no_upcoming_dates":
      return outbound(
        "no_upcoming_dates",
        "No upcoming dates announced",
        "Check next dates with provider",
        registrationUrl,
      );

    case "waitlist":
      // Never a generic registration button when waitlist is the verified situation.
      return waitlistAction(waitlistUrl);

    case "not_yet_open": {
      void now;
      const opensLabel = formatOpensOn(session.registrationOpensOn);
      const label = opensLabel
        ? `Registration opens ${opensLabel}`
        : "Registration not yet open";
      return outbound(
        "not_yet_open",
        label,
        "View provider info",
        registrationUrl,
      );
    }

    case "availability_unknown":
      return outbound(
        "availability_unknown",
        "Registration availability to confirm",
        "Check availability with provider",
        registrationUrl,
      );

    default: {
      const _exhaustive: never = session.registrationStatus;
      void _exhaustive;
      return labelOnly(
        "availability_unknown",
        "Registration availability to confirm",
      );
    }
  }
}

/**
 * Resolve the registration display action for a session or explicit edge context.
 * This is the only place that decides registration display state for Camps UI.
 */
export function getRegistrationAction(
  input: RegistrationActionInput,
  options?: GetRegistrationActionOptions,
): RegistrationAction {
  const now = options?.now ?? new Date();

  switch (input.kind) {
    case "load_failed":
      return labelOnly("load_failed", "Sessions couldn't be loaded");

    case "dates_unverified":
      return labelOnly(
        "dates_unverified",
        "Upcoming dates not yet verified",
      );

    case "confirmed_no_announced_dates":
      return outbound(
        "no_upcoming_dates",
        "No upcoming dates announced",
        "Check next dates with provider",
        nonEmptyUrl(input.infoUrl),
      );

    case "session":
      return actionForSession(input.session, now);

    default: {
      const _exhaustive: never = input;
      void _exhaustive;
      return labelOnly("load_failed", "Sessions couldn't be loaded");
    }
  }
}
