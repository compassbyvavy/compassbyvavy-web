/**
 * PE-018 — DiNOViLLE Indoor Playground. Real venue record (draft).
 *
 * Source: the venue's own pages (home, Daily Admissions, Private Parties,
 * Waiver, Rules, Contact Us, FAQs, About Us and Franchise), read Nov 7, 2026.
 * The PE number is provisional. The call sheet has not yet confirmed the
 * venue is open at this address, so operatingStatus is "unknown".
 *
 * Conflicts on the venue's own pages, and how they are handled:
 * - Hours: the Contact page lists Mon–Fri 11 am–7 pm and Sat–Sun 10:30 am–8 pm.
 *   The home page's dated drop-in schedule (Oct 26–Nov 8) shows Fridays
 *   11 am–4:30 pm and every weekend "Closed for private events". The Contact
 *   hours are stored, with the conflict on the hours note and a call-ahead
 *   booking rule.
 * - Outside food: the FAQ ("during drop-in visits") allows nut-free food in
 *   the dining area; the Rules page allows none except for a medical
 *   condition or baby food, unless it's a private party. The more specific
 *   FAQ answer is stored, with the Rules wording in conflictNote.
 * - Email: the Contact page shows info@dinoville.ca, but the site's email
 *   link points to a placeholder address; no email is stored.
 *
 * Not published, so not stored: an age range for the playground or the
 * toddler area (so no 10–12 age band), whether a baby under 1 is free
 * without a paying sibling, whether the $10 price changes on weekends or
 * holidays, re-entry, posted hours after Nov 8, holiday hours (Dec 24, 25,
 * 26, 31 and Jan 1), PA Day and March Break hours, washrooms, change tables,
 * nursing space, parking, wheelchair access, and photo permission.
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE018_SITE = "https://www.dinoville.ca/";
const ABOUT = "https://www.dinoville.ca/home-2852-1557";
const ADMISSIONS = "https://www.dinoville.ca/home-2852-1557-5511";
const PARTIES = "https://www.dinoville.ca/home-2852-1557-5511-2478";
const WAIVER = "https://www.dinoville.ca/home-2852-1557-5511-2478-3124";
const RULES = "https://www.dinoville.ca/rules";
const CONTACT = "https://www.dinoville.ca/home-2852-2003";
const FAQ = "https://www.dinoville.ca/faq";
export const PE018_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE018_SITE, sourceCheckedDate: PE018_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const admissions = at(ADMISSIONS);
const parties = at(PARTIES);
const rules = at(RULES);
const faq = at(FAQ);

const party = (id: string, label: string, day: "weekday" | "weekend_holiday", amount: number, includesNote: string): VenuePrice => ({
  ...parties, id, kind: "party", label, audience: "group", durationMinutes: 120, includesNote, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, dayType: day,
  notes: day === "weekday" ? "Monday to Friday" : "Saturday, Sunday and holidays",
});

export const pe018Dinoville: VenueRecord = {
  place: {
    id: "PE-018",
    slug: "dinoville-indoor-playground-mississauga",
    name: "DiNOViLLE Indoor Playground",
    branchName: null,
    aliases: ["DiNOViLLE", "DiNOViLLe", "Dinoville", "Dinoville Indoor Playground"],
    description:
      "An indoor playground with play structures, slides, ladders and tunnels, a dedicated toddler area and the Dino Munchies Snack Bar. One all-day price covers kids of all ages, and parents get in free.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "2380 Royal Windsor Dr, Unit 5",
    neighbourhood: null,
    websiteUrl: PE018_SITE,
    postalCode: "L5J 1K6",
    allAges: false,
    ageMin: 0,
    ageMax: null,
    setting: "indoor",
    costTier: "budget",
    typicalVisitMinutes: null,
    typicalVisitNote: "Admission is an all-day pass",
    compassTake: [
      "Good value: An all-day pass is $10 + HST per child, and parents and guardians get in free with a child.",
      "Little ones: There's a dedicated toddler area. Ladders and tunnels are meant for kids 7 and up, and kids 6 and under must be fully supervised.",
      "Plan ahead: Drop-in hours change around private parties (the posted schedule had weekends closed for private events), so call before you go.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "no",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE018_SITE,
    sourceCheckedDate: PE018_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "unknown",
  },
  cityName: "Mississauga",
  types: [
    { ...site, placeType: "Indoor Playgrounds", isPrimary: true },
  ],
  ageBands: [
    { ...admissions, band: "0_2", fit: "good", note: "Dedicated toddler area (ages not stated); under 1 free with a paid sibling" },
    { ...rules, band: "3_5", fit: "good", note: "Kids 6 and under must be fully supervised; ladders and tunnels are for 7 and up" },
    { ...rules, band: "6_9", fit: "good", note: "Ladders and tunnels are meant for kids 7 and up" },
  ],
  // Contact page hours. The home page's dated schedule differs (see the hours note).
  hours: [
    { weekday: 1, opensAt: "11:00", closesAt: "19:00" },
    { weekday: 2, opensAt: "11:00", closesAt: "19:00" },
    { weekday: 3, opensAt: "11:00", closesAt: "19:00" },
    { weekday: 4, opensAt: "11:00", closesAt: "19:00" },
    { weekday: 5, opensAt: "11:00", closesAt: "19:00", notes: "The home page's dated drop-in schedule shows Fridays 11 am–4:30 pm; call ahead" },
    { weekday: 6, opensAt: "10:30", closesAt: "20:00", notes: "The home page's dated drop-in schedule shows weekends closed for private events; call ahead" },
    { weekday: 7, opensAt: "10:30", closesAt: "20:00", notes: "The home page's dated drop-in schedule shows weekends closed for private events; call ahead" },
  ].map((h) => ({ ...h, weekday: h.weekday as 1 | 2 | 3 | 4 | 5 | 6 | 7, sourceUrl: CONTACT, sourceCheckedDate: PE018_LAST_RESEARCHED })),
  activities: [
    { ...rules, id: "pe018-play-structures", name: "Play structures", description: "Play structures with slides, ladders, tunnels and protective nets.", availability: "available", includedInAdmission: "yes", schedule: "always", safetyNote: "Ladders and tunnels are meant for kids 7 and up; kids 6 and under must be fully supervised. No going up the slides, down the ladders, or climbing the nets." },
    { ...faq, id: "pe018-toddler", name: "Toddler area", description: "A dedicated toddler area with safe, age-appropriate toys.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...faq, id: "pe018-trampoline", name: "Trampoline", description: "There is no trampoline.", availability: "not_offered", includedInAdmission: "no", schedule: "unknown" },
  ],
  prices: [
    { ...admissions, id: "pe018-child", kind: "admission", label: "Child, all-day pass", audience: "child", includesNote: "All-day pass", amount: 10, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, notes: "One price for all ages" },
    { ...admissions, id: "pe018-under1", kind: "admission", label: "Under 1", audience: "infant", ageMin: 0, ageMax: 0, isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Free with a paid sibling" },
    { ...admissions, id: "pe018-parent", kind: "admission", label: "Parent or guardian", audience: "adult", isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Free when accompanying a child" },
    { ...admissions, id: "pe018-group", kind: "group", label: "Group of 7 or more paying kids", audience: "group", amount: 9, isFree: false, currency: "CAD", requiredAddon: false, plusTax: false, eligibility: "7 or more paying kids", notes: "$9 per child, including HST; one combined payment from the host of the playdate" },
    { ...rules, id: "pe018-socks", kind: "addon", label: "Socks", audience: "other", amount: 2, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Per pair at the front desk, if you forget your socks" },
    party("pe018-party1-weekday", "Dino Package #1, up to 15 kids + 25 parents/guardians", "weekday", 320, "2 hours of private, exclusive use of the whole playground"),
    party("pe018-party1-weekend", "Dino Package #1, up to 15 kids + 25 parents/guardians", "weekend_holiday", 370, "2 hours of private, exclusive use of the whole playground"),
    party("pe018-party2-weekday", "Dino Package #2, up to 25 kids + 35 parents/guardians", "weekday", 345, "2 hours of private, exclusive use of the whole playground"),
    party("pe018-party2-weekend", "Dino Package #2, up to 25 kids + 35 parents/guardians", "weekend_holiday", 395, "2 hours of private, exclusive use of the whole playground"),
    { ...parties, id: "pe018-party-extra-child", kind: "party", label: "Party: additional child", audience: "child", amount: 10, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Per child, added to either package" },
    { ...parties, id: "pe018-party-extra-adult", kind: "party", label: "Party: additional parent/guardian", audience: "adult", amount: 5, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Per parent/guardian, added to either package" },
    { ...parties, id: "pe018-party-deposit", kind: "fee", label: "Party deposit", audience: "other", amount: 100, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Non-refundable and non-transferable; required at the time of booking" },
  ],
  programs: [],
  amenities: [
    { ...at(ABOUT), amenity: "food_onsite", status: "yes", note: "Dino Munchies Snack Bar: snacks, treats, juices, milk, ice cream and freezes; soft drinks and cold coffees for adults" },
    { ...at(ABOUT), amenity: "wifi", status: "yes", note: "Free Wi-Fi" },
    { ...rules, amenity: "grip_socks", status: "yes", note: "Socks sold at the front desk for $2 a pair" },
    { ...rules, amenity: "allergy_info", status: "yes", note: "Nut-aware: no foods containing nuts allowed, but not a guaranteed nut-free facility" },
    { ...faq, amenity: "outside_food", status: "yes", note: "On drop-in visits, if it's nut-free and kept in the dining area", conflictNote: "FAQ says outside food is allowed during drop-in visits if nut-free and kept in the dining area; Rules page says no outside food except for a medical condition or an infant's baby food and milk, unless it's a private party." },
  ],
  policies: [
    { ...site, kind: "hours_note", body: "Drop-in hours are posted week by week on the home page. The schedule posted on Nov 7 (Oct 26–Nov 8) showed Mon–Thu 11 am–7 pm, Fri 11 am–4:30 pm, and Sat–Sun closed for private events.", conflictNote: "Contact page lists Mon–Fri 11 am–7 pm and Sat–Sun 10:30 am–8 pm; the home page's dated schedule shows Fridays 11 am–4:30 pm and weekends closed for private events." },
    { ...admissions, kind: "booking_rule", body: "Drop-in hours may vary due to private party bookings, so call ahead before dropping in: 905-822-1120." },
    { ...at(WAIVER), kind: "waiver", body: "Every guest needs a waiver, shown to staff on arrival. A parent or legal guardian signs for anyone under 18, online on the site's Waiver page, and it stays valid for future visits until revoked in writing." },
    { ...rules, kind: "supervision", body: "DiNOViLLE is an unsupervised playground: parents and guardians must supervise their children at all times." },
    { ...faq, kind: "supervision", body: "No drop-offs: a parent or guardian must stay with their child." },
    { ...rules, kind: "age_guidance", body: "Ladders and tunnels are meant for children 7 and up. Children 6 and under must be fully supervised by a parent or guardian." },
    { ...rules, kind: "dress_socks", body: "Kids and their parents or guardians must wear socks inside the playground. Forgot yours? Socks are $2 a pair at the front desk." },
    { ...faq, kind: "arrival", body: "Strollers are allowed only in the dining area, not near the play structures." },
    { ...rules, kind: "food_rule", body: "No food or drinks in or around the play structures, even during private parties. No foods containing nuts." },
    { ...rules, kind: "restriction", body: "No outside toys or sharp objects, no confetti, silly string or glitter, and no vaping, smoking or alcohol." },
    { ...faq, kind: "other", body: "No memberships or loyalty programs." },
    { ...faq, kind: "other", body: "There's no lost and found, so check for your belongings before you leave." },
    { ...parties, kind: "party", body: "A private party closes the entire playground to other guests for 2 hours. Hosts bring their own food, cutlery, non-alcoholic drinks and decorations. Holidays are priced like weekends." },
    { ...faq, kind: "party", body: "The $100 deposit is due within 24 hours of choosing a date and time; the balance is due on the party day. Babies under 1 and the birthday child don't count toward the kids' headcount; hosting parents count as adults." },
    { ...faq, kind: "party", body: "Not allowed at parties: electric appliances (microwaves, kettles, coffee machines, crockpots, food warmers, hot plates), flame-heated chafing dishes, and bubble shows." },
  ],
  links: [
    { ...site, kind: "website", value: PE018_SITE, label: "DiNOViLLE website" },
    { ...at(CONTACT), kind: "phone", value: "905-822-1120" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
