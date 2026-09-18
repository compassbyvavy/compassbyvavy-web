import Link from "next/link";

export default function DiscoverCategoryNotFound() {
  return (
    <section className="page-hero">
      <div className="container narrow">
        <span className="eyebrow">Discover</span>
        <h1>Category not found</h1>
        <p className="hero-lead">
          That Discover path is not on the map. No substitute listings are
          shown.
        </p>
        <p>
          <Link href="/#discover">Back to Discover</Link>
        </p>
      </div>
    </section>
  );
}
