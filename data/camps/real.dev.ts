/**
 * DEV ONLY — real Mississauga camp preview data (not fictional fixtures).
 *
 * Authorized local preview for candidate MSC-0201 only:
 * Nutty Scientists Canada — Nutty Summer Science Camp.
 *
 * Facts below were re-checked against the provider’s public summer camp page
 * (https://nuttyscientistscanada.ca/summercamp) on 2026-08-30.
 * Internal research / inspector notes are intentionally omitted.
 *
 * Access only via lib/camps/realDevCatalog.ts — never treat as production seed.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";

export const DEV_ONLY_REAL_CAMPS_CATALOG = true as const;

export const REAL_DEV_SOURCE_CANDIDATE_ID = "MSC-0201" as const;
export const REAL_DEV_SOURCE_CHECKED_DATE = "2026-08-30" as const;
export const REAL_DEV_SOURCE_URL =
  "https://nuttyscientistscanada.ca/summercamp" as const;

const REG_URL_AGES_5_7 = "https://forms.gle/SGgvXZddvprHFjGC9";
const REG_URL_AGES_8_10 = "https://forms.gle/UGMUaLXtnTWxbHNz9";

export const realDevProviders: Provider[] = [
  {
    id: "prov-nutty-scientists-canada",
    name: "Nutty Scientists Canada",
    websiteUrl: "https://nuttyscientistscanada.ca/",
    registrationInfoUrl: "https://nuttyscientistscanada.ca/register-program",
  },
];

export const realDevVenues: Venue[] = [
  {
    id: "venue-vic-johnson-community-centre",
    name: "Vic Johnson Community Centre",
    // Neighbourhood ≠ city — keep distinct in filters and labels.
    neighbourhood: "Streetsville",
    addressLine: "335 Church Street",
    city: "Mississauga",
    province: "ON",
    postalCode: "L5M 1N1",
  },
];

export const realDevPrograms: CampProgram[] = [
  {
    id: "prog-nutty-summer-science-camp",
    slug: "nutty-summer-science-camp",
    providerId: "prov-nutty-scientists-canada",
    name: "Nutty Summer Science Camp",
    description:
      "Drop-off STEAM summer camp with hands-on experiments, themed science topics each week, and age-grouped sessions.",
    primaryCategory: "STEM",
    secondaryThemes: ["Science", "Hands-on experiments"],
    // Descriptive only — session rows carry exact eligibility.
    typicalAgeMin: 5,
    typicalAgeMax: 10,
    typicalAgeMinInclusive: true,
    typicalAgeMaxInclusive: true,
    audience: "child_only",
    experienceSummary:
      "Daily mix of STEM learning, hands-on experiments, Nutty Facts discussion, worksheets/games/crafts, and free play. Campers bring their own lunch and snack.",
    prerequisites: null,
    supportInfo:
      "The provider may share group allergy or food notices after you register — confirm directly with them.",
    policiesSummary:
      "Refund and fee-change rules are on the provider’s summer camp page — confirm before paying.",
    packingItems: [
      { text: "Own lunch and snack each camp day", kind: "required" },
    ],
    preparationNotes:
      "Early drop-off (from 9:30) and extended pick-up (until 16:30) are available by advance request with registration for an additional hourly fee.",
    imageSrc:
      "https://d101qgvxw5fp3p.cloudfront.net/site/99009108/assets/uploads/pageuploads/20260208092325-1.png",
    imageAlt: "Nutty Scientists Canada summer science camp activities",
  },
];

/**
 * Provider lists month/day windows only (e.g. “July 6th - 10th”) with no
 * calendar year on the public page. Do not invent YYYY-MM-DD start/end.
 */
function weekSession(input: {
  id: string;
  /** Source month/day window only — year not stated on the provider page. */
  listedDateWindow: string;
  ageMin: number;
  ageMax: number;
  registrationUrl: string;
}): CampSession {
  return {
    id: input.id,
    programId: "prog-nutty-summer-science-camp",
    venueId: "venue-vic-johnson-community-centre",
    startDate: null,
    endDate: null,
    timingLabel: "Summer",
    // Parent-facing date copy when ISO year is unverified (see formatSessionDatesLabel).
    notes: `Listed dates: ${input.listedDateWindow} (year not yet verified)`,
    scheduleFormat: "full_day",
    stayType: "day",
    deliveryMode: "in_person",
    coreHoursStart: "10:30",
    coreHoursEnd: "16:00",
    beforeCare: {
      offered: "yes",
      startTime: "09:30",
      endTime: "10:30",
      separateBookingRequired: "yes",
    },
    afterCare: {
      offered: "yes",
      startTime: "16:00",
      endTime: "16:30",
      separateBookingRequired: "yes",
    },
    // Exact 1-week list price on the source page (+ tax).
    priceAmount: 399,
    priceUnit: "per_week",
    currency: "CAD",
    feeNotes:
      "+ tax. Also listed: 2-week CAD $599 + tax; 1-day CAD $105 + tax — confirm which option when registering.",
    // Lifecycle cannot be proven open/closed per week without a verified year.
    // Keep registration URLs; capacity stays unknown (no scarcity claims).
    registrationStatus: "availability_unknown",
    registrationUrl: input.registrationUrl,
    sourceUrl: REAL_DEV_SOURCE_URL,
    sourceCheckedDate: REAL_DEV_SOURCE_CHECKED_DATE,
    providerConfirmed: false,
    seatAvailability: "unknown",
    ageMin: input.ageMin,
    ageMax: input.ageMax,
    ageMinInclusive: true,
    ageMaxInclusive: true,
    ageAssessmentRule: "unknown",
  };
}

/**
 * Eight week sessions from the provider page (month/day + age band only).
 * Registration URLs remain age-band specific; lifecycle is availability_unknown
 * until a calendar year is source-verified.
 */
export const realDevSessions: CampSession[] = [
  weekSession({
    id: "sess-nutty-july-6-10-ages-5-7",
    listedDateWindow: "July 6–10",
    ageMin: 5,
    ageMax: 7,
    registrationUrl: REG_URL_AGES_5_7,
  }),
  weekSession({
    id: "sess-nutty-july-13-17-ages-5-7",
    listedDateWindow: "July 13–17",
    ageMin: 5,
    ageMax: 7,
    registrationUrl: REG_URL_AGES_5_7,
  }),
  weekSession({
    id: "sess-nutty-july-20-24-ages-8-10",
    listedDateWindow: "July 20–24",
    ageMin: 8,
    ageMax: 10,
    registrationUrl: REG_URL_AGES_8_10,
  }),
  weekSession({
    id: "sess-nutty-july-27-31-ages-8-10",
    listedDateWindow: "July 27–31",
    ageMin: 8,
    ageMax: 10,
    registrationUrl: REG_URL_AGES_8_10,
  }),
  weekSession({
    id: "sess-nutty-aug-3-7-ages-5-7",
    listedDateWindow: "August 3–7",
    ageMin: 5,
    ageMax: 7,
    registrationUrl: REG_URL_AGES_5_7,
  }),
  weekSession({
    id: "sess-nutty-aug-10-14-ages-5-7",
    listedDateWindow: "August 10–14",
    ageMin: 5,
    ageMax: 7,
    registrationUrl: REG_URL_AGES_5_7,
  }),
  weekSession({
    id: "sess-nutty-aug-17-21-ages-8-10",
    listedDateWindow: "August 17–21",
    ageMin: 8,
    ageMax: 10,
    registrationUrl: REG_URL_AGES_8_10,
  }),
  weekSession({
    id: "sess-nutty-aug-24-28-ages-8-10",
    listedDateWindow: "August 24–28",
    ageMin: 8,
    ageMax: 10,
    registrationUrl: REG_URL_AGES_8_10,
  }),
];
