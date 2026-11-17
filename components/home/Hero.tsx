export function Hero() {
  return (
    <section className="home-hero">
      <div className="container home-hero-grid">
        <div>
          <p className="home-eyebrow">YOUR FAMILY-FUN COMPASS</p>
          <h1>Spend less time searching. Make more family memories.</h1>
          <p className="home-lead">
            Places, events, classes, camps and weekend adventures, matched to your kids, your budget and the time you actually have.
          </p>
          <div className="home-actions">
            <a className="home-btn home-btn-green" href="#waitlist">
              Join the waitlist
            </a>
            <a className="home-btn home-btn-outline" href="#winter">
              See what&apos;s coming
            </a>
          </div>
          <ul className="home-ticks">
            <li>Made by a GTA parent</li>
            <li>Free to browse, no login</li>
            <li>Opening January 1, 2027</li>
          </ul>
        </div>

        <article className="home-sample">
          <div className="home-sample-top" aria-hidden="true">
            <span>A COSY SATURDAY</span>
            <span className="home-temp">−3°C</span>
          </div>
          <div aria-hidden="true">
            <SnowyHill />
          </div>
          <h2>Sledding hill + hot chocolate</h2>
          <p aria-hidden="true">Great for ages 3–10 · Free · 12 minutes away</p>
          <div className="home-chips" aria-hidden="true">
            <span>Washrooms</span>
            <span>Free parking</span>
            <span>Café nearby</span>
          </div>
          <img className="home-sample-badge" src="/brand/vavy-checked.svg" alt="" width={88} height={96} />
        </article>
      </div>
    </section>
  );
}

function SnowyHill() {
  return (
    <svg className="home-snow" viewBox="0 0 360 180" width="100%" height="180">
      <rect width="360" height="180" rx="18" fill="#E7EEF0" />
      <circle cx="300" cy="42" r="18" fill="#E0A526" />
      <path d="M0 120 C80 90 140 140 220 110 C280 90 320 120 360 100 V180 H0 Z" fill="#8FA98A" />
      <path d="M0 146 C90 120 150 160 240 140 C300 126 330 150 360 136 V180 H0 Z" fill="#FBF6EC" />
      <path d="M70 146 l14-36 14 36 Z" fill="#33503E" />
      <path d="M118 150 l10-24 10 24 Z" fill="#2B2622" />
      <circle cx="40" cy="48" r="3" fill="#fff" />
      <circle cx="160" cy="36" r="2.5" fill="#fff" />
      <circle cx="210" cy="58" r="2" fill="#fff" />
      <circle cx="250" cy="30" r="3" fill="#fff" />
    </svg>
  );
}
