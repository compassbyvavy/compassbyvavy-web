/**
 * DEV ONLY — fictional Discover venue fixtures for previewing venue pages.
 *
 * Every name, address, price, review source and URL here is invented
 * (example.org / example.com). Load only through lib/discover/venuesCatalog.ts,
 * which returns nothing in production. Never copy these into real data.
 */

import type { VenueRecord } from "@/data/discover/venueTypes";

export const DEV_ONLY_VENUE_FIXTURES = true as const;

const SRC = "https://example.org/maple-leap/heartland";
const CHECKED = "2026-10-10";
const ok = { sourceUrl: SRC, sourceCheckedDate: CHECKED, verificationStatus: "verified" as const };

/** A fully researched branch: every section has verified facts. */
const heartland: VenueRecord = {
  place: {
    id: "DEV-PE-001",
    slug: "maple-leap-play-centre-heartland",
    name: "Maple Leap Play Centre",
    branchName: "Heartland",
    aliases: ["Maple Leap Heartland"],
    description:
      "An indoor play centre with a multi-level climbing structure, a separate toddler zone and two trampoline courts.",
    category: "play_entertainment",
    placeType: "Indoor Playground",
    cityId: "mississauga",
    addressLine: "100 Example Drive, Unit 4",
    postalCode: "L5V 0A0",
    neighbourhood: "Heartland",
    allAges: false,
    ageMin: 1,
    ageMax: 12,
    setting: "indoor",
    costTier: "moderate",
    typicalVisitMinutes: 120,
    toddlerFriendly: "yes",
    strollerFriendly: "yes",
    hoursKind: "fixed",
    latitude: 43.61,
    longitude: -79.69,
    sourceUrl: SRC,
    sourceCheckedDate: CHECKED,
    publicationState: "published",
    publishedAt: "2026-10-11T12:00:00Z",
    operatingStatus: "open",
  },
  cityName: "Mississauga",
  types: [
    { ...ok, placeType: "Indoor Playground", isPrimary: true },
    { ...ok, placeType: "Trampoline Park", isPrimary: false },
    { ...ok, placeType: "Toddler Play Area", isPrimary: false },
  ],
  ageBands: [
    { ...ok, band: "0_2", fit: "good", note: "Fenced toddler zone for under-3s" },
    { ...ok, band: "3_5", fit: "good" },
    { ...ok, band: "6_9", fit: "good" },
    { ...ok, band: "10_12", fit: "some", note: "Trampolines and the upper climbing levels" },
    { ...ok, band: "13_17", fit: "not_suitable", note: "Play structure is for ages 12 and under" },
  ],
  hours: [
    ...[1, 2, 3, 4, 5].map((weekday) => ({
      weekday: weekday as 1 | 2 | 3 | 4 | 5,
      opensAt: "10:00",
      closesAt: "19:00",
      sourceUrl: SRC,
      sourceCheckedDate: CHECKED,
    })),
    { weekday: 6, opensAt: "09:00", closesAt: "20:00", sourceUrl: SRC, sourceCheckedDate: CHECKED },
    { weekday: 7, opensAt: "09:00", closesAt: "18:00", sourceUrl: SRC, sourceCheckedDate: CHECKED },
    {
      weekday: 1,
      opensAt: "09:00",
      closesAt: "17:00",
      validFrom: "2026-12-21",
      validTo: "2027-01-03",
      notes: "Winter break hours",
      sourceUrl: SRC,
      sourceCheckedDate: CHECKED,
    },
  ],
  activities: [
    {
      ...ok,
      id: "act-1",
      name: "Multi-level climbing structure",
      description: "Three levels of nets, tunnels and slides.",
      availability: "available",
      includedInAdmission: "yes",
      schedule: "always",
      ageMin: 3,
      ageMax: 12,
      maxHeightCm: 150,
    },
    {
      ...ok,
      id: "act-2",
      name: "Toddler zone",
      description: "Soft play and ride-ons in a fenced area.",
      availability: "available",
      includedInAdmission: "yes",
      schedule: "always",
      ageMin: 0,
      ageMax: 3,
    },
    {
      ...ok,
      id: "act-3",
      name: "Trampoline courts",
      availability: "available",
      includedInAdmission: "no",
      extraCostNote: "$6 per 30-minute session",
      schedule: "scheduled",
      scheduleNote: "Sessions start on the hour",
      ageMin: 5,
      maxWeightKg: 100,
      safetyNote: "One jumper per trampoline",
    },
    {
      ...ok,
      id: "act-4",
      name: "Laser tag",
      availability: "not_offered",
      includedInAdmission: "unknown",
      schedule: "unknown",
      safetyNote: "Offered at other Maple Leap branches, not this one",
    },
  ],
  prices: [
    { ...ok, id: "p1", kind: "admission", label: "Child admission", audience: "child", ageMin: 3, ageMax: 12, durationMinutes: 120, amount: 21.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, includesNote: "climbing structure" },
    { ...ok, id: "p2", kind: "admission", label: "Toddler admission", audience: "infant", ageMin: 1, ageMax: 2, amount: 12.99, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true },
    { ...ok, id: "p3", kind: "admission", label: "Under 1", audience: "infant", ageMax: 0, isFree: true, currency: "CAD", requiredAddon: false },
    { ...ok, id: "p4", kind: "admission", label: "Accompanying adult", audience: "non_participant", isFree: true, currency: "CAD", requiredAddon: false },
    { ...ok, id: "p5", kind: "addon", label: "Grip socks", audience: "child", amount: 3.5, isFree: false, currency: "CAD", requiredAddon: true, plusTax: true },
    { ...ok, id: "p6", kind: "membership", label: "Monthly play pass", audience: "child", amount: 59, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, includesNote: "unlimited weekday visits" },
    { ...ok, id: "p7", kind: "party", label: "Birthday party (10 children)", audience: "group", amount: 349, isFree: false, currency: "CAD", requiredAddon: false, plusTax: true, durationMinutes: 120 },
    { ...ok, id: "p8", kind: "promotion", label: "Weekday morning toddler rate", audience: "infant", amount: 9.99, isFree: false, currency: "CAD", requiredAddon: false, eligibility: "Monday to Friday before noon", validTo: "2026-12-19" },
    { ...ok, id: "p9", kind: "promotion", label: "Summer pass", audience: "child", amount: 79, isFree: false, currency: "CAD", requiredAddon: false, validTo: "2026-09-01" },
  ],
  programs: [
    { ...ok, id: "prog-1", name: "Toddler mornings", description: "Quieter play with the big structure closed to over-5s.", cadence: "ongoing", scheduleNote: "Tuesdays and Thursdays, 9–11 am", ageMin: 0, ageMax: 4, priceNote: "Toddler admission applies" },
    { ...ok, id: "prog-2", name: "Sensory-friendly hour", description: "Lower music and lighting, capped attendance.", cadence: "dated", startsOn: "2026-11-01", endsOn: "2026-11-29", scheduleNote: "Sundays, 8–9 am", registrationUrl: "https://example.org/maple-leap/heartland/sensory" },
  ],
  amenities: [
    { ...ok, amenity: "washrooms", status: "yes" },
    { ...ok, amenity: "change_table", status: "yes", note: "In both washrooms" },
    { ...ok, amenity: "parent_seating", status: "yes", note: "Café tables facing the toddler zone" },
    { ...ok, amenity: "food_onsite", status: "yes", note: "Café with snacks and coffee" },
    { ...ok, amenity: "outside_food", status: "no", note: "Except baby food and birthday cake for booked parties" },
    { ...ok, amenity: "lockers", status: "yes", note: "Coin lockers" },
    { ...ok, amenity: "parking", status: "yes", note: "Free plaza parking" },
    { ...ok, amenity: "wifi", status: "yes" },
    { ...ok, amenity: "grip_socks", status: "yes", note: "Sold at the front desk" },
    { ...ok, amenity: "sensory_supports", status: "yes", verificationStatus: "conflicting", conflictNote: "The website lists ear defenders to borrow; the FAQ page does not mention them." },
  ],
  policies: [
    { ...ok, kind: "supervision", body: "Children under 10 must have an adult in the building at all times." },
    { ...ok, kind: "height_limit", body: "The climbing structure is for children under 150 cm." },
    { ...ok, kind: "waiver", body: "A parent or guardian must sign the online waiver for each child before the first visit." },
    { ...ok, kind: "dress_socks", body: "Everyone on the play structure, including adults, must wear grip socks." },
    { ...ok, kind: "booking_rule", body: "Booking ahead is recommended on weekends; walk-ins are taken when space allows." },
    { ...ok, kind: "arrival", body: "Arrive 15 minutes before your session to check in." },
    { ...ok, kind: "food_rule", body: "No re-entry once you leave the play area." },
    { ...ok, kind: "cancellation", body: "Online bookings can be moved up to 24 hours before the session; no refunds." },
    { ...ok, kind: "hours_note", body: "Closed on Christmas Day and New Year's Day." },
    { ...ok, kind: "location_note", body: "Entrance is at the back of the plaza, beside the gym." },
  ],
  links: [
    { ...ok, kind: "website", value: "https://example.org/maple-leap/heartland" },
    { ...ok, kind: "booking", value: "https://example.org/maple-leap/heartland/book" },
    { ...ok, kind: "phone", value: "905-555-0100" },
  ],
  reviewSources: [
    {
      ...ok,
      id: "rs-google",
      sourceUrl: "https://maps.example.com/maple-leap-heartland",
      kind: "customer_reviews",
      platform: "google_places_reviews",
      sourceName: "Google",
      coverageNote: "Read the reviews Google Places returned for this location.",
      selectionMethod: "Google's 'most relevant' ordering",
      itemsReviewed: 5,
      periodFrom: "2026-03-02",
      periodTo: "2026-09-28",
      statedRating: 4.4,
      ratingScale: 5,
      statedRatingCount: 612,
      providerAttributions: [
        { name: "Review author A", uri: "https://maps.example.com/contrib/a" },
        { name: "Review author B", uri: "https://maps.example.com/contrib/b" },
      ],
    },
    {
      ...ok,
      id: "rs-blog",
      sourceUrl: "https://blog.example.com/gta-indoor-play-roundup",
      kind: "editorial",
      platform: "blog_or_guide",
      sourceName: "Example Family Blog",
      coverageNote: "A roundup of GTA indoor play centres that includes this branch.",
      itemsReviewed: 1,
    },
    {
      ...ok,
      id: "rs-bad-google",
      sourceUrl: "https://maps.example.com/no-attribution",
      kind: "customer_reviews",
      platform: "google_review_summary",
      sourceName: "Google review summary",
      coverageNote: "Summary without the required disclosure — must be withheld.",
    },
  ],
  experienceThemes: [
    { ...ok, theme: "parent_seating", summary: "The venue describes café seating with a view of the toddler zone.", basis: "venue_published", sentiment: "neutral", agreement: "consistent" },
    { ...ok, theme: "age_fit", summary: "Reviewers with under-5s often mention the separate toddler zone as a reason to visit.", basis: "reviewer_reported", sentiment: "liked", agreement: "consistent", reviewSourceId: "rs-google", sourceUrl: "https://maps.example.com/maple-leap-heartland" },
    { ...ok, theme: "activity_level", summary: "The roundup describes it as very active, best for kids who want to climb and jump.", basis: "reviewer_reported", sentiment: "neutral", agreement: "consistent", reviewSourceId: "rs-blog", sourceUrl: "https://blog.example.com/gta-indoor-play-roundup" },
    { ...ok, theme: "busy_times", summary: "Several reviews say weekend afternoons get crowded and loud.", basis: "reviewer_reported", sentiment: "concern", agreement: "consistent", reviewSourceId: "rs-google", sourceUrl: "https://maps.example.com/maple-leap-heartland" },
  ],
};

/** A thinly researched branch of the same chain: most sections are empty. */
const brampton: VenueRecord = {
  place: {
    id: "DEV-PE-002",
    slug: "maple-leap-play-centre-brampton",
    name: "Maple Leap Play Centre",
    branchName: "Brampton",
    category: "play_entertainment",
    cityId: "brampton",
    allAges: false,
    setting: "unknown",
    costTier: "unknown",
    toddlerFriendly: "unknown",
    strollerFriendly: "unknown",
    hoursKind: "unknown",
    sourceUrl: "https://example.org/maple-leap/brampton",
    sourceCheckedDate: "2026-10-09",
    publicationState: "published",
    publishedAt: "2026-10-11T12:00:00Z",
    operatingStatus: "open",
  },
  cityName: "Brampton",
  types: [
    { sourceUrl: "https://example.org/maple-leap/brampton", sourceCheckedDate: "2026-10-09", verificationStatus: "verified", placeType: "Indoor Playground", isPrimary: true },
  ],
  ageBands: [],
  hours: [],
  activities: [
    {
      id: "act-b1",
      name: "Laser tag",
      availability: "available",
      includedInAdmission: "unknown",
      schedule: "unknown",
      sourceUrl: "https://example.org/maple-leap/all-locations",
      sourceCheckedDate: "2026-10-09",
      // Chain-wide page only — not yet confirmed for this branch.
      verificationStatus: "needs_follow_up",
    },
  ],
  prices: [],
  programs: [],
  amenities: [],
  policies: [],
  links: [],
  reviewSources: [],
  experienceThemes: [],
};

/** Draft — must never get a public page. */
const draft: VenueRecord = {
  ...brampton,
  place: {
    ...brampton.place,
    id: "DEV-PE-003",
    slug: "lakeshore-splash-pad-draft",
    name: "Lakeshore Splash Pad",
    branchName: null,
    cityId: "oakville",
    publicationState: "draft",
    publishedAt: null,
  },
  cityName: "Oakville",
};

/** Published but permanently closed — must never get a public page. */
const closed: VenueRecord = {
  ...brampton,
  place: {
    ...brampton.place,
    id: "DEV-PE-004",
    slug: "old-mill-fun-zone",
    name: "Old Mill Fun Zone",
    branchName: null,
    cityId: "mississauga",
    operatingStatus: "permanently_closed",
  },
  cityName: "Mississauga",
};

export const venuesDevRecords: VenueRecord[] = [heartland, brampton, draft, closed];
