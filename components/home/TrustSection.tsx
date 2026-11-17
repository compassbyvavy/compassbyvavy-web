import { FOUNDER_NOTE } from "@/lib/home/home";

const ticks = [
  "Free to browse, no login needed",
  "No one pays to rank higher",
  "Sponsored listings always labelled",
  "Your family's data is never sold",
];

export function TrustSection() {
  return (
    <section className="home-section home-trust" id="trust">
      <div className="container home-trust-grid">
        <img src="/brand/vavy-checked.svg" alt="Vavy-checked" width={160} height={174} />
        <div>
          <p className="home-eyebrow">WHY PARENTS CAN TRUST IT</p>
          <h2>Vavy-checked means we went.</h2>
          <ul className="home-ticks">
            {ticks.map((tick) => (
              <li key={tick}>{tick}</li>
            ))}
          </ul>
          {FOUNDER_NOTE ? <blockquote className="home-founder">{FOUNDER_NOTE}</blockquote> : null}
        </div>
      </div>
    </section>
  );
}
