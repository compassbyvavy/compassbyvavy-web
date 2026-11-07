/**
 * PE-009 — Kidsports Indoor Playground. Real venue record (draft).
 *
 * Source: the venue's own pages (home, admission, membership and party pages,
 * read Oct 27, 2026). The PE number is provisional.
 *
 * Conflicts: the site gives Thursday–Friday hours as 12–8 pm; Google lists
 * Tuesday–Friday 3–8 pm. The site is used, with the hours check flagged.
 * Age 3 fits both the toddler (1–3) and child (3+) tickets; the price tool
 * uses the narrower toddler ticket.
 *
 * Not published, so not stored: the grip-sock price, the outside-food rule,
 * re-entry, parking, washrooms and change tables.
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE009_SITE = "https://www.kidsportsindoorplayground.com/";
const ADMISSION = "https://www.kidsportsindoorplayground.com/admission";
const MEMBERSHIP = "https://www.kidsportsindoorplayground.com/membership";
const PARTIES = "https://www.kidsportsindoorplayground.com/book";
export const PE009_LAST_RESEARCHED = "2026-10-27";

const site: Provenance = { sourceUrl: PE009_SITE, sourceCheckedDate: PE009_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const admission = at(ADMISSION);

const ticket = (id: string, label: string, ageMin: number, ageMax: number | null, amount: number, notes: string): VenuePrice => ({
  ...admission, id, kind: "admission", label, audience: "child", ageMin, ageMax, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, adultsIncluded: 1, notes,
});

const party = (id: string, label: string, amount: number, notes: string): VenuePrice => ({
  ...at(PARTIES), id, kind: "party", label, audience: "group", durationMinutes: 120, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes,
});

export const pe009Kidsports: VenueRecord = {
  place: {
    id: "PE-009",
    slug: "kidsports-indoor-playground",
    name: "Kidsports Indoor Playground",
    branchName: null,
    aliases: ["Kidsports"],
    description:
      "An 18,000 sq ft indoor playground with towering multi-level structures and slides, a soft toddler zone, 20+ arcade games and a soccer arena, with no time limit on play.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "4500 Dixie Rd",
    neighbourhood: "Dixie & Eglinton",
    websiteUrl: PE009_SITE,
    postalCode: "L4W 1V7",
    allAges: false,
    ageMin: 0,
    ageMax: 12,
    setting: "indoor",
    costTier: "budget",
    typicalVisitMinutes: null,
    typicalVisitNote: "No time limit: stay until closing",
    compassTake: [
      "Best for: Burning energy on big multi-level structures and slides, with a soft toddler zone for little ones.",
      "Good value: One admission lets you stay until closing, and one adult comes free with each playing child.",
      "Plan ahead: Closed Mondays, and weekday opening starts in the afternoon.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "unknown",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE009_SITE,
    sourceCheckedDate: PE009_LAST_RESEARCHED,
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
    { ...admission, band: "0_2", fit: "good", note: "Under 12 months free; soft toddler zone" },
    { ...admission, band: "3_5", fit: "good" },
    { ...admission, band: "6_9", fit: "good" },
    { ...admission, band: "10_12", fit: "good" },
  ],
  hours: [
    { weekday: 2, opensAt: "15:00", closesAt: "20:00" },
    { weekday: 3, opensAt: "15:00", closesAt: "20:00" },
    { weekday: 4, opensAt: "12:00", closesAt: "20:00" },
    { weekday: 5, opensAt: "12:00", closesAt: "20:00" },
    { weekday: 6, opensAt: "10:00", closesAt: "20:00" },
    { weekday: 7, opensAt: "10:00", closesAt: "20:00" },
  ].map((h) => ({ ...h, weekday: h.weekday as 2 | 3 | 4 | 5 | 6 | 7, sourceUrl: ADMISSION, sourceCheckedDate: PE009_LAST_RESEARCHED })),
  activities: [
    { ...site, id: "pe009-structures", name: "Multi-level play structures", description: "Towering multi-level structures and big slides.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...site, id: "pe009-toddler", name: "Toddler Zone", description: "A soft, safe zone for babies and young toddlers.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...site, id: "pe009-arcade", name: "Arcade", description: "20+ arcade games with prizes to redeem.", availability: "available", includedInAdmission: "no", extraCostNote: "Play + arcade tickets, or a game card from the front desk", schedule: "always" },
    { ...site, id: "pe009-soccer", name: "KS Soccerplex", description: "An indoor soccer arena.", availability: "available", includedInAdmission: "unknown", schedule: "unknown" },
  ],
  prices: [
    { ...admission, id: "pe009-infant", kind: "admission", label: "Infants under 12 months", audience: "infant", ageMin: 0, ageMax: 0, isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, notes: "With a paying adult" },
    ticket("pe009-toddler", "Toddlers 1–3", 1, 3, 17.99, "Unlimited playtime"),
    ticket("pe009-child", "Children 3+", 3, 17, 19.99, "Unlimited playtime"),
    { ...admission, id: "pe009-adult", kind: "admission", label: "Adult", audience: "adult", amount: 7.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "One adult free with each playing child" },
    { ...admission, id: "pe009-toddler-arcade", kind: "package", label: "Toddler play + arcade", audience: "child", ageMin: 1, ageMax: 3, amount: 22.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null },
    { ...admission, id: "pe009-child-arcade", kind: "package", label: "Child play + arcade", audience: "child", ageMin: 3, ageMax: 17, amount: 24.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null },
    { ...at(MEMBERSHIP), id: "pe009-10-visit", kind: "package", label: "10 Visit Pass", audience: "other", includesNote: "10 visits and a one-time $20 game card", amount: 179.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, notes: "In store only" },
    { ...at(MEMBERSHIP), id: "pe009-monthly", kind: "membership", label: "Monthly Pass", audience: "child", includesNote: "unlimited play for one month and a one-time $10 game card", amount: 99.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, notes: "In store only" },
    party("pe009-party-super", "Super Fun, 8 kids + 8 adults", 399, "1 large pizza · juice box each · $5 game card for the birthday child"),
    party("pe009-party-deluxe", "Deluxe Fun, 15 kids + 15 adults", 499, "1 party-size pizza · juice box each · $5 game card for the birthday child"),
    party("pe009-party-ultimate", "Ultimate Fun, 20 kids + 20 adults", 699, "1 party-size and 1 large pizza · juice box each · $5 game card for every kid · bigger room"),
    party("pe009-party-mega", "Mega Fun, 25 kids + 25 adults", 799, "2 party-size pizzas · juice box each · $5 game card for every kid · bigger room"),
    party("pe009-party-soccer", "Soccer party, from 8 kids + 8 adults", 599, "Details on request"),
    party("pe009-party-steam", "STEAM activities party, from 8 kids + 8 adults", 599, "Details on request"),
  ],
  programs: [],
  amenities: [
    { ...admission, amenity: "grip_socks", status: "yes", note: "Sold at the front desk" },
    { ...at(PARTIES), amenity: "party_rooms", status: "yes" },
  ],
  policies: [
    { ...admission, kind: "supervision", body: "Anyone under 18 must come with a paying adult." },
    { ...admission, kind: "dress_socks", body: "Socks are required for everyone in the play area; grip socks are sold at the front." },
    { ...admission, kind: "arrival", body: "No time limit: once you're in, you can stay until closing." },
    { ...site, kind: "waiver", body: "You can sign the waiver online before you go." },
    { ...admission, kind: "hours_note", body: "Closed Mondays. Google lists Tuesday to Friday as 3–8 pm, while the venue's site gives Thursday and Friday as 12–8 pm; call to confirm weekday hours." },
    { ...at(MEMBERSHIP), kind: "other", body: "A free loyalty card gives you a free visit after 7 paid visits." },
    { ...at(PARTIES), kind: "party", body: "Every party gets 2 hours in a dedicated room, help with setup and cleanup, plates and tablecloths, play time after the party when there's space, and a return pass for the birthday child." },
    { ...at(PARTIES), kind: "party", body: "Extra guests are $25 per child and $8 per adult; call for parties of 30 or more." },
  ],
  links: [
    { ...at(PARTIES), kind: "booking", value: PARTIES, label: "Book a party" },
    { ...site, kind: "website", value: PE009_SITE, label: "Kidsports website" },
    { ...site, kind: "phone", value: "905-624-9400" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
