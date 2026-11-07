/**
 * PE-015 — Kids Empire, Heartland (Mississauga). Real venue record (draft).
 *
 * Source: kidsempire.com General Admission and About pages, read Nov 7,
 * 2026. The PE number is provisional.
 *
 * kidsempire.com has no Mississauga or Heartland location page. The store
 * locator ("Find location") and "All locations" list load by script and show
 * no locations; the sitemap's store-locator pages are all US parks (the only
 * "Ontario" page, /store-locator/kids-empire-ontario, is Ontario, CA); the
 * ticket store's park selector says "No matching locations found"; and the
 * About page says "over 100 Kids Empire locations span the United States",
 * with no mention of Canada. So:
 * - operatingStatus is "unknown": nothing on the site shows this location
 *   operating (no hours, schedule or bookings for it).
 * - addressLine is null. 600 Matheson Blvd W comes only from the Google
 *   listing. The branch name "Heartland" comes from the task, not the site.
 * - Only rules the site words as applying to all of Kids Empire are stored
 *   (waivers, socks, card-only payment, outside food), and the site only ever
 *   describes US parks. Treat them as chain rules for the call sheet to
 *   confirm.
 * - Not stored, because the site ties them to a location or they vary:
 *   prices (child "$17.90 to $24.90", "Depending on locations", currency not
 *   stated); hours (the General Admission page gives Mon–Thu 10 am–8 pm and
 *   Fri–Sun 10 am–10 pm, but the Ontario, CA park page shows different hours,
 *   so hours vary by park); ages 1–17, under-1 free with a sibling, 2 free
 *   adults per child and $5 extra adults (all part of the ticket, which is
 *   priced per location); all-day re-entry; activities and play zones;
 *   party packages ("per park").
 *
 * Not published, so not stored: that the location is open, its address,
 * unit, phone and email; admission prices in CAD and whether HST is
 * included; adults-free and infant rules here; local hours, holiday, PA Day
 * and March Break hours; the sock price; the Mississauga waiver link and how
 * long a waiver lasts; toddler zone and height limits; change table, nursing
 * space, washrooms; parking and strollers; supervision rules; exceptions to
 * the outside-food rule (baby food, allergies); wheelchair access; party
 * packages and prices; and photo permission for Compass.
 */

import type { Provenance, VenueRecord } from "@/data/discover/venueTypes";

export const PE015_SITE = "https://www.kidsempire.com/";
const ADMISSION = "https://www.kidsempire.com/general-admission";
const LOCATOR = "https://www.kidsempire.com/store-locator";
export const PE015_LAST_RESEARCHED = "2026-11-07";

const site: Provenance = { sourceUrl: PE015_SITE, sourceCheckedDate: PE015_LAST_RESEARCHED, verificationStatus: "verified" };
const admission: Provenance = { ...site, sourceUrl: ADMISSION };

export const pe015KidsEmpireHeartland: VenueRecord = {
  place: {
    id: "PE-015",
    slug: "kids-empire-heartland-mississauga",
    name: "Kids Empire",
    branchName: "Heartland",
    aliases: ["Kids Empire Mississauga", "Kids Empire Heartland"],
    description:
      "A location of Kids Empire, an indoor playground chain. The chain's website doesn't list this location yet, so only the rules Kids Empire states for all its parks are shown here.",
    category: "play_entertainment",
    placeType: "Indoor Playgrounds",
    cityId: "mississauga",
    addressLine: null,
    neighbourhood: null,
    websiteUrl: PE015_SITE,
    postalCode: null,
    allAges: false,
    ageMin: null,
    ageMax: null,
    setting: "indoor",
    costTier: "unknown",
    typicalVisitMinutes: null,
    typicalVisitNote: null,
    compassTake: [
      "Plan ahead: Kids Empire asks every child and adult to sign a waiver, and you can sign it online before you arrive.",
      "Plan ahead: Bring socks for everyone (no shoes), or buy Kids Empire socks at the front desk. Locations take cards only.",
    ].join("\n"),
    toddlerFriendly: "unknown",
    strollerFriendly: "unknown",
    hoursKind: "unknown",
    latitude: null,
    longitude: null,
    sourceUrl: ADMISSION,
    sourceCheckedDate: PE015_LAST_RESEARCHED,
    publicationState: "draft",
    publishedAt: null,
    operatingStatus: "unknown",
  },
  cityName: "Mississauga",
  types: [{ ...admission, placeType: "Indoor Playgrounds", isPrimary: true }],
  ageBands: [],
  hours: [],
  activities: [],
  prices: [],
  programs: [],
  amenities: [
    { ...admission, amenity: "outside_food", status: "no", note: "Sealed tumblers are allowed" },
  ],
  policies: [
    { ...admission, kind: "waiver", body: "Waivers are mandatory for every child and adult visiting Kids Empire; sign yours online before arriving." },
    { ...admission, kind: "dress_socks", body: "No shoes, and non-grip socks are mandatory for each child and adult. Bring your own or buy Kids Empire socks at the front desk." },
    { ...admission, kind: "other", body: "Kids Empire locations accept cards only; some locations have cash-to-card kiosks." },
    { ...admission, kind: "food_rule", body: "Outside food and drinks are not permitted at Kids Empire; sealed tumblers are allowed." },
    { ...site, sourceUrl: LOCATOR, kind: "location_note", body: "The Kids Empire website doesn't list a Mississauga location yet, so local prices and hours aren't published there." },
  ],
  links: [{ ...site, kind: "website", value: PE015_SITE, label: "Kids Empire" }],
  reviewSources: [],
  experienceThemes: [],
};
