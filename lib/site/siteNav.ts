/**
 * Site-wide main navigation. The header shows exactly these four links plus
 * the search bar: Discover · Plan · Learn · Account · Search.
 */

export type SiteNavId = "discover" | "plan" | "learn" | "account";

export type SiteNavLink = {
  id: SiteNavId;
  href: string;
  label: string;
};

export const SITE_NAV_LINKS: readonly SiteNavLink[] = [
  { id: "discover", href: "/#discover", label: "Discover" },
  { id: "plan", href: "/saved", label: "Plan" },
  { id: "learn", href: "/learn", label: "Learn" },
  { id: "account", href: "/account", label: "Account" },
] as const;

function under(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Which main-nav item a page belongs to. The home page highlights nothing. */
export function isSiteNavActive(pathname: string, id: SiteNavId): boolean {
  const path = pathname.split("?")[0].split("#")[0] || "/";
  switch (id) {
    case "discover":
      return under(path, "/discover") || under(path, "/camps");
    case "plan":
      return under(path, "/saved") || under(path, "/calendar");
    case "learn":
      return under(path, "/learn");
    case "account":
      return under(path, "/account");
  }
}
