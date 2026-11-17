import { HOME_CATEGORIES } from "@/lib/home/home";
import { CategoryIcon } from "@/components/home/icons";

export function CategoryRow() {
  return (
    <section className="home-cats" id="discover" aria-label="Discover">
      <div className="container home-cats-row">
        {HOME_CATEGORIES.map((category) => (
          <a
            key={category.label}
            className={category.highlight ? "home-cat is-highlight" : "home-cat"}
            href={category.href}
          >
            <CategoryIcon name={category.icon} />
            <span>{category.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
