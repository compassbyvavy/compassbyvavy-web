import Link from "next/link";
import { AGE_BANDS, PRINTABLES } from "@/lib/learn/printables";
import "./learn.css";

export const metadata = {
  title: "Learn",
  description:
    "Free printable learning scavenger hunts for ages 3 to 9, plus age-stage guides, seasonal playbooks and best-of roundups (coming soon).",
};

function firstSentence(text: string): string {
  const end = text.indexOf(". ");
  return end === -1 ? text : text.slice(0, end + 1);
}

export default function LearnPage() {
  return (
    <section className="page-hero">
      <div className="container narrow">
        <span className="eyebrow">Learn</span>
        <h1>Guides for every age and season</h1>
        <p className="hero-lead">
          Free printable learning hunts you can use today, with age-stage guides,
          seasonal playbooks and best-of roundups on the way.
        </p>

        <div className="content-card" id="printables">
          <p className="coming-soon-kicker">Free printables</p>
          <h2>Learning scavenger hunts</h2>
          <p>
            Print, cut, hide and hunt. Every chit teaches a real fact, then gives
            a clue to the next hiding spot around the house.
          </p>
          {AGE_BANDS.map((band) => {
            const items = PRINTABLES.filter((p) => p.ages === band.ages);
            if (items.length === 0) return null;
            return (
              <div className="learn-band" key={band.ages}>
                <h3>{band.label}</h3>
                <p className="learn-band-blurb">{band.blurb}</p>
                <div className="learn-card-grid">
                  {items.map((p) => (
                    <Link className="learn-printable-card" href={`/learn/${p.slug}`} key={p.slug}>
                      <span className="eyebrow">
                        {p.chits} chits · {p.minutes} min
                      </span>
                      <h3>{p.title}</h3>
                      <p>{firstSentence(p.lede)}</p>
                      <span className="learn-card-cta">See the printable →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
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
