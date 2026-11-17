"use client";

import { Heart, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteSearchBar, SiteSearchBarShell } from "@/components/site/SiteSearchBar";
import {
  HEADER_WAITLIST_HREF,
  LIST_YOUR_CAMP_HREF,
  SAVED_HREF,
  SHOW_WAITLIST_UNTIL_LAUNCH,
} from "@/lib/home/home";
import { isSiteNavActive, mainMenuLinks } from "@/lib/site/siteNav";
import { usePathname } from "next/navigation";

/**
 * Logged-out header. There is no auth session in the app yet, so this
 * always shows Sign in rather than Account.
 */
export function SiteHeader() {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const account = mainMenuLinks().find((item) => item.id === "account");
  const accountActive = account ? isSiteNavActive(pathname, account.id) : false;

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, searchOpen]);

  function openSearch() {
    setMenuOpen(false);
    setSearchOpen((open) => {
      const next = !open;
      if (next) {
        window.requestAnimationFrame(() => {
          document.querySelector<HTMLInputElement>("#site-search input[type='search']")?.focus();
        });
      }
      return next;
    });
  }

  return (
    <header className="site-header">
      <div className={searchOpen ? "container header-inner is-search-open" : "container header-inner"}>
        <Link className="brand" href="/">
          <img src="/brand/mark.svg" alt="" width={38} height={38} />
          <span className="brand-words">
            <span className="brand-compass">Compass</span>{" "}
            <span className="brand-by">by Vavy</span>
          </span>
        </Link>
        <div className="header-search" id="site-search">
          <Suspense fallback={<SiteSearchBarShell />}>
            <SiteSearchBar />
          </Suspense>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="header-icon-btn header-search-toggle"
            aria-label="Search"
            aria-expanded={searchOpen}
            aria-controls="site-search"
            onClick={openSearch}
          >
            <Search aria-hidden="true" size={22} strokeWidth={1.75} />
          </button>
          <Link className="header-icon-btn header-saved" href={SAVED_HREF} aria-label="Saved">
            <Heart aria-hidden="true" size={22} strokeWidth={1.75} />
          </Link>
          <div className="header-desktop">
            <SiteNav />
            <a className="header-list-camp" href={LIST_YOUR_CAMP_HREF}>
              List your camp
            </a>
            {account ? (
              <Link
                href={account.href}
                className={
                  accountActive ? "site-nav-link site-nav-account is-active" : "site-nav-link site-nav-account"
                }
                aria-current={accountActive ? "page" : undefined}
              >
                {account.label}
              </Link>
            ) : null}
            {SHOW_WAITLIST_UNTIL_LAUNCH ? (
              <a className="home-btn home-btn-green header-waitlist" href={HEADER_WAITLIST_HREF}>
                Join the waitlist
              </a>
            ) : null}
          </div>
          <button
            type="button"
            className="header-icon-btn header-menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Menu"}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => {
              setSearchOpen(false);
              setMenuOpen((open) => !open);
            }}
          >
            {menuOpen ? (
              <X aria-hidden="true" size={22} strokeWidth={1.75} />
            ) : (
              <Menu aria-hidden="true" size={22} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div className="header-menu" id="site-menu">
          <nav className="container header-menu-list" aria-label="Main menu">
            {mainMenuLinks()
              .filter((item) => item.id !== "account")
              .map((item) => {
                const active = isSiteNavActive(pathname, item.id);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={active ? "header-menu-link is-active" : "header-menu-link"}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            <a className="header-menu-link" href={LIST_YOUR_CAMP_HREF}>
              List your camp
            </a>
            {account ? (
              <Link
                href={account.href}
                className={accountActive ? "header-menu-link is-active" : "header-menu-link"}
                aria-current={accountActive ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {account.label}
              </Link>
            ) : null}
            {SHOW_WAITLIST_UNTIL_LAUNCH ? (
              <a className="header-menu-link header-menu-waitlist" href={HEADER_WAITLIST_HREF}>
                Join the waitlist
              </a>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
