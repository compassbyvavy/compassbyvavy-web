/**
 * PE-011 — Mighty Jungle Indoor Playground. Real venue record (draft).
 *
 * Source: the venue's own pages (home, drop-in hours and prices, FAQ, rules,
 * parties, party add-ons and contact pages), read Nov 7, 2026. The PE number
 * is provisional.
 *
 * Drop-in is weekdays only: weekends are private parties only, so Saturday and
 * Sunday have no hours rows (see the booking rule and hours notes).
 *
 * Conflicts on the venue's own pages, and how they are handled:
 * - Extra party half hour: $50 on the rules page, $70 in the FAQ (the rules
 *   page separately charges $70 when a party runs past its end time). Stored
 *   as $50 from the rules page, flagged.
 * - Outside food: the FAQ allows nut-free outside food and drinks, but answers
 *   it among the party questions; the rules page bans eating, drinking and gum
 *   in the play area. Both kept; drop-in snacking flagged as a question.
 *
 * Not published, so not stored: whether HST is included in the passes;
 * whether the $12 pass is the same for toddlers and older kids, and whether
 * 11–12-year-olds can come; re-entry on the all-day pass; whether multi-visit
 * passes expire or can be shared by siblings; winter hours and which evenings
 * close for parties; Dec 24, 25, 26, 31 and Jan 1 hours; PA day and March
 * Break drop-in; a separate toddler or baby area; height limits on the
 * structure; change tables, nursing space and washrooms; where strollers go;
 * waiver format, who signs and how long it lasts; where families can eat on a
 * drop-in visit; an accessible washroom; photo permission. The three price-board
 * images on the prices page couldn't be read.
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE011_SITE = "https://themightyjungle.ca/";
const PRICES = "https://themightyjungle.ca/Home/Prices";
const FAQ = "https://themightyjungle.ca/Home/Faq";
const RULES = "https://themightyjungle.ca/Home/Rules";
const PARTIES = "https://themightyjungle.ca/Home/Parties";
const ADDONS = "https://themightyjungle.ca/Home/Additions";
const CONTACT = "https://themightyjungle.ca/Home/Contact";
export const PE011_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE011_SITE, sourceCheckedDate: PE011_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const prices = at(PRICES);
const faq = at(FAQ);
const rules = at(RULES);
const parties = at(PARTIES);

const pass = (id: string, label: string, amount: number): VenuePrice => ({
  ...prices, id, kind: "package", label, audience: "other", amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null,
});

const party = (id: string, label: string, days: string, amount: number, notes: string): VenuePrice => ({
  ...parties, id, kind: "party", label, audience: "group", durationMinutes: 120, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, eligibility: days, notes,
});

const PARTY_EXTRAS = "Extra child $10, extra adult $5 · birthday child free · free return pass for the birthday child · host for setup and clean-up";

export const pe011MightyJungle: VenueRecord = {
  place: {
    id: "PE-011",
    slug: "mighty-jungle-mississauga",
    name: "Mighty Jungle Indoor Playground",
    branchName: null,
    aliases: ["Mighty Jungle", "The Mighty Jungle"],
    description:
      "A small, cozy indoor playground built around a 3-storey jungle-themed play structure, best suited to ages 1 to 10, with weekday drop-in and private parties on weekends.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "3100 Ridgeway Dr, Unit 19",
    neighbourhood: null,
    websiteUrl: PE011_SITE,
    postalCode: "L5L 5M5",
    allAges: false,
    ageMin: 1,
    ageMax: 10,
    setting: "indoor",
    costTier: "budget",
    typicalVisitMinutes: null,
    typicalVisitNote: "The $12 drop-in pass is an all-day pass",
    compassTake: [
      "Best for: Ages 1 to 10 in a small playground (maximum 50 people) with a 3-storey play structure.",
      "Good value: The $12 all-day pass includes 2 adults per child, and coffee, tea, Wi-Fi and parking are free.",
      "Plan ahead: Drop-in is weekdays only (Fridays until 3:30 pm); weekends are private parties only, and the venue asks you to call before heading out.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "unknown",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE011_SITE,
    sourceCheckedDate: PE011_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [{ ...site, placeType: "Indoor Playgrounds", isPrimary: true }],
  ageBands: [
    { ...site, band: "0_2", fit: "good", note: "Best suited from age 1; under 1 free with a paid sibling, otherwise $6" },
    { ...site, band: "3_5", fit: "good" },
    { ...site, band: "6_9", fit: "good" },
    { ...site, band: "10_12", fit: "some", note: "Best suited up to age 10" },
  ],
  hours: [
    ...([1, 2, 3, 4] as const).map((weekday) => ({ weekday, opensAt: "09:30", closesAt: "19:00", sourceUrl: PRICES, sourceCheckedDate: PE011_LAST_RESEARCHED })),
    { weekday: 5 as const, opensAt: "09:30", closesAt: "15:30", sourceUrl: PRICES, sourceCheckedDate: PE011_LAST_RESEARCHED },
  ],
  activities: [
    { ...site, id: "pe011-structure", name: "3-storey play structure", description: "A jungle-themed play structure, three storeys high.", availability: "available", includedInAdmission: "yes", schedule: "always", safetyNote: "No toys on the climbing structure and no climbing on the outside of it" },
  ],
  prices: [
    { ...prices, id: "pe011-day-pass", kind: "admission", label: "Play all-day pass", audience: "child", amount: 12, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, adultsIncluded: 2, notes: "Prices include 2 adults per child" },
    { ...prices, id: "pe011-under1-free", kind: "admission", label: "Under 1, with a paid sibling", audience: "infant", ageMin: 0, ageMax: 0, isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, eligibility: "With a paid sibling" },
    { ...prices, id: "pe011-under1", kind: "admission", label: "Under 1, no paid sibling", audience: "infant", ageMin: 0, ageMax: 0, amount: 6, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null },
    { ...prices, id: "pe011-extra-adult", kind: "admission", label: "Additional adult", audience: "adult", amount: 5, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Beyond the 2 adults included per child" },
    pass("pe011-6-visit", "6 visit play pass", 70),
    pass("pe011-10-visit", "10 visit play pass", 90),
    pass("pe011-15-visit", "15 visit play pass", 100),
    { ...at(ADDONS), id: "pe011-socks-kids", kind: "addon", label: "Socks, kids", audience: "child", amount: 1.5, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Socks are mandatory in the play area; sold at the front desk" },
    { ...at(ADDONS), id: "pe011-socks-adult", kind: "addon", label: "Socks, adults", audience: "adult", amount: 2.5, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Socks are mandatory in the play area; sold at the front desk" },
    party("pe011-party-1-mon-thu", "Party Package #1 (Small), 10 kids + 20 adults", "Monday to Thursday", 310, `Coffee, tea and juice boxes · 20 slices of Gino's cheese pizza ($20 credit without pizza) · 15 invitations · ${PARTY_EXTRAS}`),
    party("pe011-party-1-fri-sun", "Party Package #1 (Small), 10 kids + 20 adults", "Friday to Sunday", 350, `Coffee, tea and juice boxes · 20 slices of Gino's cheese pizza ($20 credit without pizza) · 15 invitations · ${PARTY_EXTRAS}`),
    party("pe011-party-2-mon-thu", "Party Package #2 (Medium), 15 kids + 25 adults", "Monday to Thursday", 385, `30 slices of Gino's cheese pizza ($25 credit without pizza) · two 2L bottles of pop · coffee, tea and juice boxes · children's tableware · 20 invitations · ${PARTY_EXTRAS}`),
    party("pe011-party-2-fri-sun", "Party Package #2 (Medium), 15 kids + 25 adults", "Friday to Sunday", 430, `30 slices of Gino's cheese pizza ($25 credit without pizza) · two 2L bottles of pop · coffee, tea and juice boxes · children's tableware · 20 invitations · ${PARTY_EXTRAS}`),
    party("pe011-party-3-mon-thu", "Party Package #3 (Largest), 20 kids + 30 adults", "Monday to Thursday", 450, `40 slices of Gino's cheese pizza ($30 credit without pizza) · 10" DQ ice cream cake ($20 credit without cake) · two 2L bottles of pop · coffee, tea and juice boxes · children's tableware · 25 invitations · ${PARTY_EXTRAS}`),
    party("pe011-party-3-fri-sun", "Party Package #3 (Largest), 20 kids + 30 adults", "Friday to Sunday", 500, `40 slices of Gino's cheese pizza ($30 credit without pizza) · 10" DQ ice cream cake ($20 credit without cake) · two 2L bottles of pop · coffee, tea and juice boxes · children's tableware · 25 invitations · ${PARTY_EXTRAS}`),
    party("pe011-party-breakfast", "Breakfast Package (Morning Party), 10 kids + 20 adults", "Saturday and Sunday", 385, `Yogurt cup, croissant and mini banana loaf per child · coffee, tea and juice boxes · children's tableware · 15 invitations · ${PARTY_EXTRAS}`),
    { ...rules, id: "pe011-party-deposit", kind: "fee", label: "Birthday party deposit", audience: "group", amount: 100, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Non-refundable; the venue offers another day to reschedule" },
  ],
  programs: [],
  amenities: [
    { ...site, amenity: "parking", status: "yes", note: "Free parking" },
    { ...faq, amenity: "wifi", status: "yes", note: "Free Wi-Fi" },
    { ...site, amenity: "other", status: "yes", note: "Complimentary coffee and tea" },
    { ...site, amenity: "wheelchair_access", status: "yes", note: "The home page says the facility is wheelchair accessible; an accessible washroom isn't confirmed" },
    { ...faq, amenity: "parent_seating", status: "yes", note: "A lounge area, where shoes are fine" },
    { ...rules, amenity: "allergy_info", status: "yes", note: "Peanut/nut-free facility, but the venue doesn't guarantee it is peanut/nut-free" },
  ],
  policies: [
    { ...site, kind: "age_guidance", body: "Best suited for children ages 1 to 10." },
    { ...faq, kind: "restriction", body: "A small, cozy playground with a maximum capacity of 50 people." },
    { ...rules, kind: "supervision", body: "Mighty Jungle is an unsupervised play area: parents and guardians are fully responsible for their children's safety." },
    { ...rules, kind: "waiver", body: "A waiver must be signed for each child in the facility." },
    { ...rules, kind: "dress_socks", body: "Socks are mandatory for parents and children in the play area: no shoes or bare feet. Shoes are fine in the lounge. Socks are sold at the front desk." },
    { ...faq, kind: "booking_rule", body: "Drop-in is weekdays only. Weekends are open for private birthday parties only, with no walk-ins." },
    { ...prices, kind: "hours_note", body: "Saturday and Sunday: private parties only." },
    { ...prices, kind: "hours_note", body: "Drop-in and play hours may vary during the winter months, and some evenings might be closed for private parties, so call before heading out." },
    { ...rules, kind: "food_rule", body: "Peanut/nut-free facility: no peanut or nut products. No eating, drinking or gum chewing in the play area." },
    {
      ...faq, kind: "food_rule", body: "Outside food and drinks are allowed as long as everything is nut/peanut-free.",
      conflictNote: "The FAQ gives this answer among its party questions; it doesn't say whether it applies to drop-in visits.",
    },
    { ...rules, kind: "restriction", body: "No toys on the climbing structure, no climbing on the outside of the structure, no running, and no sharp objects. Rough play means removal from the play area." },
    { ...rules, kind: "other", body: "Please use hand sanitizer before entering the play area, and visit another day if you or your child aren't feeling well." },
    { ...prices, kind: "other", body: "Prices are subject to change without notice." },
    { ...parties, kind: "party", body: "Parties are fully private and last 2 hours. The venue books 3–4 months ahead; reserve by phone or in person, with a $100 non-refundable deposit." },
    { ...rules, kind: "party", body: "An extra half hour can be added for $50 when available; a party that runs past its end time is charged $70.", conflictNote: "The rules page says an extra half hour is $50; the FAQ says $70." },
    { ...rules, kind: "party", body: "Arrive no sooner than 5 minutes before the party. No piñatas or face painting; helium balloons only if weighted; no tape on the walls. Children who aren't fully potty trained need proper apparel." },
    { ...parties, kind: "party", body: "Wacky Tuesdays: 20% off a party booked for a Tuesday. Crazy Thursdays: a free half hour on any package for a Thursday party." },
  ],
  links: [
    { ...site, kind: "website", value: PE011_SITE, label: "Mighty Jungle website" },
    { ...at(CONTACT), kind: "phone", value: "289-997-0644" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
