import Link from "next/link";

export default function VenueNotFound() {
  return (
    <section className="page-hero coming-soon-page">
      <div className="container narrow">
        <div className="content-card" role="status">
          <h1>Venue not found</h1>
          <p>
            This venue isn&apos;t published on Compass. The link may be wrong, or
            the location hasn&apos;t been verified yet — we don&apos;t show
            another branch in its place.
          </p>
          <p>
            <Link href="/#discover">Back to Discover</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
