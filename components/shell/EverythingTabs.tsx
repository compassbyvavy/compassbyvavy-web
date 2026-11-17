"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryIcon } from "@/components/shell/icons";

type Tab = {
  slug: string;
  name: string;
  icon: string;
  subs: { slug: string; name: string }[];
};

export function EverythingTabs({ city, categories }: { city: string; categories: Tab[] }) {
  const [active, setActive] = useState(categories[0]?.slug ?? "camps");
  const current = categories.find((category) => category.slug === active) ?? categories[0];
  if (!current) return null;
  return (
    <div>
      <div className="tab-row" role="tablist" aria-label="Categories">
        {categories.map((category) => (
          <button
            key={category.slug}
            type="button"
            role="tab"
            aria-selected={category.slug === current.slug}
            className={category.slug === current.slug ? "tab active" : "tab"}
            onClick={() => setActive(category.slug)}
          >
            <CategoryIcon name={category.icon} camps={category.slug === "camps"} size={18} />
            {category.name}
          </button>
        ))}
      </div>
      <div className="chip-row" role="tabpanel">
        {current.subs.map((sub) => (
          <Link key={sub.slug} className="chip" href={`/${city}/${current.slug}/${sub.slug}`}>
            {sub.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
