/**
 * Registration Tracker — deadline / opens-on awareness for saved camps.
 *
 * Compass never processes provider registration and never invents urgency,
 * open/closed/waitlist/seats, or live inventory. Unknown stays unknown.
 *
 * Reads only fields already on CampSession (registrationOpensOn, lifecycle
 * status, optional deadline when a verified date is supplied). Does not
 * scrape notes or invent countdowns.
 */

import type { CampSession } from "@/data/camps/types";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import { formatSessionDatesLabel } from "@/lib/camps/campDetail";
import {
  formatRegistrationCalendarDate,
  getRegistrationAction,
} from "@/lib/camps/registrationAction";
import { REGISTRATION_TRACKER_HREF } from "@/lib/camps/campsChrome";
import {
  resolveShortlist,
  type ResolvedActiveItem,
} from "@/lib/shortlist/resolve";
import type {
  SavedItemsSource,
  SavedItemsSourceKind,
} from "@/lib/shortlist/savedItemsSource";
import { SHORTLIST_VERSION, type ShortlistState } from "@/lib/shortlist/types";

export const TRACKER_EMPTY_TITLE =
  "Save camps to track registration windows";

export const TRACKER_EMPTY_BODY =
  "Heart a camp from the directory to see opens-on dates and lifecycle notes already on file. Compass does not process registration and does not invent seat inventory.";

export const TRACKER_EMPTY_CTA_LABEL = "Browse camps";
export const TRACKER_EMPTY_CTA_HREF = "/camps";

export const TRACKER_DISCLAIMER =
  "These notes come from fields on file — opens-on dates and registration lifecycle when we have them. Registration open is not a confirmed seat. Unknown is not closed, full, or open. Compass never processes provider registration.";

export const TRACKER_VERIFY_LABEL = "Verify on provider site";

export const TRACKER_UNKNOWN_STATUS = "Status unknown — check provider";

/** Copy for a verified deadline date. Never call with a guessed date. */
export function formatDeadlineOnFile(
  isoDate: string | null | undefined,
): string | null {
  const label = formatRegistrationCalendarDate(isoDate);
  return label ? `Deadline on file ${label}` : null;
}

export function formatOpensOnSignal(
  isoDate: string | null | undefined,
): string | null {
  const label = formatRegistrationCalendarDate(isoDate);
  return label ? `Registration opens ${label}` : null;
}

export type TrackerSignalTone = "known" | "unknown";

export type TrackerSignalId =
  | "opens_on"
  | "deadline_on_file"
  | "lifecycle"
  | "unknown"
  | "verify";

export type TrackerSignal = {
  id: TrackerSignalId;
  text: string;
  tone: TrackerSignalTone;
};

export type TrackerRow = {
  key: string;
  entryId: string;
  sourceKind: SavedItemsSourceKind;
  programName: string;
  providerName: string;
  href: string;
  sessionDatesLabel: string | null;
  signals: TrackerSignal[];
  verifyHref: string | null;
  verifyLabel: typeof TRACKER_VERIFY_LABEL;
  parentMarkedRegistered: boolean;
  /** Missing data is never treated as urgent. */
  missingDataUrgent: false;
};

export type RegistrationTrackerView = {
  sourceKind: SavedItemsSourceKind;
  catalogPending: boolean;
  empty: boolean;
  emptyTitle: string;
  emptyBody: string;
  emptyCtaHref: string;
  emptyCtaLabel: string;
  disclaimer: string;
  href: string;
  rows: TrackerRow[];
};

const FAKE_SEAT_OR_URGENCY =
  /live seats?|seats? available|spots? left|filling fast|hurry|countdown|days left|almost full|limited spots/i;

function withoutDenials(text: string): string {
  return text.replace(
    /\b(?:does not|do not|don't|never|not)\b[^.!?\n]{0,80}/gi,
    " ",
  );
}

export function trackerCopyClaimsLiveSeats(text: string): boolean {
  return FAKE_SEAT_OR_URGENCY.test(withoutDenials(text));
}

function sourceState(source: SavedItemsSource): ShortlistState {
  return {
    version: SHORTLIST_VERSION,
    items: source.items,
    past: [],
  };
}

function verifyHrefForSession(session: CampSession): string | null {
  const action = getRegistrationAction({ kind: "session", session });
  if (action.linksOut && action.href) return action.href;
  const fallback = session.registrationUrl?.trim() || session.waitlistUrl?.trim();
  return fallback && fallback.length > 0 ? fallback : null;
}

/**
 * Honest lifecycle sentence from verified session fields only.
 * Unknown never becomes open, closed, waitlist, or full.
 */
export function trackerLifecycleCopy(session: CampSession): string {
  const status = session.registrationStatus;

  if (status === "availability_unknown") {
    return TRACKER_UNKNOWN_STATUS;
  }

  if (status === "not_yet_open") {
    const opens = formatOpensOnSignal(session.registrationOpensOn);
    return opens ?? "Registration not yet open — verify on provider site";
  }

  if (status === "registration_open") {
    return "Registration open with provider — not a confirmed seat";
  }

  if (status === "waitlist") {
    return "Waitlist on file — verify on provider site";
  }

  if (status === "registration_closed") {
    return "Registration closed on file — verify on provider site";
  }

  if (status === "no_upcoming_dates") {
    return "No upcoming dates announced — verify on provider site";
  }

  return TRACKER_UNKNOWN_STATUS;
}

function toneForLifecycle(session: CampSession): TrackerSignalTone {
  return session.registrationStatus === "availability_unknown"
    ? "unknown"
    : "known";
}

export function buildTrackerSignals(session: CampSession): TrackerSignal[] {
  const signals: TrackerSignal[] = [];
  const opens = formatOpensOnSignal(session.registrationOpensOn);
  const deadline = formatDeadlineOnFile(session.registrationDeadlineOn);

  if (opens && session.registrationStatus !== "not_yet_open") {
    signals.push({ id: "opens_on", text: opens, tone: "known" });
  }

  if (deadline) {
    signals.push({ id: "deadline_on_file", text: deadline, tone: "known" });
  }

  const lifecycle = trackerLifecycleCopy(session);
  signals.push({
    id:
      session.registrationStatus === "availability_unknown"
        ? "unknown"
        : "lifecycle",
    text: lifecycle,
    tone: toneForLifecycle(session),
  });

  return signals;
}

function catalogPendingRow(
  source: SavedItemsSource,
  entryId: string,
): TrackerRow {
  return {
    key: entryId,
    entryId,
    sourceKind: source.kind,
    programName: "Saved camp ID",
    providerName: "Details to load",
    href: "/camps",
    sessionDatesLabel: null,
    signals: [
      {
        id: "unknown",
        text: TRACKER_UNKNOWN_STATUS,
        tone: "unknown",
      },
    ],
    verifyHref: null,
    verifyLabel: TRACKER_VERIFY_LABEL,
    parentMarkedRegistered: false,
    missingDataUrgent: false,
  };
}

function rowFromSession(
  source: SavedItemsSource,
  item: Extract<ResolvedActiveItem, { kind: "session" }>,
): TrackerRow {
  const session = item.session;
  return {
    key: `${item.entry.entryId}:${session.id}`,
    entryId: item.entry.entryId,
    sourceKind: source.kind,
    programName: item.program.name,
    providerName: item.provider.name,
    href: `/camps/${item.program.slug}?session=${session.id}`,
    sessionDatesLabel: formatSessionDatesLabel(session),
    signals: buildTrackerSignals(session),
    verifyHref: verifyHrefForSession(session),
    verifyLabel: TRACKER_VERIFY_LABEL,
    parentMarkedRegistered: item.entry.registeredMarkedAt != null,
    missingDataUrgent: false,
  };
}

function rowsFromProgram(
  source: SavedItemsSource,
  item: Extract<ResolvedActiveItem, { kind: "program" }>,
): TrackerRow[] {
  if (item.sessions.length === 0) {
    return [
      {
        key: item.entry.entryId,
        entryId: item.entry.entryId,
        sourceKind: source.kind,
        programName: item.program.name,
        providerName: item.provider.name,
        href: `/camps/${item.program.slug}`,
        sessionDatesLabel: "Upcoming dates not yet verified",
        signals: [
          {
            id: "unknown",
            text: TRACKER_UNKNOWN_STATUS,
            tone: "unknown",
          },
        ],
        verifyHref: item.provider.registrationInfoUrl?.trim() || null,
        verifyLabel: TRACKER_VERIFY_LABEL,
        parentMarkedRegistered: item.entry.registeredMarkedAt != null,
        missingDataUrgent: false,
      },
    ];
  }

  return item.sessions.map((session) => ({
    key: `${item.entry.entryId}:${session.id}`,
    entryId: item.entry.entryId,
    sourceKind: source.kind,
    programName: item.program.name,
    providerName: item.provider.name,
    href: `/camps/${item.program.slug}?session=${session.id}`,
    sessionDatesLabel: formatSessionDatesLabel(session),
    signals: buildTrackerSignals(session),
    verifyHref: verifyHrefForSession(session),
    verifyLabel: TRACKER_VERIFY_LABEL,
    parentMarkedRegistered: item.entry.registeredMarkedAt != null,
    missingDataUrgent: false,
  }));
}

export function buildRegistrationTracker(
  source: SavedItemsSource,
  catalog: CampsCatalogBundle | null,
  options?: { now?: Date },
): RegistrationTrackerView {
  const emptyBase = {
    sourceKind: source.kind,
    emptyTitle: TRACKER_EMPTY_TITLE,
    emptyBody: TRACKER_EMPTY_BODY,
    emptyCtaHref: TRACKER_EMPTY_CTA_HREF,
    emptyCtaLabel: TRACKER_EMPTY_CTA_LABEL,
    disclaimer: TRACKER_DISCLAIMER,
    href: REGISTRATION_TRACKER_HREF,
  };

  if (source.items.length === 0) {
    return {
      ...emptyBase,
      catalogPending: catalog == null,
      empty: true,
      rows: [],
    };
  }

  const resolved = resolveShortlist(sourceState(source), catalog, options);

  if (resolved.catalogPending) {
    return {
      ...emptyBase,
      catalogPending: true,
      empty: false,
      rows: source.items.map((entry) => catalogPendingRow(source, entry.entryId)),
    };
  }

  const rows: TrackerRow[] = [];
  for (const item of resolved.active) {
    if (item.kind === "catalog_pending") {
      rows.push(catalogPendingRow(source, item.entry.entryId));
      continue;
    }
    if (item.kind === "program") {
      rows.push(...rowsFromProgram(source, item));
      continue;
    }
    rows.push(rowFromSession(source, item));
  }

  return {
    ...emptyBase,
    catalogPending: false,
    empty: rows.length === 0,
    rows,
  };
}

export function collectTrackerDisplayText(view: RegistrationTrackerView): string {
  const parts = [
    view.emptyTitle,
    view.emptyBody,
    view.emptyCtaLabel,
    view.disclaimer,
    ...view.rows.flatMap((row) => [
      row.programName,
      row.providerName,
      row.sessionDatesLabel ?? "",
      row.verifyLabel,
      ...row.signals.map((s) => s.text),
    ]),
  ];
  return parts.join("\n");
}
