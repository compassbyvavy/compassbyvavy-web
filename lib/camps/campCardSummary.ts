/**
 * Pure CampCard summarization over *matching* sessions only.
 *
 * Registration display comes from getRegistrationAction (Prompt 2).
 * Price, dates, and venue summaries are derived here from matching sessions —
 * never from a single program-level venue field.
 *
 * Empty matchingSessions must NOT become "No upcoming sessions".
 * Callers should treat that as dates-unverified unless an explicit context says otherwise.
 */

import type {
  CampCurrency,
  CampProgram,
  CampSession,
  PriceUnit,
  Venue,
} from "@/data/camps/types";
import {
  getRegistrationAction,
  type RegistrationAction,
  type RegistrationDisplayStateId,
} from "@/lib/camps/registrationAction";
import { summarizeMatchingSessionAges } from "@/lib/camps/sessionEligibility";

export type CampCardPriceSummary =
  | {
      kind: "known";
      /** Display string e.g. "CAD $285/week" or "CAD $250–$275/week". */
      label: string;
      amountMin: number;
      amountMax: number;
      currency: CampCurrency;
      unit: PriceUnit;
    }
  | {
      kind: "mixed_units";
      label: "Check with provider";
      detail: string;
    }
  | {
      kind: "unknown";
      label: "Check with provider";
    };

export type CampCardStatusSummary =
  | {
      kind: "single";
      action: RegistrationAction;
    }
  | {
      kind: "mixed";
      /** Qualified wording — does not imply seats are available. */
      label: string;
      /** Dominant chip state for visual styling (open if any open, else first). */
      displayState: RegistrationDisplayStateId;
      openCount: number;
      totalCount: number;
    }
  | {
      kind: "dates_unverified";
      action: RegistrationAction;
    }
  | {
      kind: "load_failed";
      action: RegistrationAction;
    };

export type CampCardVenueSummary =
  | { kind: "known"; label: string }
  | { kind: "multi"; label: string; venueNames: string[] }
  | { kind: "unknown"; label: "Venue to confirm" };

export type CampCardDateSummary =
  | { kind: "range"; label: string }
  | { kind: "unverified"; label: "Upcoming dates not yet verified" };

export type CampCardHoursSummary =
  | { kind: "known"; label: string; careNote?: string }
  | { kind: "vary"; label: "Hours vary by session"; careNote?: string }
  | { kind: "unknown"; label: "Hours to confirm"; careNote?: string };

export type CampCardSummary = {
  status: CampCardStatusSummary;
  price: CampCardPriceSummary;
  venue: CampCardVenueSummary;
  dates: CampCardDateSummary;
  hours: CampCardHoursSummary;
  eligibilityLabel: string | null;
  categoryLabel: string | null;
  themeLabels: string[];
};

function formatPriceAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function unitLabel(unit: PriceUnit): string {
  switch (unit) {
    case "per_day":
      return "day";
    case "per_week":
      return "week";
    case "full_program":
      return "full program";
    case "per_session":
      return "session";
    case "other":
    case "unknown":
      return "";
    default:
      return "";
  }
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

/**
 * Format known prices as "CAD $250/week" or "CAD $250–$275/week".
 * "From" only when the amount is a starting price (min only / open upper bound).
 */
function formatKnownPriceLabel(
  amountMin: number,
  amountMax: number,
  currency: CampCurrency,
  unit: PriceUnit,
  options?: { startingOnly?: boolean },
): string {
  const unitText = unitLabel(unit);
  const currencyPrefix =
    currency === "CAD" || currency === "USD" ? `${currency} ` : "";
  const single = `${currencyPrefix}$${formatPriceAmount(amountMin)}`;
  let pricePart: string;
  if (options?.startingOnly) {
    pricePart = `From ${single}`;
  } else if (amountMin === amountMax) {
    pricePart = single;
  } else {
    pricePart = `${currencyPrefix}$${formatPriceAmount(amountMin)}–$${formatPriceAmount(amountMax)}`;
  }
  return unitText ? `${pricePart}/${unitText}` : pricePart;
}

function formatCareWindowLabel(
  kind: "before" | "after",
  window: CampSession["beforeCare"] | CampSession["afterCare"],
): string | null {
  if (!window || window.offered === "no") return null;
  const name = kind === "before" ? "before care" : "after care";
  if (window.offered === "unknown") {
    return `${name} to confirm`;
  }
  // offered === "yes"
  const advance =
    window.separateBookingRequired === "yes"
      ? " · advance request; additional fee"
      : "";
  if (window.startTime && window.endTime) {
    return `${name} ${window.startTime}–${window.endTime}${advance}`;
  }
  return `${name} (times to confirm)${advance}`;
}

function careNoteForSessions(sessions: CampSession[]): string | undefined {
  if (sessions.length === 0) return undefined;
  const notes = sessions.map((s) => {
    const bits = [
      formatCareWindowLabel("before", s.beforeCare),
      formatCareWindowLabel("after", s.afterCare),
    ].filter(Boolean) as string[];
    return bits.join(" · ");
  });
  const first = notes[0];
  if (notes.every((n) => n === first)) {
    return first || undefined;
  }
  return "care hours vary by session";
}

export function summarizeMatchingSessionPrices(
  matchingSessions: CampSession[],
): CampCardPriceSummary {
  const priced = matchingSessions.filter(
    (s) =>
      typeof s.priceAmount === "number" &&
      s.priceAmount >= 0 &&
      s.priceUnit &&
      s.priceUnit !== "unknown" &&
      s.currency &&
      s.currency !== "unknown",
  );

  if (priced.length === 0) {
    return { kind: "unknown", label: "Check with provider" };
  }

  const units = new Set(priced.map((s) => s.priceUnit as PriceUnit));
  const currencies = new Set(priced.map((s) => s.currency as CampCurrency));

  // Never compare daily vs weekly directly.
  if (units.size > 1 || currencies.size > 1) {
    return {
      kind: "mixed_units",
      label: "Check with provider",
      detail: "Matching sessions use different price units or currencies.",
    };
  }

  const unit = priced[0].priceUnit as PriceUnit;
  const currency = priced[0].currency as CampCurrency;
  const amounts = priced.map((s) => s.priceAmount as number);
  const amountMin = Math.min(...amounts);
  const amountMax = Math.max(...amounts);
  // Exact equal amounts are never "From" — tax / fee notes are disclosures, not an open upper bound.
  const labelBase = formatKnownPriceLabel(amountMin, amountMax, currency, unit, {
    startingOnly: false,
  });
  const disclosesTax = priced.some((s) =>
    /\+\s*tax/i.test(s.feeNotes?.trim() ?? ""),
  );
  const label =
    amountMin === amountMax && disclosesTax
      ? `${labelBase} + tax`
      : labelBase;

  return { kind: "known", label, amountMin, amountMax, currency, unit };
}

export function summarizeMatchingSessionStatus(
  matchingSessions: CampSession[],
  options?: { now?: Date; loadFailed?: boolean },
): CampCardStatusSummary {
  if (options?.loadFailed) {
    return {
      kind: "load_failed",
      action: getRegistrationAction({ kind: "load_failed" }, { now: options.now }),
    };
  }

  // Empty matching array alone is NOT "No upcoming sessions".
  if (matchingSessions.length === 0) {
    return {
      kind: "dates_unverified",
      action: getRegistrationAction(
        { kind: "dates_unverified" },
        { now: options?.now },
      ),
    };
  }

  const actions = matchingSessions.map((session) =>
    getRegistrationAction({ kind: "session", session }, { now: options?.now }),
  );

  const openCount = actions.filter(
    (a) => a.displayState === "registration_open",
  ).length;
  const uniqueStates = new Set(actions.map((a) => a.displayState));

  if (uniqueStates.size === 1) {
    return { kind: "single", action: actions[0] };
  }

  const totalCount = matchingSessions.length;
  // Qualified wording — does not imply seats are available.
  const label =
    openCount > 0
      ? `${openCount} of ${totalCount} sessions have registration open`
      : `Matching sessions have mixed registration states`;

  const displayState: RegistrationDisplayStateId =
    openCount > 0 ? "registration_open" : actions[0].displayState;

  return { kind: "mixed", label, displayState, openCount, totalCount };
}

export function summarizeMatchingSessionVenues(
  matchingSessions: CampSession[],
  venuesById: Record<string, Venue>,
): CampCardVenueSummary {
  const names: string[] = [];
  for (const session of matchingSessions) {
    if (!session.venueId) continue;
    const venue = venuesById[session.venueId];
    if (!venue) continue;
    // Neighbourhood and city stay distinct — never treat them as interchangeable.
    const label =
      venue.neighbourhood && venue.city
        ? `${venue.name} · ${venue.neighbourhood}, ${venue.city}`
        : venue.neighbourhood
          ? `${venue.name} · ${venue.neighbourhood}`
          : venue.city
            ? `${venue.name} · ${venue.city}`
            : venue.name;
    if (!names.includes(label)) names.push(label);
  }

  if (names.length === 0) {
    return { kind: "unknown", label: "Venue to confirm" };
  }
  if (names.length === 1) {
    return { kind: "known", label: names[0] };
  }
  return {
    kind: "multi",
    label: `${names.length} venues`,
    venueNames: names,
  };
}

export function summarizeMatchingSessionDates(
  matchingSessions: CampSession[],
): CampCardDateSummary {
  if (matchingSessions.length === 0) {
    return {
      kind: "unverified",
      label: "Upcoming dates not yet verified",
    };
  }

  const starts = matchingSessions
    .map((s) => s.startDate)
    .filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d)))
    .sort();
  const ends = matchingSessions
    .map((s) => s.endDate)
    .filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d)))
    .sort();

  if (starts.length === 0) {
    return {
      kind: "unverified",
      label: "Upcoming dates not yet verified",
    };
  }

  const first = formatIsoShort(starts[0]);
  const last = ends.length > 0 ? formatIsoShort(ends[ends.length - 1]) : first;
  const range = first === last ? first : `${first} – ${last}`;
  if (matchingSessions.length === 1) {
    return { kind: "range", label: range };
  }
  const count = matchingSessions.length;
  const sessionWord = count === 1 ? "session" : "sessions";
  return {
    kind: "range",
    label: `${count} ${sessionWord} · ${range}`,
  };
}

export function summarizeMatchingSessionHours(
  matchingSessions: CampSession[],
): CampCardHoursSummary {
  if (matchingSessions.length === 0) {
    return { kind: "unknown", label: "Hours to confirm" };
  }

  const withHours = matchingSessions.filter(
    (s) => s.coreHoursStart && s.coreHoursEnd,
  );

  if (withHours.length === 0) {
    return {
      kind: "unknown",
      label: "Hours to confirm",
      careNote: careNoteForSessions(matchingSessions),
    };
  }

  if (withHours.length < matchingSessions.length) {
    return {
      kind: "vary",
      label: "Hours vary by session",
      careNote: careNoteForSessions(matchingSessions),
    };
  }

  const first = withHours[0];
  const allSame = withHours.every(
    (s) =>
      s.coreHoursStart === first.coreHoursStart &&
      s.coreHoursEnd === first.coreHoursEnd,
  );
  if (!allSame) {
    return {
      kind: "vary",
      label: "Hours vary by session",
      careNote: careNoteForSessions(matchingSessions),
    };
  }

  return {
    kind: "known",
    label: `${first.coreHoursStart}–${first.coreHoursEnd}`,
    careNote: careNoteForSessions(withHours),
  };
}

export function buildCampCardSummary(input: {
  program: CampProgram;
  matchingSessions: CampSession[];
  venuesById: Record<string, Venue>;
  now?: Date;
  loadFailed?: boolean;
}): CampCardSummary {
  const { program, matchingSessions, venuesById, now, loadFailed } = input;
  // Exact eligibility from matching sessions only — never program typical ages.
  const ageSummary = summarizeMatchingSessionAges(matchingSessions);

  return {
    status: summarizeMatchingSessionStatus(matchingSessions, {
      now,
      loadFailed,
    }),
    price: summarizeMatchingSessionPrices(matchingSessions),
    venue: summarizeMatchingSessionVenues(matchingSessions, venuesById),
    dates: summarizeMatchingSessionDates(matchingSessions),
    hours: summarizeMatchingSessionHours(matchingSessions),
    eligibilityLabel: ageSummary.label,
    categoryLabel: program.primaryCategory ?? null,
    themeLabels: program.secondaryThemes ?? [],
  };
}
