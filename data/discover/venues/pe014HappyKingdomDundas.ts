/**
 * PE-014 — Happy Kingdom Dundas. Real venue record (draft).
 *
 * Source: the venue's own home, Fun, Food, Party, Waiver, Contact and Q&A
 * pages, read Nov 7, 2026, with exact wording from the verified sheet
 * (Verifier, Nov 4, 2026). The PE number is provisional. The party booking
 * site (booking.happykingdomdundas.ca) does not load for our reader, so no
 * facts come from it.
 *
 * Sources disagree (stored from the more specific page, with a conflictNote):
 * - Socks: the Home and Fun pages say non-slip socks are required for
 *   children; the Q&A says all guests, adults included, must wear socks.
 * - Outside food: the Home page says no outside food or drinks; the Q&A says
 *   outside food is allowed with a $100 outside food fee (birthday cake
 *   excepted).
 * - Food court: the Food page says "Coming Soon!"; the Home page and the Q&A
 *   describe a food court (and a drink bar) in use.
 *
 * Left out on purpose: the Terms page carries leftover template text (a
 * "Golf sessions" line), so its reservation and cancellation lines are not
 * stored. The VR section mentions "VR at Forever Young"; not stored.
 *
 * Not published, so not stored:
 * - Which ages count as "Toddler" and as "Kid"
 * - Open-play price for babies under 12 months
 * - Whether every adult with a Kid or Sibling pass pays $6.99
 * - Whether laser tag is included Monday–Thursday; laser tag ages, height
 *   rule and session length
 * - Day Pass time limit and re-entry
 * - Whether prices include HST
 * - Grip-sock price
 * - Open play: walk-in or reserve; capacity limits
 * - Holiday hours (Dec 24–26, Dec 31, Jan 1), PA Day and March Break hours,
 *   and which dates count as "Winter Break"
 * - Change table, nursing space, washrooms, stroller storage, adult seating
 *   for open play
 * - Parking
 * - A separate toddler area, its ages, and height limits on the structure or VR
 * - How long a signed waiver lasts; up to what age kids go on a parent's waiver
 * - Step-free entry, an elevator to the 2nd-level party rooms, an accessible
 *   washroom
 * - Party package names, prices and guest counts; whether the 11 AM party
 *   slot is weekends only
 * - Photo permission for Compass
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE014_SITE = "https://happykingdomdundas.ca/";
const FUN = "https://happykingdomdundas.ca/fun/";
const FOOD = "https://happykingdomdundas.ca/food/";
const PARTY = "https://happykingdomdundas.ca/party/";
const WAIVER = "https://happykingdomdundas.ca/waiver/";
const CONTACT = "https://happykingdomdundas.ca/contact-us/";
const QA = "https://happykingdomdundas.ca/qa/";
const PARTY_BOOKING = "https://booking.happykingdomdundas.ca";
export const PE014_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE014_SITE, sourceCheckedDate: PE014_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const fun = at(FUN);
const qa = at(QA);
const party = at(PARTY);

const WEEKEND_DAYS = "Fri–Sun, PA Days, Holidays, March Break, Summer Break and Winter Break · includes laser tag";

const dayPass = (
  id: string,
  label: string,
  day: "weekday" | "weekend_holiday",
  amount: number,
  extra: Partial<VenuePrice> = {},
): VenuePrice => ({
  ...fun, id, kind: "admission", label, audience: "child", amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, dayType: day,
  notes: day === "weekday" ? "Day Pass · Mon–Thu" : `Day Pass · ${WEEKEND_DAYS}`,
  ...extra,
});

export const pe014HappyKingdomDundas: VenueRecord = {
  place: {
    id: "PE-014",
    slug: "happy-kingdom-dundas-mississauga",
    name: "Happy Kingdom Dundas",
    branchName: "Dundas",
    aliases: ["Happy Kingdom", "Happy Kingdom Playground"],
    description:
      "An indoor playground with slides, climbing zones and tunnels, plus 80+ arcade machines, VR games, claw machines and tropical-themed party rooms. Laser tag is included with the weekend Day Pass.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "3025 Lenworth Dr",
    neighbourhood: null,
    websiteUrl: PE014_SITE,
    postalCode: "L4X 2G3",
    allAges: false,
    ageMin: 1,
    ageMax: 12,
    setting: "indoor",
    costTier: "moderate",
    typicalVisitMinutes: null,
    typicalVisitNote: "Sold as a Day Pass; no time limit is published",
    compassTake: [
      "Best for: Toddlers to early teens, with a playground, 80+ arcade machines, VR and claw machines under one roof.",
      "Good value: Monday to Thursday Day Passes cost $9–$10 less than Friday to Sunday, and the Toddler pass includes 1 free adult.",
      "Plan ahead: PA Days, holidays and school breaks are charged the weekend rate, and weekday opening is 12 PM.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "unknown",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE014_SITE,
    sourceCheckedDate: PE014_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [
    { ...fun, placeType: "Indoor Playgrounds", isPrimary: true },
    { ...fun, placeType: "Arcades", isPrimary: false },
    { ...fun, placeType: "VR Centres", isPrimary: false },
    { ...fun, placeType: "Laser Tag", isPrimary: false },
  ],
  ageBands: [
    { ...fun, band: "0_2", fit: "good", note: "\"Ideal for toddlers to early teens\"; Toddler pass priced (ages not stated); no open-play price for babies published" },
    { ...fun, band: "3_5", fit: "good" },
    { ...fun, band: "6_9", fit: "good" },
    { ...fun, band: "10_12", fit: "good" },
    { ...fun, band: "13_17", fit: "some", note: "\"Ideal for toddlers to early teens\"" },
  ],
  hours: [
    ...([1, 2, 3, 4, 5] as const).map((weekday) => ({ weekday, opensAt: "12:00", closesAt: "20:00" })),
    ...([6, 7] as const).map((weekday) => ({ weekday, opensAt: "11:00", closesAt: "20:00" })),
  ].map((h) => ({ ...h, sourceUrl: CONTACT, sourceCheckedDate: PE014_LAST_RESEARCHED })),
  activities: [
    { ...fun, id: "pe014-playground", name: "Indoor Playground", description: "Slides, climbing zones, tunnels and interactive play equipment on large, colourful play structures, with safe, soft flooring and age-appropriate zones.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...fun, id: "pe014-laser-tag", name: "Laser tag", description: "Included with the Fri–Sun and holiday Day Pass; no other details are published.", availability: "available", includedInAdmission: "unknown", extraCostNote: "The Fri–Sun, PA Day, holiday and school-break Day Pass says \"(Includes Laser Tag)\"; Mon–Thu not stated", schedule: "unknown" },
    { ...fun, id: "pe014-arcade", name: "Arcade", description: "80+ arcade machines from retro to modern, for every age and skill level.", availability: "available", includedInAdmission: "no", extraCostNote: "Arcade cards: $22 → 130 pts, $32 → 225 pts, $40 → 300 pts, $50 → 400 pts, $75 → 625 pts, $100 → 850 pts (bonus included) · new card fee $3 · most games cost around 10 credits", schedule: "always" },
    { ...fun, id: "pe014-vr", name: "Virtual reality", description: "A wide variety of VR games for all ages, with staff-guided setup for beginners.", availability: "available", includedInAdmission: "no", extraCostNote: "Swipe your arcade card to play; most games cost around 20 credits per session", schedule: "always" },
    { ...fun, id: "pe014-claw", name: "Claw machines", description: "Easy-to-use and great for all ages.", availability: "available", includedInAdmission: "no", extraCostNote: "2–4 tokens per play · $20 → 22 tokens, $50 → 95, $80 → 160, $100 → 260, $200 → 420", schedule: "always" },
  ],
  prices: [
    dayPass("pe014-kid-wkd", "Kid", "weekday", 23.99),
    dayPass("pe014-sibling-wkd", "Sibling", "weekday", 22.99, { siblingOnly: true }),
    dayPass("pe014-toddler-wkd", "Toddler", "weekday", 17.99, { includesNote: "1 free adult", adultsIncluded: 1 }),
    dayPass("pe014-kid-wke", "Kid", "weekend_holiday", 33.99),
    dayPass("pe014-sibling-wke", "Sibling", "weekend_holiday", 32.99, { siblingOnly: true }),
    dayPass("pe014-toddler-wke", "Toddler", "weekend_holiday", 26.99, { includesNote: "1 free adult", adultsIncluded: 1 }),
    { ...fun, id: "pe014-adult", kind: "admission", label: "Adults accompanying children", audience: "adult", amount: 6.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null },
    { ...qa, id: "pe014-party-deposit", kind: "party", label: "Party deposit", audience: "group", amount: 100, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Required to secure your booking · non-refundable under any circumstances, including cancellations or rescheduling" },
    { ...qa, id: "pe014-party-extra-wkd", kind: "party", label: "Extra party half-hour", audience: "group", durationMinutes: 30, amount: 75, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, dayType: "weekday", notes: "Mondays to Thursdays" },
    { ...qa, id: "pe014-party-extra-wke", kind: "party", label: "Extra party half-hour", audience: "group", durationMinutes: 30, amount: 90, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, dayType: "weekend_holiday", notes: "Fridays, Saturdays, Sundays, PA Days and Holidays" },
  ],
  programs: [],
  amenities: [
    { ...qa, amenity: "grip_socks", status: "yes", note: "Bring your own or buy non-slip socks at the venue; price not published" },
    { ...party, amenity: "party_rooms", status: "yes", note: "Tropical-themed private party rooms on the 2nd level" },
    {
      ...at(FOOD), amenity: "food_onsite", status: "no", note: "The Food page says \"Coming Soon!\"",
      verificationStatus: "conflicting",
      conflictNote: "The Food page says \"Coming Soon!\"; the Home page describes a Food Court and Drink Bar, and the Q&A says party food can be bought from the food court on the day.",
    },
  ],
  policies: [
    { ...fun, kind: "age_guidance", body: "The venue says the playground is ideal for toddlers to early teens." },
    { ...qa, kind: "supervision", body: "Parents and guardians must supervise their own children at all times in the playground, party rooms and arcade area." },
    { ...at(WAIVER), kind: "waiver", body: "Everyone entering the indoor playground must sign a waiver. Sign online on your phone before you go (it takes 1–2 minutes) or at the kiosk at the entrance; your info stays on file, so next time you just check in with your phone number." },
    {
      ...qa, kind: "dress_socks", body: "Sock-only facility: all guests, children and adults, must wear socks. Bring your own or buy non-slip socks at the venue.",
      verificationStatus: "conflicting",
      conflictNote: "The Home and Fun pages say non-slip socks are required for children; the Q&A says all guests (children and adults) must wear socks.",
    },
    {
      ...qa, kind: "food_rule", body: "Outside food and drinks are allowed with a $100 outside food fee; a birthday cake is the exception.",
      verificationStatus: "conflicting",
      conflictNote: "The Q&A allows outside food for a $100 outside food fee; the Home page says \"NO OUTSIDE FOOD OR DRINKS ALLOWED!!\"",
    },
    { ...fun, kind: "other", body: "Weekend Day Pass prices also apply on PA Days, holidays, March Break, Summer Break and Winter Break." },
    { ...party, kind: "party", body: "Party rooms include all-day playground access for everyone attending, a free future visit pass for the birthday child, arcade play cards, balloons and invitations (physical or digital), and plates, cups, utensils, napkins and tablecloths." },
    { ...qa, kind: "party", body: "Party time slots: 11:00 AM–1:00 PM, 2:00–4:00 PM and 5:00–7:00 PM. Children under 12 months are welcome and not counted in the guest total." },
    { ...qa, kind: "party", body: "To book a party within 3 days of the event, visit in person to book and pay the $100 deposit." },
    { ...at(WAIVER), kind: "party", body: "Every party guest needs a signed waiver before entering the playground." },
  ],
  links: [
    { ...party, kind: "booking", value: PARTY_BOOKING, label: "Book a party" },
    { ...site, kind: "website", value: PE014_SITE, label: "Happy Kingdom Dundas website" },
    { ...at(CONTACT), kind: "phone", value: "365-230-9177", label: "Party Bookings" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
