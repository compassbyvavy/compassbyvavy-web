"use client";

import Link from "next/link";
import { useState } from "react";

type Tab = {
  slug: string;
  name: string;
  icon: string;
  subs: { slug: string; name: string }[];
};

export function EverythingTabs({ city, categories }: { city: string; categories: Tab[] }) {
  const [active, setActive] = useState(categories[0]?.slug ?? "camps");
  return (
    <div className="everything">
      <div className="tab-row" role="tablist" aria-label="Categories">
        {categories.map((category) => (
          <button
            key={category.slug}
            id={`everything-tab-${category.slug}`}
            type="button"
            role="tab"
            aria-selected={category.slug === active}
            aria-controls={`everything-panel-${category.slug}`}
            className={category.slug === active ? "tab active" : "tab"}
            onClick={() => setActive(category.slug)}
          >
            {category.name}
          </button>
        ))}
      </div>
      {categories.map((category) => (
        <div
          key={category.slug}
          id={`everything-panel-${category.slug}`}
          className="everything-links"
          role="tabpanel"
          aria-labelledby={`everything-tab-${category.slug}`}
          hidden={category.slug !== active}
        >
          {category.subs.map((sub) => (
            <Link key={sub.slug} href={`/${city}/${category.slug}/${sub.slug}`}>
              {sub.name}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
