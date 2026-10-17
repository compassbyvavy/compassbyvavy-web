"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DISCOVER_CATEGORIES } from "@/lib/discover/categories";

function isActive(pathname: string, href: string): boolean {
  if (href === "/camps") {
    return pathname === "/camps" || pathname.startsWith("/camps/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DiscoverCategoryNav() {
  const pathname = usePathname();
  return (
    <nav className="discover-cat-nav" aria-label="Discover categories">
      {DISCOVER_CATEGORIES.map((category) => {
        const active = isActive(pathname, category.href);
        return (
          <Link
            key={category.slug}
            href={category.href}
            className={active ? "discover-cat-link is-active" : "discover-cat-link"}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden="true">{category.icon}</span>
            {category.title}
          </Link>
        );
      })}
    </nav>
  );
}
