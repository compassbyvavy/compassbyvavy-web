"use client";

import { CategoryIcon } from "@/components/home/icons";
import { useHomePlace } from "@/components/home/useHomePlace";
import { homeCategories, homeCategoryHref, linkSlugForPlace } from "@/lib/home/home";

export function CategoryRow() {
  const [placeId] = useHomePlace();
  const citySlug = linkSlugForPlace(placeId);
  const categories = homeCategories();

  return (
    <section className="home-cats" id="discover" aria-label="Discover">
      <div className="container home-cats-row">
        {categories.map((category) => (
          <a
            key={category.slug}
            className={category.slug === "camps" ? "home-cat is-highlight" : "home-cat"}
            href={homeCategoryHref(category, citySlug)}
          >
            <CategoryIcon name={category.icon} />
            <span>{category.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
