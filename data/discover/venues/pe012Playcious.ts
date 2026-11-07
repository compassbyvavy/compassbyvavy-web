/**
 * PE-012 — Playcious Mississauga. Real venue record (draft).
 *
 * Source: the venue's own home and ticket pages, read Oct 27, 2026. The PE
 * number is provisional.
 *
 * Not published, so not stored: the sock price, the outside-food rule,
 * party prices, parking, washrooms and change tables. Laser tag runs in the
 * bumper car arena; no separate price is published.
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE012_SITE = "https://playcious.com/mississauga/";
const TICKETS = "https://playcious.com/mississauga/buy-tickets/";
export const PE012_LAST_RESEARCHED = "2026-10-27";

const site: Provenance = { sourceUrl: PE012_SITE, sourceCheckedDate: PE012_LAST_RESEARCHED, verificationStatus: "verified" };
const tickets: Provenance = { ...site, sourceUrl: TICKETS };

const playPass = (id: string, label: string, minutes: number, amount: number, includesNote: string): VenuePrice => ({
  ...tickets, id, kind: "admission", label, audience: "child", ageMin: 1, ageMax: 17, durationMinutes: minutes, includesNote, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, adultsIncluded: 1,
});

export const pe012Playcious: VenueRecord = {
  place: {
    id: "PE-012",
    slug: "playcious-mississauga",
    name: "Playcious",
    branchName: "Mississauga",
    aliases: ["Playcious Mississauga"],
    description:
      "A big indoor play centre with a 3-storey jungle gym (zip line, ninja course, slides), a ball pool, a toddler pretend-play area, climbing walls, bumper cars, an arcade and a café.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "75 Courtneypark Dr W, Unit 2B",
    neighbourhood: "Courtneypark",
    websiteUrl: PE012_SITE,
    postalCode: "L5W 0E3",
    allAges: false,
    ageMin: 1,
    ageMax: 12,
    setting: "indoor",
    costTier: "moderate",
    typicalVisitMinutes: 120,
    typicalVisitNote: "Passes are 60 or 120 minutes; on weekdays play time is doubled",
    compassTake: [
      "Best for: Mixed ages: a toddler pretend-play area for 1–5, and a 3-storey jungle gym, ninja course and bumper cars for older kids.",
      "Good value: On weekdays there are no set time slots, and play time is doubled.",
      "Plan ahead: Weekends run in 2-hour slots and can fill up, so check online before you go.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "no",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE012_SITE,
    sourceCheckedDate: PE012_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [
    { ...site, placeType: "Indoor Playgrounds", isPrimary: true },
    { ...site, placeType: "Arcades", isPrimary: false },
    { ...site, placeType: "Climbing", isPrimary: false },
  ],
  ageBands: [
    { ...site, band: "0_2", fit: "good", note: "Toddler area for ages 1–5; under 1 free with a paying sibling or adult" },
    { ...site, band: "3_5", fit: "good" },
    { ...site, band: "6_9", fit: "good" },
    { ...site, band: "10_12", fit: "good" },
    { ...tickets, band: "13_17", fit: "some", note: "Passes cover ages 1–17; big bumper cars from 43 inches" },
  ],
  hours: ([1, 2, 3, 4, 5, 6, 7] as const).map((weekday) => ({ weekday, opensAt: "10:15", closesAt: "20:00", sourceUrl: PE012_SITE, sourceCheckedDate: PE012_LAST_RESEARCHED })),
  activities: [
    { ...site, id: "pe012-jungle-gym", name: "3-storey jungle gym", description: "Wavy and tube slides, a zip line and an axe-throwing target game.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...site, id: "pe012-ninja", name: "Ninja course", description: "On the second storey of the jungle gym.", availability: "available", includedInAdmission: "no", extraCostNote: "Included with Silver, Gold and Family passes", schedule: "always" },
    { ...site, id: "pe012-ball-pool", name: "Marina Ball Pool", description: "A ball pool with a small slide, joined to the jungle gym by a clear tunnel 10 ft up.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...site, id: "pe012-toddler", name: "Toddler area", description: "Pretend kitchen, bakery and auto shop, plus a ball pit.", availability: "available", includedInAdmission: "yes", schedule: "always", ageMin: 1, ageMax: 5 },
    { ...site, id: "pe012-climbing", name: "Climbing walls", description: "Four timed walls reaching 17 ft.", availability: "available", includedInAdmission: "no", extraCostNote: "Turns included with Silver, Gold and Family passes", schedule: "always" },
    { ...site, id: "pe012-mini-bumper", name: "Mini bumper cars", description: "For kids 37–55 inches tall; an attendant always watches the arena.", availability: "available", includedInAdmission: "no", extraCostNote: "Rides included with Silver, Gold and Family passes", schedule: "always", minHeightCm: 94, maxHeightCm: 140 },
    { ...site, id: "pe012-big-bumper", name: "Big bumper cars and laser tag", description: "Bumper cars with laser tagging, for older kids and adults.", availability: "available", includedInAdmission: "no", extraCostNote: "Rides included with Silver, Gold and Family passes", schedule: "always", minHeightCm: 109 },
    { ...site, id: "pe012-arcade", name: "Arcade", description: "Games and rides with prizes for tickets.", availability: "available", includedInAdmission: "no", extraCostNote: "Arcade credits included with Silver, Gold and Family passes", schedule: "always" },
  ],
  prices: [
    { ...tickets, id: "pe012-under1", kind: "admission", label: "Under 1", audience: "infant", ageMin: 0, ageMax: 0, isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Free with a paid sibling, adult or family pass" },
    playPass("pe012-basic-60", "Basic, 60 minutes", 60, 9.99, "jungle gym, ball pool and toddler area, plus 1 adult"),
    playPass("pe012-basic-120", "Basic, 120 minutes", 120, 14.99, "jungle gym, ball pool and toddler area, plus 1 adult"),
    playPass("pe012-silver-60", "Silver Value, 60 minutes", 60, 18.99, "Basic plus the ninja course, 1 climbing turn, 1 bumper car ride and 20 arcade credits, plus 1 adult"),
    playPass("pe012-gold-120", "Gold Value, 120 minutes", 120, 24.99, "Basic plus the ninja course, 2 climbing turns, 2 bumper car rides and 32 arcade credits, plus 1 adult"),
    { ...tickets, id: "pe012-adult", kind: "admission", label: "Extra adult", audience: "adult", durationMinutes: 120, amount: 7.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "60 to 120 minutes" },
    { ...tickets, id: "pe012-family", kind: "package", label: "Family Pass", audience: "family", durationMinutes: 120, includesNote: "2 children and 2 adults", amount: 99.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "4 climbing turns, 4 bumper car rides, 60 arcade credits and a meal for 4" },
  ],
  programs: [],
  amenities: [
    { ...site, amenity: "food_onsite", status: "yes", note: "Café Playcious" },
    { ...site, amenity: "parent_seating", status: "yes", note: "Seating areas where you can watch the kids" },
    { ...site, amenity: "party_rooms", status: "yes" },
  ],
  policies: [
    { ...site, kind: "waiver", body: "Everyone needs a valid waiver (online or in store), signed by someone 18 or older; it lasts a year." },
    { ...site, kind: "dress_socks", body: "Socks only: kids need grip socks, adults need socks, and no shoes in the playground." },
    { ...site, kind: "arrival", body: "Strollers aren't allowed in the playground." },
    { ...tickets, kind: "booking_rule", body: "Weekdays: walk in any time, with no set slots. Weekends and holidays run in 2-hour slots (10:30, 1:00, 3:30 and 6:00); walk-ins are welcome, but check online or call first since it can fill up." },
    { ...tickets, kind: "other", body: "On weekdays, play time is doubled." },
    { ...site, kind: "supervision", body: "An attendant watches the bumper car arena at all times." },
    { ...site, kind: "party", body: "Party options: 2-Hour Basic, 3-Hour Prime, 4-Hour Deluxe, and private or corporate events." },
  ],
  links: [
    { ...tickets, kind: "tickets", value: TICKETS, label: "Buy play passes" },
    { ...site, kind: "website", value: PE012_SITE, label: "Playcious Mississauga" },
    { ...site, kind: "phone", value: "905-901-0421" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
