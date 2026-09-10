import { DISCOVER_CATEGORIES } from "@/lib/discover/categories";

const promises = [
  "Useful session facts when we have them — unknown stays unknown",
  "Age, dates, hours, and cost on the same camp session",
  "Public browse: no account required to see details",
  "A saved list on this device, when you want one",
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Weekend clarity for parents</span>
            <h1>Spend less time searching. Make more family memories.</h1>
            <p className="hero-lead">
              Compass is household intelligence: discover, choose, then
              organize. Start with Mississauga camps you can actually weigh —
              dates, eligibility, hours, and cost on the same session. We will
              not pretend the whole city is listed yet.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/camps">
                Browse Mississauga camps
              </a>
              <a className="button button-secondary" href="#discover">
                See the Discover map
              </a>
            </div>
            <div className="trust-line">
              <span>No account needed to browse</span>
              <span>Starting in Mississauga</span>
            </div>
          </div>

          <div className="hero-card" aria-label="Example family recommendation">
            <div className="hero-card-top">
              <span className="mini-label">A calmer Saturday</span>
              <span className="weather">☀️ 24°C</span>
            </div>
            <div className="adventure-visual">
              <div className="sun" />
              <div className="hill hill-back" />
              <div className="hill hill-front" />
              <div className="tree tree-one">🌳</div>
              <div className="tree tree-two">🌲</div>
              <div className="family">👨‍👩‍👧‍👦</div>
            </div>
            <h2>Lakeside play + ice cream</h2>
            <p>An illustration of the kind of weekend we want to make easier — not a live listing.</p>
            <div className="tags">
              <span>Playground</span>
              <span>Washrooms</span>
              <span>Stroller friendly</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="discover">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Discover</span>
            <h2>An honest map of family time — one live category first</h2>
            <p>
              Camps is available to browse now. Every other category is a
              calm placeholder, not a fake directory. Coverage is ongoing;
              confidence over urgency; no paid ranking.
            </p>
          </div>
          <div className="category-grid category-grid-ten">
            {DISCOVER_CATEGORIES.map((category) => {
              const inner = (
                <>
                  <span className="category-icon" aria-hidden="true">
                    {category.icon}
                  </span>
                  <h3>{category.title}</h3>
                  <p>{category.blurb}</p>
                  <span
                    className={
                      category.status === "available"
                        ? "category-available"
                        : "coming-soon"
                    }
                  >
                    {category.cta}
                  </span>
                </>
              );
              return (
                <a className="category-card" href={category.href} key={category.slug}>
                  {inner}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section soft-section" id="how-it-works">
        <div className="container two-column">
          <div>
            <span className="eyebrow">Why Compass by Vavy</span>
            <h2>Built around real parent questions</h2>
            <p className="large-copy">
              “We have two children, three hours, a $50 budget and rain in the
              forecast. What should we do?”
            </p>
            <p>
              We are designing Compass to answer that kind of question with
              evidence, not another long undifferentiated list. Compass never
              processes provider registration — parents complete that step
              with the provider.
            </p>
          </div>
          <div className="promise-list">
            {promises.map((promise, index) => (
              <div className="promise-item" key={promise}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{promise}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container waitlist-card">
          <div>
            <span className="eyebrow light">Be among the first</span>
            <h2>Join the Compass by Vavy journey</h2>
            <p>
              Early notes as more Discover categories come online — without
              pretending they already have listings.
            </p>
          </div>
          <a
            className="button button-light"
            href="mailto:hello@compassbyvavy.ca?subject=Compass%20by%20Vavy%20early%20access&body=Hello%2C%20please%20add%20me%20to%20the%20early-access%20list."
          >
            Email hello@compassbyvavy.ca
          </a>
        </div>
      </section>
    </>
  );
}
