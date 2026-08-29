/**
 * DEV ONLY — real Mississauga camp preview data (not fictional fixtures).
 *
 * Authorized local preview for candidate MSC-0201 only:
 * Nutty Scientists Canada — Nutty Summer Science Camp.
 *
 * Facts below were checked against the provider’s public summer camp page
 * (https://nuttyscientistscanada.ca/summercamp) on 2026-08-28.
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
export const REAL_DEV_SOURCE_CHECKED_DATE = "2026-08-28" as const;
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
      "Allergy or food restriction notices may be shared with the group after registration — confirm with the provider.",
    policiesSummary:
      "Refund and fee-change rules are published by the provider on their summer camp page — confirm before paying.",
    packingItems: [
      { text: "Own lunch and snack each camp day", kind: "required" },
    ],
    preparationNotes:
      "Early drop-off (from 9:30) and extended pick-up (until 16:30) are available by advance request for an extra hourly fee — arrange with registration.",
    imageSrc:
      "https://d101qgvxw5fp3p.cloudfront.net/site/99009108/assets/uploads/pageuploads/20260208092325-1.png",
    imageAlt: "Nutty Scientists Canada summer science camp activities",
  },
];

function weekSession(input: {
  id: string;
  startDate: string;
  endDate: string;
  ageMin: number;
  ageMax: number;
  registrationUrl: string;
  registrationStatus: CampSession["registrationStatus"];
}): CampSession {
  return {
    id: input.id,
    programId: "prog-nutty-summer-science-camp",
    venueId: "venue-vic-johnson-community-centre",
    startDate: input.startDate,
    endDate: input.endDate,
    timingLabel: "Summer",
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
    // Verified 1-week list price; 2-week / 1-day options exist — not invented as this row's unit.
    priceAmount: 399,
    priceUnit: "per_week",
    currency: "CAD",
    feeNotes:
      "CAD $399 + tax for one week (provider-listed). Also offers 2-week (CAD $599 + tax) and 1-day (CAD $105 + tax) options — confirm which applies when registering.",
    registrationStatus: input.registrationStatus,
    registrationUrl: input.registrationUrl,
    sourceUrl: REAL_DEV_SOURCE_URL,
    sourceCheckedDate: REAL_DEV_SOURCE_CHECKED_DATE,
    providerConfirmed: false,
    // Provider marketing mentions limited seats — do not encode scarcity claims.
    seatAvailability: "unknown",
    ageMin: input.ageMin,
    ageMax: input.ageMax,
    ageMinInclusive: true,
    ageMaxInclusive: true,
    // Assessment rule not stated on the public page.
    ageAssessmentRule: "unknown",
  };
}

/**
 * Eight week-long sessions listed on the provider page with explicit dates
 * and age groups. Registration status uses end-date vs source-check day
 * (2026-08-28): ended weeks are closed; the week ending that day stays open
 * on the provider page.
 */
export const realDevSessions: CampSession[] = [
  weekSession({
    id: "sess-nutty-2026-07-06-ages-5-7",
    startDate: "2026-07-06",
    endDate: "2026-07-10",
    ageMin: 5,
    ageMax: 7,
    registrationUrl: REG_URL_AGES_5_7,
    registrationStatus: "registration_closed",
  }),
  weekSession({
    id: "sess-nutty-2026-07-13-ages-5-7",
    startDate: "2026-07-13",
    endDate: "2026-07-17",
    ageMin: 5,
    ageMax: 7,
    registrationUrl: REG_URL_AGES_5_7,
    registrationStatus: "registration_closed",
  }),
  weekSession({
    id: "sess-nutty-2026-07-20-ages-8-10",
    startDate: "2026-07-20",
    endDate: "2026-07-24",
    ageMin: 8,
    ageMax: 10,
    registrationUrl: REG_URL_AGES_8_10,
    registrationStatus: "registration_closed",
  }),
  weekSession({
    id: "sess-nutty-2026-07-27-ages-8-10",
    startDate: "2026-07-27",
    endDate: "2026-07-31",
    ageMin: 8,
    ageMax: 10,
    registrationUrl: REG_URL_AGES_8_10,
    registrationStatus: "registration_closed",
  }),
  weekSession({
    id: "sess-nutty-2026-08-03-ages-5-7",
    startDate: "2026-08-03",
    endDate: "2026-08-07",
    ageMin: 5,
    ageMax: 7,
    registrationUrl: REG_URL_AGES_5_7,
    registrationStatus: "registration_closed",
  }),
  weekSession({
    id: "sess-nutty-2026-08-10-ages-5-7",
    startDate: "2026-08-10",
    endDate: "2026-08-14",
    ageMin: 5,
    ageMax: 7,
    registrationUrl: REG_URL_AGES_5_7,
    registrationStatus: "registration_closed",
  }),
  weekSession({
    id: "sess-nutty-2026-08-17-ages-8-10",
    startDate: "2026-08-17",
    endDate: "2026-08-21",
    ageMin: 8,
    ageMax: 10,
    registrationUrl: REG_URL_AGES_8_10,
    registrationStatus: "registration_closed",
  }),
  weekSession({
    id: "sess-nutty-2026-08-24-ages-8-10",
    startDate: "2026-08-24",
    endDate: "2026-08-28",
    ageMin: 8,
    ageMax: 10,
    registrationUrl: REG_URL_AGES_8_10,
    registrationStatus: "registration_open",
  }),
];
