import Link from "next/link";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Shop",
  description: "Books from Compass by Vavy. The first book is not for sale yet.",
  path: "/shop",
});

export default function ShopPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Shop</h1>
        <p className="lede">One book is in the works. Nothing is for sale yet, and there is no price.</p>
        <Link className="guide-card" href="/shop/quebec-city-ages-6-8">
          <span className="kicker">Activity book · Ages 6–8</span>
          <strong>Québec City with Kids</strong>
          <span>A book for the trip. Notify me when it is ready.</span>
        </Link>
      </div>
    </section>
  );
}
