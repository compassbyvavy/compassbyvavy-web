/**
 * Per-category search and filters for Discover listing pages.
 * Facets only match a confirmed yes or no. Unknown is never treated as either.
 */

import type {
  DiscoverCategoryId,
  DiscoverPlaceListing,
} from "@/lib/listings/discoverPlace";
import type { ListingTriState } from "@/lib/listings/types";

export type PlaceKindOption = {
  id: string;
  label: string;
};

export type DiscoverFacet = {
  id: string;
  label: string;
  read: (listing: DiscoverPlaceListing) => ListingTriState;
};

export type CategoryPage = {
  slug: DiscoverCategoryId;
  lede: string;
  exampleBanner: string;
  trustNote: string;
  /** Stricter copy for the services directory. Omitted everywhere else. */
  governanceNote?: string;
  emptyTitle: string;
  emptyBody: string;
  placeKinds: readonly PlaceKindOption[];
  facets: readonly DiscoverFacet[];
};

export const EXAMPLE_PAGE_BANNER =
  "These are labelled examples so the page can render. Names, places, prices, and dates are fictional seed data — not verified listings and not real businesses. Latest verified shows the seed date when one is present, or Unknown when it is not.";

export const DISCOVER_TRUST_NOTE =
  "Compass does not take payment or registration. When a provider link is on file, the next step opens on the provider's site. Unknown stays Unknown.";

export const SERVICES_GOVERNANCE_NOTE =
  "Directory facts only. Compass does not rank care, recommend a clinician, or promise an outcome. This is not medical advice. Confirm anything important with the provider.";

const SHARED_EMPTY_BODY =
  "Nothing in this example set matches. A Yes or No filter skips rows whose fact is Unknown — Compass does not guess.";

function facet(
  id: string,
  label: string,
  read: (listing: DiscoverPlaceListing) => ListingTriState,
): DiscoverFacet {
  return { id, label, read };
}

function triFrom(
  category: DiscoverCategoryId,
  read: (listing: DiscoverPlaceListing) => ListingTriState,
): (listing: DiscoverPlaceListing) => ListingTriState {
  return (listing) =>
    listing.extension.category === category ? read(listing) : "unknown";
}

export const CATEGORY_PAGES: readonly CategoryPage[] = [
  {
    slug: "parks",
    lede: "Playgrounds, splash pads, trails, conservation areas, and beaches. Filter by what is actually on file.",
    exampleBanner: EXAMPLE_PAGE_BANNER,
    trustNote: DISCOVER_TRUST_NOTE,
    emptyTitle: "No parks match",
    emptyBody: SHARED_EMPTY_BODY,
    placeKinds: [
      { id: "playground", label: "Playgrounds" },
      { id: "splash_pad", label: "Splash pads" },
      { id: "trail", label: "Trails" },
      { id: "conservation", label: "Conservation areas" },
      { id: "beach", label: "Beaches" },
    ],
    facets: [
      facet(
        "washrooms",
        "Washrooms",
        triFrom("parks", (listing) =>
          listing.extension.category === "parks"
            ? listing.extension.washrooms
            : "unknown",
        ),
      ),
      facet(
        "shade",
        "Shade",
        triFrom("parks", (listing) =>
          listing.extension.category === "parks"
            ? listing.extension.shade
            : "unknown",
        ),
      ),
      facet(
        "stroller",
        "Stroller friendly",
        triFrom("parks", (listing) =>
          listing.extension.category === "parks"
            ? listing.extension.strollerFriendly
            : "unknown",
        ),
      ),
      facet(
        "parking",
        "Parking",
        triFrom("parks", (listing) =>
          listing.extension.category === "parks"
            ? listing.extension.parking
            : "unknown",
        ),
      ),
    ],
  },
  {
    slug: "play",
    lede: "Indoor play, trampoline parks, arcades, and rainy-day fallbacks.",
    exampleBanner: EXAMPLE_PAGE_BANNER,
    trustNote: `${DISCOVER_TRUST_NOTE} Splash pads live under Parks & Nature.`,
    emptyTitle: "No play spots match",
    emptyBody: SHARED_EMPTY_BODY,
    placeKinds: [
      { id: "indoor_play", label: "Indoor play" },
      { id: "trampoline", label: "Trampoline parks" },
      { id: "arcade", label: "Arcades" },
      { id: "rainy_day", label: "Rainy-day fallbacks" },
    ],
    facets: [
      facet(
        "waiver",
        "Waiver required",
        triFrom("play", (listing) =>
          listing.extension.category === "play"
            ? listing.extension.waiverRequired
            : "unknown",
        ),
      ),
      facet(
        "socks",
        "Socks required",
        triFrom("play", (listing) =>
          listing.extension.category === "play"
            ? listing.extension.socksRequired
            : "unknown",
        ),
      ),
    ],
  },
  {
    slug: "learning",
    lede: "Museums, libraries, galleries, science centres, and heritage sites.",
    exampleBanner: EXAMPLE_PAGE_BANNER,
    trustNote: DISCOVER_TRUST_NOTE,
    emptyTitle: "No learning spots match",
    emptyBody: SHARED_EMPTY_BODY,
    placeKinds: [
      { id: "museum", label: "Museums" },
      { id: "library", label: "Libraries" },
      { id: "gallery", label: "Galleries" },
      { id: "science_centre", label: "Science centres" },
      { id: "heritage", label: "Heritage sites" },
    ],
    facets: [
      facet(
        "free",
        "Free admission",
        triFrom("learning", (listing) =>
          listing.extension.category === "learning"
            ? listing.extension.freeAdmission
            : "unknown",
        ),
      ),
      facet(
        "card",
        "Library card required",
        triFrom("learning", (listing) =>
          listing.extension.category === "learning"
            ? listing.extension.libraryCardRequired
            : "unknown",
        ),
      ),
    ],
  },
  {
    slug: "events",
    lede: "Festivals, seasonal happenings, and free community days.",
    exampleBanner: EXAMPLE_PAGE_BANNER,
    trustNote: DISCOVER_TRUST_NOTE,
    emptyTitle: "No events match",
    emptyBody: SHARED_EMPTY_BODY,
    placeKinds: [
      { id: "festival", label: "Festivals" },
      { id: "seasonal", label: "Seasonal happenings" },
      { id: "free_community_day", label: "Free community days" },
    ],
    facets: [
      facet(
        "free",
        "Free to attend",
        triFrom("events", (listing) =>
          listing.extension.category === "events"
            ? listing.extension.freeToAttend
            : "unknown",
        ),
      ),
      facet(
        "ticket",
        "Ticket required",
        triFrom("events", (listing) =>
          listing.extension.category === "events"
            ? listing.extension.ticketRequired
            : "unknown",
        ),
      ),
    ],
  },
  {
    slug: "classes",
    lede: "Recurring lessons: swim, dance, music, art, sports, and tutoring. Camps stay on their own listing.",
    exampleBanner: EXAMPLE_PAGE_BANNER,
    trustNote: DISCOVER_TRUST_NOTE,
    emptyTitle: "No classes match",
    emptyBody: SHARED_EMPTY_BODY,
    placeKinds: [
      { id: "swim", label: "Swim" },
      { id: "dance", label: "Dance" },
      { id: "music", label: "Music" },
      { id: "art", label: "Art" },
      { id: "sports", label: "Sports" },
      { id: "tutoring", label: "Tutoring" },
    ],
    facets: [
      facet(
        "dropin",
        "Drop-in",
        triFrom("classes", (listing) =>
          listing.extension.category === "classes"
            ? listing.extension.dropIn
            : "unknown",
        ),
      ),
      facet(
        "registration",
        "Registration required",
        triFrom("classes", (listing) =>
          listing.extension.category === "classes"
            ? listing.extension.registrationRequired
            : "unknown",
        ),
      ),
    ],
  },
  {
    slug: "food",
    lede: "Family-friendly restaurants, ice cream, and kid-approved spots.",
    exampleBanner: EXAMPLE_PAGE_BANNER,
    trustNote: DISCOVER_TRUST_NOTE,
    emptyTitle: "No food spots match",
    emptyBody: SHARED_EMPTY_BODY,
    placeKinds: [
      { id: "restaurant", label: "Restaurants" },
      { id: "ice_cream", label: "Ice cream" },
      { id: "kid_approved", label: "Kid-approved spots" },
    ],
    facets: [
      facet(
        "kidsmenu",
        "Kids menu",
        triFrom("food", (listing) =>
          listing.extension.category === "food"
            ? listing.extension.kidsMenu
            : "unknown",
        ),
      ),
      facet(
        "highchairs",
        "High chairs",
        triFrom("food", (listing) =>
          listing.extension.category === "food"
            ? listing.extension.highChairs
            : "unknown",
        ),
      ),
    ],
  },
  {
    slug: "travel",
    lede: "Day trips, worth-the-drive destinations, and weekend escapes.",
    exampleBanner: EXAMPLE_PAGE_BANNER,
    trustNote: DISCOVER_TRUST_NOTE,
    emptyTitle: "No getaways match",
    emptyBody: SHARED_EMPTY_BODY,
    placeKinds: [
      { id: "day_trip", label: "Day trips" },
      { id: "worth_the_drive", label: "Worth the drive" },
      { id: "weekend_escape", label: "Weekend escapes" },
    ],
    facets: [
      facet(
        "overnight",
        "Overnight",
        triFrom("travel", (listing) =>
          listing.extension.category === "travel"
            ? listing.extension.overnight
            : "unknown",
        ),
      ),
    ],
  },
  {
    slug: "shopping",
    lede: "Toy stores, kids' consignment, and family-friendly retail.",
    exampleBanner: EXAMPLE_PAGE_BANNER,
    trustNote: DISCOVER_TRUST_NOTE,
    emptyTitle: "No shops match",
    emptyBody: SHARED_EMPTY_BODY,
    placeKinds: [
      { id: "toy_store", label: "Toy stores" },
      { id: "consignment", label: "Kids' consignment" },
      { id: "family_retail", label: "Family-friendly retail" },
    ],
    facets: [
      facet(
        "stroller",
        "Stroller friendly",
        triFrom("shopping", (listing) =>
          listing.extension.category === "shopping"
            ? listing.extension.strollerFriendly
            : "unknown",
        ),
      ),
    ],
  },
  {
    slug: "services",
    lede: "Pediatricians, dentists, tutors, and childcare — a directory of facts, not a recommendation.",
    exampleBanner: EXAMPLE_PAGE_BANNER,
    trustNote: DISCOVER_TRUST_NOTE,
    governanceNote: SERVICES_GOVERNANCE_NOTE,
    emptyTitle: "No services match",
    emptyBody: SHARED_EMPTY_BODY,
    placeKinds: [
      { id: "pediatrician", label: "Pediatricians" },
      { id: "dentist", label: "Dentists" },
      { id: "tutor", label: "Tutors" },
      { id: "childcare", label: "Childcare" },
    ],
    facets: [
      facet(
        "accepting",
        "Accepting new patients",
        triFrom("services", (listing) =>
          listing.extension.category === "services"
            ? listing.extension.acceptingNewPatients
            : "unknown",
        ),
      ),
    ],
  },
];

export function getCategoryPage(slug: string): CategoryPage | undefined {
  return CATEGORY_PAGES.find((page) => page.slug === slug);
}

export function placeKindLabel(category: DiscoverCategoryId, id: string): string {
  const page = getCategoryPage(category);
  return page?.placeKinds.find((kind) => kind.id === id)?.label ?? UNKNOWN_KIND;
}

const UNKNOWN_KIND = "Unknown";
