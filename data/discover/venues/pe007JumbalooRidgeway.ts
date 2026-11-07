/**
 * PE-007 — Jumbaloo, Ridgeway (Future World). Real venue record (draft).
 *
 * Source: the venue's own pages (Ridgeway home, playtime, FAQ and offers
 * pages, the contact page and the policy page), read Nov 7, 2026. The PE
 * number is provisional.
 *
 * The playtime price list shows the five labels first, then the five prices, in
 * the same order; prices are paired with labels in that order. The infant label
 * is cut off on the page ("free with a playing sibling or").
 *
 * Conflicts on the venue's own pages, and how they are handled:
 * - Hours: the contact page and footer say Mon–Fri 12–8 pm and Sat–Sun
 *   10 am–8 pm; the home page and playtime page say Mon–Fri 10 am–8 pm and
 *   Sat–Sun 9 am–8 pm. Stored from the contact page, flagged.
 * - Outside food: the Ridgeway FAQ allows only baby bottles and baby food; the
 *   policy page also allows fresh fruit and vegetables. Stored from the policy
 *   page, flagged.
 * - Adult admission: the Ridgeway price list says $3.25 + HST; the Argentia
 *   playtime FAQ on the same site says $3.29. The Ridgeway page is used.
 *
 * Not published, so not stored: whether Active City (or the "Active Play" the
 * FAQ says isn't in admission) costs extra on top of admission, and whether
 * Cosmic Climb, Orbit Run, Lava Leap and the floor games are included; minimum
 * age or height for Active City, Cosmic Climb and Orbit Run; whether any part
 * is closed for the renovation; how many adults can come in; whether a baby
 * under 1 is $10 without a playing sibling (label cut off); whether prices
 * differ on weekdays and weekends; the Toddler Tuesday price; re-entry within a
 * slot; Dec 24, 25, 26, 31 and Jan 1 hours; PA day and March Break hours;
 * whether 3-year-olds can use the toddler zone and whether it's gated; the
 * sock price and whether regular socks are fine; who signs the waiver, how
 * long it lasts and whether an Argentia waiver counts here; change tables,
 * nursing space and washrooms; wheelchair access and an accessible washroom;
 * parent seating and Wi-Fi at this location; whether this unit was Aladdin's
 * Adventures; photo permission.
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE007_SITE = "https://jumbaloo.com/ridgeway/";
const PLAYTIME = "https://jumbaloo.com/ridgeway/playtime/";
const FAQS = "https://jumbaloo.com/ridgeway/faqs-ridgeway/";
const OFFERS = "https://jumbaloo.com/ridgeway/offers/";
const CONTACT = "https://jumbaloo.com/contact-us/";
const POLICY = "https://jumbaloo.com/policy/";
const BOOKING = "https://jumbalooridgeway.bookings.pcsparty.com/app/obm/selection";
export const PE007_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE007_SITE, sourceCheckedDate: PE007_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const playtime = at(PLAYTIME);
const faqs = at(FAQS);
const policy = at(POLICY);

const ticket = (id: string, label: string, ageMin: number, ageMax: number, amount: number): VenuePrice => ({
  ...playtime, id, kind: "admission", label, audience: "child", ageMin, ageMax, durationMinutes: 120, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, adultsIncluded: 0,
});

const activeCity = (sessions: 1 | 2 | 3, minutes: number, amount: number): VenuePrice => ({
  ...playtime, id: `pe007-active-city-${sessions}`, kind: "addon", label: `Active City, ${sessions} ${sessions === 1 ? "session" : "sessions"} (${minutes} min)`, audience: "other", durationMinutes: minutes, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: null,
});

const HOURS_CONFLICT = "The contact page and footer say Monday to Friday 12–8 pm and Saturday–Sunday 10 am–8 pm; the home page and playtime page say Monday to Friday 10 am–8 pm and Saturday–Sunday 9 am–8 pm.";

export const pe007JumbalooRidgeway: VenueRecord = {
  place: {
    id: "PE-007",
    slug: "jumbaloo-ridgeway",
    name: "Jumbaloo",
    branchName: "Ridgeway (Future World)",
    aliases: ["Jumbaloo Ridgeway", "Jumbaloo Future World", "Jumbaloo Playgrounds"],
    description:
      "Jumbaloo's Future World location, mixing active and interactive play: Active City, Cosmic Climb, Orbit Run, Lava Leap and interactive floor games, plus a toddler zone for under-3s, played in 2-hour slots.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: "3450 Ridgeway Drive, Unit 10/11",
    neighbourhood: null,
    websiteUrl: PE007_SITE,
    postalCode: "L5L 0A2",
    allAges: false,
    ageMin: 0,
    ageMax: 12,
    setting: "indoor",
    costTier: "moderate",
    typicalVisitMinutes: 120,
    typicalVisitNote: "Playtime is limited to 2 hours (120 minutes), and a new slot opens every hour",
    compassTake: [
      "Best for: Kids with big energy: Active City, Cosmic Climb, Orbit Run and Lava Leap are movement-based attractions.",
      "Little ones: A toddler zone for under-3s with soft play, a ball pit and play panels.",
      "Plan ahead: Active City is priced separately in 20-minute sessions, and the site lists two different sets of opening hours, so call before you go.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "no",
    hoursKind: "fixed",
    latitude: null,
    longitude: null,
    sourceUrl: PE007_SITE,
    sourceCheckedDate: PE007_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [
    { ...site, placeType: "Indoor Playgrounds", isPrimary: true },
    { ...faqs, placeType: "Climbing", isPrimary: false },
  ],
  ageBands: [
    { ...faqs, band: "0_2", fit: "good", note: "Toddler zone for children under 3" },
    { ...playtime, band: "3_5", fit: "good" },
    { ...playtime, band: "6_9", fit: "good" },
    { ...policy, band: "10_12", fit: "good", note: "Playground equipment is designed for children under 12" },
    { ...playtime, band: "13_17", fit: "some", note: "Youth ticket for ages 13–16" },
  ],
  hours: [
    ...([1, 2, 3, 4, 5] as const).map((weekday) => ({ weekday, opensAt: "12:00", closesAt: "20:00", notes: HOURS_CONFLICT, sourceUrl: CONTACT, sourceCheckedDate: PE007_LAST_RESEARCHED })),
    ...([6, 7] as const).map((weekday) => ({ weekday, opensAt: "10:00", closesAt: "20:00", notes: HOURS_CONFLICT, sourceUrl: CONTACT, sourceCheckedDate: PE007_LAST_RESEARCHED })),
  ],
  activities: [
    {
      ...playtime, id: "pe007-active-city", name: "Active City", description: "More than video games: a place to move, climb, run, jump and play through active challenges.", availability: "available", includedInAdmission: "unknown",
      extraCostNote: "Priced on the playtime page: 1 session (20 min) $9, 2 sessions (40 min) $15, 3 sessions (60 min) $20", schedule: "unknown",
    },
    { ...faqs, id: "pe007-cosmic-climb", name: "Cosmic Climb", description: "Rock climbing.", availability: "available", includedInAdmission: "unknown", schedule: "unknown", safetyNote: "Staff supervise Cosmic Climb" },
    { ...faqs, id: "pe007-orbit-run", name: "Orbit Run", description: "An active play area.", availability: "available", includedInAdmission: "unknown", schedule: "unknown", safetyNote: "Staff supervise Orbit Run" },
    { ...playtime, id: "pe007-lava-leap", name: "Lava Leap", description: "A movement-based attraction for kids with big energy.", availability: "available", includedInAdmission: "unknown", schedule: "unknown" },
    { ...site, id: "pe007-floor-games", name: "Interactive floor games", availability: "available", includedInAdmission: "unknown", schedule: "unknown" },
    { ...faqs, id: "pe007-toddler", name: "Toddler zone", description: "Soft play equipment, ball games, a ball pit and interactive play panels.", availability: "available", includedInAdmission: "yes", schedule: "always", ageMax: 2 },
  ],
  prices: [
    {
      ...playtime, id: "pe007-infant", kind: "admission", label: "Infant", audience: "infant", ageMin: 0, ageMax: 0, isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, eligibility: "With a playing sibling",
      notes: "The label is cut off on the price list (\"free with a playing sibling or\"); the price listed first is $10 + HST",
    },
    ticket("pe007-toddler", "Toddler (1–3 yrs)", 1, 3, 16),
    ticket("pe007-child", "Child (4–12 yrs)", 4, 12, 21.5),
    ticket("pe007-youth", "Youth (13–16 yrs)", 13, 16, 13),
    { ...playtime, id: "pe007-adult", kind: "admission", label: "Adults", audience: "adult", durationMinutes: 120, amount: 3.25, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, notes: "Every adult who comes in pays; one adult admission can't be shared between 2 adults" },
    activeCity(1, 20, 9),
    activeCity(2, 40, 15),
    activeCity(3, 60, 20),
  ],
  programs: [],
  amenities: [
    { ...site, amenity: "parking", status: "yes", note: "Free parking" },
    { ...faqs, amenity: "food_onsite", status: "yes", note: "Snacks and water at the snack counter (the Recharge Station)" },
    { ...policy, amenity: "outside_food", status: "no", note: "Except baby bottles, baby food and fresh fruit and vegetables", conflictNote: "The Ridgeway FAQ lists only baby bottles and baby food as exceptions; the policy page also allows fresh fruit and vegetables." },
    { ...faqs, amenity: "stroller_access", status: "no", note: "Strollers can come as far as the front lobby, not into the play area" },
  ],
  policies: [
    { ...faqs, kind: "supervision", body: "Jumbaloo is an unsupervised playground: a parent or guardian stays with their child and is responsible for their safety. Staff supervise Cosmic Climb and Orbit Run." },
    { ...policy, kind: "supervision", body: "Siblings over 6 and parents must go with children under 4 in the main play structure. Staff help but don't provide childcare." },
    { ...policy, kind: "age_guidance", body: "Playground equipment is designed for children under 12." },
    { ...faqs, kind: "waiver", body: "Parents or guardians must sign a waiver for their child; it's on Jumbaloo's website, and Ridgeway has its own waiver link." },
    { ...faqs, kind: "dress_socks", body: "Everyone must wear socks, adults included; no indoor shoes. Socks can be bought at entry." },
    { ...faqs, kind: "booking_rule", body: "Walk-ins are always welcome, but booking is recommended for holidays and busy weekends." },
    { ...playtime, kind: "booking_rule", body: "Reserve your slot online, or same day over the phone." },
    { ...playtime, kind: "arrival", body: "Playtime is limited to 2 hours (120 minutes), and a new slot opens every hour." },
    { ...faqs, kind: "arrival", body: "Playtime can't be extended if you arrive late, because the facility runs on a set schedule." },
    { ...faqs, kind: "arrival", body: "Everyone gets a wristband at admission and must wear it in the play area. Every adult pays, and older children who aren't playing still pay." },
    { ...faqs, kind: "arrival", body: "Strollers can come as far as the front lobby, not into the play area." },
    { ...policy, kind: "food_rule", body: "No outside food or drinks, except baby bottles, baby food and fresh fruit and vegetables. No food, drinks, candy or gum in the playground.", conflictNote: "The Ridgeway FAQ lists only baby bottles and baby food as exceptions." },
    { ...faqs, kind: "food_rule", body: "There's no water fountain; you can bring your own water bottle or buy water at the snack counter." },
    { ...at(CONTACT), kind: "hours_note", body: "Weekdays 12–8 pm and weekends 10 am–8 pm per the contact page; call to confirm opening times before you go.", conflictNote: HOURS_CONFLICT },
    { ...site, kind: "other", body: "The Ridgeway pages show a \"Coming Soon\" banner and a renovation pop-up (\"Getting a Glow-Up!\") without saying what's affected; check before you go." },
    { ...at(OFFERS), kind: "other", body: "Toddler Tuesday: special admission pricing for toddlers every Tuesday (the price isn't published)." },
    { ...faqs, kind: "other", body: "No pets except service animals, and no alcohol." },
    { ...faqs, kind: "party", body: "Parties must always be booked ahead." },
    { ...at(OFFERS), kind: "party", body: "20% off weekday parties (Monday to Thursday) in 2026." },
  ],
  links: [
    { ...playtime, kind: "booking", value: BOOKING, label: "Book your playtime" },
    { ...site, kind: "website", value: PE007_SITE, label: "Jumbaloo Ridgeway" },
    { ...at(CONTACT), kind: "phone", value: "289-422-0880" },
  ],
  reviewSources: [],
  experienceThemes: [],
};
