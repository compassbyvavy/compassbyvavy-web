"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/#discover", label: "Discover", match: "discover" },
  { href: "/camps", label: "Camps", match: "camps" },
  { href: "/saved", label: "Plan", match: "plan" },
] as const;

const LATER = ["Profile", "Learn", "Services", "Community"] as const;

function isActive(pathname: string, match: (typeof LINKS)[number]["match"]): boolean {
  if (match === "plan") return pathname === "/saved" || pathname.startsWith("/saved/");
  if (match === "camps") return pathname === "/camps" || pathname.startsWith("/camps/");
  return pathname === "/" || pathname.startsWith("/discover");
}

export function SiteNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="nav-row" aria-label="Main navigation">
      {LINKS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={
            isActive(pathname, item.match)
              ? "nav-pill is-active"
              : "nav-pill"
          }
        >
          {item.label}
        </Link>
      ))}
      {LATER.map((label) => (
        <span key={label} className="nav-pill is-later" title="Not designed yet">
          {label}
        </span>
      ))}
    </nav>
  );
}
