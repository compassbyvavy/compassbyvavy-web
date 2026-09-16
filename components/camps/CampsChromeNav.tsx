"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CAMPS_CHROME_LINKS,
  isCampsChromeHrefActive,
} from "@/lib/camps/campsChrome";

export function CampsChromeNav() {
  const pathname = usePathname();
  return (
    <nav className="camps-chrome-nav" aria-label="Camps">
      <ul className="camps-chrome-nav-list">
          {CAMPS_CHROME_LINKS.map((link) => {
            const active = isCampsChromeHrefActive(pathname, link.href);
            return (
              <li key={link.id}>
                <Link
                  href={link.href}
                  className={
                    active
                      ? "camps-chrome-nav-link is-active"
                      : "camps-chrome-nav-link"
                  }
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className="camps-chrome-nav-link"
              onClick={() =>
                window.dispatchEvent(new Event("compass:open-command-palette"))
              }
            >
              Search
            </button>
          </li>
      </ul>
    </nav>
  );
}
