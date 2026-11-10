/**
 * DEV ONLY. City Winter 2026 session roster matched to ActiveNet on 2026-11-10.
 * The eligible-list age bands and date windows are NOT substitutes for
 * session-level ActiveNet detail eligibility or verified fees.
 * TODO: verify all 30 detail payloads, addresses, prices, and Jr birthday cutoff.
 */
import type { CampProgram, CampSession, Venue } from "@/data/camps/types";
import { MISSISSAUGA_WINTER_2026_LISTED } from "@/data/camps/real/mississaugaWinter2026EligibleList";
import { WINTER_2026_MAPPINGS } from "@/lib/camps/availability/activenet/registry";
import { activeNetActivityPageUrl, activeNetEnrollUrl } from "@/lib/camps/availability/activenet/urls";

const JR_PROGRAM_ID = "prog-city-mississauga-winter-fun-jr";
const MALTON_NUMBER = "147884";
const VENUE_NAMES = [...new Set(MISSISSAUGA_WINTER_2026_LISTED.map((row) => row.centre))];
const venueId = (name: string) => "venue-city-winter-2026-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");

export const winter2026Venues: Venue[] = VENUE_NAMES
  .filter((name) => name !== "Malton Community Centre")
  .map((name) => ({
    id: venueId(name),
    name,
    city: "Mississauga",
    province: "ON",
    // Address and coordinates remain unknown until verified from City detail.
  }));

export const winter2026JrProgram: CampProgram = {
  id: JR_PROGRAM_ID,
  slug: "camp-winter-fun-jr",
  providerId: "prov-city-of-mississauga",
  name: "Camp: Winter Fun Jr",
  description: "City of Mississauga winter break camp. Session-specific age eligibility, daily hours, and fees must be confirmed with the City.",
  primaryCategory: "Camps",
  typicalAgeMin: 4,
  typicalAgeMax: 5,
  typicalAgeMinInclusive: true,
  typicalAgeMaxInclusive: true,
  audience: "child_only",
  preparationNotes: "The eligible camp list says ages 4–5. Confirm the City's exact birthday cutoff and eligibility on the registration page.",
};

export const winter2026AdditionalSessions: CampSession[] =
  MISSISSAUGA_WINTER_2026_LISTED
    .filter((row) => row.publicActivityNumber !== MALTON_NUMBER)
    .map((row) => {
      const mapping = WINTER_2026_MAPPINGS.find((m) => m.activityNumber === row.publicActivityNumber);
      if (!mapping) throw new Error("Missing ActiveNet mapping: " + row.publicActivityNumber);
      return {
        id: mapping.sessionId,
        programId: mapping.programId,
        venueId: row.centre === "Malton Community Centre"
          ? "venue-malton-community-centre" : venueId(row.centre),
        startDate: row.startDate,
        endDate: row.startDate === "2026-12-21" ? "2026-12-23" : "2026-12-31",
        timingLabel: "Winter Break",
        scheduleFormat: "full_day",
        stayType: "day",
        deliveryMode: "in_person",
        priceAmount: null,
        priceUnit: "unknown",
        currency: "CAD",
        registrationStatus: "availability_unknown",
        registrationUrl: activeNetEnrollUrl(mapping.activityId),
        sourceUrl: activeNetActivityPageUrl(mapping.activityId),
        sourceCheckedDate: "2026-11-10",
        providerConfirmed: false,
        seatAvailability: "unknown",
        ageMin: row.program === "Winter Fun Jr" ? 4 : 6,
        ageMax: row.program === "Winter Fun Jr" ? 5 : 12,
        ageMinInclusive: true,
        ageMaxInclusive: true,
        ageAssessmentRule: "unknown",
        notes: "City eligible-list age band and dates; public activity #" + row.publicActivityNumber + ". Verify detailed eligibility, hours and fee with City before booking.",
      };
    });
