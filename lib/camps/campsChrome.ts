/**
 * Camps chrome — browse / saved / registration tracker.
 *
 * Planner and Camp Buddies stay out of this increment on purpose.
 * Registration Tracker was the missing CampMatch-inspired reminder surface.
 */

export type CampsChromeLinkId = "browse" | "saved" | "registration_tracker";

export type CampsChromeLink = {
  id: CampsChromeLinkId;
  href: string;
  label: string;
};

export const CAMPS_CHROME_LINKS: readonly CampsChromeLink[] = [
  { id: "browse", href: "/camps", label: "Browse camps" },
  { id: "saved", href: "/saved", label: "Saved" },
  {
    id: "registration_tracker",
    href: "/saved/tracker",
    label: "Registration Tracker",
  },
] as const;

export const CAMPS_CHROME_OMITTED = ["Planner", "Camp Buddies"] as const;

export const REGISTRATION_TRACKER_HREF = "/saved/tracker";

export function isCampsChromeHrefActive(
  pathname: string,
  href: string,
): boolean {
  const path = pathname.split("?")[0] || "/";
  if (href === "/saved/tracker") {
    return path === "/saved/tracker" || path.startsWith("/saved/tracker/");
  }
  if (href === "/saved") {
    return path === "/saved" || path === "/saved/compare" || path.startsWith("/saved/compare/");
  }
  if (href === "/camps") {
    return path === "/camps" || path.startsWith("/camps/");
  }
  return path === href;
}

export function campsChromeLinkById(
  id: CampsChromeLinkId,
): CampsChromeLink | undefined {
  return CAMPS_CHROME_LINKS.find((link) => link.id === id);
}
