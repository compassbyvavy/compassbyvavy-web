/**
 * PE-013 — Playtown (Kids Playtown). Real venue record (draft).
 *
 * Source: the venue's own Visit Us, Parties, FAQs, About, Playhouses and
 * Price Update pages on kidsplaytown.ca, read Nov 7, 2026. The home page
 * (and robots.txt) blocked automated reading, so no facts come from it. The
 * PE number is provisional.
 *
 * operatingStatus is "unknown", not "open": no page publishes current
 * hours or a 2026 schedule. The newest dated items are a slot table for the
 * week of July 22–28, 2024 (Visit Us) and an October 2023 price note
 * (Parties). The About and Playhouses pages also carry unrelated watch
 * advertising, a sign the site may not be maintained. The call sheet should
 * confirm the venue is open before this is published.
 *
 * Address: no page read gives one. 2170 Dunwin Dr Unit 6 comes only from the
 * Google listing and third-party listings, so addressLine is null.
 *
 * Two copies of the Parties page disagree, and how they are handled:
 * - kidsplaytown.ca/parties.html lists the 20/30/50/70-person packages
 *   (+HST), the October 2023 increase, 647.697.4003 and a 48-hour
 *   cancellation rule. It is the newer copy, so it is stored.
 * - www.kidsplaytown.ca/parties.html still serves an older page: packages for
 *   "up to 12" and "up to 24" children with no price, a $545 private party
 *   (6–9 pm, no food), a $75 / $100 deposit, 14-day / 7-day cancellation,
 *   $25 per 15 minutes overtime, 905-569-7529, and children from 12 months to
 *   12 years counted. These appear only in conflictNotes.
 * Other conflicts:
 * - The Price Update page ("effective as of January 1, 2020") lists general
 *   admission for 2–12 years, $10 for 12–23 months, and older party prices.
 *   The Visit Us page is more specific and newer, so its prices are stored.
 * - Visit Us: under 11 months free with a paid child; Price Update: under
 *   12 months free "PER FAMILY".
 *
 * Left out on purpose: the Parties page still says "Everyone over the age of
 * 5 is required to wear a mask" and that contact details are kept 14 days for
 * public health (pandemic-era terms; ask before storing). Party add-ons are
 * listed as "Currently not available".
 *
 * Not published, so not stored: whether the venue is open now; the address;
 * current days and hours, and holiday, PA Day and March Break hours; how to
 * reserve (only "contact us"); the sock price and whether grip socks are
 * needed; a waiver for daily play (the party terms mention a sign-off form);
 * an email address (the Parties page says "E-mail us" with none given);
 * whether the raceway costs extra; change table, nursing space, washrooms;
 * stroller rules; whether the Café sells food to daily-play families;
 * wheelchair access; party deposit on the current packages; whether party
 * prices differ by day; and photo permission for Compass.
 */

import type { Provenance, VenuePrice, VenueRecord } from "@/data/discover/venueTypes";

export const PE013_SITE = "https://kidsplaytown.ca/";
const VISIT = "https://kidsplaytown.ca/visit.html";
const PARTIES = "https://kidsplaytown.ca/parties.html";
const FAQS = "https://kidsplaytown.ca/faqs.html";
const ABOUT = "https://kidsplaytown.ca/about.html";
const PLAYHOUSES = "https://kidsplaytown.ca/playhouses.html";
const PRICE_UPDATE = "https://kidsplaytown.ca/priceupdate.html";
export const PE013_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE013_SITE, sourceCheckedDate: PE013_LAST_RESEARCHED, verificationStatus: "verified" };
const at = (sourceUrl: string): Provenance => ({ ...site, sourceUrl });
const visit = at(VISIT);
const parties = at(PARTIES);
const faqs = at(FAQS);
const about = at(ABOUT);
const playhouses = at(PLAYHOUSES);
const priceUpdate = at(PRICE_UPDATE);

const OLD_PARTIES_NOTE =
  "An older copy of the Parties page at www.kidsplaytown.ca lists a $545 private party (6–9 pm, facility only, no food) and packages for up to 12 or 24 children.";

const partyPackage = (id: string, label: string, amount: number, includesNote: string, conflictNote?: string): VenuePrice => ({
  ...parties, id, kind: "party", label, audience: "group", durationMinutes: 120, includesNote, amount, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true,
  notes: "Counts kids and adults together. A two-hour slot, plus 15 minutes before for setup.",
  conflictNote: conflictNote ?? null,
});

const playhouse = (id: string, name: string, description: string) => ({
  ...playhouses, id, name, description, availability: "available" as const, includedInAdmission: "yes" as const, schedule: "always" as const,
});

export const pe013Playtown: VenueRecord = {
  place: {
    id: "PE-013",
    slug: "playtown-mississauga",
    name: "Playtown",
    branchName: null,
    aliases: ["Kids Playtown"],
    description:
      "A pretend-play town for young children: themed playhouses (diner, theatre, salon, grocery store, fire station, vet, construction site and house) along a Main Street, a Toddler Town for babies, a ride-on raceway, a café and three themed party rooms.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: null,
    neighbourhood: null,
    websiteUrl: PE013_SITE,
    postalCode: null,
    allAges: false,
    ageMin: 0,
    ageMax: 12,
    setting: "indoor",
    costTier: "moderate",
    typicalVisitMinutes: 120,
    typicalVisitNote: "General admission is booked in 2-hour slots",
    compassTake: [
      "Best for: Pretend play, with playhouses parents can walk into and join, plus a ride-on raceway.",
      "Little ones: Toddler Town is a separate area for babies from newborn to walking, with a view of the Main Street.",
      "Plan ahead: Reservations are required, so contact Playtown before you go. Payment is by e-transfer or cash.",
    ].join("\n"),
    toddlerFriendly: "yes",
    strollerFriendly: "unknown",
    hoursKind: "unknown",
    latitude: null,
    longitude: null,
    sourceUrl: VISIT,
    sourceCheckedDate: PE013_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "unknown",
  },
  cityName: "Mississauga",
  types: [{ ...about, placeType: "Indoor Playgrounds", isPrimary: true }],
  ageBands: [
    { ...playhouses, band: "0_2", fit: "good", note: "Toddler Town is for babies from newborn to walking; under 11 months free with a paid child" },
    { ...priceUpdate, band: "3_5", fit: "good", note: "General admission listed for 2–12 years", conflictNote: "The 2020 Price Update page lists general admission for 2–12 years; the Visit Us page charges any child over 11 months and gives no upper age." },
    { ...priceUpdate, band: "6_9", fit: "good", conflictNote: "Age range from the 2020 Price Update page; the Visit Us page gives no upper age." },
    { ...priceUpdate, band: "10_12", fit: "good", conflictNote: "Age range from the 2020 Price Update page; the Visit Us page gives no upper age." },
  ],
  hours: [],
  activities: [
    playhouse("pe013-diner", "Playtown Diner", "A restaurant playhouse: be the customer, waiter, chef or cashier."),
    playhouse("pe013-theatre", "Playtown Theatre", "A lighted marquee, stage curtains, a puppet theatre, costumes and real theatre seating."),
    playhouse("pe013-salon", "Beauty Boutique", "A salon playhouse with nine hair mannequins and salon aprons."),
    playhouse("pe013-grocery", "Grocery Store", "Shopping carts, a beeping checkout and cash register, produce bins and stocked shelves."),
    playhouse("pe013-fire-station", "Fire Station", "A fire truck, call box, hose reels and uniforms."),
    playhouse("pe013-vet", "Animal Hospital", "A vet playhouse with exam tables, costumes, anatomy charts, real stethoscopes and toy animals."),
    playhouse("pe013-construction", "Construction Site", "Tools, a stocked workbench, safety hats and vests, building blocks and blueprints."),
    playhouse("pe013-house", "Playtown House", "Care for the baby, cook dinner and have tea and cupcakes."),
    { ...playhouse("pe013-toddler-town", "Toddler Town", "A separate area with toys for babies; parents can stay in and still see the Main Street."), ageMin: 0, ageMax: null },
    playhouse("pe013-raceway", "Playtown Raceway", "A secure track for racing on Plasma Racers, with signs, pylons and a real traffic light; café seating overlooks it."),
  ],
  prices: [
    {
      ...visit, id: "pe013-under11m", kind: "admission", label: "Under 11 months", audience: "infant", ageMin: 0, ageMax: 0, isFree: true, amount: null, currency: "CAD", requiredAddon: false, plusTax: null, notes: "Free with a paid child",
      conflictNote: "The 2020 Price Update page says under 12 months are free with a paid child, per family.",
    },
    {
      ...visit, id: "pe013-child", kind: "admission", label: "Child", audience: "child", ageMin: 1, durationMinutes: 120, amount: 15, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, adultsIncluded: 0, eligibility: "Any child over 11 months",
      notes: "General admission, Mon–Sun, in 2-hour slots; reservations required",
      conflictNote: "The 2020 Price Update page lists $10 for 12–23 months.",
    },
    { ...visit, id: "pe013-adult-first", kind: "admission", label: "First adult", audience: "adult", durationMinutes: 120, amount: 10, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, eligibility: "When booking for 1 child" },
    { ...visit, id: "pe013-adult-extra", kind: "admission", label: "Extra adult", audience: "adult", durationMinutes: 120, amount: 5, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true },
    { ...visit, id: "pe013-adult-2plus", kind: "admission", label: "Each adult, 2 or more children", audience: "adult", durationMinutes: 120, amount: 5, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, eligibility: "When booking for 2 or more children, all adults are $5 + HST" },
    {
      ...visit, id: "pe013-private-play", kind: "group", label: "Private Play", audience: "group", durationMinutes: 90, includesNote: "Up to 15 people, kids and adults included", amount: 185, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, dayType: "weekday",
      notes: "Minimum price; Monday to Thursday only",
    },
    { ...visit, id: "pe013-private-play-extra", kind: "group", label: "Private Play, additional child or adult", audience: "other", amount: 15, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true },
    partyPackage("pe013-party-20", "20 people party package", 500, "1 party room, 1 party size cheese pizza, 1 pitcher of juice, 1 bowl of chips"),
    partyPackage("pe013-party-30", "30 people party package", 600, "2 party rooms, 2 party size cheese pizzas, 2 pitchers of juice, 1 bowl of chips"),
    partyPackage("pe013-party-50", "50 people party package", 720, "3 party rooms, 2 party size cheese pizzas, 2 pitchers of juice, 2 bowls of chips"),
    partyPackage("pe013-party-70", "70 people private party package", 820, "Full facility, 3 party size cheese pizzas, 3 pitchers of juice, 3 bowls of chips", OLD_PARTIES_NOTE),
    {
      ...parties, id: "pe013-party-extra-time", kind: "addon", label: "Party extra time, per hour", audience: "group", amount: 165, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true,
      notes: "Up to a maximum of two hours, based on availability",
      conflictNote: "The older www.kidsplaytown.ca copy of the Parties page says overtime may be charged at $25 per 15 minutes.",
    },
  ],
  programs: [],
  amenities: [
    { ...faqs, amenity: "parking", status: "yes", note: "Plenty of free parking" },
    { ...faqs, amenity: "grip_socks", status: "yes", note: "Socks sold at reception for kids and adults; price not published" },
    { ...about, amenity: "parent_seating", status: "yes", note: "Seating along the Main Street and in the Café" },
    { ...about, amenity: "viewing_area", status: "yes", note: "Parents in the Café can watch the kids on security monitors" },
    { ...faqs, amenity: "outside_food", status: "yes", note: "Nut-free food only" },
    { ...faqs, amenity: "other", status: "yes", note: "Five highchairs available on request" },
    { ...parties, amenity: "party_rooms", status: "yes", note: "Enchanted Castle, Friendly Forest and Playtown Pond" },
  ],
  policies: [
    { ...visit, kind: "booking_rule", body: "Reservations required: contact Playtown before visiting, due to limited capacity. General admission runs in 2-hour slots." },
    { ...visit, kind: "hours_note", body: "No current hours are posted. The Visit Us page shows only a slot table for the week of July 22–28, 2024, and says to see the home page for other slots." },
    { ...visit, kind: "booking_rule", body: "On peak days (Saturdays, Sundays and PA Days) capacity is sometimes limited. On weekends, or if you're travelling far, check Playtown's Facebook page or call first." },
    { ...visit, kind: "other", body: "Payment is by e-transfer (preferred) or cash." },
    { ...parties, kind: "dress_socks", body: "Socks only: all kids and adults must wear socks. Socks are sold at reception for kids and adults." },
    { ...about, kind: "supervision", body: "No child can enter or exit without a parent, and no adult can enter without a child. Exit doors are alarmed, and parents are encouraged to play along in the playhouses." },
    { ...faqs, kind: "food_rule", body: "Food from home is allowed for daily play and parties, but it can't contain peanuts or nuts." },
    { ...faqs, kind: "restriction", body: "Children in potty training must wear diapers for the whole visit." },
    { ...faqs, kind: "restriction", body: "No alcohol at any time, including private parties." },
    { ...parties, kind: "restriction", body: "Children who are unwell during their visit will be asked to leave. No rough play." },
    {
      ...parties, kind: "party", body:
        "Each party has a 2-hour slot plus 15 minutes for setup, and access to all of the play section. Packages count kids and adults together. The Enchanted Castle isn't available for double-room parties. The cafeteria is included only with a private party. Bring your own cutlery, plates, cups and napkins. No food or drinks in the play area ($200 fine). On arrival you sign a form and give contact details.",
      conflictNote: OLD_PARTIES_NOTE,
    },
    { ...faqs, kind: "party", body: "The play area stays open for daily play during parties and is shared with party guests. Confirm your guest count at least 3 days ahead." },
    {
      ...parties, kind: "cancellation", body: "Party cancellations within 48 hours of the party pay the full balance.",
      conflictNote: "The older www.kidsplaytown.ca copy of the Parties page gives a deposit-based policy: more than 14 days, deposit transferable; 7–14 days, 50%; under 7 days, forfeited.",
    },
  ],
  links: [
    { ...site, kind: "website", value: PE013_SITE, label: "Playtown" },
    {
      ...parties, kind: "phone", value: "647-697-4003",
      conflictNote: "The older www.kidsplaytown.ca copy of the Parties page lists 905-569-7529.",
    },
  ],
  reviewSources: [],
  experienceThemes: [],
};
