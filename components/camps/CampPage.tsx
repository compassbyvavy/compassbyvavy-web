import { CampCostTool } from "@/components/camps/CampCostTool";
import { ShareIconButton, StickyBookBar, VenueSection } from "@/components/discover/VenueTools";
import { SaveControl } from "@/components/shortlist/SaveControl";
import type { CampProgram, CampSession } from "@/data/camps/types";
import { directionsUrl } from "@/lib/camps/campMap";
import type { CampPageView } from "@/lib/camps/campPage";
import { saveRefForCard } from "@/lib/shortlist/refs";

/**
 * Parent-first camp page. Same layout as the venue pages: answers first, a
 * "Plan your camp days" card (cost and booking) beside the page on wide screens
 * and straight after the header on phones, then sections parents scan.
 */
export function CampPage({
  view,
  program,
  sessions,
  banner,
  mapEmbedUrl = null,
}: {
  view: CampPageView;
  program: CampProgram;
  sessions: CampSession[];
  /** Maps Embed URL; null (no key) shows no map. */
  mapEmbedUrl?: string | null;
  banner?: string | null;
}) {
  const primaryBook = view.bookLinks[0] ?? null;
  const tabs = [
    { id: "dates", label: "Dates and prices" },
    ...(view.experience ? [{ id: "kids", label: "What kids do" }] : []),
    { id: "before", label: "Before you go" },
    { id: "money", label: "Cancellation and fees" },
    { id: "sources", label: "How we checked" },
  ];
  const plusTax = view.options.some((o) => o.plusTax);

  return (
    <article className="venue-layout camp-page" aria-labelledby="camp-title">
      <header className="venue-header venue-area-head" id="overview">
        {banner ? (
          <p className="venue-banner" role="status">
            {banner}
          </p>
        ) : null}
        <p className="venue-crumb">
          {view.crumb.map((c, i) => (
            <span key={c}>
              {i > 0 ? <span aria-hidden="true"> › </span> : null}
              {c === "Camps" ? <a href="/camps">Camps</a> : c}
            </span>
          ))}
        </p>
        <div className="venue-title-row">
          <div>
            <h1 id="camp-title">{view.title}</h1>
            <p className="camp-provider">
              by{" "}
              {view.providerUrl ? (
                <a href={view.providerUrl} rel="noopener noreferrer" target="_blank">
                  {view.providerName}
                </a>
              ) : (
                view.providerName
              )}
            </p>
            {view.address ? <p className="venue-address">{view.address}</p> : null}
            <p className={`camp-status is-${view.status.tone}`}>{view.status.text}</p>
          </div>
          <div className="venue-header-actions">
            <SaveControl refToSave={saveRefForCard(program, sessions)} label={view.title} variant="heart" />
            <ShareIconButton title={`${view.title} — ${view.providerName}`} />
          </div>
        </div>
        {view.checked ? (
          <p className="venue-trust">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span>
              <strong>Checked with {view.providerName}&apos;s own website on {view.checked}</strong>
            </span>
            <a href="#sources">How we checked</a>
          </p>
        ) : null}
        {view.lede ? <p className="venue-intro">{view.lede}</p> : null}
        <dl className="venue-quick">
          {view.answers.map((a) => (
            <div key={a.label}>
              <dt>{a.label}</dt>
              <dd>{keepRangesTogether(a.value)}</dd>
            </div>
          ))}
        </dl>
      </header>

      <aside className="venue-aside venue-area-aside" aria-labelledby="plan-h">
        <div className="venue-book-card venue-plan">
          <h2 id="plan-h" className="venue-plan-title">
            Plan your camp days
          </h2>
          {view.priceFrom ? (
            <p className="venue-book-price">
              {view.priceFrom}
              <span>{view.priceFromNote ? ` ${view.priceFromNote}` : ""}</span>
            </p>
          ) : null}
          {view.bookLinks.map((b, i) => (
            <a
              key={b.url}
              className={i === 0 ? "button button-primary venue-plan-book" : "button button-secondary camp-book-more"}
              href={b.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {b.label}
            </a>
          ))}
          <p className="venue-muted">Booking and payment happen on {view.providerName}&apos;s own site.</p>
          <CampCostTool options={view.options} />
          {view.address ? (
            <p className="venue-plan-contact">
              {view.address}
              {view.mapQuery ? (
                <>
                  {" · "}
                  <a href={directionsUrl(view.mapQuery)} rel="noopener noreferrer" target="_blank">
                    Directions
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </aside>

      <div className="venue-page venue-area-body">
        <nav className="venue-toc" aria-label="On this page">
          {tabs.map((t) => (
            <a key={t.id} href={`#${t.id}`}>
              {t.label}
            </a>
          ))}
        </nav>

        <VenueSection id="dates" title="Dates and prices" openOnPhone>
          {view.datesPosted ? null : (
            <p className="camp-callout">
              {view.providerName} says this camp runs, but hasn&apos;t posted the dates yet. Check back, or ask them.
            </p>
          )}
          <div className="camp-options">
            {view.options.map((o) => (
              <section key={o.key} className="camp-option" aria-label={o.label}>
                <header className="camp-option-head">
                  <div>
                    <h3>{view.options.length > 1 ? o.label : "Camp days"}</h3>
                    {o.hours ? <p className="camp-option-hours">{o.hours}</p> : null}
                  </div>
                  <div className="camp-option-price">
                    {o.priceText ? <strong>{o.priceText}</strong> : <strong>Price: check with the camp</strong>}
                    {o.withTaxText ? <span>{o.withTaxText}</span> : null}
                  </div>
                </header>
                <ul className="camp-dates">
                  {o.dates.map((d, i) => (
                    <li key={`${d.text}-${i}`}>
                      <span className="camp-date">{d.text}</span>
                      <span className={`camp-spots is-${d.spots.tone}`}>{d.spots.text}</span>
                      {d.bookUrl ? (
                        <a className="camp-date-book" href={d.bookUrl} rel="noopener noreferrer" target="_blank">
                          Book
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {o.perDay && !o.feeNotes.some((n) => /pick only the days/i.test(n)) ? (
                  <p className="venue-muted">Book any of these days on its own.</p>
                ) : null}
                {o.feeNotes.length ? (
                  <ul className="venue-list camp-fee-notes">
                    {o.feeNotes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
          <p className="venue-muted">
            Spots change quickly. The camp&apos;s booking page always has the latest number.
          </p>
        </VenueSection>

        {view.experience ? (
          <VenueSection id="kids" title="What kids do" openOnPhone>
            <p>{view.experience}</p>
            {view.themes.length ? (
              <ul className="venue-tags">
                {view.themes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : null}
          </VenueSection>
        ) : null}

        <VenueSection id="before" title="Before you go">
          <dl className="camp-facts">
            {view.options.map((o) =>
              o.hours ? (
                <div key={o.key}>
                  <dt>{view.options.length > 1 ? `${o.label} hours` : "Hours"}</dt>
                  <dd>{o.hours}</dd>
                </div>
              ) : null,
            )}
            {view.options.some((o) => o.care.before || o.care.after) ? (
              <div>
                <dt>Before and after care</dt>
                <dd>
                  {[...new Set(view.options.flatMap((o) => [o.care.before, o.care.after]).filter(Boolean))].join(" · ")}
                </dd>
              </div>
            ) : null}
            {view.address ? (
              <div>
                <dt>Where</dt>
                <dd>
                  {view.address}
                  {view.area ? <span className="venue-muted"> · {view.area}</span> : null}
                  {view.mapQuery ? (
                    <>
                      {" · "}
                      <a href={directionsUrl(view.mapQuery)} rel="noopener noreferrer" target="_blank">
                        Directions
                      </a>
                    </>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>
          {mapEmbedUrl ? (
            <iframe
              className="camp-map"
              title={`Map: ${view.address ?? view.providerName}`}
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : null}
          {view.notes.length ? (
            <ul className="venue-list">
              {view.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
          {view.askTheCamp.length ? (
            <div className="camp-ask">
              <h3>Not on their website yet</h3>
              <p className="venue-muted">Ask {view.providerName} before you book:</p>
              <ul className="venue-list">
                {view.askTheCamp.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </VenueSection>

        <VenueSection id="money" title="Cancellation and fees">
          {view.policies ? <p>{view.policies}</p> : <p className="venue-muted">The camp&apos;s website doesn&apos;t give a cancellation policy. Ask before you pay.</p>}
          {plusTax ? <p className="venue-muted">Prices are plus 13% HST. The totals above include it.</p> : null}
        </VenueSection>

        <VenueSection id="sources" title="How we checked">
          <p>
            Every fact on this page comes from {view.providerName}&apos;s own website. Compass hasn&apos;t visited this camp, and
            isn&apos;t paid by it.
          </p>
          {view.sources.length ? (
            <div className="venue-table-scroll">
              <table className="venue-sources-table">
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {view.sources.map((s) => (
                    <tr key={s.url}>
                      <td>
                        <a href={s.url} rel="noopener noreferrer" target="_blank">
                          {s.label}
                        </a>
                      </td>
                      <td>{s.checked ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="venue-muted">
            Is this your camp? Email{" "}
            <span className="camp-email">hello@compassbyvavy.ca</span> to correct something or ask us to remove the listing.
          </p>
        </VenueSection>
      </div>

      {primaryBook ? (
        <StickyBookBar>
          <p className="venue-book-price">
            {view.priceFrom ?? ""}
            <span>{view.priceFromNote ? ` ${view.priceFromNote}` : ""}</span>
          </p>
          <a className="button button-primary" href={primaryBook.url} rel="noopener noreferrer" target="_blank">
            Book
          </a>
        </StickyBookBar>
      ) : null}
    </article>
  );
}

/**
 * Keeps a date or time range on one line ("Dec 28–30", "9:00–1:30") so a
 * narrow tile breaks between ranges, never inside one ("Dec 28–" / "30").
 */
const RANGE = /([A-Z][a-z]{2} \d{1,2}\u2013\d{1,2}|\d{1,2}:\d{2}\u2013\d{1,2}:\d{2}|\S+\u2013\S+)/g;

function keepRangesTogether(text: string) {
  return text.split(RANGE).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="camp-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
