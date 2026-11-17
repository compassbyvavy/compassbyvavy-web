"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAV_LINKS, isSiteNavActive } from "@/lib/site/siteNav";

/**
 * Discover, Plan, Learn and Shop, with Account as its own outlined pill so
 * the phone header can put Account beside the logo.
 */
export function SiteNav() {
  const pathname = usePathname() || "/";
  const links = SITE_NAV_LINKS.filter((item) => item.id !== "account");
  const account = SITE_NAV_LINKS.find((item) => item.id === "account");

  return (
    <>
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
      {account ? (
        <Link
          href={account.href}
          className={
            isSiteNavActive(pathname, account.id)
              ? "site-nav-link site-nav-account is-active"
              : "site-nav-link site-nav-account"
          }
          aria-current={isSiteNavActive(pathname, account.id) ? "page" : undefined}
        >
          {account.label}
        </Link>
      ) : null}
    </>
  );
}
