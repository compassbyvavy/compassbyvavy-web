/**
 * PE-017 — JusPlay Indoor Playgrounds. Real venue record (draft).
 *
 * Source: the venue's own home, Play, Party, Date Night, About, Contact and
 * Terms & Conditions pages, read Nov 7, 2026. The PE number is provisional.
 * The Aluvii store (jus-play.aluvii.com) blocks automated reading, so no
 * facts come from it.
 *
 * As published, and stored that way:
 * - Prices are "Tue-Thu" and "Fri-Mon", but the venue is closed Mondays, and
 *   Friday has weekday hours. Fri–Mon prices are stored as weekend prices,
 *   with the published days in the notes.
 * - "The Big Ol' Fam" is listed as "$ 129.99 each" for up to 6 children and
 *   4 adults.
 * - Up to 2 accompanying parents enter free per visit (not per child
 *   ticket), so child tickets carry no adultsIncluded value.
 *
 * Not published, so not stored:
 * - Why "Fri–Mon" when Mondays are closed; whether Friday is charged the
 *   weekend rate
 * - Whether "The Big Ol' Fam" is per group or per person, and which days
 * - Price for babies under 1
 * - Whether prices include HST (admission, parties, Date Night)
 * - Whether every visit is 2 hours; extension price; re-entry
 * - Walk-ins, and whether weekend slots sell out
 * - Holiday hours (Dec 24–26, Dec 31, Jan 1) and PA Day hours (listed "TBA");
 *   March Break hours; camps (the Terms mention a summer camp; no camp page)
 * - Change table, nursing space, washrooms inside the unit
 * - Whether parking is free, and weekday parking
 * - Grip-sock price; whether kids can wear their own grip socks
 * - Whether the waiver is online, and how long it lasts
 * - Height limits on the 3-level structure or ride-on vehicles; whether
 *   ride-ons cost extra
 * - Whether baby food or formula is allowed despite the no-outside-food rule
 * - Wheelchair access and an accessible washroom
 * - Whether party prices are the same every day; party deposit
 * - Photo permission for Compass
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE017_SITE = "https://www.jus-play.com/";
const PLAY = "https://www.jus-play.com/play";
const PARTY = "https://www.jus-play.com/party";
const DATE_NIGHT = "https://www.jus-play.com/datenight";
const ABOUT = "https://www.jus-play.com/about";
const CONTACT = "https://www.jus-play.com/contact";
const TERMS = "https://www.jus-play.com/terms-conditions";
const STORE = "https://jus-play.aluvii.com/store/shop/categoryproducts?id=1&offSet=300&categoryId=1";
const EVENTS = "https://jus-play.aluvii.com/event";
export const PE017_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE017_SITE, sourceCheckedDate: PE017_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const play = at(PLAY);
const party = at(PARTY);
const terms = at(TERMS);

const ticket = (id: string, label: string, day: "weekday" | "weekend_holiday", ageMin: number, ageMax: number, amount: number): VenuePrice => ({
  ...play, id, kind: "admission", label, audience: "child", ageMin, ageMax, durationMinutes: 120, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, dayType: day,
  notes: `${day === "weekday" ? "Tue–Thu" : "Fri–Mon"} · each · two-hour slots · up to 2 accompanying parents enter free`,
});

const partyPackage = (guests: number, amount: number, food: string, rooms: string): VenuePrice => ({
  ...party, id: `pe017-party-${guests}`, kind: "party", label: `Up to ${guests} guests`, audience: "group", durationMinutes: 120, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null,
  notes: `Guest count includes kids and adults · ${food} · coffee, water, loot bags, theme, setup and cleanup · ${rooms}`,
});

export const pe017JusPlay: VenueRecord = {
  place: {
    id: "PE-017",
    slug: "jusplay-indoor-playgrounds-mississauga",
    name: "JusPlay Indoor Playgrounds",
    branchName: null,
    aliases: ["JusPlay", "Jus Play"],
    description:
      "An indoor playground with a 3-level play structure (slides, ball pit, maze and zip line), a 2-level set for younger kids, two toddler play sets beside the Parents' Lounge, ride-on vehicles, a seasonal crafts and blocks room and a cafe.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "2273 Dundas St W, Unit 14 & 15",
    neighbourhood: null,
    websiteUrl: PE017_SITE,
    postalCode: "L5K 2L8",
    allAges: false,
    ageMin: 1,
    ageMax: 12,
    setting: "indoor",
    costTier: "budget",
    typicalVisitMinutes: 120,
    typicalVisitNote: "Play is sold in two-hour slots; you can ask to extend at the front desk",
    compassTake: [
      "Best for: Ages 1–12, with toddler play sets for 1–3 and a 3-level structure with a zip line for bigger kids.",
      "Good value: Up to 2 accompanying parents enter free, and Tuesday to Thursday prices are lower.",
      "Plan ahead: Closed Mondays, and on weekends the play area closes 2:30–3:30 pm for cleaning; book online to save time at check-in.",
      "Little ones: Two toddler play sets sit right next to the Parents' Lounge.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "no",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE017_SITE,
    sourceCheckedDate: PE017_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [
    { ...site, placeType: "Indoor Playgrounds", isPrimary: true },
  ],
  ageBands: [
    { ...play, band: "0_2", fit: "good", note: "Toddler tickets and two toddler play sets for ages 1–3; no price for babies under 1 published" },
    { ...play, band: "3_5", fit: "good" },
    { ...play, band: "6_9", fit: "good" },
    { ...play, band: "10_12", fit: "good" },
    { ...play, band: "13_17", fit: "some", note: "Elder siblings 13–17 must come with an attending sibling" },
  ],
  hours: [
    ...([2, 3, 4, 5] as const).map((weekday) => ({ weekday, opensAt: "12:30", closesAt: "20:00", notes: null })),
    { weekday: 6 as const, opensAt: "10:30", closesAt: "20:00", notes: "Closed 2:30–3:30 pm for cleaning" },
    { weekday: 7 as const, opensAt: "10:30", closesAt: "18:30", notes: "Closed 2:30–3:30 pm for cleaning" },
  ].map((h) => ({ ...h, sourceUrl: CONTACT, sourceCheckedDate: PE017_LAST_RESEARCHED })),
  activities: [
    { ...site, id: "pe017-big-structure", name: "3-level play structure", description: "Slides, obstacles and drops; climb, crawl and jump; a ball pit, maze and zip line.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...site, id: "pe017-small-structure", name: "2-level play set", description: "A smaller play set for younger kids.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...play, id: "pe017-toddler", name: "Toddler play sets", description: "Two toddler play sets right next to the Parents' Lounge.", availability: "available", includedInAdmission: "yes", schedule: "always", ageMin: 1, ageMax: 3 },
    { ...play, id: "pe017-ride-on", name: "Ride-on vehicles", description: "Ride-ons to explore the whole playground.", availability: "available", includedInAdmission: "unknown", schedule: "unknown" },
    { ...at(ABOUT), id: "pe017-activity-room", name: "Multi-activity room", description: "Arts and crafts and building blocks.", availability: "available", includedInAdmission: "unknown", schedule: "scheduled", scheduleNote: "Seasonal" },
  ],
  prices: [
    ticket("pe017-toddler-wkd", "Toddler 1–3", "weekday", 1, 3, 14.99),
    ticket("pe017-child-wkd", "Child 4–12", "weekday", 4, 12, 19.99),
    ticket("pe017-toddler-wke", "Toddler 1–3", "weekend_holiday", 1, 3, 16.99),
    ticket("pe017-child-wke", "Child 4–12", "weekend_holiday", 4, 12, 22.99),
    { ...play, id: "pe017-elder-sibling", kind: "admission", label: "Elder sibling 13–17", audience: "child", ageMin: 13, ageMax: 17, durationMinutes: 120, amount: 11.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, siblingOnly: true, notes: "Each · must accompany an attending sibling" },
    { ...play, id: "pe017-adult", kind: "admission", label: "Additional adult", audience: "adult", durationMinutes: 120, amount: 9.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Each · must accompany an attending family" },
    { ...play, id: "pe017-parents-free", kind: "admission", label: "Accompanying parents (up to 2)", audience: "adult", isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Enter for free" },
    { ...play, id: "pe017-big-ol-fam", kind: "package", label: "The Big Ol' Fam", audience: "family", durationMinutes: 120, includesNote: "up to 6 children and 4 adults", amount: 129.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Listed as \"$ 129.99 each\"" },
    partyPackage(20, 599.99, "2 XL pizzas, 1 XL fries, 10 pop cans, 10 juice boxes", "Room 1 or 2"),
    partyPackage(30, 699.99, "3 XL pizzas, 1 XL fries, 15 pop cans, 15 juice boxes", "Room 1 or 2"),
    partyPackage(40, 849.99, "4 XL pizzas, 2 XL fries, 20 pop cans, 20 juice boxes", "Room 3 or 4"),
    partyPackage(50, 999.99, "5 XL pizzas, 2 XL fries, 25 pop cans, 25 juice boxes", "Room 3 or 4"),
    partyPackage(60, 1199.99, "6 XL pizzas, 3 XL fries, 30 pop cans, 30 juice boxes", "Room 3 or 4"),
    partyPackage(70, 1499.99, "7 XL pizzas, 3 XL fries, 35 pop cans, 35 juice boxes", "Room 6"),
    partyPackage(90, 1899.99, "9 XL pizzas, 4 XL fries, 45 pop cans, 45 juice boxes", "Room 6"),
    { ...party, id: "pe017-party-extra-guest", kind: "party", label: "Additional child or adult", audience: "other", amount: 19.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null },
  ],
  programs: [
    {
      ...at(DATE_NIGHT), id: "pe017-date-night", name: "The Date Night Escape",
      description: "Drop off your kids for a few hours of supervised play and activities, with one meal included (snack, side and drink).",
      attendance: "drop_off",
      cadence: "dated",
      scheduleNote: "Thursdays 5:00–8:00 pm: Nov 12, Nov 19 and Nov 26, 2026",
      startsOn: "2026-11-12",
      endsOn: "2026-11-26",
      ageMin: 4,
      ageMax: 12,
      priceNote: "$59.99 per child. Children must be fully potty trained.",
      registrationUrl: EVENTS,
    },
  ],
  amenities: [
    { ...site, amenity: "food_onsite", status: "yes", note: "Cafe with snacks and drinks, including fresh, healthier options" },
    { ...site, amenity: "parent_seating", status: "yes", note: "Parents' Lounge with a 360 degree view of the kids" },
    { ...terms, amenity: "outside_food", status: "no", note: "A $250 sanitary fee applies; cakes or cupcakes are allowed for parties" },
    { ...terms, amenity: "stroller_storage", status: "yes", note: "Designated area near reception" },
    { ...site, amenity: "grip_socks", status: "yes", note: "Sold at the front desk; price not published" },
    { ...party, amenity: "party_rooms", status: "yes", note: "Themed party rooms, with adjoining rooms for bigger parties" },
  ],
  policies: [
    { ...terms, kind: "supervision", body: "Parents and guardians must stay and keep an eye on their kids. Adults not accompanying a child or part of an attending group can't enter." },
    { ...terms, kind: "dress_socks", body: "Everyone wears socks at all times: grip socks for children and regular socks for adults. No shoes inside. Socks are sold at the front desk." },
    { ...terms, kind: "waiver", body: "Every adult and child must be on a signed waiver before entering." },
    { ...terms, kind: "restriction", body: "All children must be fully potty trained or wear a secure, leak-proof diaper at all times." },
    { ...terms, kind: "food_rule", body: "Outside food and drinks aren't allowed; a $250 sanitary fee applies if they're brought in. Cakes or cupcakes are allowed for parties." },
    { ...terms, kind: "arrival", body: "Strollers are kept in a designated area near reception." },
    { ...play, kind: "booking_rule", body: "Play is booked in two-hour slots throughout the day. You can extend your stay within store hours; check availability and price at the front desk." },
    { ...site, kind: "booking_rule", body: "To save time at check-in, book online." },
    { ...site, kind: "hours_note", body: "Closed Mondays. On Saturdays and Sundays the play area closes 2:30–3:30 pm for cleaning. PA Day and holiday hours are listed as TBA." },
    { ...terms, kind: "other", body: "If you or your child are unwell, you'll be asked to leave." },
    { ...site, kind: "location_note", body: "Extra parking at the rear of the plaza on Saturdays and Sundays only. JusPlay doesn't control parking, so follow the parking attendants to avoid fines." },
    { ...party, kind: "party", body: "Parties run in two-hour slots, with a playtime top-up available." },
    { ...terms, kind: "party", body: "Party payments are non-refundable unless you cancel at least 14 days before the party." },
    { ...terms, kind: "cancellation", body: "Date Night payments are non-refundable unless you cancel at least 48 hours before the booking date." },
  ],
  links: [
    { ...play, kind: "tickets", value: STORE, label: "Book play slots" },
    { ...at(DATE_NIGHT), kind: "booking", value: EVENTS, label: "Book Date Night" },
    { ...site, kind: "website", value: PE017_SITE, label: "JusPlay website" },
    { ...at(CONTACT), kind: "phone", value: "905-569-9909" },
    { ...at(CONTACT), kind: "phone", value: "1-844-440-7529", label: "1 844 440 PLAY" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
