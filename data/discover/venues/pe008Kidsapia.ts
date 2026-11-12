/**
 * PE-008 — Kidsapia, Erin Mills Town Centre. Real venue record (draft).
 *
 * Source: the venue's own home, pricing and opening-hours pages, read
 * Oct 27, 2026. The PE number is provisional.
 *
 * Conflict: Pyjama Time is $9.50 on the home page and $10 on the pricing
 * page; the pricing page is used, flagged (stored as a visit note).
 * The opening-hours page still lists last year's holiday hours (Dec 2025), so
 * they are not stored.
 *
 * Not published, so not stored: party package prices (on separate pages not
 * read), a sock price, the supervision policy, parking, washrooms and change
 * tables.
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE008_SITE = "https://kidsapia.ca/";
const PRICING = "https://kidsapia.ca/pricing-and-promotions/";
const HOURS = "https://kidsapia.ca/home/opening-hours/";
export const PE008_LAST_RESEARCHED = "2026-10-27";

const site: Provenance = { sourceUrl: PE008_SITE, sourceCheckedDate: PE008_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const pricing = at(PRICING);

function pass(id: string, label: string, day: "weekday" | "weekend_holiday", ageMin: number, ageMax: number | null, amount: number, audience: "child" | "infant" = "child"): VenuePrice {
  return {
    ...pricing, id, kind: "admission", label, audience, ageMin, ageMax, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, dayType: day, adultsIncluded: 1,
    notes: day === "weekday" ? "All-day pass, in and out" : "One entry, no in and out",
  };
}

export const pe008Kidsapia: VenueRecord = {
  place: {
    id: "PE-008",
    slug: "kidsapia-erin-mills",
    name: "Kidsapia",
    branchName: "Erin Mills Town Centre",
    aliases: [],
    description:
      "A space-themed indoor playground in Erin Mills Town Centre with moving play structures and soft play, for children up to 130 cm (52 inches) tall.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "Erin Mills Town Centre, 5100 Erin Mills Pkwy (lower level, near Walmart)",
    neighbourhood: "Erin Mills",
    websiteUrl: PE008_SITE,
    postalCode: "L5M 4Z5",
    allAges: false,
    ageMin: 0,
    ageMax: 8,
    setting: "indoor",
    costTier: "budget",
    typicalVisitMinutes: null,
    typicalVisitNote: "Weekday passes are all day with in-and-out",
    compassTake: [
      "Best for: Toddlers to early primary kids up to 130 cm tall, in a space-themed play structure.",
      "Good value: Weekday passes last all day with in-and-out, so you can shop the mall and come back.",
      "Deals: Half price on Wednesdays (ages 2+), and a cheaper last hour Monday to Thursday (Pyjama Time).",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "unknown",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE008_SITE,
    sourceCheckedDate: PE008_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [
    { ...site, placeType: "Indoor Playgrounds", isPrimary: true },
  ],
  ageBands: [
    { ...pricing, band: "0_2", fit: "good", note: "Toddler and baby prices; babies free with a paying sibling on weekdays" },
    { ...site, band: "3_5", fit: "good" },
    { ...site, band: "6_9", fit: "some", note: "Kids must be 130 cm (52 in) or shorter" },
    { ...site, band: "10_12", fit: "limited", note: "Most are taller than the 130 cm limit" },
  ],
  hours: [
    ...([1, 2, 3, 4, 5, 6] as const).map((weekday) => ({ weekday, opensAt: "10:00", closesAt: "20:00" })),
    { weekday: 7 as const, opensAt: "11:00", closesAt: "19:00" },
  ].map((h) => ({ ...h, sourceUrl: HOURS, sourceCheckedDate: PE008_LAST_RESEARCHED })),
  activities: [
    { ...site, id: "pe008-structure", name: "Space-themed play structure", description: "Moving play structures with a space theme.", availability: "available", includedInAdmission: "yes", schedule: "always", maxHeightCm: 130 },
    { ...site, id: "pe008-soft-play", name: "Soft play", description: "Soft play designed for young children.", availability: "available", includedInAdmission: "yes", schedule: "always" },
  ],
  prices: [
    pass("pe008-wkd-2", "Ages 2 and up", "weekday", 2, 17, 20),
    pass("pe008-wkd-toddler", "Toddlers 12–23 months", "weekday", 1, 1, 12, "infant"),
    { ...pass("pe008-wkd-baby", "Babies 0–11 months", "weekday", 0, 0, 10, "infant"), notes: "All-day pass, in and out · free with a paying sibling" },
    pass("pe008-wke-2", "Ages 2 and up", "weekend_holiday", 2, 17, 22),
    pass("pe008-wke-toddler", "Toddlers 12–23 months", "weekend_holiday", 1, 1, 14, "infant"),
    pass("pe008-wke-baby", "Babies 0–11 months", "weekend_holiday", 0, 0, 12, "infant"),
    { ...pricing, id: "pe008-adult", kind: "admission", label: "Extra adult", audience: "adult", amount: 6, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, notes: "One adult free with each child" },
  ],
  programs: [
    { ...site, id: "pe008-robotics", name: "Robotics camps", description: "Robotics camps for kids.", cadence: "seasonal", registrationUrl: "https://kidsapia.ca/kidsapia-robotic-camps/" },
  ],
  amenities: [
    { ...site, amenity: "party_rooms", status: "yes" },
  ],
  policies: [
    { ...site, kind: "height_limit", body: "The play area is for kids 130 cm (52 inches) tall or shorter." },
    { ...site, kind: "dress_socks", body: "Socks are required for everyone, adults included." },
    { ...site, kind: "waiver", body: "A parent or guardian must sign a waiver for every child; you can sign it online before you go." },
    { ...pricing, kind: "booking_rule", body: "Walk in; no reservation needed." },
    { ...pricing, kind: "arrival", body: "Weekends and holidays are one entry only; weekday passes allow in and out all day." },
    { ...pricing, kind: "other", body: "Weekly deals: grandparent Mondays 2-for-1, twin Tuesdays half price, Wacky Wednesdays half price (ages 2+), and 10% off passes on Thursdays. Deals can't be combined and don't apply to toddlers or babies." },
    {
      ...pricing, kind: "other", body: "Pyjama Time: $10 per child (ages 2+) for the last hour, Monday to Thursday 7–8 pm.",
      verificationStatus: "conflicting",
      conflictNote: "The pricing page says $10; the home page says $9.50.",
    },
    { ...pricing, kind: "other", body: "Daycares and small regular groups can ask for special rates." },
    { ...at(HOURS), kind: "hours_note", body: "Hours follow Erin Mills Town Centre and can change for maintenance, private events or school trips; call before you go." },
    { ...site, kind: "location_note", body: "Lower level of the mall, in the Walmart aisle; Entrance A is closest." },
    { ...site, kind: "party", body: "Party packages for 10 (Happy), 15 (Happier) and 20 kids (Happiest), plus larger and private parties; staff help with setup." },
  ],
  links: [
    { ...site, kind: "website", value: PE008_SITE, label: "Kidsapia website" },
    { ...site, kind: "phone", value: "289-997-9177" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
