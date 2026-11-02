/**
 * PE-004 — Chuck E. Cheese, Dixie (Rockwood Mall). Real venue record (draft).
 *
 * Source: the store's own pages on chuckecheese.com (read Oct 26–27, 2026).
 * Party and Fun Pass prices are the Mississauga chain prices from the founder's
 * screenshots; this store's own deals page was not readable, so no deals are
 * stored. The PE number is provisional.
 *
 * Not published by the venue, so not stored: the Adventure Zone admission
 * price, All You Can Play prices, parking, washrooms, change tables and the
 * outside-food rule.
 */

import type { Provenance, VenueRecord } from "@/data/discover/venueTypes";
import { chuckECheesePolicies, chuckECheesePrices } from "@/data/discover/venues/pe003ChuckECheeseArgentia";

export const PE004_STORE = "https://www.chuckecheese.com/mississauga-rockwood/";
const PLAYGROUND = "https://www.chuckecheese.com/mississauga-rockwood/experience/indoor-playground/";
const ADVENTURE_ZONE = "https://www.chuckecheese.com/mississauga-rockwood/adventurezone/";
const FUN_PASS = "https://www.chuckecheese.com/mississauga/funpass/";
const PARTIES = "https://www.chuckecheese.com/mississauga/birthday-parties/";
const ARCADE = "https://www.chuckecheese.com/mississauga/arcade/";
export const PE004_LAST_RESEARCHED = "2026-10-27";

const site: Provenance = { sourceUrl: PE004_STORE, sourceCheckedDate: PE004_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });

export const pe004ChuckECheeseDixie: VenueRecord = {
  place: {
    id: "PE-004",
    slug: "chuck-e-cheese-dixie",
    name: "Chuck E. Cheese",
    branchName: "Dixie (Rockwood Mall)",
    aliases: ["Chuck E. Cheese Rockwood"],
    description:
      "An arcade and pizza restaurant with free entry, a Superhero Playground and Trampoline Zone for kids under 56 inches, kiddie rides and a live Chuck E. show.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "4141 Dixie Rd (Rockwood Mall)",
    neighbourhood: "Rockwood",
    websiteUrl: PE004_STORE,
    postalCode: "L4W 1V5",
    allAges: false,
    ageMin: 2,
    ageMax: 12,
    setting: "indoor",
    costTier: "moderate",
    typicalVisitMinutes: null,
    compassTake: [
      "Best for: Kids 2–12 who love arcade games, plus the bigger Chuck E. Cheese playground: a Superhero Playground and trampolines.",
      "Know before you go: Entry is free. Games run on a $2 Play Pass card, and the Adventure Zone is charged per child on top; its price isn't published.",
      "For little ones: 4 kiddie rides; the playground and trampolines are for kids under 56 inches.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "unknown",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE004_STORE,
    sourceCheckedDate: PE004_LAST_RESEARCHED,
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
    { ...at(PLAYGROUND), band: "0_2", fit: "some", note: "Kiddie rides; the playground suits climbers" },
    { ...at(PLAYGROUND), band: "3_5", fit: "good" },
    { ...at(PLAYGROUND), band: "6_9", fit: "good" },
    { ...at(PLAYGROUND), band: "10_12", fit: "good", note: "Playground and trampolines are for kids under 56 inches" },
    { ...at(PLAYGROUND), band: "13_17", fit: "limited", note: "Teens joining in is the store's call; ask staff" },
  ],
  hours: ([1, 2, 3, 4, 5, 6, 7] as const).map((weekday) => ({
    weekday,
    opensAt: weekday === 6 ? "10:00" : "11:00",
    closesAt: weekday === 5 || weekday === 6 ? "22:00" : "21:00",
    sourceUrl: PE004_STORE,
    sourceCheckedDate: PE004_LAST_RESEARCHED,
  })),
  activities: [
    { ...at(PLAYGROUND), id: "pe004-superhero", name: "Superhero Playground", description: "A climbing structure with climbing walls, balance beams, tunnels and slides, with padded benches for parents around it.", availability: "available", includedInAdmission: "no", extraCostNote: "Adventure Zone admission, priced per child at the store", schedule: "unknown", maxHeightCm: 142 },
    { ...at(ADVENTURE_ZONE), id: "pe004-trampolines", name: "Trampoline Zone", description: "Trampolines with soft surfaces, padded borders and staff supervision.", availability: "available", includedInAdmission: "no", extraCostNote: "Adventure Zone admission, priced per child at the store", schedule: "unknown", maxHeightCm: 142 },
    { ...at(PLAYGROUND), id: "pe004-arcade", name: "Arcade", description: "65 different games and rides on 86 machines.", availability: "available", includedInAdmission: "no", extraCostNote: "Play Points or All You Can Play time on a Play Pass card", schedule: "unknown" },
    { ...at(PLAYGROUND), id: "pe004-kiddie-rides", name: "Kiddie rides", description: "4 climb-on rides for little ones.", availability: "available", includedInAdmission: "no", extraCostNote: "Play Points", schedule: "unknown" },
    { ...at(ARCADE), id: "pe004-show", name: "Chuck E. live show and dance floor", description: "A dance party with Chuck E. on every visit.", availability: "available", includedInAdmission: "yes", schedule: "unknown" },
  ],
  prices: chuckECheesePrices({ deals: PE004_STORE, funPass: FUN_PASS, parties: PARTIES, arcade: ARCADE }, false).map((p) => ({
    ...p,
    id: p.id.replace(/^cec-/, "pe004-"),
    sourceCheckedDate: PE004_LAST_RESEARCHED,
  })),
  programs: [],
  amenities: [
    { ...at(ARCADE), amenity: "food_onsite", status: "yes", note: "Pizza and a full menu; gluten-free crust at most locations" },
  ],
  policies: [
    ...chuckECheesePolicies({ store: PE004_STORE, funPass: FUN_PASS, parties: PARTIES, playground: ADVENTURE_ZONE }),
    { ...at(PE004_STORE), kind: "hours_note", body: "Hours can vary by day; call the store to confirm." },
  ],
  links: [
    { ...site, kind: "website", value: PE004_STORE, label: "Chuck E. Cheese Rockwood" },
    { ...site, kind: "phone", value: "905-602-4090" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
