/**
 * PE-005 — Funday! Family Centre. Real venue record (draft).
 *
 * Source: the venue's own site, read Nov 7, 2026. thefunday.ca is a Wix site
 * and every page body came back empty to the fetcher; only each page's title
 * and meta description could be read (home, Open Play, Visit, Memberships,
 * Parties, Party Room, Party Tour, Ultimate Experience, Full Facility, Academy
 * and Summer Camp). The FAQ page failed to load twice. Every fact below is
 * one those titles and descriptions state; the October baseline is not used.
 *
 * Not published (not readable on the site), so not stored: opening hours
 * (the site says only "seven days a week", so hoursKind is "unknown"),
 * open-play prices by age, session times and length, adult and infant
 * prices, whether prices include HST, re-entry, holiday hours (Dec 24, 25,
 * 26, 31 and Jan 1), PA Day and March Break hours or prices, the socks
 * policy and price, the waiver policy, toddler zone ages and Play City
 * height limits, washrooms, change tables, nursing space, strollers,
 * outside food and food sold on site, supervision rules, wheelchair access,
 * party package prices and the Friday rate, which membership tier the
 * "from $99 a month" price is for, the postal code, an email address, and
 * photo permission.
 */

import type { Provenance, VenueRecord } from "@/data/discover/venueTypes";

export const PE005_SITE = "https://www.thefunday.ca/";
const OPEN_PLAY = "https://www.thefunday.ca/open-play";
const VISIT = "https://www.thefunday.ca/visit";
const MEMBERSHIPS = "https://www.thefunday.ca/memberships";
const PARTIES = "https://www.thefunday.ca/parties";
const PARTY_TOUR = "https://www.thefunday.ca/party-tour";
const ULTIMATE = "https://www.thefunday.ca/ultimate-experience";
const FULL_FACILITY = "https://www.thefunday.ca/full-facility";
const ACADEMY = "https://www.thefunday.ca/academy";
const SUMMER_CAMP = "https://www.thefunday.ca/summer-camp-mississauga";
export const PE005_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE005_SITE, sourceCheckedDate: PE005_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const openPlay = at(OPEN_PLAY);
const visit = at(VISIT);
const parties = at(PARTIES);

export const pe005Funday: VenueRecord = {
  place: {
    id: "PE-005",
    slug: "funday-family-centre-mississauga",
    name: "Funday! Family Centre",
    branchName: null,
    aliases: ["Funday!", "Funday", "Funday! Family Centre & Indoor Playground"],
    description:
      "A 10,000 sq ft indoor playground at Dixie & Dundas with the Play City soft play structure, a toddler zone, a ball pit and slides for ages 0–12, plus five private party rooms and Funday Academy camps and programs.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "1224 Dundas Street East, Unit 26",
    neighbourhood: "Dixie & Dundas",
    websiteUrl: PE005_SITE,
    postalCode: null,
    allAges: false,
    ageMin: 0,
    ageMax: 12,
    setting: "indoor",
    costTier: "unknown",
    typicalVisitMinutes: null,
    typicalVisitNote: null,
    compassTake: [
      "Best for: Ages 0–12, with the Play City soft play structure, a ball pit and slides, and a toddler zone for little ones.",
      "Good value: Unlimited-play memberships start at $99 a month, with no contract.",
      "Plan ahead: Open play runs seven days a week and walk-ins are welcome; call 647-212-7433 to check hours and prices before you go.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "unknown",
    hoursKind: "unknown",
    latitude: null,
    longitude: null,
    sourceUrl: PE005_SITE,
    sourceCheckedDate: PE005_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [
    { ...site, placeType: "Indoor Playgrounds", isPrimary: true },
  ],
  ageBands: [
    { ...openPlay, band: "0_2", fit: "good", note: "Toddler zone (ages not published); open play is for ages 0–12" },
    { ...openPlay, band: "3_5", fit: "good" },
    { ...openPlay, band: "6_9", fit: "good" },
    { ...openPlay, band: "10_12", fit: "good" },
  ],
  hours: [],
  activities: [
    { ...openPlay, id: "pe005-play-city", name: "Play City", description: "A soft play structure.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...openPlay, id: "pe005-toddler", name: "Toddler zone", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...openPlay, id: "pe005-ball-pit", name: "Ball pit", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...openPlay, id: "pe005-slides", name: "Slides", availability: "available", includedInAdmission: "yes", schedule: "always" },
  ],
  prices: [
    { ...at(MEMBERSHIPS), id: "pe005-membership-from", kind: "membership", label: "Membership, from", audience: "other", includesNote: "Unlimited indoor play", amount: 99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Published as \"from $99 a month\"; the tier at this price isn't stated. Gold: weekdays, Monday to Friday. Diamond: all seven days, plus guest passes and party discounts. No contract, cancel anytime." },
  ],
  programs: [
    { ...at(ACADEMY), id: "pe005-academy", name: "Funday Academy", description: "Camps and structured kids programs with active play, crafts, STEM and games, led by a Registered ECE and a trained team.", attendance: null, cadence: "ongoing", ageMin: 4, ageMax: 12 },
    { ...at(SUMMER_CAMP), id: "pe005-summer-camp", name: "Summer camp", description: "Weekly summer camp, fully indoor and air conditioned, with active play, crafts, STEM, water days and field trips, led by a Registered ECE and a trained team.", attendance: "drop_off", cadence: "seasonal", scheduleNote: "Weekly sessions; early drop-off and late pick-up available", ageMin: 4, ageMax: 12 },
  ],
  amenities: [
    { ...visit, amenity: "parking", status: "yes", note: "Free parking on site" },
    { ...parties, amenity: "party_rooms", status: "yes", note: "Five private party rooms for 10 to 200 guests" },
  ],
  policies: [
    { ...visit, kind: "hours_note", body: "Open seven days a week; call 647-212-7433 for opening hours." },
    { ...openPlay, kind: "booking_rule", body: "Walk-ins welcome for open play." },
    { ...parties, kind: "party", body: "All-inclusive party packages with a private room, a dedicated party host, unlimited playground access, food options and character add-ons. Five rooms for 10 to 200 guests." },
    { ...at(PARTY_TOUR), kind: "party", body: "Book a free walkthrough to see Play City and all five party rooms and go over packages and pricing before you book." },
    { ...at(ULTIMATE), kind: "party", body: "The Ultimate Party Experience adds a professional character performer and themed décor to any party room, at a special package price." },
    { ...at(FULL_FACILITY), kind: "party", body: "Full facility buyouts of the whole 10,000 sq ft venue for private events of up to 200 guests." },
  ],
  links: [
    { ...site, kind: "website", value: PE005_SITE, label: "Funday! website" },
    { ...parties, kind: "phone", value: "647-212-7433" },
    { ...at(PARTY_TOUR), kind: "booking", value: PARTY_TOUR, label: "Book a party tour" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
