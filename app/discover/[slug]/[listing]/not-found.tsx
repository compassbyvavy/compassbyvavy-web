import Link from "next/link";

export default function DiscoverListingNotFound() {
  return (
    <section className="page-hero">
      <div className="container narrow">
        <span className="eyebrow">Discover</span>
        <h1>Listing not found</h1>
        <p className="hero-lead">
          That listing is not in this category. No substitute place is shown.
        </p>
        <p>
          <Link href="/#discover">Back to Discover</Link>
        </p>
      </div>
    </section>
  );
}
