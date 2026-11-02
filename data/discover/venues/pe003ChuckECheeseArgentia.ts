/**
 * PE-003 — Chuck E. Cheese, Argentia. Real venue record (draft).
 *
 * Source: the store's own pages on chuckecheese.com (read Oct 26–27, 2026) and
 * the founder's screenshots of the deals, Fun Pass and birthday pages
 * (Oct 27, 2026). The PE number is provisional.
 *
 * Conflicts, flagged on the page:
 * - The store's indoor-playground page says this store has a Trampoline Zone
 *   and a climbing structure but no Superhero Playground; the chain's
 *   Adventure Zone page for this store says it combines both.
 * - The Fun Package headline is $129.99 for 6 kids; a bullet on the same page
 *   says "$99.99 includes the Birthday Star + five kids".
 *
 * Not published by the venue, so not stored: the Adventure Zone admission
 * price, regular All You Can Play prices, how the monthly membership works,
 * parking, washrooms, change tables and the outside-food rule.
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE003_STORE = "https://www.chuckecheese.com/mississauga/";
const PLAYGROUND = "https://www.chuckecheese.com/mississauga/experience/indoor-playground/";
const ADVENTURE_ZONE = "https://www.chuckecheese.com/mississauga/adventurezone/";
const ARCADE = "https://www.chuckecheese.com/mississauga/arcade/";
const DEALS = "https://www.chuckecheese.com/mississauga/coupons-and-deals/";
const FUN_PASS = "https://www.chuckecheese.com/mississauga/funpass/";
const PARTIES = "https://www.chuckecheese.com/mississauga/birthday-parties/";
export const PE003_LAST_RESEARCHED = "2026-10-27";

const site: Provenance = { sourceUrl: PE003_STORE, sourceCheckedDate: PE003_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });

/** Chuck E. Cheese Mississauga store prices shared by the Argentia and Dixie records. */
export function chuckECheesePrices(src: { deals: string; funPass: string; parties: string; arcade: string }, withDeals: boolean): VenuePrice[] {
  const funPass = (id: string, label: string, amount: number, notes: string): VenuePrice => ({
    ...at(src.funPass), id, kind: "membership", label, audience: "family", amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null,
    includesNote: "unlimited visits for two months, Play Pass cards for up to 6 family members",
    notes: `${notes} · bought in store · all sales final`,
  });
  return [
    { ...at(src.arcade), id: "cec-entry", kind: "admission", label: "Entry", audience: "other", isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Getting in is free; you pay for games and the Adventure Zone" },
    { ...at(src.arcade), id: "cec-play-pass", kind: "addon", label: "Play Pass card", audience: "other", amount: 2, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Reusable; each player needs their own card for games" },
    ...(withDeals
      ? ([
          { ...at(src.deals), id: "cec-aycp-60", kind: "promotion", label: "60 minutes of All You Can Play", audience: "child", amount: 19.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, eligibility: "Monday to Thursday", validTo: "2026-11-10" },
          { ...at(src.deals), id: "cec-aycp-2x60", kind: "promotion", label: "Two 60-minute All You Can Play cards", audience: "other", amount: 56.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, validTo: "2026-11-10" },
        ] satisfies VenuePrice[])
      : []),
    funPass("cec-fun-pass-bronze", "Bronze 2-Month Fun Pass", 69.99, "40 Play Points a visit · 20% off food, drinks, extra games and Adventure Zone"),
    funPass("cec-fun-pass-silver", "Silver 2-Month Fun Pass", 99.99, "100 Play Points a visit · 30% off food, drinks, extra games and Adventure Zone"),
    funPass("cec-fun-pass-gold", "Gold 2-Month Fun Pass", 169.99, "250 Play Points a visit · 50% off food, drinks, extra games and Adventure Zone"),
    {
      ...at(src.parties), id: "cec-party-fun", kind: "party", label: "Fun Package, 6 kids", audience: "group", durationMinutes: 120, amount: 129.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null,
      notes: "2 hours of games, drinks, birthday show, decorated table · extra kid $24.99 · no pizza or host",
      verificationStatus: "conflicting",
      conflictNote: "The headline says $129.99 for 6 kids; a line on the same page says $99.99 for the birthday child and five kids.",
    },
    { ...at(src.parties), id: "cec-party-mega", kind: "party", label: "Megafun Package, per kid", audience: "group", durationMinutes: 120, amount: 37.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Minimum 5 kids · pizza, Dippin' Dots, party host, 250 bonus tickets each" },
    { ...at(src.parties), id: "cec-party-ultimate", kind: "party", label: "Ultimatefun Package, per kid", audience: "group", durationMinutes: 120, amount: 43.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Minimum 5 kids · Megafun plus goodie bags, 2 bonus pizzas, 500 bonus tickets each, a Bronze Fun Pass for the birthday child" },
  ];
}

export function chuckECheesePolicies(src: { store: string; funPass: string; parties: string; playground: string }) {
  return [
    { ...at(src.store), kind: "supervision" as const, body: "Kid Check stamps matching numbers on every child and adult in your group, so kids only leave with the grown-ups they came with." },
    { ...at(src.playground), kind: "height_limit" as const, body: "Trampolines are for kids under 56 inches (142 cm)." },
    { ...at(src.playground), kind: "dress_socks" as const, body: "Grip socks come with Adventure Zone admission." },
    { ...at(src.funPass), kind: "other" as const, body: "Play Points don't cover the trampolines or crane games; Adventure Zone is a separate admission." },
    { ...at(src.parties), kind: "party" as const, body: "Every package includes 2 hours of unlimited games; Adventure Zone admission is an add-on." },
    { ...at(src.parties), kind: "party" as const, body: "Prices can change by date and time; you'll see the final price when you book." },
    { ...at(src.parties), kind: "party" as const, body: "Booking online costs a one-time $5 fee; booking in store is free." },
    { ...at(src.parties), kind: "party" as const, body: "Code BDAYFREE makes the birthday child free when you host 13 or more kids (book and hold the party by Dec 31, 2026)." },
    { ...at(src.parties), kind: "party" as const, body: "Real birthday parties only, and one party per household per day." },
  ];
}

export const pe003ChuckECheeseArgentia: VenueRecord = {
  place: {
    id: "PE-003",
    slug: "chuck-e-cheese-argentia",
    name: "Chuck E. Cheese",
    branchName: "Argentia",
    aliases: ["Chuck E. Cheese Mississauga"],
    description:
      "An arcade and pizza restaurant with free entry, a Trampoline Zone and climbing structure for kids under 56 inches, kiddie rides and a live Chuck E. show.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "2945 Argentia Rd",
    neighbourhood: "Meadowvale",
    websiteUrl: PE003_STORE,
    postalCode: "L5N 0A2",
    allAges: false,
    ageMin: 2,
    ageMax: 12,
    setting: "indoor",
    costTier: "moderate",
    typicalVisitMinutes: null,
    compassTake: [
      "Best for: Kids 2–12 who love arcade games, with trampolines and a climber as an extra.",
      "Know before you go: Entry is free. Games run on a $2 Play Pass card, and the Adventure Zone is charged per child on top; its price isn't published.",
      "For little ones: 4 kiddie rides and a first-climb structure with a grown-up close by.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "unknown",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE003_STORE,
    sourceCheckedDate: PE003_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [
    { ...site, placeType: "Indoor Playgrounds", isPrimary: true },
    { ...site, placeType: "Arcades", isPrimary: false },
    { ...site, placeType: "Family Entertainment Centres", isPrimary: false },
  ],
  ageBands: [
    { ...at(PLAYGROUND), band: "0_2", fit: "some", note: "Kiddie rides and a first climb with a grown-up" },
    { ...at(PLAYGROUND), band: "3_5", fit: "good" },
    { ...at(PLAYGROUND), band: "6_9", fit: "good" },
    { ...at(PLAYGROUND), band: "10_12", fit: "good", note: "Trampolines are for kids under 56 inches" },
    { ...at(PLAYGROUND), band: "13_17", fit: "limited", note: "Teens joining in is the store's call; ask staff" },
  ],
  hours: ([1, 2, 3, 4, 5, 6, 7] as const).map((weekday) => ({
    weekday,
    opensAt: weekday === 6 ? "10:00" : "11:00",
    closesAt: weekday === 5 || weekday === 6 ? "22:00" : "21:00",
    sourceUrl: PE003_STORE,
    sourceCheckedDate: PE003_LAST_RESEARCHED,
  })),
  activities: [
    { ...at(PLAYGROUND), id: "pe003-trampolines", name: "Trampoline Zone", description: "Trampolines with padded borders and staff supervision.", availability: "available", includedInAdmission: "no", extraCostNote: "Adventure Zone admission, priced per child at the store", schedule: "unknown", maxHeightCm: 142 },
    {
      ...at(PLAYGROUND), id: "pe003-climber", name: "Climbing play structure", description: "A good first climb with a grown-up close by.", availability: "available", includedInAdmission: "no", extraCostNote: "Part of Adventure Zone admission", schedule: "unknown", maxHeightCm: 142,
      verificationStatus: "conflicting",
      conflictNote: "The store page says there is no Superhero Playground here; the chain's Adventure Zone page for this store says it has one.",
    },
    { ...at(PLAYGROUND), id: "pe003-arcade", name: "Arcade", description: "58 different games and rides on 78 machines.", availability: "available", includedInAdmission: "no", extraCostNote: "Play Points or All You Can Play time on a Play Pass card", schedule: "unknown" },
    { ...at(PLAYGROUND), id: "pe003-kiddie-rides", name: "Kiddie rides", description: "4 climb-on rides for little ones.", availability: "available", includedInAdmission: "no", extraCostNote: "Play Points", schedule: "unknown" },
    { ...at(ARCADE), id: "pe003-show", name: "Chuck E. live show and dance floor", description: "A dance party with Chuck E. on every visit.", availability: "available", includedInAdmission: "yes", schedule: "unknown" },
  ],
  prices: chuckECheesePrices({ deals: DEALS, funPass: FUN_PASS, parties: PARTIES, arcade: ARCADE }, true),
  programs: [],
  amenities: [
    { ...at(ARCADE), amenity: "food_onsite", status: "yes", note: "Pizza and a full menu; gluten-free crust at most locations" },
  ],
  policies: [
    ...chuckECheesePolicies({ store: PE003_STORE, funPass: FUN_PASS, parties: PARTIES, playground: ADVENTURE_ZONE }),
    { ...at(ARCADE), kind: "other", body: "All You Can Play time can be paused once per visit, for example for a pizza break." },
    { ...at(PE003_STORE), kind: "hours_note", body: "Hours can vary by day; call the store to confirm." },
  ],
  links: [
    { ...site, kind: "website", value: PE003_STORE, label: "Chuck E. Cheese Argentia" },
    { ...site, kind: "phone", value: "905-785-3593" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
