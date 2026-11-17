const cards = [
  { title: "Winter break camps", scene: "tent" },
  { title: "PA day camps", scene: "calendar" },
  { title: "Indoor play for cold days", scene: "blocks" },
  { title: "Sledding and skating", scene: "hill" },
] as const;

export function WinterCollections() {
  return (
    <section className="home-section" id="winter">
      <div className="container">
        <div className="home-section-head">
          <div>
            <p className="home-eyebrow">OPENING WITH</p>
            <h2>This winter on Compass</h2>
          </div>
          <a className="home-text-link" href="/camps">
            See everything for winter
          </a>
        </div>
        <div className="home-winter-grid">
          {cards.map((card) => (
            <article className="home-winter-card" key={card.title}>
              <WinterCover scene={card.scene} />
              <h3>{card.title}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WinterCover({ scene }: { scene: (typeof cards)[number]["scene"] }) {
  return (
    <svg className="home-winter-cover" viewBox="0 0 320 180" aria-hidden="true">
      <rect width="320" height="180" rx="16" fill="#E7EEF0" />
      {scene === "tent" ? <Tent /> : null}
      {scene === "calendar" ? <Calendar /> : null}
      {scene === "blocks" ? <Blocks /> : null}
      {scene === "hill" ? <Hill /> : null}
    </svg>
  );
}

function Tent() {
  return (
    <>
      <path d="M40 150 L160 40 L280 150 Z" fill="#33503E" />
      <path d="M160 150 V78" stroke="#FBF6EC" strokeWidth="4" />
      <circle cx="250" cy="42" r="14" fill="#E0A526" />
    </>
  );
}

function Calendar() {
  return (
    <>
      <rect x="78" y="36" width="164" height="120" rx="12" fill="#FBF6EC" stroke="#33503E" strokeWidth="3" />
      <path d="M78 68 H242" stroke="#33503E" strokeWidth="3" />
      <path d="M118 28 v16 M202 28 v16" stroke="#C9702F" strokeWidth="4" strokeLinecap="round" />
      <path d="M118 110 l16 14 36-40" fill="none" stroke="#33503E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Blocks() {
  return (
    <>
      <rect x="48" y="90" width="70" height="60" rx="8" fill="#E0A526" />
      <rect x="128" y="60" width="70" height="90" rx="8" fill="#33503E" />
      <rect x="208" y="100" width="64" height="50" rx="8" fill="#C9702F" />
    </>
  );
}

function Hill() {
  return (
    <>
      <path d="M0 120 C90 70 150 130 230 90 C280 70 300 100 320 88 V180 H0 Z" fill="#8FA98A" />
      <path d="M0 150 C100 120 180 160 320 130 V180 H0 Z" fill="#FBF6EC" />
      <ellipse cx="230" cy="128" rx="36" ry="10" fill="none" stroke="#33503E" strokeWidth="3" />
    </>
  );
}
