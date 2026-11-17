/**
 * Home page copy and links.
 *
 * Category names follow the Discover spec, with the current labels where
 * they differ: Play & Fun, Animals & Farms, and Day Trips & Getaways.
 * The Discover Categories workbook sheet is not in this repo, and
 * discover_categories is not seeded, so the home page does not query it.
 * Pass rows into homeCategories() only when a caller already has them.
 */

export const FOUNDER_NOTE = "";

export const LOCATION_PICKER_LABEL = "City or region";

/** Header "Join the waitlist" stays until launch. Turn this off on launch day. */
export const SHOW_WAITLIST_UNTIL_LAUNCH = true;

export const WAITLIST_ADDRESS = "hello@compassbyvavy.ca";

export const SAVED_HREF = "/plan/saved";

/** No public listing page yet. This is the mailbox camps already use. */
export const LIST_YOUR_CAMP_HREF =
  "mailto:hello@compassbyvavy.ca?subject=List%20your%20camp";

export const HEADER_WAITLIST_HREF = "/#waitlist";

/**
 * Ontario's official tourism regions, including 13a–c, in source order.
 * Source: data/discover/ontario-location-data.json `regions`
 * (Ontario Ministry of Tourism regions list).
 */
export const TOURISM_REGIONS = [
  { code: "1", name: "Southwest Ontario" },
  { code: "2", name: "Niagara Canada" },
  { code: "3", name: "Hamilton, Halton and Brant" },
  { code: "4", name: "Huron, Perth, Waterloo and Wellington" },
  { code: "5", name: "Greater Toronto Area" },
  { code: "6", name: "York, Durham and Headwaters" },
  { code: "7", name: "Bruce Peninsula, Southern Georgian Bay and Lake Simcoe" },
  { code: "8", name: "Kawarthas Northumberland" },
  { code: "9", name: "Southeastern Ontario" },
  { code: "10", name: "Ottawa and Countryside" },
  { code: "11", name: "Haliburton Highlands to the Ottawa Valley" },
  { code: "12", name: "Muskoka, Parry Sound and Algonquin Park" },
  { code: "13a", name: "Northeastern Ontario" },
  { code: "13b", name: "Sault Ste. Marie - Algoma" },
  { code: "13c", name: "Northwest Ontario" },
] as const;

export type HomePlace = {
  id: string;
  label: string;
  kind: "city" | "region";
  /** Segment used in /[city]/[category]. */
  linkSlug: string;
  /** Camps `where` id. Regions are not browse locations, so this stays empty. */
  whereId: string | null;
};

/** Launch cities already in the picker, before the tourism regions. */
export const HEADER_CITIES: readonly HomePlace[] = [
  {
    id: "mississauga--r5",
    label: "Mississauga",
    kind: "city",
    linkSlug: "mississauga",
    whereId: "mississauga--r5",
  },
  {
    id: "oakville--r3",
    label: "Oakville",
    kind: "city",
    linkSlug: "oakville",
    whereId: "oakville--r3",
  },
  {
    id: "brampton--r5",
    label: "Brampton",
    kind: "city",
    linkSlug: "brampton",
    whereId: "brampton--r5",
  },
  {
    id: "toronto--r5",
    label: "Toronto",
    kind: "city",
    linkSlug: "toronto",
    whereId: "toronto--r5",
  },
];

export const HEADER_REGIONS: readonly HomePlace[] = TOURISM_REGIONS.map((region) => ({
  id: `tourism-region:${region.code}`,
  label: region.name,
  kind: "region" as const,
  linkSlug: regionLinkSlug(region.name),
  whereId: null,
}));

/** Cities first, then the 13 tourism regions (13a–c included). */
export const HOME_PLACES: readonly HomePlace[] = [...HEADER_CITIES, ...HEADER_REGIONS];

export const DEFAULT_HEADER_CITY = HEADER_CITIES[0].id;

export const DEFAULT_CITY_SLUG = HEADER_CITIES[0].linkSlug;

export const SEARCH_PLACEHOLDER = "Search places, camps, classes";

/** Same mailbox and subject the old home page used for the waitlist. */
export function waitlistMailto(email: string): string {
  const body = `Please add me to the Compass by Vavy early-access list.\n\n${email.trim()}`;
  const subject = "Join the Compass by Vavy waitlist";
  return `mailto:${WAITLIST_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function waitlistEmailError(value: string): string | null {
  const email = value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter an email address.";
  return null;
}

export function regionLinkSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function homePlaceById(id: string | null | undefined): HomePlace | undefined {
  if (!id) return undefined;
  return HOME_PLACES.find((place) => place.id === id);
}

export function headerCityId(stored: string | null): string {
  return homePlaceById(stored) ? stored! : DEFAULT_HEADER_CITY;
}

/** City or region slug used in category links. Unknown ids stay on Mississauga. */
export function linkSlugForPlace(id: string | null | undefined): string {
  return homePlaceById(id)?.linkSlug ?? DEFAULT_CITY_SLUG;
}

export type HomeCategoryIcon =
  | "Tent"
  | "FerrisWheel"
  | "Trees"
  | "PawPrint"
  | "Landmark"
  | "GraduationCap"
  | "CalendarDays"
  | "IceCreamCone"
  | "Car";

export type HomeCategory = {
  name: string;
  slug: string;
  icon: HomeCategoryIcon;
  status: "live" | "coming_soon";
};

/**
 * Nine Discover categories, Camps first. Icons are lucide-react names.
 * Coming-soon categories still link.
 */
export const HOME_CATEGORIES: readonly HomeCategory[] = [
  { name: "Camps", slug: "camps", icon: "Tent", status: "live" },
  { name: "Play & Fun", slug: "play-fun", icon: "FerrisWheel", status: "live" },
  { name: "Parks & Nature", slug: "parks-nature", icon: "Trees", status: "coming_soon" },
  { name: "Animals & Farms", slug: "animals-farms", icon: "PawPrint", status: "coming_soon" },
  { name: "Learning & Culture", slug: "learning-culture", icon: "Landmark", status: "coming_soon" },
  { name: "Classes & Programs", slug: "classes-programs", icon: "GraduationCap", status: "coming_soon" },
  { name: "Events", slug: "events", icon: "CalendarDays", status: "coming_soon" },
  { name: "Food & Treats", slug: "food-treats", icon: "IceCreamCone", status: "coming_soon" },
  { name: "Day Trips & Getaways", slug: "day-trips-getaways", icon: "Car", status: "coming_soon" },
];

/**
 * Use discover_categories rows when the caller already has some.
 * An empty or missing list falls back so the row is never blank.
 * This module does not query Supabase.
 */
export function homeCategories(
  fromDatabase?: readonly HomeCategory[] | null,
): readonly HomeCategory[] {
  if (fromDatabase && fromDatabase.length > 0) return fromDatabase;
  return HOME_CATEGORIES;
}

export function homeCategoryHref(category: HomeCategory, citySlug: string = DEFAULT_CITY_SLUG): string {
  return `/${citySlug}/${category.slug}`;
}

export type WinterScene = "tent" | "calendar" | "blocks" | "hill";

export type WinterCard = {
  title: string;
  scene: WinterScene;
  href: string;
};

/**
 * Real routes only.
 * Winter break and PA days use the camps listing timing filters.
 * Indoor play uses the Play category page.
 * There is no sledding or skating page, so that card goes to Parks & Nature.
 */
export const WINTER_CARDS: readonly WinterCard[] = [
  { title: "Winter break camps", scene: "tent", href: "/camps?timing=winter_break" },
  { title: "PA day camps", scene: "calendar", href: "/camps?timing=pa_days" },
  { title: "Indoor play for cold days", scene: "blocks", href: "/discover/play" },
  { title: "Sledding and skating", scene: "hill", href: "/discover/parks" },
];

export type HomeLearnItem = {
  title: string;
  href: string;
  kicker: string;
  summary: string;
};

/**
 * Real Learn routes only. Guides are not published yet.
 * Copy is the Space Mission page's own title, ages, and chit count.
 */
export const HOME_LEARN_ITEMS: readonly HomeLearnItem[] = [
  {
    title: "Space Mission Scavenger Hunt",
    href: "/learn/space-mission-scavenger-hunt",
    kicker: "Free printable · Ages 6–8 · 40 clue chits",
    summary:
      "An indoor treasure hunt from the Sun to the edge of the universe, with a space fact on every chit.",
  },
];

/** Footer targets that do not have a page yet. Shop stays here when the menu hides it. */
export const UNBUILT_LINKS = [
  { label: "Shop", href: "#" },
  { label: "List your camp for free", href: "#" },
  { label: "Update your listing", href: "#" },
] as const;
