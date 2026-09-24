import Link from "next/link";
import type { PlayVenue } from "@/data/play/types";

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export function PlayVenueDetail({ venue }: { venue: PlayVenue }) {
  return (
    <article className="play-detail">
      <header className="play-hero">
        <div className="play-shell play-hero-grid">
          <div>
            <Link className="play-back" href="/play">← Play & Entertainment</Link>
            <div className="play-kicker">{venue.id} · Verified venue</div>
            <h1>{venue.name}</h1>
            <p className="play-dek">{venue.summary.text}</p>
            <div className="play-actions">
              <a className="play-button play-button-primary" href={venue.websiteUrl} target="_blank" rel="noreferrer">Official website ↗</a>
              {venue.bookingUrl ? <a className="play-button play-button-secondary" href={venue.bookingUrl} target="_blank" rel="noreferrer">View tickets ↗</a> : null}
            </div>
          </div>
          <aside className="play-fact-card" aria-label="Venue essentials">
            <span className="play-status">✓ Verified</span>
            <dl>
              <div><dt>Best ages</dt><dd>{venue.compassBestAges}</dd></div>
              <div><dt>Setting</dt><dd>{venue.setting}</dd></div>
              <div><dt>Allow</dt><dd>About 1.5–2 hours</dd></div>
              <div><dt>Address</dt><dd>{venue.address.street}<br />{venue.address.city}, {venue.address.province} {venue.address.postalCode}</dd></div>
            </dl>
            {venue.address.note ? <p className="play-small-note">{venue.address.note}</p> : null}
          </aside>
        </div>
      </header>

      <div className="play-shell play-layout">
        <main>
          <section className="play-section">
            <div className="play-section-heading"><span>01</span><div><h2>Will my family love this?</h2><p>Eligibility and editorial fit are kept separate.</p></div></div>
            <div className="play-callout"><strong>Official eligibility</strong><p>{venue.officialEligibility.text}</p></div>
            <h3>Compass age assessment</h3>
            <p className="play-big-age">Best for ages {venue.compassBestAges}</p>
            <ul className="play-check-list">{venue.ageNotes.map((note) => <li key={note}>{note}</li>)}</ul>
          </section>

          <section className="play-section">
            <div className="play-section-heading"><span>02</span><div><h2>What children can do</h2><p>{venue.activities.length} permanent attractions confirmed for this location.</p></div></div>
            <div className="play-activity-grid">
              {venue.activities.map((activity) => <article className="play-activity-card" key={activity.name}><h3>{activity.name}</h3><p>{activity.description}</p>{activity.bestAges ? <span>{activity.bestAges}</span> : null}</article>)}
            </div>
          </section>

          <section className="play-section">
            <div className="play-section-heading"><span>03</span><div><h2>Tickets and memberships</h2><p>Official Mississauga prices captured {venue.lastResearched}.</p></div></div>
            <div className="play-price-grid">
              {venue.pricing.map((price) => <article className="play-price-card" key={price.id}><p className="play-price-name">{price.name}</p><p className="play-price">{money.format(price.priceCad)}<small>/{price.cadence}</small></p><p>{price.access}</p>{price.benefits?.length ? <ul>{price.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul> : null}</article>)}
            </div>
            <p className="play-freshness">Prices can change. Confirm on the official website before purchasing.</p>
          </section>

          <section className="play-section">
            <div className="play-section-heading"><span>04</span><div><h2>Current offers</h2><p>Promotions are tracked separately from regular prices.</p></div></div>
            <div className="play-offer-list">
              {venue.offers.map((offer) => <article key={offer.id}><div><h3>{offer.name}</h3><p>{offer.summary}</p>{offer.terms?.length ? <p className="play-terms">{offer.terms.join(" · ")}</p> : null}</div><div className="play-offer-value">{offer.priceCad ? money.format(offer.priceCad) : offer.promoCode ? <><small>Code</small>{offer.promoCode}</> : "Offer"}</div></article>)}
            </div>
          </section>

          <section className="play-section">
            <div className="play-section-heading"><span>05</span><div><h2>Programs and parties</h2><p>Scheduled programs need a current local date.</p></div></div>
            <div className="play-program-list">{venue.programs.map((program) => <article key={program.name}><div><h3>{program.name}</h3><p>{program.description}</p></div><span className={program.availability === "scheduled" ? "is-confirmed" : "needs-check"}>{program.availability === "scheduled" ? "Scheduled" : "Check local calendar"}</span></article>)}</div>
            <div className="play-callout"><strong>Birthday parties</strong><p>{venue.partySummary.text}</p></div>
          </section>

          <section className="play-section">
            <div className="play-section-heading"><span>06</span><div><h2>Know before you go</h2><p>The practical details that change a family outing.</p></div></div>
            <dl className="play-practical">{venue.practical.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
            <h3>Amenities</h3>
            <div className="play-amenities">{venue.amenities.map((item) => <div key={item.label}><span>{item.value === "Yes" ? "✓" : item.value === "No" ? "×" : "?"}</span><p><strong>{item.label}</strong><br />{item.note ?? item.value}</p></div>)}</div>
          </section>

          <section className="play-section">
            <div className="play-section-heading"><span>07</span><div><h2>What families report</h2><p>{venue.reviewSignal.sourceNote}</p></div></div>
            <div className="play-review-grid"><article><h3>Best liked</h3><ul>{venue.reviewSignal.bestLiked.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h3>Not liked</h3><ul>{venue.reviewSignal.notLiked.map((item) => <li key={item}>{item}</li>)}</ul></article></div>
          </section>

          <section className="play-section play-verdict">
            <div className="play-section-heading"><span>08</span><div><h2>The Compass verdict</h2><p>Our parent-facing interpretation of the evidence.</p></div></div>
            <div className="play-verdict-grid"><div><h3>Best for</h3><ul>{venue.compassVerdict.bestFor.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Less ideal for</h3><ul>{venue.compassVerdict.lessIdealFor.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
            <h3>Parent tips</h3><ul className="play-check-list">{venue.compassVerdict.parentTips.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </main>

        <aside className="play-side">
          <div className="play-side-card"><h2>Categories</h2><a href={`/play?category=${encodeURIComponent(venue.primaryCategory)}`}>{venue.primaryCategory}</a>{venue.additionalCategories.map((category) => <a href={`/play?category=${encodeURIComponent(category)}`} key={category}>{category}</a>)}</div>
          {venue.firstHandNote ? <div className="play-side-card"><h2>First-hand check</h2><p>{venue.firstHandNote.text}</p></div> : null}
          <div className="play-side-card"><h2>Sources</h2><p>Facts are linked to their evidence and dated.</p>{venue.sources.filter((source) => source.kind !== "compass_assessment" && source.kind !== "first_hand").map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>{source.label} ↗<small>{source.kind.replaceAll("_", " ")} · {source.capturedAt}</small></a>)}</div>
        </aside>
      </div>
    </article>
  );
}
