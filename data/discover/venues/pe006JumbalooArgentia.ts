/**
 * PE-006 — Jumbaloo, Argentia. Real venue record (draft).
 *
 * Source: the venue's own pages (Argentia home, playtime, FAQ and offers pages,
 * the contact page and the policy page), read Nov 7, 2026. The PE number is
 * provisional.
 *
 * The playtime price list shows the five labels first, then the five prices, in
 * the same order; prices are paired with labels in that order. The infant label
 * is cut off on the page ("free with a playing sibling or").
 *
 * Conflicts on the venue's own pages, and how they are handled:
 * - Weekday hours: the home page hours block says Mon–Fri 10 am–8 pm; the
 *   contact page, footer and policy page say 12–8 pm. Stored as 12–8, flagged.
 * - Toddler zone ages: the home page says "made for ages 1–4"; the FAQ says
 *   "designed for children under 3". Stored as under 3, flagged.
 * - Adult admission: the price list says $3.25 + HST; the FAQ on the same
 *   playtime page says $3.29 + HST. Stored as $3.25, flagged.
 * - Renovation: the pages still show a "Coming Soon" banner and a "Getting a
 *   Glow-Up!" renovation pop-up, while the home page calls Argentia "newly
 *   renovated". Stored as a note, flagged.
 * - Booking: the playtime FAQ says sessions are walk-in; the FAQ page
 *   recommends booking for holidays and busy weekends. Both kept in one rule.
 *
 * Not published, so not stored: whether a baby under 1 is $10 without a
 * playing sibling (label cut off); whether prices differ on weekdays and
 * weekends; the Toddler Tuesday price and times; whether walk-ins can be
 * turned away when slots are full; re-entry within a slot; Dec 24, 25, 26,
 * 31 and Jan 1 hours; PA day and March Break hours; the sock price and
 * whether regular socks are fine; who signs the waiver and how long it lasts;
 * change tables, nursing space and washrooms; wheelchair access and an
 * accessible washroom; age or height limits on the ziplines, slides and the
 * Level Two sports field; whether the renovation is finished and every new
 * zone (including the new ball pit) is open; photo permission.
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE006_SITE = "https://jumbaloo.com/argentia/";
const PLAYTIME = "https://jumbaloo.com/argentia/playtime/";
const FAQS = "https://jumbaloo.com/argentia/faqs/";
const OFFERS = "https://jumbaloo.com/argentia/offers/";
const CONTACT = "https://jumbaloo.com/contact-us/";
const POLICY = "https://jumbaloo.com/policy/";
const BOOK_PLAYTIME = "https://jumbaloo.pcsparty.com/bookings/index.asp?event_id=405152&event_md=&event_mde=&event_mt=";
const BOOK_PARTY = "https://jumbaloo.pcsparty.com/bookings/";
export const PE006_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE006_SITE, sourceCheckedDate: PE006_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const playtime = at(PLAYTIME);
const faqs = at(FAQS);
const policy = at(POLICY);

const ticket = (id: string, label: string, ageMin: number, ageMax: number, amount: number): VenuePrice => ({
  ...playtime, id, kind: "admission", label, audience: "child", ageMin, ageMax, durationMinutes: 120, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, adultsIncluded: 0,
});

const HOURS_CONFLICT = "The home page hours block says Monday to Friday 10 am–8 pm; the contact page and footer say 12–8 pm.";

export const pe006JumbalooArgentia: VenueRecord = {
  place: {
    id: "PE-006",
    slug: "jumbaloo-argentia",
    name: "Jumbaloo",
    branchName: "Argentia",
    aliases: ["Jumbaloo Argentia", "Jumbaloo Playgrounds"],
    description:
      "An indoor playground with multi-level structures, wave and spiral slides, ziplines, trampolines, a sports arena for older siblings, arcade games and an enclosed toddler zone, played in 2-hour slots.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "3135 Argentia Road, Unit 3",
    neighbourhood: "Meadowvale",
    websiteUrl: PE006_SITE,
    postalCode: "L5N 8E1",
    allAges: false,
    ageMin: 0,
    ageMax: 12,
    setting: "indoor",
    costTier: "moderate",
    typicalVisitMinutes: 120,
    typicalVisitNote: "Playtime is limited to 2 hours (120 minutes), and a new slot starts every hour",
    compassTake: [
      "Best for: Mixed ages: an enclosed toddler zone with a ball pit, plus slides, ziplines, trampolines and a sports arena for older siblings.",
      "Good value: Adult admission is a few dollars rather than a full ticket, and parking is free right outside.",
      "Plan ahead: Playtime runs in 2-hour slots that can't be extended if you're late; booking is recommended for holidays and busy weekends.",
      "Little ones: Under-4s in the main structure need a parent or a sibling over 6 with them, and strollers stay in the front lobby.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "no",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE006_SITE,
    sourceCheckedDate: PE006_LAST_RESEARCHED,
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
    { ...faqs, band: "0_2", fit: "good", note: "Toddler zone for children under 3", conflictNote: "The home page says the toddler zone is made for ages 1–4; the FAQ says under 3." },
    { ...playtime, band: "3_5", fit: "good" },
    { ...playtime, band: "6_9", fit: "good" },
    { ...policy, band: "10_12", fit: "good", note: "Playground equipment is designed for children under 12" },
    { ...playtime, band: "13_17", fit: "some", note: "Youth ticket for ages 13–16; sports arena for older siblings" },
  ],
  hours: [
    ...([1, 2, 3, 4, 5] as const).map((weekday) => ({ weekday, opensAt: "12:00", closesAt: "20:00", notes: HOURS_CONFLICT, sourceUrl: CONTACT, sourceCheckedDate: PE006_LAST_RESEARCHED })),
    ...([6, 7] as const).map((weekday) => ({ weekday, opensAt: "09:00", closesAt: "20:00", sourceUrl: CONTACT, sourceCheckedDate: PE006_LAST_RESEARCHED })),
  ],
  activities: [
    { ...playtime, id: "pe006-structures", name: "Jungle gym", description: "Multi-level structures with bridges, tunnels, obstacle-style challenges, and wave and spiral slides.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    {
      ...faqs, id: "pe006-toddler", name: "Toddler zone", description: "A dedicated zone with soft, safe play equipment, a ball pit and play panels with games.", availability: "available", includedInAdmission: "yes", schedule: "always", ageMax: 2,
      conflictNote: "The home page says the toddler zone is made for ages 1–4; the FAQ says it is designed for children under 3.",
    },
    { ...site, id: "pe006-ziplines", name: "Ziplines and trampolines", description: "Ziplines and trampolines alongside the slides.", availability: "available", includedInAdmission: "unknown", schedule: "unknown" },
    { ...playtime, id: "pe006-sports", name: "Sports arena", description: "A sports arena for older siblings.", availability: "available", includedInAdmission: "yes", schedule: "always" },
    { ...faqs, id: "pe006-arcade", name: "Arcade games", description: "Arcade games played with reloadable arcade cards.", availability: "available", includedInAdmission: "no", extraCostNote: "Arcade cards are bought at the arcade counter or reception; they don't expire and can be reloaded", schedule: "always" },
  ],
  prices: [
    {
      ...playtime, id: "pe006-infant", kind: "admission", label: "Infant", audience: "infant", ageMin: 0, ageMax: 0, isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, eligibility: "With a playing sibling",
      notes: "The label is cut off on the price list (\"free with a playing sibling or\"); the price listed first is $10 + HST",
    },
    ticket("pe006-toddler", "Toddler (1–3 yrs)", 1, 3, 16),
    ticket("pe006-child", "Child (4–12 yrs)", 4, 12, 21.5),
    ticket("pe006-youth", "Youth (13–16 yrs)", 13, 16, 13),
    {
      ...playtime, id: "pe006-adult", kind: "admission", label: "Adults", audience: "adult", durationMinutes: 120, amount: 3.25, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true,
      notes: "Every adult who comes in pays; one adult admission can't be shared between 2 adults",
      conflictNote: "The price list says $3.25 + HST; the FAQ on the playtime page says adults pay $3.29 + HST.",
    },
  ],
  programs: [],
  amenities: [
    { ...playtime, amenity: "parking", status: "yes", note: "Free parking right outside the entrance" },
    { ...playtime, amenity: "parent_seating", status: "yes", note: "A seating area with a view of the whole space" },
    { ...playtime, amenity: "wifi", status: "yes", note: "Free Wi-Fi in the parent seating area" },
    { ...faqs, amenity: "food_onsite", status: "yes", note: "Snacks and drinks at the snack rack; water is sold at the snack counter" },
    { ...policy, amenity: "outside_food", status: "no", note: "Except baby bottles, baby food and fresh fruit and vegetables" },
    { ...faqs, amenity: "stroller_access", status: "no", note: "Strollers can come as far as the front lobby, not into the play area" },
    { ...faqs, amenity: "party_rooms", status: "yes", note: "Three dedicated party rooms" },
  ],
  policies: [
    { ...faqs, kind: "supervision", body: "Jumbaloo is an unsupervised playground: an adult must come in with children and is responsible for their safety and safe use of the equipment at all times." },
    { ...policy, kind: "supervision", body: "Siblings over 6 and parents must go with children under 4 in the main play structure. Staff help but don't provide childcare." },
    { ...policy, kind: "age_guidance", body: "Playground equipment is designed for children under 12." },
    { ...faqs, kind: "waiver", body: "Parents or guardians must sign a waiver for their child; it's on Jumbaloo's website, so you can sign before you arrive." },
    { ...faqs, kind: "dress_socks", body: "Sock-only for everyone, adults included: no bare feet, shoes or slippers past the front lobby. Socks can be bought at entry." },
    { ...faqs, kind: "booking_rule", body: "Walk-ins are always welcome, but booking is recommended for holidays and busy weekends." },
    { ...playtime, kind: "booking_rule", body: "Reserve your slot online, or same day over the phone." },
    { ...playtime, kind: "arrival", body: "Playtime is limited to 2 hours (120 minutes), and a new slot starts every hour. Playtime can't be extended if you arrive late." },
    { ...faqs, kind: "arrival", body: "Everyone who comes in gets a wristband and counts toward capacity, so older children who aren't playing still pay." },
    { ...policy, kind: "arrival", body: "Wristbands are linked to your order number and must be shown at the exit gate." },
    { ...faqs, kind: "arrival", body: "Strollers can come as far as the front lobby, not into the play area; don't leave bags or valuables with the stroller." },
    { ...policy, kind: "food_rule", body: "No outside food or drinks, except baby bottles, baby food and fresh fruit and vegetables. No food, drinks, candy or gum in the playground." },
    { ...faqs, kind: "food_rule", body: "There's no water fountain; you can bring your own water bottle or buy water at the snack counter." },
    { ...at(CONTACT), kind: "hours_note", body: "Weekdays 12–8 pm and weekends 9 am–8 pm per the contact page; call to confirm weekday opening time.", conflictNote: HOURS_CONFLICT },
    {
      ...site, kind: "other", body: "The home page describes Argentia as newly renovated, with brighter slides, bouncier trampolines and new zones.",
      conflictNote: "A \"Coming Soon\" banner and a \"Getting a Glow-Up!\" renovation pop-up still show on the same pages; check which zones are open before you go.",
    },
    { ...at(OFFERS), kind: "other", body: "Toddler Tuesday: special admission pricing for toddlers every Tuesday (the price isn't published)." },
    { ...faqs, kind: "other", body: "No pets except service animals, and no alcohol." },
    { ...faqs, kind: "party", body: "Parties must always be booked ahead; there are three dedicated party rooms." },
    { ...at(OFFERS), kind: "party", body: "20% off weekday parties (Monday to Thursday) in 2026." },
  ],
  links: [
    { ...playtime, kind: "booking", value: BOOK_PLAYTIME, label: "Book a playtime" },
    { ...site, kind: "booking", value: BOOK_PARTY, label: "Book a party" },
    { ...site, kind: "website", value: PE006_SITE, label: "Jumbaloo Argentia" },
    { ...at(CONTACT), kind: "phone", value: "905-785-3990" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
