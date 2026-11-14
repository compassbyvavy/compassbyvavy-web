import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRINTABLES, getPrintable, printablePdf } from "@/lib/learn/printables";
import "../learn.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return PRINTABLES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const p = getPrintable(slug);
  if (!p) return {};
  const title = `${p.title} — free printable`;
  return {
    title,
    description: p.lede,
    openGraph: {
      title,
      description: p.lede,
      url: `https://compassbyvavy.ca/learn/${p.slug}`,
    },
  };
}

export default async function PrintablePage({ params }: PageProps) {
  const { slug } = await params;
  const p = getPrintable(slug);
  if (!p) notFound();
  const pdf = printablePdf(p.slug);

  const facts = [
    { label: "Ages", value: p.ages },
    { label: "Clue chits", value: String(p.chits) },
    { label: "Time", value: `${p.minutes} min` },
    { label: "Where", value: "Indoors, at home" },
    { label: "Cost", value: "Free" },
  ];

  const more = PRINTABLES.filter((x) => x.slug !== p.slug && x.ages === p.ages).slice(0, 3);

  return (
    <section className="page-hero learn-printable">
      <div className="container narrow">
        <nav className="learn-crumb" aria-label="Breadcrumb">
          <Link href="/learn">Learn</Link>
          <span aria-hidden="true">/</span>
          <Link href="/learn#printables">Free printables</Link>
        </nav>
        <span className="eyebrow">Free printable · Ages {p.ages}</span>
        <h1>{p.title}</h1>
        <p className="hero-lead">{p.lede}</p>

        <dl className="learn-facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="coming-soon-actions">
          <a className="button button-primary" href={pdf} download>
            Download the PDF
          </a>
          <a className="button button-secondary" href={pdf} target="_blank" rel="noopener">
            Open to print
          </a>
        </div>
        <p className="learn-fineprint">
          {p.pages} letter-size pages: setup, {p.chits} chits, a grown-up answer key and a
          certificate. {p.format}.
        </p>

        <div className="content-card">
          <h2>What your child learns</h2>
          <ul className="learn-bullets">
            {p.learns.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2>The route</h2>
          <ol className="learn-stages">
            {p.stages.map((stage, i) => (
              <li key={stage.name}>
                <span className="learn-stage-no">Part {i + 1}</span>
                <div>
                  <h3>{stage.name}</h3>
                  <p>
                    <span className="learn-stage-chits">Chits {stage.range}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <h2>A peek at the chits</h2>
          <div className="learn-chits">
            {p.samples.map((chit) => (
              <article className="learn-chit" key={chit.n}>
                <header>
                  <span>Chit</span>
                  <span className="learn-chit-no">#{chit.n}</span>
                </header>
                <p className="learn-chit-fact">
                  <b>Did you know?</b> {chit.fact}
                </p>
                {chit.challenge ? <p className="learn-chit-challenge">{chit.challenge}</p> : null}
                <p className="learn-chit-clue">{chit.clue}</p>
                {chit.pic ? (
                  <p className="learn-chit-pic" aria-hidden="true">
                    {chit.pic}
                  </p>
                ) : null}
              </article>
            ))}
          </div>

          <h2>How to set it up</h2>
          <ol className="learn-steps">
            {p.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="learn-fineprint">
            Missing one of the hiding spots at home? Swap it: rewrite that chit’s clue and the
            hiding note on the chit before it.
          </p>
        </div>

        {more.length > 0 ? (
          <div className="learn-more">
            <h2>More for ages {p.ages}</h2>
            <div className="learn-card-grid">
              {more.map((x) => (
                <Link className="learn-printable-card" href={`/learn/${x.slug}`} key={x.slug}>
                  <span className="eyebrow">
                    Ages {x.ages} · {x.chits} chits
                  </span>
                  <h3>{x.title}</h3>
                  <span className="learn-card-cta">See the printable →</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
