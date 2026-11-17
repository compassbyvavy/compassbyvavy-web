/**
 * Site-wide main navigation. The header shows these links plus search:
 * Discover · Plan · Learn · Shop · Sign in.
 * Shop is omitted from the menu while SHOW_SHOP_IN_MAIN_MENU is false.
 * There is no auth session yet, so the account link reads Sign in.
 */

export type SiteNavId = "discover" | "plan" | "learn" | "shop" | "account";

export type SiteNavLink = {
  id: SiteNavId;
  href: string;
  label: string;
};

export const SITE_NAV_LINKS: readonly SiteNavLink[] = [
  { id: "discover", href: "/#discover", label: "Discover" },
  { id: "plan", href: "/saved", label: "Plan" },
  { id: "learn", href: "/learn", label: "Learn" },
  { id: "shop", href: "#", label: "Shop" },
  { id: "account", href: "/account", label: "Sign in" },
] as const;

/**
 * Shop returns to the main menu when a product is live.
 * Default off: Shop stays in the footer only.
 */
export const SHOW_SHOP_IN_MAIN_MENU = false;

export function mainMenuLinks(showShop: boolean = SHOW_SHOP_IN_MAIN_MENU): readonly SiteNavLink[] {
  return showShop ? SITE_NAV_LINKS : SITE_NAV_LINKS.filter((link) => link.id !== "shop");
}

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
      return under(path, "/saved") || under(path, "/calendar") || under(path, "/plan");
    case "learn":
      return under(path, "/learn");
    case "shop":
      return false;
    case "account":
      return under(path, "/account");
  }
}
