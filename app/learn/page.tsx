import Link from "next/link";
import "./learn.css";

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
          <p className="coming-soon-kicker">Free printables</p>
          <p>
            At-home activities you can print today. They don&apos;t send you
            anywhere, so they&apos;re ready now.
          </p>
          <Link className="learn-printable-card" href="/learn/space-mission-scavenger-hunt">
            <span className="eyebrow">Ages 6–8 · 40 clue chits</span>
            <h3>Space Mission Scavenger Hunt</h3>
            <p>
              An indoor treasure hunt from the Sun to the edge of the universe,
              with a space fact on every chit.
            </p>
            <span className="learn-card-cta">See the printable →</span>
          </Link>
        </div>
        <div className="content-card">
          <p className="coming-soon-kicker">Guides: coming soon</p>
          <p>
            Guides aren&apos;t live yet. We&apos;ll publish them once the
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
