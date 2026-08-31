/**
 * Provisional Camps domain types for UI foundation work.
 *
 * SOURCE OF TRUTH for product behavior: docs/camps/compass-camps-page-spec.md
 * These shapes are provisional until reconciled with the Camp Research Master
 * workbook / database schema. Do not treat field names as confirmed columns.
 *
 * Hard rules baked into the model:
 * - Provider, CampProgram, CampSession, and Venue stay distinct records.
 * - Registration status is not seat availability.
 * - Unknown is preserved (omit, null, or explicit "unknown") — never invent
 *   scarcity, ratings, or unverified verification claims.
 */

/** Tri-state for confirmed facts where Yes / No / Unknown must stay distinct. */
export type ConfirmedTriState = "yes" | "no" | "unknown";

/**
 * Registration / lifecycle state for a session.
 *
 * The spec's five "Registration status → action" rows are *display situations*
 * (open, no dates, waitlist, not yet open, unknown) — not an exhaustive list
 * of every underlying lifecycle value. `registration_closed` is an additional
 * lifecycle fact: registration no longer accepts new entries, even when seats
 * remain. Does not encode seat scarcity (e.g. no "filling fast").
 */
export type CampRegistrationStatus =
  | "registration_open"
  | "registration_closed"
  | "no_upcoming_dates"
  | "waitlist"
  | "not_yet_open"
  | "availability_unknown";

/**
 * Seat / capacity fact only — independent of registration lifecycle.
 * Prefer "unknown" until verified. Do not invent scarcity labels.
 * Closure of registration belongs on CampRegistrationStatus
 * (`registration_closed`), not here.
 */
export type SeatAvailabilityFact =
  | "unknown"
  | "confirmed_available"
  | "confirmed_full";

export type PriceUnit =
  | "per_day"
  | "per_week"
  | "full_program"
  | "per_session"
  | "other"
  | "unknown";

export type CampCurrency = "CAD" | "USD" | "unknown";

/** Day-length / session cadence — keep distinct from overnight and delivery. */
export type CampSessionScheduleFormat =
  | "full_day"
  | "half_day"
  | "short_session"
  | "single_day"
  | "weekly"
  | "multiweek"
  | "other"
  | "unknown";

/** Day vs overnight — separate from schedule format and delivery mode. */
export type CampStayType = "day" | "overnight" | "unknown";

/** In-person vs online — separate from schedule format and stay type. */
export type CampDeliveryMode = "in_person" | "online" | "unknown";

export type CampAudience =
  | "child_only"
  | "parent_and_child"
  | "family"
  | "other"
  | "unknown";

export type Provider = {
  id: string;
  name: string;
  /** Public marketing / info site when known. */
  websiteUrl?: string | null;
  /** Official registration or inquiry URL when known. */
  registrationInfoUrl?: string | null;
  notes?: string | null;
};

export type Venue = {
  id: string;
  name: string;
  /** Neighbourhood or area label for cards when address is too long. */
  neighbourhood?: string | null;
  addressLine?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  /**
   * Coordinates only when verified. Omit rather than inventing.
   * Online / off-site serving Mississauga should be labelled in UI, not guessed here.
   */
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

/**
 * How a provider assesses child age for exact session eligibility.
 * - as_of_date: use the session's ageAssessedAtDate (ISO YYYY-MM-DD)
 * - as_of_session_start: use the session's startDate
 * - unknown / omit: a child-age query cannot be proven (do not assume today)
 *
 * Age unit: whole years (non-negative integers). Fractional ages are not supported.
 */
export type CampAgeAssessmentRule =
  | "as_of_date"
  | "as_of_session_start"
  | "unknown";

/** Packing line for detail "what to bring" — required vs suggested stay distinct. */
export type CampPackingItem = {
  text: string;
  kind: "required" | "suggested";
};

export type CampProgram = {
  id: string;
  /** Stable slug for future /camps/[slug] — provisional until schema reconcile. */
  slug: string;
  providerId: string;
  name: string;
  description?: string | null;
  /** Approved primary theme/category. */
  primaryCategory?: string | null;
  /** Secondary themes (array). Do not invent taxonomy values. */
  secondaryThemes?: string[];
  /**
   * Typical / descriptive age band for the program only.
   * NEVER copied into session eligibility or used as qualification fallback.
   * Exact eligibility lives on CampSession (flat age* fields) — not inherited here.
   */
  typicalAgeMin?: number | null;
  typicalAgeMax?: number | null;
  /** Descriptive inclusive/exclusive flags for typical program ages — not session proof. */
  typicalAgeMinInclusive?: boolean | null;
  typicalAgeMaxInclusive?: boolean | null;
  /** Descriptive only when present on the program — not used for session matching. */
  typicalAgeAssessedAtDate?: string | null;
  audience?: CampAudience | null;
  /** Provider-confirmed accessibility / support tags — not a generic "inclusive" badge. */
  accessibilitySupportTags?: string[];
  imageSrc?: string | null;
  imageAlt?: string | null;
  /**
   * Detail-page narrative sections. Omit / empty ⇒ UI shows explicit unknown —
   * never invent experience, requirements, or packing lists.
   */
  experienceSummary?: string | null;
  /** Provider-confirmed prerequisites only when verified. */
  prerequisites?: string[] | null;
  supportInfo?: string | null;
  policiesSummary?: string | null;
  /**
   * Packing / what-to-bring. Keep required vs suggested distinct —
   * never label suggested items as required.
   */
  packingItems?: CampPackingItem[] | null;
  preparationNotes?: string | null;
  notes?: string | null;
};

export type CareWindow = {
  offered: ConfirmedTriState;
  /** Actual clock times when known (e.g. "07:30"). Omit when unknown. */
  startTime?: string | null;
  endTime?: string | null;
  /** Whether care requires a separate booking — unknown is not no. */
  separateBookingRequired?: ConfirmedTriState;
};

export type CampSession = {
  id: string;
  programId: string;
  venueId?: string | null;
  /** Inclusive session start date (ISO YYYY-MM-DD) when verified. */
  startDate?: string | null;
  /** Inclusive session end date (ISO YYYY-MM-DD) when verified. */
  endDate?: string | null;
  /** School-break or seasonal label when applicable — distinct from raw dates. */
  timingLabel?: string | null;
  scheduleFormat?: CampSessionScheduleFormat | null;
  stayType?: CampStayType | null;
  deliveryMode?: CampDeliveryMode | null;
  coreHoursStart?: string | null;
  coreHoursEnd?: string | null;
  beforeCare?: CareWindow | null;
  afterCare?: CareWindow | null;
  priceAmount?: number | null;
  priceUnit?: PriceUnit | null;
  currency?: CampCurrency | null;
  /** Disclosed mandatory or optional fee notes — unknown fees are not zero. */
  feeNotes?: string | null;
  /**
   * Registration / lifecycle state for this session.
   * Spec table rows are display situations; may include registration_closed.
   * Independent of seatAvailability (capacity only).
   */
  registrationStatus: CampRegistrationStatus;
  /** Confirmed registration opening date when status is not_yet_open. */
  registrationOpensOn?: string | null;
  /** Waitlist URL only when the provider explicitly offers one. */
  waitlistUrl?: string | null;
  /** Outbound registration / info link for this session when known. */
  registrationUrl?: string | null;
  sourceUrl?: string | null;
  /** ISO date (YYYY-MM-DD) when the source was checked. */
  sourceCheckedDate?: string | null;
  /** True only when the provider confirmed the fact — distinct from source-checked. */
  providerConfirmed?: boolean | null;
  /**
   * Capacity fact only — separate from registrationStatus lifecycle.
   * Defaults conceptually to unknown; never invent "filling fast".
   * Do not store registration closure here.
   */
  seatAvailability?: SeatAvailabilityFact | null;
  /**
   * Exact session eligibility in whole years (flat fields; same names as program).
   * Missing bounds, inclusive flags, or assessment rule/date ⇒ unknown — not eligible.
   * Program-level ages must never fill these in at match time.
   */
  ageMin?: number | null;
  ageMax?: number | null;
  ageMinInclusive?: boolean | null;
  ageMaxInclusive?: boolean | null;
  /** Provider cutoff date (ISO YYYY-MM-DD) when ageAssessmentRule is as_of_date. */
  ageAssessedAtDate?: string | null;
  /**
   * Explicit assessment rule. Omit/unknown ⇒ child-age queries return unknown
   * (do not assume "today" or invent a birthday / DOB).
   */
  ageAssessmentRule?: CampAgeAssessmentRule | null;
  notes?: string | null;
};

/** Convenience aggregate for UI work once pages exist — not a DB table. */
export type CampProgramWithRelations = {
  program: CampProgram;
  provider: Provider;
  sessions: CampSession[];
  venuesById: Record<string, Venue>;
};
