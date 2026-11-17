import { HOME_LEARN_ITEMS } from "@/lib/home/home";

/** Guides and free printables. Hidden when nothing real is published. */
export function LearnRow() {
  if (HOME_LEARN_ITEMS.length === 0) return null;

  return (
    <section className="home-section" id="learn" aria-labelledby="from-learn-title">
      <div className="container">
        <div className="home-section-head">
          <div>
            <p className="home-eyebrow">FROM LEARN</p>
            <h2 id="from-learn-title">From Learn</h2>
          </div>
          <a className="home-text-link" href="/learn">
            See Learn
          </a>
        </div>
        <div className="home-learn-grid">
          {HOME_LEARN_ITEMS.map((item) => (
            <a className="home-learn-card" href={item.href} key={item.href}>
              <p className="home-eyebrow">{item.kicker}</p>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
