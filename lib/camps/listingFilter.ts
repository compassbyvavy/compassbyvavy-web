/**
 * Same-session listing filter + grouped/flat result builders.
 *
 * Every session-level condition must pass on the *same* session before grouping.
 * Age uses childMatchesSessionAge — only "match" qualifies; "unknown" is never eligible.
 * Program typical ages are never consulted.
 */

import type {
  CampProgram,
  CampSession,
  CampSessionScheduleFormat,
  CampStayType,
  PriceUnit,
  Provider,
  Venue,
} from "@/data/camps/types";
import {
  childMatchesSessionAge,
  isIsoDateString,
  type ChildAgeStatement,
} from "@/lib/camps/sessionEligibility";

export type TimingShortcutId =
  | "all"
  | "summer"
  | "march_break"
  | "winter_break"
  | "pa_days"
  | "weekends";

export type ListingSortId =
  | "soonest_start"
  | "price_asc"
  | "name_asc";

/**
 * Draft age inputs from the filter UI. Incomplete drafts are never applied as
 * eligibility filters — see resolveChildAgeFilter.
 */
export type ListingAgeDraft = {
  ageYears: number | null;
  asOfDate: string | null;
};

export type CampsListingFilters = {
  /** Free-text over program/provider/venue/category — empty = no keyword constraint. */
  keyword: string;
  /**
   * Age draft from the sidebar/drawer. Only a complete valid pair becomes an
   * applied ChildAgeStatement for childMatchesSessionAge.
   */
  childAge: ListingAgeDraft | null;
  /** Inclusive ISO date bounds; session must overlap when either bound is set. */
  dateFrom: string | null;
  dateTo: string | null;
  timingShortcut: TimingShortcutId;
  /** Primary category or secondary theme labels (OR within the set). */
  themes: string[];
  scheduleFormats: CampSessionScheduleFormat[];
  audiences: NonNullable<CampProgram["audience"]>[];
  accessibilityTags: string[];
  /** Venue neighbourhood or city labels (OR). */
  locations: string[];
  venueIds: string[];
  /** Max price; requires matching unit. Unknown session price fails when set. */
  priceMax: number | null;
  priceUnit: PriceUnit | null;
  /** Core hours must be known and within [start, end] when either is set. */
  coreHoursStartMax: string | null;
  coreHoursEndMin: string | null;
  requireBeforeCare: boolean;
  requireAfterCare: boolean;
  stayTypes: CampStayType[];
};

export const EMPTY_LISTING_FILTERS: CampsListingFilters = {
  keyword: "",
  childAge: null,
  dateFrom: null,
  dateTo: null,
  timingShortcut: "all",
  themes: [],
  scheduleFormats: [],
  audiences: [],
  accessibilityTags: [],
  locations: [],
  venueIds: [],
  priceMax: null,
  priceUnit: null,
  coreHoursStartMax: null,
  coreHoursEndMin: null,
  requireBeforeCare: false,
  requireAfterCare: false,
  stayTypes: [],
};

export const AGE_FILTER_MISSING_DATE_NOTICE =
  "Age filter not applied—add an age reference date.";
export const AGE_FILTER_MISSING_AGE_NOTICE =
  "Age filter not applied—add a child age.";
export const AGE_FILTER_INVALID_AGE_NOTICE =
  "Age filter not applied—enter a whole-number age.";

/** @deprecated Prefer AGE_FILTER_MISSING_DATE_NOTICE — kept as the missing-date copy. */
export const AGE_FILTER_INCOMPLETE_NOTICE = AGE_FILTER_MISSING_DATE_NOTICE;

/**
 * Resolve sidebar/drawer age drafts into an applied eligibility statement.
 * Incomplete or invalid drafts never count as an applied age filter.
 *
 * Input contract (CampsFilterPanel): blank age → `null`; non-empty invalid
 * parse → `NaN`; finite numbers (including non-integers) are stored as-is.
 * Follow-up: blank vs invalid is preserved via null vs NaN — not a raw string.
 */
export function resolveChildAgeFilter(
  draft: ListingAgeDraft | null | undefined,
): {
  applied: ChildAgeStatement | null;
  notice: string | null;
} {
  if (!draft) {
    return { applied: null, notice: null };
  }

  const rawAsOf = draft.asOfDate?.trim() ?? "";
  const hasAsOfInput = rawAsOf.length > 0;
  const asOfValid = hasAsOfInput && isIsoDateString(rawAsOf);

  const ageYears = draft.ageYears;
  // null/undefined = blank; NaN = invalid typed input; other numbers may be valid or not.
  const ageBlank = ageYears == null;
  const ageInvalidMarked =
    typeof ageYears === "number" && Number.isNaN(ageYears);
  const ageValid =
    typeof ageYears === "number" &&
    !Number.isNaN(ageYears) &&
    Number.isInteger(ageYears) &&
    Number.isFinite(ageYears) &&
    ageYears >= 0;
  const agePresentButInvalid =
    !ageBlank && !ageValid; // NaN, 7.5, -1, Infinity, etc.

  if (ageBlank && !hasAsOfInput) {
    return { applied: null, notice: null };
  }

  if (agePresentButInvalid || ageInvalidMarked) {
    return { applied: null, notice: AGE_FILTER_INVALID_AGE_NOTICE };
  }

  if (ageValid && asOfValid) {
    return {
      applied: { ageYears: ageYears as number, asOfDate: rawAsOf },
      notice: null,
    };
  }

  if (ageValid && !asOfValid) {
    return { applied: null, notice: AGE_FILTER_MISSING_DATE_NOTICE };
  }

  // Usable/blank age absent, reference date present (valid or not).
  if (ageBlank && hasAsOfInput) {
    return { applied: null, notice: AGE_FILTER_MISSING_AGE_NOTICE };
  }

  return { applied: null, notice: AGE_FILTER_MISSING_DATE_NOTICE };
}

/**
 * Filter groups we surface in the UI but cannot evaluate yet from provisional data.
 * Shown explicitly — never invented.
 */
export const UNSUPPORTED_LISTING_FILTERS: ReadonlyArray<{
  id: string;
  label: string;
  reason: string;
}> = [
  {
    id: "grade",
    label: "Grade eligibility",
    reason: "Grade bands are not modelled on sessions yet.",
  },
  {
    id: "distance",
    label: "Distance / map radius",
    reason: "Map search is out of v1 scope; neighbourhood/city filters are available.",
  },
  {
    id: "meals",
    label: "Meals included",
    reason: "Meal facts are not verified fields on CampSession.",
  },
  {
    id: "accreditation",
    label: "Accreditation / safety badges",
    reason: "Accreditation is a distinct verified attribute — not used as a browse filter yet.",
  },
];

export type ListingCatalog = {
  programs: CampProgram[];
  providers: Provider[];
  sessions: CampSession[];
  venuesById: Record<string, Venue>;
};

export type ListingProgramMatch = {
  program: CampProgram;
  provider: Provider;
  /** Ordered matching session IDs — identical set used for grouped and flat views. */
  matchingSessionIds: string[];
  matchingSessions: CampSession[];
};

export type ListingFlatRow = {
  program: CampProgram;
  provider: Provider;
  session: CampSession;
  matchingSessionIds: string[];
};

export type ListingResultSet = {
  /** Underlying matches after same-session filtering (before sort of display rows). */
  matches: ListingProgramMatch[];
  /** Programs with no verified session dates that remain reachable under active filters. */
  awaitingDates: ListingProgramMatch[];
  programCount: number;
  matchingSessionCount: number;
  awaitingDatesCount: number;
};

const TIMING_LABELS: Record<Exclude<TimingShortcutId, "all">, string[]> = {
  summer: ["summer"],
  march_break: ["march break"],
  winter_break: ["winter break"],
  pa_days: ["pa day", "pa days"],
  weekends: ["weekend", "weekends"],
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function sessionOverlapsDateRange(
  session: CampSession,
  dateFrom: string | null,
  dateTo: string | null,
): boolean {
  if (!dateFrom && !dateTo) return true;
  const start = session.startDate;
  if (!start) return false;
  const end = session.endDate ?? start;
  if (dateFrom && end < dateFrom) return false;
  if (dateTo && start > dateTo) return false;
  return true;
}

function timingMatches(
  session: CampSession,
  shortcut: TimingShortcutId,
): boolean {
  if (shortcut === "all") return true;
  const label = normalizeText(session.timingLabel ?? "");
  if (!label) return false;
  return TIMING_LABELS[shortcut].some((needle) => label.includes(needle));
}

function clockToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function sessionHoursSatisfy(
  session: CampSession,
  coreHoursStartMax: string | null,
  coreHoursEndMin: string | null,
): boolean {
  if (!coreHoursStartMax && !coreHoursEndMin) return true;
  if (!session.coreHoursStart || !session.coreHoursEnd) return false;
  const start = clockToMinutes(session.coreHoursStart);
  const end = clockToMinutes(session.coreHoursEnd);
  if (start == null || end == null) return false;
  if (coreHoursStartMax) {
    const maxStart = clockToMinutes(coreHoursStartMax);
    if (maxStart == null || start > maxStart) return false;
  }
  if (coreHoursEndMin) {
    const minEnd = clockToMinutes(coreHoursEndMin);
    if (minEnd == null || end < minEnd) return false;
  }
  return true;
}

function careOfferedYes(
  window: CampSession["beforeCare"] | CampSession["afterCare"],
): boolean {
  return window?.offered === "yes";
}

function keywordHaystack(
  program: CampProgram,
  provider: Provider,
  session: CampSession,
  venuesById: Record<string, Venue>,
): string {
  const venue = session.venueId ? venuesById[session.venueId] : null;
  return normalizeText(
    [
      program.name,
      program.description ?? "",
      program.primaryCategory ?? "",
      ...(program.secondaryThemes ?? []),
      provider.name,
      venue?.name ?? "",
      venue?.neighbourhood ?? "",
      venue?.city ?? "",
      session.timingLabel ?? "",
    ].join(" "),
  );
}

function programThemesMatch(program: CampProgram, themes: string[]): boolean {
  if (themes.length === 0) return true;
  const available = new Set(
    [program.primaryCategory, ...(program.secondaryThemes ?? [])]
      .filter(Boolean)
      .map((t) => normalizeText(String(t))),
  );
  return themes.some((t) => available.has(normalizeText(t)));
}

function locationMatches(
  session: CampSession,
  venuesById: Record<string, Venue>,
  locations: string[],
  venueIds: string[],
): boolean {
  if (locations.length === 0 && venueIds.length === 0) return true;
  if (venueIds.length > 0) {
    if (!session.venueId || !venueIds.includes(session.venueId)) return false;
  }
  if (locations.length === 0) return true;
  const venue = session.venueId ? venuesById[session.venueId] : null;
  if (!venue) return false;
  const labels = [venue.neighbourhood, venue.city, venue.name]
    .filter(Boolean)
    .map((v) => normalizeText(String(v)));
  return locations.some((loc) => labels.includes(normalizeText(loc)));
}

/**
 * True when every active filter condition passes on this single session
 * (plus its program/provider/venue context).
 */
export function sessionMatchesListingFilters(
  session: CampSession,
  program: CampProgram,
  provider: Provider,
  venuesById: Record<string, Venue>,
  filters: CampsListingFilters,
): boolean {
  if (filters.childAge) {
    const { applied } = resolveChildAgeFilter(filters.childAge);
    if (applied) {
      const ageResult = childMatchesSessionAge(session, applied);
      if (ageResult !== "match") return false;
    }
  }

  if (!sessionOverlapsDateRange(session, filters.dateFrom, filters.dateTo)) {
    return false;
  }

  if (!timingMatches(session, filters.timingShortcut)) {
    return false;
  }

  if (filters.scheduleFormats.length > 0) {
    if (
      !session.scheduleFormat ||
      !filters.scheduleFormats.includes(session.scheduleFormat)
    ) {
      return false;
    }
  }

  if (filters.stayTypes.length > 0) {
    if (!session.stayType || !filters.stayTypes.includes(session.stayType)) {
      return false;
    }
  }

  if (filters.priceMax != null) {
    if (
      typeof session.priceAmount !== "number" ||
      !session.priceUnit ||
      session.priceUnit === "unknown" ||
      !session.currency ||
      session.currency === "unknown"
    ) {
      return false;
    }
    if (filters.priceUnit && session.priceUnit !== filters.priceUnit) {
      return false;
    }
    if (session.priceAmount > filters.priceMax) return false;
  }

  if (
    !sessionHoursSatisfy(
      session,
      filters.coreHoursStartMax,
      filters.coreHoursEndMin,
    )
  ) {
    return false;
  }

  if (filters.requireBeforeCare && !careOfferedYes(session.beforeCare)) {
    return false;
  }
  if (filters.requireAfterCare && !careOfferedYes(session.afterCare)) {
    return false;
  }

  if (!locationMatches(session, venuesById, filters.locations, filters.venueIds)) {
    return false;
  }

  if (!programThemesMatch(program, filters.themes)) return false;

  if (filters.audiences.length > 0) {
    if (!program.audience || !filters.audiences.includes(program.audience)) {
      return false;
    }
  }

  if (filters.accessibilityTags.length > 0) {
    const tags = (program.accessibilitySupportTags ?? []).map(normalizeText);
    if (
      !filters.accessibilityTags.every((t) => tags.includes(normalizeText(t)))
    ) {
      return false;
    }
  }

  const kw = normalizeText(filters.keyword);
  if (kw) {
    if (!keywordHaystack(program, provider, session, venuesById).includes(kw)) {
      return false;
    }
  }

  return true;
}

/** Session-level constraints that would exclude programs with no dated sessions. */
export function hasActiveSessionLevelFilters(
  filters: CampsListingFilters,
): boolean {
  const ageApplied = resolveChildAgeFilter(filters.childAge).applied;
  return Boolean(
    ageApplied ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.timingShortcut !== "all" ||
      filters.scheduleFormats.length > 0 ||
      filters.stayTypes.length > 0 ||
      filters.priceMax != null ||
      filters.coreHoursStartMax ||
      filters.coreHoursEndMin ||
      filters.requireBeforeCare ||
      filters.requireAfterCare ||
      filters.locations.length > 0 ||
      filters.venueIds.length > 0,
  );
}

function programPassesNonSessionFilters(
  program: CampProgram,
  provider: Provider,
  filters: CampsListingFilters,
): boolean {
  if (!programThemesMatch(program, filters.themes)) return false;
  if (filters.audiences.length > 0) {
    if (!program.audience || !filters.audiences.includes(program.audience)) {
      return false;
    }
  }
  if (filters.accessibilityTags.length > 0) {
    const tags = (program.accessibilitySupportTags ?? []).map(normalizeText);
    if (
      !filters.accessibilityTags.every((t) => tags.includes(normalizeText(t)))
    ) {
      return false;
    }
  }
  const kw = normalizeText(filters.keyword);
  if (kw) {
    const hay = normalizeText(
      [
        program.name,
        program.description ?? "",
        program.primaryCategory ?? "",
        ...(program.secondaryThemes ?? []),
        provider.name,
      ].join(" "),
    );
    if (!hay.includes(kw)) return false;
  }
  return true;
}

function sortSessions(sessions: CampSession[], sort: ListingSortId): CampSession[] {
  const copy = [...sessions];
  copy.sort((a, b) => {
    if (sort === "price_asc") {
      const ap = typeof a.priceAmount === "number" ? a.priceAmount : Number.POSITIVE_INFINITY;
      const bp = typeof b.priceAmount === "number" ? b.priceAmount : Number.POSITIVE_INFINITY;
      if (ap !== bp) return ap - bp;
    }
    if (sort === "soonest_start" || sort === "price_asc") {
      const as = a.startDate ?? "9999-99-99";
      const bs = b.startDate ?? "9999-99-99";
      if (as !== bs) return as < bs ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });
  return copy;
}

export function buildListingResults(
  catalog: ListingCatalog,
  filters: CampsListingFilters,
  options?: { sort?: ListingSortId },
): ListingResultSet {
  const sort = options?.sort ?? "soonest_start";
  const providersById = Object.fromEntries(
    catalog.providers.map((p) => [p.id, p]),
  );
  const sessionsByProgram = new Map<string, CampSession[]>();
  for (const session of catalog.sessions) {
    const list = sessionsByProgram.get(session.programId) ?? [];
    list.push(session);
    sessionsByProgram.set(session.programId, list);
  }

  const matches: ListingProgramMatch[] = [];
  const awaitingDates: ListingProgramMatch[] = [];

  for (const program of catalog.programs) {
    const provider = providersById[program.providerId];
    if (!provider) continue;

    const programSessions = sessionsByProgram.get(program.id) ?? [];
    const matching = sortSessions(
      programSessions.filter((session) =>
        sessionMatchesListingFilters(
          session,
          program,
          provider,
          catalog.venuesById,
          filters,
        ),
      ),
      sort,
    );

    if (matching.length > 0) {
      matches.push({
        program,
        provider,
        matchingSessionIds: matching.map((s) => s.id),
        matchingSessions: matching,
      });
      continue;
    }

    // Programs awaiting verified dates — reachable in grouped view only when
    // no session-level filter rules them out.
    if (
      programSessions.length === 0 &&
      !hasActiveSessionLevelFilters(filters) &&
      programPassesNonSessionFilters(program, provider, filters)
    ) {
      awaitingDates.push({
        program,
        provider,
        matchingSessionIds: [],
        matchingSessions: [],
      });
    }
  }

  matches.sort((a, b) => {
    if (sort === "name_asc") {
      return a.program.name.localeCompare(b.program.name);
    }
    if (sort === "price_asc") {
      const ap = a.matchingSessions[0]?.priceAmount;
      const bp = b.matchingSessions[0]?.priceAmount;
      const an = typeof ap === "number" ? ap : Number.POSITIVE_INFINITY;
      const bn = typeof bp === "number" ? bp : Number.POSITIVE_INFINITY;
      if (an !== bn) return an - bn;
    }
    const as = a.matchingSessions[0]?.startDate ?? "9999-99-99";
    const bs = b.matchingSessions[0]?.startDate ?? "9999-99-99";
    if (as !== bs) return as < bs ? -1 : 1;
    return a.program.name.localeCompare(b.program.name);
  });

  if (sort === "name_asc") {
    awaitingDates.sort((a, b) => a.program.name.localeCompare(b.program.name));
  }

  const matchingSessionCount = matches.reduce(
    (n, m) => n + m.matchingSessionIds.length,
    0,
  );

  return {
    matches,
    awaitingDates,
    programCount: matches.length,
    matchingSessionCount,
    awaitingDatesCount: awaitingDates.length,
  };
}

/** Flat rows share the same matchingSessionIds as the grouped match for that program. */
export function toFlatRows(results: ListingResultSet): ListingFlatRow[] {
  const rows: ListingFlatRow[] = [];
  for (const match of results.matches) {
    for (const session of match.matchingSessions) {
      rows.push({
        program: match.program,
        provider: match.provider,
        session,
        matchingSessionIds: match.matchingSessionIds,
      });
    }
  }
  return rows;
}

export function formatListingCounts(results: ListingResultSet): string {
  const camps = results.programCount;
  const sessions = results.matchingSessionCount;
  const campWord = camps === 1 ? "camp" : "camps";
  const sessionWord = sessions === 1 ? "matching session" : "matching sessions";
  let label = `${camps} ${campWord} · ${sessions} ${sessionWord}`;
  if (results.awaitingDatesCount > 0) {
    const awaitingWord =
      results.awaitingDatesCount === 1 ? "camp" : "camps";
    label += ` · ${results.awaitingDatesCount} ${awaitingWord} awaiting dates`;
  }
  return label;
}

export function countActiveFilters(filters: CampsListingFilters): number {
  let n = 0;
  if (filters.keyword.trim()) n += 1;
  if (resolveChildAgeFilter(filters.childAge).applied) n += 1;
  if (filters.dateFrom || filters.dateTo) n += 1;
  if (filters.timingShortcut !== "all") n += 1;
  if (filters.themes.length) n += 1;
  if (filters.scheduleFormats.length) n += 1;
  if (filters.audiences.length) n += 1;
  if (filters.accessibilityTags.length) n += 1;
  if (filters.locations.length || filters.venueIds.length) n += 1;
  if (filters.priceMax != null) n += 1;
  if (filters.coreHoursStartMax || filters.coreHoursEndMin) n += 1;
  if (filters.requireBeforeCare || filters.requireAfterCare) n += 1;
  if (filters.stayTypes.length) n += 1;
  return n;
}

/** Listing UI state that must survive detail → back. */
export type CampsListingUrlState = {
  filters: CampsListingFilters;
  sort: ListingSortId;
  groupByProgram: boolean;
};

const SORT_IDS: ListingSortId[] = ["soonest_start", "price_asc", "name_asc"];
const TIMING_IDS: TimingShortcutId[] = [
  "all",
  "summer",
  "march_break",
  "winter_break",
  "pa_days",
  "weekends",
];

function csv(values: string[]): string | null {
  return values.length ? values.join(",") : null;
}

function splitCsv(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Serialize listing search/filters/sort/grouping into `/camps?...`.
 * Used for the address bar and as the detail `from` return path.
 */
export function buildListingHref(state: CampsListingUrlState): string {
  const p = new URLSearchParams();
  const f = state.filters;
  if (f.keyword.trim()) p.set("q", f.keyword.trim());
  if (f.childAge?.ageYears != null && !Number.isNaN(f.childAge.ageYears)) {
    p.set("age", String(f.childAge.ageYears));
  }
  if (f.childAge?.asOfDate) p.set("ageAsOf", f.childAge.asOfDate);
  if (f.dateFrom) p.set("df", f.dateFrom);
  if (f.dateTo) p.set("dt", f.dateTo);
  if (f.timingShortcut !== "all") p.set("timing", f.timingShortcut);
  const themes = csv(f.themes);
  if (themes) p.set("themes", themes);
  const formats = csv(f.scheduleFormats);
  if (formats) p.set("formats", formats);
  const audiences = csv(f.audiences);
  if (audiences) p.set("audiences", audiences);
  const access = csv(f.accessibilityTags);
  if (access) p.set("access", access);
  const locs = csv(f.locations);
  if (locs) p.set("loc", locs);
  const venues = csv(f.venueIds);
  if (venues) p.set("venues", venues);
  if (f.priceMax != null) p.set("priceMax", String(f.priceMax));
  if (f.priceUnit) p.set("priceUnit", f.priceUnit);
  if (f.coreHoursStartMax) p.set("hrsStart", f.coreHoursStartMax);
  if (f.coreHoursEndMin) p.set("hrsEnd", f.coreHoursEndMin);
  if (f.requireBeforeCare) p.set("before", "1");
  if (f.requireAfterCare) p.set("after", "1");
  const stays = csv(f.stayTypes);
  if (stays) p.set("stay", stays);
  if (state.sort !== "soonest_start") p.set("sort", state.sort);
  p.set("group", state.groupByProgram ? "1" : "0");
  const qs = p.toString();
  return qs ? `/camps?${qs}` : "/camps";
}

/**
 * Hydrate listing state from `/camps` query params (e.g. after Back from detail).
 * Unknown keys are ignored; invalid enums fall back to defaults.
 */
export function parseListingHrefSearch(
  search: string | URLSearchParams,
): CampsListingUrlState {
  const p =
    typeof search === "string"
      ? new URLSearchParams(
          search.startsWith("?") ? search.slice(1) : search,
        )
      : search;

  const ageRaw = p.get("age");
  let ageYears: number | null = null;
  if (ageRaw != null && ageRaw.trim() !== "") {
    const n = Number(ageRaw);
    ageYears = Number.isFinite(n) ? n : Number.NaN;
  }
  const ageAsOf = p.get("ageAsOf");
  const childAge =
    ageYears != null || ageAsOf
      ? { ageYears, asOfDate: ageAsOf || null }
      : null;

  const timingRaw = p.get("timing") as TimingShortcutId | null;
  const timingShortcut =
    timingRaw && TIMING_IDS.includes(timingRaw) ? timingRaw : "all";

  const sortRaw = p.get("sort") as ListingSortId | null;
  const sort =
    sortRaw && SORT_IDS.includes(sortRaw) ? sortRaw : "soonest_start";

  const groupParam = p.get("group");
  const groupByProgram = groupParam == null ? true : groupParam !== "0";

  const priceMaxRaw = p.get("priceMax");
  let priceMax: number | null = null;
  if (priceMaxRaw != null && priceMaxRaw.trim() !== "") {
    const n = Number(priceMaxRaw);
    priceMax = Number.isFinite(n) ? n : null;
  }

  const filters: CampsListingFilters = {
    ...EMPTY_LISTING_FILTERS,
    keyword: p.get("q")?.trim() ?? "",
    childAge,
    dateFrom: p.get("df"),
    dateTo: p.get("dt"),
    timingShortcut,
    themes: splitCsv(p.get("themes")),
    scheduleFormats: splitCsv(p.get("formats")) as CampSessionScheduleFormat[],
    audiences: splitCsv(p.get("audiences")) as NonNullable<
      CampProgram["audience"]
    >[],
    accessibilityTags: splitCsv(p.get("access")),
    locations: splitCsv(p.get("loc")),
    venueIds: splitCsv(p.get("venues")),
    priceMax,
    priceUnit: (p.get("priceUnit") as PriceUnit | null) || null,
    coreHoursStartMax: p.get("hrsStart"),
    coreHoursEndMin: p.get("hrsEnd"),
    requireBeforeCare: p.get("before") === "1",
    requireAfterCare: p.get("after") === "1",
    stayTypes: splitCsv(p.get("stay")) as CampStayType[],
  };

  return { filters, sort, groupByProgram };
}

