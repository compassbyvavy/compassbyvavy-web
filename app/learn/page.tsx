export const metadata = {
  title: "Learn — coming soon",
  description:
    "Age-stage guides, seasonal playbooks and best-of roundups for families. Not live yet.",
  robots: { index: false, follow: true },
};

export default function LearnPage() {
  return (
    <section className="page-hero coming-soon-page">
      <div className="container narrow">
        <span className="eyebrow">Learn</span>
        <h1>Guides for every age and season</h1>
        <p className="hero-lead">
          Age-stage guides, seasonal playbooks and best-of roundups, written
          from the same checked facts as the listings.
        </p>
        <div className="content-card">
          <p className="coming-soon-kicker">Coming soon</p>
          <p>
            Learn isn&apos;t live yet. We&apos;ll publish guides once the
            places and programs they point to are verified, so nothing here
            sends you somewhere we haven&apos;t checked.
          </p>
          <div className="coming-soon-actions">
            <a className="button button-primary" href="/camps">
              Browse camps
            </a>
            <a className="button button-secondary" href="/#discover">
              Back to Discover
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
