/**
 * PE-010 — Kidz at Play. Real venue record (draft).
 *
 * Source: the venue's own home (admission), contact/FAQ, party and
 * events-and-specials pages, read Nov 7, 2026. The PE number is provisional.
 * The online ticket shop and waiver form (pcsparty.com) don't load for our
 * reader, so no facts come from them.
 *
 * Phones: the Home and Contact pages list (416) 994-7406 and 905-567-0777;
 * the Specials page also shows (365) 513-8905 as "CALL US". Only the first
 * two are stored until the main number is confirmed.
 * The Specials page offers weeknight parties "Monday to Friday", while the
 * hours say Monday is closed; both are stored as published.
 * Place ages: the field trips and camps intro says "designed for children
 * ages 1–10"; admission is priced from 9 months with no top age.
 *
 * Not published, so not stored:
 * - Whether the 365 number is current, and which number is main
 * - Open-play price for babies under 9 months, and whether 9–11 months is
 *   free with a paid sibling
 * - Fri–Sun: whether every adult pays $5.50, including the first
 * - Session length / time limit and re-entry
 * - Whether admission prices include HST
 * - Online ticket time slots, and whether weekends sell out
 * - Holiday hours (Dec 24–26, Dec 31, Jan 1); whether open to the public on
 *   PA Day camp days; Monday opening in March Break
 * - Grip-sock price; whether kids may bring their own grip socks; whether
 *   adults need grip socks
 * - Change table; washrooms inside the play area
 * - A separate toddler area and its ages; height limits; a top age for play
 * - Whether the arcade costs extra
 * - Waiver validity, and up to what age kids can be on a parent's waiver
 * - Wheelchair access and an accessible washroom (the site only says
 *   "children of all abilities")
 * - PA Day camp age range and whether it's drop-off
 * - Private party prices other than the $1,900 rental on the Specials page
 * - Photo permission for Compass
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE010_SITE = "https://www.kidzatplay.ca/";
const CONTACT = "https://www.kidzatplay.ca/contact";
const PARTIES = "https://www.kidzatplay.ca/book-a-party";
const SPECIALS = "https://www.kidzatplay.ca/events-and-specials";
const TICKETS = "https://kidzatplay.bookings.pcsparty.com/app/tickets/selection";
const PARTY_BOOKING = "https://kidzatplay.bookings.pcsparty.com/app/obm/selection";
const CAMP_REGISTRATION = "https://kidzatplay.pcsparty.com/store/index.asp";
export const PE010_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE010_SITE, sourceCheckedDate: PE010_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const contact = at(CONTACT);
const parties = at(PARTIES);
const specials = at(SPECIALS);

const ticket = (
  id: string,
  label: string,
  day: "weekday" | "weekend_holiday",
  ageMin: number,
  ageMax: number | null,
  amount: number,
  audience: "child" | "infant",
): VenuePrice => ({
  ...site, id, kind: "admission", label, audience, ageMin, ageMax, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, dayType: day,
  ...(day === "weekday"
    ? { includesNote: "1 adult", adultsIncluded: 1, notes: "Tuesday–Thursday" }
    : { adultsIncluded: 0, notes: "Friday–Sunday · child admission only" }),
});

const party = (guests: number, amount: number): VenuePrice => ({
  ...parties, id: `pe010-party-${guests}`, kind: "party", label: `${guests} guests`, audience: "group", durationMinutes: 120, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true,
  notes: "Guest count includes kids and adults · 2-hour private room, play area shared",
});

export const pe010KidzAtPlay: VenueRecord = {
  place: {
    id: "PE-010",
    slug: "kidz-at-play-mississauga",
    name: "Kidz at Play",
    branchName: null,
    aliases: [],
    description:
      "An indoor playground with a play structure with slides, a pretend-play mini town (Kids Town) and arcade games, plus party rooms and a lounge.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "6991 Millcreek Dr, Unit 2",
    neighbourhood: "Meadowvale",
    websiteUrl: PE010_SITE,
    postalCode: "L5N 6B9",
    allAges: false,
    ageMin: 0,
    ageMax: 10,
    setting: "indoor",
    costTier: "budget",
    typicalVisitMinutes: null,
    typicalVisitNote: "No session length is published",
    compassTake: [
      "Best for: Babies to early primary kids, with a play structure, a pretend-play mini town and arcade games.",
      "Good value: Tuesday to Thursday, each child ticket includes 1 adult; on weekends 9 AM–12 PM, Happy Hour does the same.",
      "Plan ahead: Closed Mondays, and the venue recommends buying tickets online since on-site tickets may be limited or unavailable.",
      "Little ones: Priced from 9 months, with a nursing room; strollers stay in the coat area.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "no",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE010_SITE,
    sourceCheckedDate: PE010_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [
    { ...site, placeType: "Indoor Playgrounds", isPrimary: true },
    { ...site, placeType: "Arcades", isPrimary: false },
  ],
  ageBands: [
    { ...site, band: "0_2", fit: "good", note: "Tickets for infants 9–11 months and kids 12–23 months; nursing room on site" },
    { ...site, band: "3_5", fit: "good" },
    { ...specials, band: "6_9", fit: "good" },
    { ...specials, band: "10_12", fit: "some", note: "No top age published; field trips and camps are designed for ages 1–10" },
  ],
  hours: [
    { weekday: 2, opensAt: "10:00", closesAt: "18:00" },
    { weekday: 3, opensAt: "10:00", closesAt: "20:00" },
    { weekday: 4, opensAt: "10:00", closesAt: "20:00" },
    { weekday: 5, opensAt: "10:00", closesAt: "20:00" },
    { weekday: 6, opensAt: "09:00", closesAt: "20:00" },
    { weekday: 7, opensAt: "09:00", closesAt: "18:00" },
  ].map((h) => ({ ...h, weekday: h.weekday as 2 | 3 | 4 | 5 | 6 | 7, sourceUrl: CONTACT, sourceCheckedDate: PE010_LAST_RESEARCHED })),
  activities: [
    { ...site, id: "pe010-structure", name: "Play Structure", description: "An indoor play structure with slides.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...site, id: "pe010-kids-town", name: "Kids Town", description: "A pretend-play mini town.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...site, id: "pe010-arcade", name: "Arcade Games", description: "An arcade games area.", availability: "available", includedInAdmission: "unknown", schedule: "always" },
  ],
  prices: [
    { ...site, id: "pe010-infant", kind: "admission", label: "Infants 9–11 months", audience: "infant", ageMin: 0, ageMax: 0, amount: 11, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Tuesday–Sunday · \"(Without Paid Sibling)\"" },
    ticket("pe010-12-23-wkd", "Kids 12–23 months", "weekday", 1, 1, 15.5, "infant"),
    ticket("pe010-2up-wkd", "Kids 2 years and up", "weekday", 2, null, 18.5, "child"),
    ticket("pe010-12-23-wke", "Kids 12–23 months", "weekend_holiday", 1, 1, 15.5, "infant"),
    ticket("pe010-2up-wke", "Kids 2 years and up", "weekend_holiday", 2, null, 18.5, "child"),
    { ...site, id: "pe010-adult", kind: "admission", label: "Adult", audience: "adult", amount: 5.5, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Additional adult Tuesday–Thursday; adult ticket Friday–Sunday" },
    { ...specials, id: "pe010-field-trip", kind: "group", label: "Field trip", audience: "child", ageMin: 1, ageMax: 10, durationMinutes: 150, amount: 18.5, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, notes: "Per child · teachers, camp counsellors and administrators free · public hours or private · includes a private party room for backpacks and snacks" },
    party(15, 380),
    party(20, 460),
    party(25, 525),
    party(30, 590),
    party(35, 650),
    party(40, 710),
    party(50, 790),
    party(60, 960),
    { ...parties, id: "pe010-party-extra-guest", kind: "party", label: "Additional guest", audience: "other", amount: 17, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, notes: "Infants under 12 months free" },
    { ...specials, id: "pe010-private-party", kind: "party", label: "Private Party Rental, up to 90 guests", audience: "group", amount: 1900, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true },
  ],
  programs: [
    {
      ...specials, id: "pe010-pa-day-camp", name: "PA Day Adventure Camp",
      description: "Playground access, a mini pancake breakfast, pizza lunch, arts and crafts, STEM activities and challenges, and games and prizes, supervised all day.",
      cadence: "dated",
      scheduleNote: "9:00 AM–4:00 PM on Nov 27, 2026, Jan 18, 2027, Feb 12, 2027 and Jun 14, 2027",
      startsOn: "2026-11-27",
      endsOn: "2027-06-14",
      priceNote: "$79.99 + HST for 1 child; additional siblings $69.99 each. Spaces are limited.",
      registrationUrl: CAMP_REGISTRATION,
    },
  ],
  amenities: [
    { ...contact, amenity: "parking", status: "yes", note: "Lots of spaces, and parking is free" },
    { ...contact, amenity: "stroller_storage", status: "yes", note: "Strollers stay in the coat area" },
    { ...contact, amenity: "grip_socks", status: "yes", note: "Socks sold for adults and children if you forget a pair; price not published" },
    { ...contact, amenity: "outside_food", status: "yes", note: "Nut-free only, eaten in the party rooms or the lounge" },
    { ...contact, amenity: "wifi", status: "yes", note: "Free; ask staff for the password" },
    { ...contact, amenity: "other", status: "yes", note: "Nursing room" },
    { ...parties, amenity: "party_rooms", status: "yes" },
  ],
  policies: [
    { ...contact, kind: "supervision", body: "Unsupervised play facility: a parent or guardian over 18 must supervise their child at all times." },
    { ...contact, kind: "dress_socks", body: "Sock-only facility: all guests must wear socks, and all children must wear non-slip grip socks." },
    { ...contact, kind: "arrival", body: "Shoes and strollers stay in the coat area; strollers aren't allowed in the play area." },
    { ...site, kind: "waiver", body: "You can sign the waiver online before you go." },
    { ...site, kind: "booking_rule", body: "The venue recommends buying tickets online in advance; on-site tickets may be limited or unavailable." },
    { ...contact, kind: "food_rule", body: "Outside food is allowed if it's nut-free, and it must be eaten in the party rooms or the lounge. Cakes, cupcakes, loot bags and gifts aren't allowed in the lounge; book a party room for any celebration." },
    { ...contact, kind: "hours_note", body: "Closed Mondays. Hours are subject to change; the venue says to check Google for the latest hours." },
    { ...specials, kind: "other", body: "Happy Hour, Saturday and Sunday 9 AM–12 PM: 1 adult included with each paid child admission. Only for tickets bought for 9–12; arriving after 12 voids it." },
    { ...contact, kind: "other", body: "The play area stays open to the public during parties." },
    { ...contact, kind: "restriction", body: "No alcohol. No piñatas, sparklers, confetti or glitter." },
    { ...parties, kind: "party", body: "Every birthday package includes a 2-hour private room plus 15 minutes of setup, tables, chairs and a 6 ft x 6 ft backdrop stand, free play for the birthday child, and a party helper and cleanup. The play area is shared with others. Bring your own nut-free food, drinks, tableware and decor." },
    { ...parties, kind: "party", body: "The party date and time must be approved by management before the booking is confirmed." },
    { ...parties, kind: "party", body: "Private parties hold up to 140 guests, with weekday, weekend and after-hours options; ask for pricing with the request form." },
    { ...parties, kind: "party", body: "Extras: helium balloon bouquets from $27 + tax, and character visits from $80 + tax per character." },
    { ...specials, kind: "party", body: "Weeknight bonus: book a party Monday to Friday (5–7, 5:30–7:30 or 6–8 PM) and it's upgraded to a private party free, with a free 30-Day Play Pass (up to 6 visits in 30 days, public play sessions only)." },
    { ...contact, kind: "party", body: "Children can't keep playing after a party ends, because the venue has to control capacity." },
  ],
  links: [
    { ...site, kind: "tickets", value: TICKETS, label: "Buy play tickets" },
    { ...site, kind: "booking", value: PARTY_BOOKING, label: "Book a party" },
    { ...site, kind: "website", value: PE010_SITE, label: "Kidz at Play website" },
    { ...contact, kind: "phone", value: "905-567-0777" },
    { ...contact, kind: "phone", value: "416-994-7406" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
