/**
 * DEV ONLY — synthetic fixtures for type-checking and future UI previews.
 *
 * Not production directory data. Do not import from public pages, API routes,
 * or Supabase seeding without an explicit development-preview gate.
 * Names, prices, and statuses are fictional.
 *
 * Access ONLY via lib/camps/devFixtures.ts (`loadCampsDevFixtures` /
 * `requireCampsDevFixtures`). Direct imports from production UI are unsupported.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";

export const DEV_ONLY_CAMPS_FIXTURES = true as const;

export const campsDevProviders: Provider[] = [
  {
    id: "prov-dev-oakridge",
    name: "Oakridge Community Centre (dev)",
    websiteUrl: "https://example.invalid/oakridge",
    registrationInfoUrl: "https://example.invalid/oakridge/register",
  },
  {
    id: "prov-dev-harbour",
    name: "Harbour Arts Collective (dev)",
    websiteUrl: "https://example.invalid/harbour",
  },
];

export const campsDevVenues: Venue[] = [
  {
    id: "venue-dev-oakridge-main",
    name: "Oakridge Community Centre",
    neighbourhood: "Erin Mills",
    addressLine: "123 Example Rd",
    city: "Mississauga",
    province: "ON",
  },
  {
    id: "venue-dev-port-credit",
    name: "Port Credit Lakeside Studio (dev)",
    neighbourhood: "Port Credit",
    addressLine: "45 Lakeshore Example Blvd",
    city: "Mississauga",
    province: "ON",
  },
  {
    id: "venue-dev-city-centre",
    name: "City Centre Studio B (dev)",
    neighbourhood: "City Centre",
    addressLine: "100 Civic Example Way",
    city: "Mississauga",
    province: "ON",
  },
];

export const campsDevPrograms: CampProgram[] = [
  {
    id: "prog-dev-stem-explorers",
    slug: "stem-explorers-dev",
    providerId: "prov-dev-oakridge",
    name: "STEM Explorers (dev fixture)",
    description:
      "Fictional STEM week used to exercise mixed registration states and pricing.",
    primaryCategory: "STEM",
    secondaryThemes: ["Robotics"],
    ageMin: 7,
    ageMax: 12,
    ageMinInclusive: true,
    ageMaxInclusive: true,
    ageAssessedAtDate: "2026-07-01",
    audience: "child_only",
    accessibilitySupportTags: [],
  },
  {
    id: "prog-dev-art-trail",
    slug: "art-trail-multi-venue-dev",
    providerId: "prov-dev-harbour",
    name: "Art Trail Week (dev fixture)",
    description:
      "Fictional arts program with sessions at two Mississauga venues.",
    primaryCategory: "Arts",
    secondaryThemes: ["Visual arts"],
    ageMin: 5,
    ageMax: 10,
    ageMinInclusive: true,
    ageMaxInclusive: true,
    ageAssessedAtDate: "2026-07-01",
    audience: "child_only",
  },
  {
    id: "prog-dev-missing-info",
    slug: "nature-walks-missing-info-dev",
    providerId: "prov-dev-oakridge",
    name: "Nature Walks (dev missing-info)",
    description: "Fictional stub with unknown venue and price facts.",
    primaryCategory: "Outdoors",
    ageMin: 4,
    ageMax: 8,
    audience: "parent_and_child",
  },
];

export const campsDevSessions: CampSession[] = [
  // Mixed-status STEM program — three matching sessions
  {
    id: "sess-dev-stem-w1",
    programId: "prog-dev-stem-explorers",
    venueId: "venue-dev-oakridge-main",
    startDate: "2026-07-06",
    endDate: "2026-07-10",
    timingLabel: "Summer",
    scheduleFormat: "full_day",
    stayType: "day",
    deliveryMode: "in_person",
    coreHoursStart: "09:00",
    coreHoursEnd: "16:00",
    beforeCare: {
      offered: "yes",
      startTime: "07:30",
      endTime: "09:00",
      separateBookingRequired: "unknown",
    },
    afterCare: {
      offered: "yes",
      startTime: "16:00",
      endTime: "18:00",
      separateBookingRequired: "unknown",
    },
    priceAmount: 285,
    priceUnit: "per_week",
    currency: "CAD",
    registrationStatus: "registration_open",
    registrationUrl: "https://example.invalid/oakridge/stem",
    sourceUrl: "https://example.invalid/oakridge/stem",
    sourceCheckedDate: "2026-08-01",
    providerConfirmed: false,
    seatAvailability: "unknown",
  },
  {
    id: "sess-dev-stem-w2",
    programId: "prog-dev-stem-explorers",
    venueId: "venue-dev-oakridge-main",
    startDate: "2026-07-13",
    endDate: "2026-07-17",
    timingLabel: "Summer",
    scheduleFormat: "full_day",
    stayType: "day",
    deliveryMode: "in_person",
    coreHoursStart: "09:00",
    coreHoursEnd: "16:00",
    priceAmount: 285,
    priceUnit: "per_week",
    currency: "CAD",
    registrationStatus: "waitlist",
    waitlistUrl: "https://example.invalid/oakridge/waitlist",
    sourceUrl: "https://example.invalid/oakridge/stem",
    sourceCheckedDate: "2026-08-01",
    providerConfirmed: true,
    seatAvailability: "confirmed_full",
  },
  {
    id: "sess-dev-stem-w3",
    programId: "prog-dev-stem-explorers",
    venueId: "venue-dev-oakridge-main",
    startDate: "2026-07-20",
    endDate: "2026-07-24",
    timingLabel: "Summer",
    scheduleFormat: "full_day",
    stayType: "day",
    deliveryMode: "in_person",
    coreHoursStart: "09:00",
    coreHoursEnd: "16:00",
    priceAmount: 295,
    priceUnit: "per_week",
    currency: "CAD",
    registrationStatus: "registration_closed",
    registrationUrl: "https://example.invalid/oakridge/stem",
    sourceUrl: "https://example.invalid/oakridge/stem",
    sourceCheckedDate: "2026-08-01",
    seatAvailability: "confirmed_available",
  },
  // Multi-venue arts program
  {
    id: "sess-dev-art-pc",
    programId: "prog-dev-art-trail",
    venueId: "venue-dev-port-credit",
    startDate: "2026-08-10",
    endDate: "2026-08-14",
    timingLabel: "Summer",
    scheduleFormat: "full_day",
    stayType: "day",
    deliveryMode: "in_person",
    coreHoursStart: "09:30",
    coreHoursEnd: "15:30",
    priceAmount: 310,
    priceUnit: "per_week",
    currency: "CAD",
    registrationStatus: "registration_open",
    registrationUrl: "https://example.invalid/harbour/register",
    seatAvailability: "unknown",
  },
  {
    id: "sess-dev-art-cc",
    programId: "prog-dev-art-trail",
    venueId: "venue-dev-city-centre",
    startDate: "2026-08-17",
    endDate: "2026-08-21",
    timingLabel: "Summer",
    scheduleFormat: "full_day",
    stayType: "day",
    deliveryMode: "in_person",
    coreHoursStart: "09:30",
    coreHoursEnd: "15:30",
    priceAmount: 310,
    priceUnit: "per_week",
    currency: "CAD",
    registrationStatus: "not_yet_open",
    registrationOpensOn: "2026-09-01",
    registrationUrl: "https://example.invalid/harbour/info",
    seatAvailability: "unknown",
  },
  // Missing-info program — empty matching sessions intentionally omitted;
  // preview will pass [] so card uses dates_unverified context.
];
