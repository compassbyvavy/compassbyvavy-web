const categories = [
  { icon: "🌳", title: "Parks & Nature", text: "Playgrounds, trails, beaches and outdoor escapes." },
  { icon: "💦", title: "Splash Pads", text: "Cool-down spots and water-play favourites." },
  { icon: "🎠", title: "Indoor Play", text: "Rainy-day fun, play centres and museums." },
  { icon: "🎉", title: "Events", text: "Festivals, weekend events and seasonal celebrations." },
  { icon: "🎨", title: "Classes", text: "Sports, arts, STEM and enriching programs." },
  { icon: "🏕️", title: "Camps", text: "Summer, March break and specialty camps." },
  { icon: "🍦", title: "Food & Treats", text: "Family-friendly restaurants and sweet stops." },
  { icon: "🚗", title: "Getaways", text: "Easy day trips and memorable family weekends." },
];

const promises = [
  "Useful details parents actually need",
  "Age, budget and accessibility filters",
  "Trusted tips before you leave home",
  "Smarter family planning, all in one place",
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Your family-fun compass</span>
            <h1>Spend less time searching. Make more family memories.</h1>
            <p className="hero-lead">
              Discover places, events, classes, camps and weekend adventures
              matched to your children, budget and available time.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#discover">
                Explore what is coming
              </a>
              <a
                className="button button-secondary"
                href="mailto:hello@compassbyvavy.ca?subject=Join%20the%20Compass%20by%20Vavy%20waitlist&body=Please%20add%20me%20to%20the%20Compass%20by%20Vavy%20early-access%20list."
              >
                Join the waitlist
              </a>
            </div>
            <div className="trust-line">
              <span>Made for families</span>
              <span>Launching first in the GTA</span>
            </div>
          </div>

          <div className="hero-card" aria-label="Example family recommendation">
            <div className="hero-card-top">
              <span className="mini-label">A perfect Saturday</span>
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
            <p>Great for ages 2–8 · Free · 18 minutes away</p>
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
            <span className="eyebrow">Discover more together</span>
            <h2>Everything families need, in one welcoming place</h2>
            <p>
              Compass by Vavy is being built to make family decisions simpler,
              faster and more confident.
            </p>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <article className="category-card" key={category.title}>
                <span className="category-icon" aria-hidden="true">{category.icon}</span>
                <h3>{category.title}</h3>
                <p>{category.text}</p>
                <span className="coming-soon">Coming soon</span>
              </article>
            ))}
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
              We are designing Compass to answer the full question—not simply
              provide another long directory of places.
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
              Get early access, launch updates and hand-picked family ideas.
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
