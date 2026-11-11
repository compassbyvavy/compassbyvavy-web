/**
 * DEV ONLY — MSC-0007 City of Mississauga, Camp: Winter Fun.
 *
 * Public activity_number 147884 is stored separately from internal
 * activity_id 145871. REST and booking URLs use 145871 only.
 *
 * Static catalog does not freeze an openings count. Seat/lifecycle stay
 * unknown until the ActiveNet connector reads space_status. Price and
 * core hours come from the same ActiveNet pages (list time_range and
 * estimateprice) and are shown as catalog facts, not as live seats.
 *
 * Facts checked against GET /activemississauga/rest/activity/detail/145871
 * and estimateprice/145871 on 2026-11-10. Access via lib/camps/realDevCatalog.ts.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";

export {
  MSC_0007_ACTIVITY_ID,
  MSC_0007_ACTIVITY_NUMBER,
  MSC_0007_CANDIDATE_ID,
  MSC_0007_PROGRAM_ID,
  MSC_0007_PROGRAM_SLUG,
  MSC_0007_PROVIDER_ID,
  MSC_0007_SESSION_ID,
  MSC_0007_SOURCE_CHECKED_DATE,
  MSC_0007_VENUE_ID,
} from "@/data/camps/real/msc0007.ids";
import {
  MSC_0007_ACTIVITY_NUMBER,
  MSC_0007_PROGRAM_ID,
  MSC_0007_PROGRAM_SLUG,
  MSC_0007_PROVIDER_ID,
  MSC_0007_SESSION_ID,
  MSC_0007_SOURCE_CHECKED_DATE,
  MSC_0007_VENUE_ID,
} from "@/data/camps/real/msc0007.ids";

/** Booking uses internal activity_id 145871, not public number 147884. */
const BOOKING_URL =
  "https://anc.ca.apm.activecommunities.com/activemississauga/activity/search/enroll/145871?locale=en-US";
const SOURCE_URL =
  "https://anc.ca.apm.activecommunities.com/activemississauga/activity/search/detail/145871";

export const msc0007Providers: Provider[] = [
  {
    id: MSC_0007_PROVIDER_ID,
    name: "City of Mississauga",
    websiteUrl: "https://www.mississauga.ca/",
    registrationInfoUrl:
      "https://anc.ca.apm.activecommunities.com/activemississauga",
  },
];

export const msc0007Venues: Venue[] = [
  {
    id: MSC_0007_VENUE_ID,
    name: "Malton Community Centre",
    neighbourhood: "Malton",
    addressLine: "3540 Morning Star Drive",
    city: "Mississauga",
    province: "ON",
    postalCode: "L4T 1Y2",
    latitude: 43.7235,
    longitude: -79.6385,
  },
];

export const msc0007Programs: CampProgram[] = [
  {
    id: MSC_0007_PROGRAM_ID,
    slug: MSC_0007_PROGRAM_SLUG,
    providerId: MSC_0007_PROVIDER_ID,
    name: "Camp: Winter Fun",
    description:
      "A camp full of fun and adventure, including arts and crafts, sports, drama and outdoor play. Theme-based activities; Friday is a special event day. Come dressed for the weather — campers will be outside daily. If before/after camp care is required, register for extended hours with the city.",
    primaryCategory: "Camps",
    secondaryThemes: ["Arts", "Sports", "Outdoor play"],
    typicalAgeMin: 6,
    typicalAgeMax: 13,
    typicalAgeMinInclusive: true,
    typicalAgeMaxInclusive: false,
    audience: "child_only",
    indoorOutdoor: "both",
    experienceSummary:
      "Join for a camp full of fun and adventure. Activities including arts and crafts, sports, drama and outdoor play in a fun filled environment. With theme-based activities, get excited about camp. Friday is a special event day.",
    packingItems: [
      { text: "Come dressed for the weather — you will be outside daily", kind: "required" },
    ],
    preparationNotes:
      "Age requirement: campers must be 6 by the first day of camp. If before/after camp care is required, register for extended hours with the City of Mississauga.",
  },
];

export const msc0007Sessions: CampSession[] = [
  {
    id: MSC_0007_SESSION_ID,
    programId: MSC_0007_PROGRAM_ID,
    venueId: MSC_0007_VENUE_ID,
    startDate: "2026-12-21",
    endDate: "2026-12-23",
    timingLabel: "Winter Break",
    scheduleFormat: "full_day",
    stayType: "day",
    deliveryMode: "in_person",
    coreHoursStart: "09:00",
    coreHoursEnd: "16:00",
    priceAmount: 87.78,
    priceUnit: "full_program",
    currency: "CAD",
    feeNotes:
      "Resident fee from ActiveNet estimateprice on 2026-11-10. Non-resident $97.78. Core hours 9:00 AM–4:00 PM; extended hours are a separate City registration.",
    registrationStatus: "availability_unknown",
    registrationUrl: BOOKING_URL,
    sourceUrl: SOURCE_URL,
    sourceCheckedDate: MSC_0007_SOURCE_CHECKED_DATE,
    providerConfirmed: false,
    seatAvailability: "unknown",
    ageMin: 6,
    ageMax: 13,
    ageMinInclusive: true,
    ageMaxInclusive: false,
    ageAssessmentRule: "as_of_session_start",
    notes:
      `City of Mississauga ActiveNet public activity number ${MSC_0007_ACTIVITY_NUMBER}. Openings are read from the availability connector (as of the retrieval time), not this static record.`,
  },
];
