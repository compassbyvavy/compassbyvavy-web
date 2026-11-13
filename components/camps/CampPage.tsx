import { CampCostTool } from "@/components/camps/CampCostTool";
import { CampDatesPicker } from "@/components/camps/CampDatesPicker";
import { ShareIconButton, StickyBookBar } from "@/components/discover/VenueTools";
import { SaveControl } from "@/components/shortlist/SaveControl";
import type { CampProgram, CampSession } from "@/data/camps/types";
import { directionsUrl } from "@/lib/camps/campMap";
import type { CampPageView } from "@/lib/camps/campPage";
import { saveRefForCard } from "@/lib/shortlist/refs";

/**
 * Parent-first camp page (Nov 13 redesign). One idea per section, each said
 * once: what it is, the four answers, dates and prices (with the cost tool
 * folded underneath), good to know, how we checked. On wide screens a small
 * booking card sits beside the page; on phones a Book bar appears on scroll.
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
  const plusTax = view.options.some((o) => o.plusTax);
  const canCost = view.options.some((o) => o.price != null && o.units.length > 0);
  const care = [...new Set(view.options.flatMap((o) => [o.care.before, o.care.after]).filter(Boolean))].join(" · ");
  const meta = [view.area].filter(Boolean).join(" · ");

  return (
    <article className="cp" aria-labelledby="camp-title">
      <header className="cp-head">
        {banner ? (
          <p className="venue-banner" role="status">
            {banner}
          </p>
        ) : null}
        <p className="cp-crumb">
          {view.crumb.map((c, i) => (
            <span key={c}>
              {i > 0 ? <span aria-hidden="true"> / </span> : null}
              {c === "Camps" ? <a href="/camps">Camps</a> : c}
            </span>
          ))}
        </p>

        <div className="cp-title-row">
          <h1 id="camp-title">{view.title}</h1>
          <div className="cp-actions venue-header-actions">
            <SaveControl refToSave={saveRefForCard(program, sessions)} label={view.title} variant="heart" />
            <ShareIconButton title={`${view.title} — ${view.providerName}`} />
          </div>
        </div>
        <p className="cp-by">
          by{" "}
          {view.providerUrl ? (
            <a href={view.providerUrl} rel="noopener noreferrer" target="_blank">
              {view.providerName}
            </a>
          ) : (
            view.providerName
          )}
          {meta ? <span className="cp-muted"> · {meta}</span> : null}
        </p>
        <p className={`cp-status is-${view.status.tone}`}>{view.status.text}</p>

        {view.lede ? <p className="cp-lede">{view.lede}</p> : null}

        <dl className="cp-facts">
          {view.answers.map((a) => (
            <div key={a.label}>
              <dt>{a.label}</dt>
              <dd>{keepRangesTogether(a.value)}</dd>
            </div>
          ))}
        </dl>
      </header>

      <aside className="cp-aside" aria-label="Book this camp">
        <div className="cp-book-card">
          {view.priceFrom ? (
            <p className="cp-price">
              {view.priceFrom}
              {view.priceFromNote ? <span> {view.priceFromNote}</span> : null}
            </p>
          ) : null}
          {view.bookLinks.map((b, i) => (
            <a
              key={b.url}
              className={i === 0 ? "button button-primary" : "button button-secondary"}
              href={b.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {b.label}
            </a>
          ))}
          <p className="cp-muted cp-small">You book and pay on {view.providerName}&apos;s own site.</p>
          {canCost ? (
            <a className="cp-aside-link" href="#cost">
              Work out the cost for your family
            </a>
          ) : null}
        </div>
      </aside>

      <div className="cp-body">
        <section className="cp-sec" id="dates" aria-labelledby="dates-h">
          <h2 id="dates-h">Dates and prices</h2>
          {view.datesPosted ? null : (
            <p className="cp-callout">
              {view.providerName} says this camp runs, but hasn&apos;t posted the dates yet. Check back, or ask them.
            </p>
          )}
          <CampDatesPicker options={view.options} providerName={view.providerName} />
          {canCost ? (
            <details className="cp-cost" id="cost">
              <summary>Work out the cost for your family</summary>
              <CampCostTool options={view.options} />
            </details>
          ) : null}
        </section>

        {view.experience ? (
          <section className="cp-sec" id="kids" aria-labelledby="kids-h">
            <h2 id="kids-h">What kids do</h2>
            <p>{view.experience}</p>
            {view.themes.length ? (
              <ul className="cp-tags">
                {view.themes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section className="cp-sec" id="good-to-know" aria-labelledby="know-h">
          <h2 id="know-h">Good to know</h2>
          <dl className="cp-know">
            {view.address ? (
              <div>
                <dt>Where</dt>
                <dd>
                  {view.address}
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
            {care ? (
              <div>
                <dt>Care</dt>
                <dd>{care}</dd>
              </div>
            ) : null}
            <div>
              <dt>Cancelling</dt>
              <dd>
                {view.policies ?? "Their website doesn't give a cancellation policy. Ask before you pay."}
              </dd>
            </div>
            {plusTax ? (
              <div>
                <dt>Tax</dt>
                <dd>Prices are plus 13% HST.</dd>
              </div>
            ) : null}
          </dl>

          {view.notes.length ? (
            <ul className="cp-notes">
              {view.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}

          {view.askTheCamp.length ? (
            <p className="cp-ask">
              <strong>Not on their website yet:</strong> {view.askTheCamp.join(", ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}.
              {" "}Ask {view.providerName} before you book.
            </p>
          ) : null}

          {mapEmbedUrl ? (
            <iframe
              className="cp-map"
              title={`Map: ${view.address ?? view.providerName}`}
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : null}
        </section>

        <section className="cp-sec cp-sources" id="sources" aria-labelledby="sources-h">
          <h2 id="sources-h">How we checked</h2>
          <p>
            Every fact here comes from {view.providerName}&apos;s own website. Compass hasn&apos;t visited this camp and isn&apos;t
            paid by it.
          </p>
          {view.sources.length ? (
            <ul className="cp-source-list">
              {view.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="noopener noreferrer" target="_blank">
                    {s.label}
                  </a>
                  {s.checked ? <span className="cp-muted"> · checked {s.checked}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="cp-muted cp-small">
            Is this your camp? Email <span className="camp-email">hello@compassbyvavy.ca</span> to correct something or ask us to
            remove the listing.
          </p>
        </section>
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
const RANGE = /([A-Z][a-z]{2} \d{1,2}–\d{1,2}|\d{1,2}:\d{2}–\d{1,2}:\d{2}|\S+–\S+)/g;

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
