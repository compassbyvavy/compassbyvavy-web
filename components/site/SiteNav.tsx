"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAV_LINKS, isSiteNavActive } from "@/lib/site/siteNav";

/**
 * Main navigation: Discover · Plan · Learn · Account.
 * Search lives in the header search bar beside it. No bottom tab bar on
 * phones — the same links sit under the brand instead.
 */
export function SiteNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="site-nav" aria-label="Main navigation">
      {SITE_NAV_LINKS.map((item) => {
        const active = isSiteNavActive(pathname, item.id);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={active ? "site-nav-link is-active" : "site-nav-link"}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
