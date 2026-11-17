"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSiteNavActive, mainMenuLinks } from "@/lib/site/siteNav";

/** Discover, Plan, and Learn. Shop stays out until SHOW_SHOP_IN_MAIN_MENU is on. */
export function SiteNav() {
  const pathname = usePathname() || "/";
  const links = mainMenuLinks().filter((item) => item.id !== "account");

  return (
    <nav className="site-nav" aria-label="Main navigation">
      {links.map((item) => {
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
