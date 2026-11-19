import { Landmark, Snowflake, type LucideIcon } from "lucide-react";
import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "The Vavy shop",
  description: "Activity books and printables for family adventures.",
  path: "/shop",
});

const PRODUCTS: {
  id: string;
  title: string;
  details: string[];
  copy: string;
  badge: string;
  icon: LucideIcon;
}[] = [
  {
    id: "winter-pack",
    title: "Winter Break Activity Pack",
    details: ["Printable PDF", "Ages 3–10"],
    copy: "10 printables for snow days, car rides and the whole break.",
    badge: "Coming this week",
    icon: Snowflake,
  },
  {
    id: "quebec-book",
    title: "Québec City Adventure Book",
    details: ["Ages 6–8"],
    copy: "Puzzles, French words and sights for a family trip.",
    badge: "Coming soon",
    icon: Landmark,
  },
];

export default function ShopPage() {
  return (
    <section className="band">
      <div className="shell-wrap">
        <h1>The Vavy shop</h1>
        <p className="lede">Activity books and printables for family adventures.</p>
        <div className="shop-grid">
          {PRODUCTS.map((product) => {
            const Icon = product.icon;
            return (
              <article className="shop-card" key={product.id}>
                <div className="shop-tile" aria-hidden="true">
                  <Icon size={48} strokeWidth={1.75} color="#33503E" />
                </div>
                <h2>{product.title}</h2>
                <div className="shop-details">
                  {product.details.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <p className="shop-copy">{product.copy}</p>
                <span className="shop-badge">{product.badge}</span>
                <WaitlistForm
                  idPrefix={`shop-${product.id}`}
                  sourcePage="/shop"
                  category="shop"
                  product={product.id}
                  buttonLabel="Notify me"
                  consentLabel="Email me when this is ready. I can unsubscribe any time."
                  stacked
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
