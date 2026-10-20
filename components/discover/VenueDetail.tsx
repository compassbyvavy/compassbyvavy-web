import type { ReactNode } from "react";
import {
  AgeCheckTool,
  CostEstimator,
  ShareButton,
} from "@/components/discover/VenueTools";
import type {
  ActivityView,
  AmenityView,
  FactMeta,
  RuleLine,
  ThemeView,
  VenueDetailView,
} from "@/lib/discover/venueDetail";

/** "Checked Oct 10, 2026 · Source", plus the conflict when sources disagree. */
function Checked({ meta }: { meta: FactMeta }) {
  return (
    <span className="venue-checked">
      Checked {meta.checked}
      {meta.sourceUrl ? (
        <>
          {" · "}
          <a href={meta.sourceUrl} rel="noopener noreferrer" target="_blank">
            Source
          </a>
        </>
      ) : null}
      {meta.conflict ? (
        <span className="venue-conflict"> Sources disagree: {meta.conflict}</span>
      ) : null}
    </span>
  );
}

function NotConfirmed({ children }: { children: ReactNode }) {
  return <p className="venue-empty">{children}</p>;
}

function Rules({ heading, lines }: { heading: string; lines: RuleLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="venue-rule-group">
      <h4>{heading}</h4>
      <ul className="venue-list">
        {lines.map((l, i) => (
          <li key={i}>
            {l.text} <Checked meta={l.meta} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Activity({ a }: { a: ActivityView }) {
  return (
    <li className="venue-activity">
      <h4>{a.name}</h4>
      {a.description ? <p>{a.description}</p> : null}
      {a.limits.length || a.cost || a.schedule ? (
        <ul className="venue-tags">
          {a.limits.map((l) => (
            <li key={l}>{l}</li>
          ))}
          {a.cost ? <li>{a.cost}</li> : null}
          {a.schedule ? <li>{a.schedule}</li> : null}
        </ul>
      ) : null}
      <Checked meta={a.meta} />
    </li>
  );
}

function Theme({ t, showHeading = true }: { t: ThemeView; showHeading?: boolean }) {
  return (
    <li>
      {showHeading ? <strong>{t.heading}: </strong> : null}
      {t.summary}
      {t.mixed ? <span className="venue-conflict"> Reports are mixed.</span> : null}{" "}
      <span className="venue-checked">
        {t.sourceName ? `${t.sourceName} · ` : ""}checked {t.meta.checked}
      </span>
    </li>
  );
}

function Amenity({ a }: { a: AmenityView }) {
  return (
    <li className={`venue-amenity is-${a.status}`}>
      <span className="venue-amenity-label">{a.label}</span>
      <span className="venue-amenity-status">{a.statusLabel}</span>
      {a.note ? <span className="venue-amenity-note">{a.note}</span> : null}
      {a.meta ? <Checked meta={a.meta} /> : null}
    </li>
  );
}

export function VenueDetail({
  view,
  banner,
}: {
  view: VenueDetailView;
  banner?: string | null;
}) {
  const { overview, snapshot, visit, gettingThere, experience, reviews } = view;
  const hasRules =
    visit.bookingRules.length + visit.waiver.length + visit.arrival.length + visit.dress.length +
      visit.food.length + visit.cancellation.length + visit.other.length > 0;
  const confirmedAmenities = view.amenities.filter((a) => a.status !== "not_confirmed");
  const unconfirmedAmenities = view.amenities.filter((a) => a.status === "not_confirmed");

  return (
    <article className="venue-page">
      {banner ? (
        <p className="venue-banner" role="status">
          {banner}
        </p>
      ) : null}

      {/* 1. Overview */}
      <header className="venue-header" id="overview">
        <p className="eyebrow">
          {overview.categoryHref && overview.categoryTitle ? (
            <a href={overview.categoryHref}>{overview.categoryTitle}</a>
          ) : (
            overview.categoryTitle
          )}
          {overview.cityName ? ` · ${overview.cityName}` : ""}
        </p>
        <h1>
          {overview.name}
          {overview.branchName ? <span className="venue-branch"> — {overview.branchName}</span> : null}
        </h1>
        {overview.aliases.length ? (
          <p className="venue-muted">Also known as {overview.aliases.join(", ")}</p>
        ) : null}
        {overview.types.length ? (
          <ul className="venue-tags venue-types" aria-label="Venue types">
            {overview.types.map((t) => (
              <li key={t.label}>{t.label}</li>
            ))}
          </ul>
        ) : null}
        <dl className="venue-facts">
          <div>
            <dt>Address</dt>
            <dd>{overview.address ?? "Not confirmed"}</dd>
          </div>
          <div>
            <dt>Setting</dt>
            <dd>{overview.setting ?? "Not confirmed"}</dd>
          </div>
        </dl>
        {overview.intro ? <p className="hero-lead venue-intro">{overview.intro}</p> : null}
        <p className="venue-header-actions">
          <Checked meta={overview.meta} />
          <ShareButton title={`${overview.name}${overview.branchName ? ` — ${overview.branchName}` : ""}`} />
        </p>
      </header>

      <nav className="venue-toc" aria-label="On this page">
        <a href="#at-a-glance">At a glance</a>
        <a href="#plan">Plan your visit</a>
        <a href="#prices">Prices</a>
        <a href="#activities">Activities</a>
        <a href="#amenities">Amenities</a>
        <a href="#experience">What to expect</a>
        <a href="#sources">Sources</a>
      </nav>

      {/* 2. Parent decision snapshot */}
      <section className="venue-section" id="at-a-glance" aria-labelledby="at-a-glance-h">
        <h2 id="at-a-glance-h">At a glance</h2>
        <dl className="venue-facts">
          <div>
            <dt>Best-fit ages</dt>
            <dd>{snapshot.bestFitAges ?? "Not confirmed"}</dd>
          </div>
          <div>
            <dt>Rainy day</dt>
            <dd>{snapshot.rainyDay ?? "Not confirmed"}</dd>
          </div>
          <div>
            <dt>Typical visit</dt>
            <dd>
              {snapshot.visitLength ? (
                <>
                  {snapshot.visitLength.text}
                  <span className="venue-checked"> {snapshot.visitLength.basis}. Checked {snapshot.visitLength.checked}.</span>
                </>
              ) : (
                "Not confirmed"
              )}
            </dd>
          </div>
        </dl>
        <h3>By age</h3>
        <table className="venue-age-table">
          <thead>
            <tr>
              <th scope="col">Ages</th>
              <th scope="col">Fit</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.ageBands.map((b) => (
              <tr key={b.band} className={b.fit ? undefined : "is-unconfirmed"}>
                <th scope="row">{b.label}</th>
                <td>{b.fitLabel}</td>
                <td>
                  {b.note ?? ""}
                  {b.meta ? <> <Checked meta={b.meta} /></> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Rules heading="Age, height and weight limits" lines={snapshot.restrictions} />
        <Rules heading="Supervision" lines={snapshot.supervision} />
        {snapshot.activityLevel.length || snapshot.whoItSuits.length ? (
          <ul className="venue-list">
            {[...snapshot.whoItSuits, ...snapshot.activityLevel].map((t, i) => (
              <Theme key={i} t={t} />
            ))}
          </ul>
        ) : null}
        {view.ageTool.activities.length || view.ageTool.bands.some((b) => b.fit) ? (
          <AgeCheckTool tool={view.ageTool} />
        ) : null}
      </section>

      {/* 4–5. Plan your visit */}
      <section className="venue-section" id="plan" aria-labelledby="plan-h">
        <h2 id="plan-h">Plan your visit</h2>

        <h3>Hours</h3>
        {visit.hours.kind === "weekly" ? (
          <>
            <table className="venue-hours">
              <tbody>
                {visit.hours.rows.map((r) => (
                  <tr key={r.day}>
                    <th scope="row">{r.day}</th>
                    <td>{r.ranges.length ? r.ranges.join(", ") : "Closed or not confirmed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visit.hours.seasonal.length ? (
              <ul className="venue-list">
                {visit.hours.seasonal.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            {visit.hours.checked ? <p className="venue-checked">Hours checked {visit.hours.checked}</p> : null}
          </>
        ) : visit.hours.kind === "statement" ? (
          <p>
            {visit.hours.text}
            {visit.hours.checked ? <span className="venue-checked"> Checked {visit.hours.checked}</span> : null}
          </p>
        ) : (
          <NotConfirmed>Hours not confirmed yet — check with the venue before you go.</NotConfirmed>
        )}
        <Rules heading="Holiday and special hours" lines={visit.hoursNotes} />

        <h3>Booking and contact</h3>
        {visit.bookingLinks.length || visit.website || visit.phone ? (
          <ul className="venue-links">
            {visit.bookingLinks.map((l) => (
              <li key={l.href}>
                <a className="button button-primary" href={l.href} rel="noopener noreferrer" target="_blank">
                  {l.label}
                </a>{" "}
                <Checked meta={l.meta} />
              </li>
            ))}
            {visit.website ? (
              <li>
                <a href={visit.website.href} rel="noopener noreferrer" target="_blank">
                  {visit.website.label} ({visit.website.display})
                </a>{" "}
                <Checked meta={visit.website.meta} />
              </li>
            ) : null}
            {visit.phone ? (
              <li>
                <a href={visit.phone.href}>{visit.phone.display}</a> <Checked meta={visit.phone.meta} />
              </li>
            ) : null}
          </ul>
        ) : (
          <NotConfirmed>No official booking link or contact details confirmed yet.</NotConfirmed>
        )}

        {view.beforeYouGo.length ? (
          <div className="venue-tool">
            <h3>Before you go</h3>
            <ul className="venue-checklist">
              {view.beforeYouGo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasRules ? (
          <>
            <h3>Visit rules</h3>
            <Rules heading="Booking" lines={visit.bookingRules} />
            <Rules heading="Waiver" lines={visit.waiver} />
            <Rules heading="Arrival and check-in" lines={visit.arrival} />
            <Rules heading="What to wear" lines={visit.dress} />
            <Rules heading="Food and re-entry" lines={visit.food} />
            <Rules heading="Cancellations and refunds" lines={visit.cancellation} />
            <Rules heading="Good to know" lines={visit.other} />
          </>
        ) : null}

        <h3>Getting there</h3>
        {gettingThere.address ? (
          <p>
            {gettingThere.address}
            {gettingThere.directionsUrl ? (
              <>
                {" · "}
                <a href={gettingThere.directionsUrl} rel="noopener noreferrer" target="_blank">
                  Directions
                </a>
              </>
            ) : null}
          </p>
        ) : gettingThere.directionsUrl ? (
          <p>
            <a href={gettingThere.directionsUrl} rel="noopener noreferrer" target="_blank">
              Directions
            </a>
          </p>
        ) : (
          <NotConfirmed>Address not confirmed yet.</NotConfirmed>
        )}
        {gettingThere.parking.length ? (
          <ul className="venue-amenities">
            {gettingThere.parking.map((a) => (
              <Amenity key={a.kind} a={a} />
            ))}
          </ul>
        ) : null}
        <Rules heading="Location notes" lines={gettingThere.locationNotes} />
        <Rules heading="Transit" lines={gettingThere.transit} />
      </section>

      {/* 6. Prices */}
      <section className="venue-section" id="prices" aria-labelledby="prices-h">
        <h2 id="prices-h">Prices</h2>
        {view.prices.length ? (
          view.prices.map((s) => (
            <div key={s.kind} className="venue-price-group">
              <h3>{s.heading}</h3>
              <ul className="venue-prices">
                {s.lines.map((l) => (
                  <li key={l.id}>
                    <span className="venue-price-label">
                      {l.label}
                      {l.requiredAddon ? <span className="venue-required"> · Required</span> : null}
                    </span>
                    <span className="venue-price-amount">{l.amount}</span>
                    {l.details.length ? <span className="venue-price-details">{l.details.join(" · ")}</span> : null}
                    <Checked meta={l.meta} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <NotConfirmed>Prices not confirmed yet — check the venue&apos;s website.</NotConfirmed>
        )}
        {view.costEstimator ? <CostEstimator model={view.costEstimator} /> : null}
      </section>

      {/* 3 & 8. Activities and programs */}
      <section className="venue-section" id="activities" aria-labelledby="activities-h">
        <h2 id="activities-h">Activities</h2>
        {view.activities.length ? (
          <ul className="venue-activities">
            {view.activities.map((a) => (
              <Activity key={a.name} a={a} />
            ))}
          </ul>
        ) : (
          <NotConfirmed>Activities at this location are not confirmed yet.</NotConfirmed>
        )}
        {view.notOffered.length ? (
          <>
            <h3>Not offered at this location</h3>
            <ul className="venue-list">
              {view.notOffered.map((a) => (
                <li key={a.name}>
                  {a.name}
                  {a.limits.length ? ` — ${a.limits.join(" · ")}` : ""} <Checked meta={a.meta} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {view.programs.length ? (
          <>
            <h3>Programs and special sessions</h3>
            <ul className="venue-activities">
              {view.programs.map((p) => (
                <li key={p.name} className="venue-activity">
                  <h4>{p.name}</h4>
                  {p.description ? <p>{p.description}</p> : null}
                  <ul className="venue-tags">
                    {p.when ? <li>{p.when}</li> : null}
                    {p.ages ? <li>{p.ages}</li> : null}
                    {p.price ? <li>{p.price}</li> : null}
                  </ul>
                  {p.registrationUrl ? (
                    <p>
                      <a href={p.registrationUrl} rel="noopener noreferrer" target="_blank">
                        Register
                      </a>
                    </p>
                  ) : null}
                  <Checked meta={p.meta} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {/* 7. Amenities */}
      <section className="venue-section" id="amenities" aria-labelledby="amenities-h">
        <h2 id="amenities-h">Amenities and access</h2>
        {confirmedAmenities.length ? (
          <ul className="venue-amenities">
            {confirmedAmenities.map((a) => (
              <Amenity key={`${a.kind}-${a.label}`} a={a} />
            ))}
          </ul>
        ) : (
          <NotConfirmed>No amenities confirmed yet.</NotConfirmed>
        )}
        {unconfirmedAmenities.length ? (
          <p className="venue-muted">
            Not confirmed yet: {unconfirmedAmenities.map((a) => a.label.toLowerCase()).join(", ")}.
          </p>
        ) : null}
      </section>

      {/* 9. Parent experience */}
      <section className="venue-section" id="experience" aria-labelledby="experience-h">
        <h2 id="experience-h">What to expect</h2>
        {experience.status === "limited" ? (
          <p className="venue-notice">
            Limited information: we don&apos;t yet have enough consistent sources to summarise what
            visits are like here.
            {experience.hasDisagreement ? " Some sources disagree." : ""}
          </p>
        ) : null}

        {experience.venuePublished.length ? (
          <>
            <h3>From the venue</h3>
            <ul className="venue-list">
              {experience.venuePublished.map((t, i) => (
                <Theme key={i} t={t} />
              ))}
            </ul>
          </>
        ) : null}

        {experience.liked.length || experience.concerns.length || experience.otherReported.length ? (
          <div className="venue-reported">
            <h3>What reviewers report</h3>
            <p className="venue-muted">
              Opinions from the review sources listed below, in our own words — not facts
              confirmed by Compass or the venue.
            </p>
            {experience.liked.length ? (
              <>
                <h4>Parents often like</h4>
                <ul className="venue-list">
                  {experience.liked.map((t, i) => (
                    <Theme key={i} t={t} />
                  ))}
                </ul>
              </>
            ) : null}
            {experience.concerns.length ? (
              <>
                <h4>Common concerns</h4>
                <ul className="venue-list">
                  {experience.concerns.map((t, i) => (
                    <Theme key={i} t={t} />
                  ))}
                </ul>
              </>
            ) : null}
            {experience.otherReported.length ? (
              <>
                <h4>Also mentioned</h4>
                <ul className="venue-list">
                  {experience.otherReported.map((t, i) => (
                    <Theme key={i} t={t} />
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}

        {experience.firstHand.length ? (
          <>
            <h3>From a visit</h3>
            <ul className="venue-list">
              {experience.firstHand.map((t, i) => (
                <Theme key={i} t={t} showHeading={t.theme !== "other"} />
              ))}
            </ul>
          </>
        ) : null}

        <h3>Review sources</h3>
        <p>
          {reviews.coverage}
          {reviews.lastChecked ? ` Last checked ${reviews.lastChecked}.` : ""}
        </p>
        {reviews.customer.length || reviews.editorial.length ? (
          <ul className="venue-sources">
            {[...reviews.customer, ...reviews.editorial].map((s) => (
              <li key={s.href}>
                <p>
                  <a href={s.href} rel="noopener noreferrer" target="_blank">
                    {s.name}
                  </a>{" "}
                  <span className="venue-tag">{s.kindLabel}</span>
                </p>
                <p className="venue-muted">{s.coverageNote}</p>
                <ul className="venue-tags">
                  {s.sample ? <li>{s.sample}</li> : null}
                  {s.period ? <li>{s.period}</li> : null}
                  {s.selectionMethod ? <li>Order: {s.selectionMethod}</li> : null}
                  <li>Accessed {s.accessed}</li>
                </ul>
                {s.statedRating ? <p>{s.statedRating}</p> : null}
                {s.disclosure ? <p className="venue-disclosure">{s.disclosure}</p> : null}
                {s.attributions.length ? (
                  <p className="venue-attributions">
                    Reviews by{" "}
                    {s.attributions.map((a, i) => (
                      <span key={a.uri}>
                        {i > 0 ? ", " : ""}
                        <a href={a.uri} rel="noopener noreferrer" target="_blank">
                          {a.name}
                        </a>
                      </span>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {!reviews.automatedRetrieval ? (
          <p className="venue-muted">
            Review sources are checked by hand. Compass does not pull reviews automatically.
          </p>
        ) : null}
      </section>

      {/* 10. Sources and freshness */}
      <section className="venue-section" id="sources" aria-labelledby="sources-h">
        <h2 id="sources-h">Sources and freshness</h2>
        {view.conflicts.length ? (
          <div className="venue-notice">
            <p>Sources disagree on:</p>
            <ul className="venue-list">
              {view.conflicts.map((c, i) => (
                <li key={i}>
                  <strong>{c.fact}:</strong> {c.note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <table className="venue-sources-table">
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Supports</th>
              <th scope="col">Last checked</th>
            </tr>
          </thead>
          <tbody>
            {view.sources.map((s) => (
              <tr key={s.url}>
                <td>
                  <a href={s.url} rel="noopener noreferrer" target="_blank">
                    {s.host}
                  </a>
                </td>
                <td>{s.supports.join("; ")}</td>
                <td>{s.lastChecked}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="venue-muted">
          Spot something out of date?{" "}
          <a href={`mailto:hello@compassbyvavy.ca?subject=${encodeURIComponent(`Correction: ${overview.name}${overview.branchName ? ` (${overview.branchName})` : ""}`)}`}>
            Tell us
          </a>
          .
        </p>
      </section>
    </article>
  );
}
