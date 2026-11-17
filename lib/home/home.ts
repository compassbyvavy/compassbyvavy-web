/**
 * Home page copy and links. Category routes are the live Discover pages.
 * A "#" link is a section that does not have a page yet.
 */

export const FOUNDER_NOTE = "";

export const HEADER_CITIES = [
  { id: "mississauga--r5", label: "Mississauga" },
  { id: "oakville--r3", label: "Oakville" },
  { id: "brampton--r5", label: "Brampton" },
  { id: "toronto--r5", label: "Toronto" },
] as const;

export const DEFAULT_HEADER_CITY = HEADER_CITIES[0].id;

export const SEARCH_PLACEHOLDER = "Search places, camps, classes";

export const WAITLIST_ADDRESS = "hello@compassbyvavy.ca";

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

export type HomeCategory = {
  label: string;
  href: string;
  icon: "play" | "parks" | "camps" | "classes" | "events" | "learning" | "food" | "getaways";
  highlight?: boolean;
};

export const HOME_CATEGORIES: readonly HomeCategory[] = [
  { label: "Indoor play", href: "/discover/play", icon: "play" },
  { label: "Parks & nature", href: "/discover/parks", icon: "parks" },
  { label: "Camps", href: "/camps", icon: "camps", highlight: true },
  { label: "Classes", href: "/discover/classes", icon: "classes" },
  { label: "Events", href: "/discover/events", icon: "events" },
  { label: "Learning & culture", href: "/discover/learning", icon: "learning" },
  { label: "Food & treats", href: "/discover/food", icon: "food" },
  { label: "Getaways", href: "/discover/travel", icon: "getaways" },
];

/** Footer and nav targets that do not have a page yet. */
export const UNBUILT_LINKS = [
  { label: "Shop", href: "#" },
  { label: "List your camp for free", href: "#" },
  { label: "Update your listing", href: "#" },
] as const;

export function headerCityId(stored: string | null): string {
  return HEADER_CITIES.some((city) => city.id === stored) ? stored! : DEFAULT_HEADER_CITY;
}
