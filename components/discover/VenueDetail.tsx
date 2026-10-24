import type { ReactNode } from "react";
import { VenueIllustration } from "@/components/discover/VenueIllustration";
import {
  AgeCheckTool,
  CostEstimator,
  FamilyPriceTool,
  ShareIconButton,
  StickyBookBar,
  UsualHoursToday,
  VenueSection,
  VenueVideo,
  VisitChecklist,
} from "@/components/discover/VenueTools";
import type {
  ActivityView,
  AmenityView,
  DayPriceRow,
  FactMeta,
  PriceLine,
  PriceSection,
  RuleLine,
  ThemeView,
  VenueDetailView,
} from "@/lib/discover/venueDetail";

/** "Checked Oct 10, 2026 · Source", plus the conflict when sources disagree. */
function Checked({ meta }: { meta: FactMeta }) {
  // Routine facts share the page's check date, shown once at the top.
  if (meta.routine) return null;
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

/** The one checked date and source a whole list shares, or null when they differ. */
function sharedMeta(metas: FactMeta[]): FactMeta | null {
  if (metas.length < 2) return null;
  const [first] = metas;
  return metas.every((m) => m.checked === first.checked && m.sourceUrl === first.sourceUrl && !m.conflict)
    ? first
    : null;
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

function Activity({ a, compact = false, allIncluded = false }: { a: ActivityView; compact?: boolean; allIncluded?: boolean }) {
  // In a compact list the shared source shows once below, and "available
  // whenever the venue is open" goes without saying. When everything is
  // included, the list says so once instead of on every card.
  const schedule = compact && a.schedule === "Available whenever the venue is open" ? null : a.schedule;
  const cost = allIncluded && a.cost === "Included in admission" ? null : a.cost;
  return (
    <li className="venue-activity">
      <h4>{a.name}</h4>
      {a.description ? <p>{a.description}</p> : null}
      {a.limits.length || cost || schedule ? (
        <ul className="venue-tags">
          {a.limits.map((l) => (
            <li key={l}>{l}</li>
          ))}
          {cost ? <li>{cost}</li> : null}
          {schedule ? <li>{schedule}</li> : null}
        </ul>
      ) : null}
      {compact ? null : <Checked meta={a.meta} />}
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

/** Weekday / weekend price table; a price for any day shows in both columns. */
function DayPriceTable({ rows, caption, firstColumn }: { rows: DayPriceRow[]; caption: string; firstColumn: string }) {
  const cell = (l: PriceLine | null) => (l ? l.amount : "—");
  return (
    <div className="venue-table-scroll">
      <table className="venue-day-prices">
        <caption className="venue-sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{firstColumn}</th>
            <th scope="col">Weekdays</th>
            <th scope="col">Weekends and holidays</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">
                {r.label}
                {r.details.length ? <span className="venue-price-details">{r.details.join(" · ")}</span> : null}
                {(r.anyDay ?? r.weekend ?? r.weekday)?.meta.conflict ? (
                  <span className="venue-conflict"> Sources disagree: {(r.anyDay ?? r.weekend ?? r.weekday)!.meta.conflict}</span>
                ) : null}
              </th>
              <td>{cell(r.anyDay ?? r.weekday)}</td>
              <td>{cell(r.anyDay ?? r.weekend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceList({ section }: { section: PriceSection }) {
  const shared = sharedMeta(section.lines.map((l) => l.meta));
  return (
    <div className="venue-price-group">
      <h3>{section.heading}</h3>
      <ul className="venue-prices">
        {section.lines.map((l) => (
          <li key={l.id}>
            <span className="venue-price-label">
              {l.label}
              {l.requiredAddon ? <span className="venue-required"> · Required</span> : null}
            </span>
            <span className="venue-price-amount">{l.amount}</span>
            {l.details.length ? <span className="venue-price-details">{l.details.join(" · ")}</span> : null}
            {shared ? (
              l.meta.conflict ? <span className="venue-conflict">Sources disagree: {l.meta.conflict}</span> : null
            ) : (
              <Checked meta={l.meta} />
            )}
          </li>
        ))}
      </ul>
      {shared ? <Checked meta={shared} /> : null}
    </div>
  );
}

const plusTaxNote = (lines: PriceLine[]) =>
  lines.some((l) => l.plusTax === true) ? "Prices are plus HST." : null;

/**
 * A venue page, organised around a parent's questions: Will it suit my kids?
 * What will it cost? When to go, and what to know before going. Parties,
 * reviews and sources follow. Each section folds away on a phone.
 */
export function VenueDetail({
  view,
  banner,
}: {
  view: VenueDetailView;
  banner?: string | null;
}) {
  const { overview, snapshot, visit, gettingThere, experience, reviews } = view;
  const confirmedAmenities = view.amenities.filter((a) => a.status !== "not_confirmed");
  const unconfirmedAmenities = view.amenities.filter((a) => a.status === "not_confirmed");
  const admission = view.prices.find((s) => s.kind === "admission");
  const paymentNotes = visit.other.filter((l) => /\bcash/i.test(l.text));
  const otherNotes = visit.other.filter((l) => !/\bcash/i.test(l.text));
  const showAgeTool = view.ageTool.activities.some((a) => a.ageMin !== null || a.ageMax !== null);
  const fullName = `${overview.name}${overview.branchName ? ` — ${overview.branchName}` : ""}`;
  const activitiesMeta = sharedMeta(view.activities.map((a) => a.meta));
  const priceFact = view.quickFacts.find((f) => f.value === view.priceFrom);
  const priceLabel = priceFact ? priceFact.label : "";
  // "Label: text" per line becomes a short list; plain text stays a paragraph.
  const takeLines = (overview.compassTake ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^([^:]{2,30}):\s+(.+)$/.exec(l);
      return m ? { label: m[1], text: m[2] } : { label: null, text: l };
    });
  const bandsMeta = sharedMeta(snapshot.ageBands.flatMap((b) => (b.meta ? [b.meta] : [])));
  const noExperience =
    experience.status === "limited" &&
    !experience.firstHand.length &&
    !experience.venuePublished.length &&
    !experience.liked.length &&
    !experience.concerns.length &&
    !experience.otherReported.length &&
    !reviews.customer.length &&
    !reviews.editorial.length;
  const firstParty = view.parties.rows?.[0];
  const partyTeaser =
    firstParty && (firstParty.weekday || firstParty.weekend)
      ? `Packages for ${firstParty.label} from ${[
          firstParty.weekday ? `${firstParty.weekday.amount} on weekdays` : null,
          firstParty.weekend ? `${firstParty.weekend.amount} on weekends` : null,
        ]
          .filter(Boolean)
          .join(" and ")}${plusTaxNote(view.parties.lines) ? ", plus HST" : ""}.`
      : null;

  const bookCard = view.primaryBooking ? (
    <>
      {view.priceFrom ? (
        <p className="venue-book-price">
          {view.priceFrom}
          <span>{priceLabel}</span>
        </p>
      ) : null}
      <a className="button button-primary" href={view.primaryBooking.href} rel="noopener noreferrer" target="_blank">
        {view.primaryBooking.label}
      </a>
    </>
  ) : null;

  return (
    <div className="venue-layout">
    <article className="venue-page">
      {banner ? (
        <p className="venue-banner" role="status">
          {banner}
        </p>
      ) : null}

      <header className="venue-header" id="overview">
        <p className="venue-crumb">
          {overview.cityName ? <span>{overview.cityName}</span> : null}
          {overview.cityName && (view.primaryType || overview.categoryTitle) ? <span aria-hidden="true"> › </span> : null}
          {overview.categoryHref ? (
            <a href={overview.categoryHref}>{view.primaryType ?? overview.categoryTitle}</a>
          ) : (
            view.primaryType ?? overview.categoryTitle
          )}
        </p>
        <h1>
          {overview.name}
          {overview.branchName ? <span className="venue-branch"> — {overview.branchName}</span> : null}
        </h1>
        <p className="venue-address">{overview.address ?? "Address not confirmed"}</p>
        {overview.intro ? <p className="venue-intro">{overview.intro}</p> : null}
        {view.quickFacts.length ? (
          <dl className="venue-quick">
            {view.quickFacts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {view.quickNote ? (
          <p className={view.primaryBooking ? "venue-quick-note venue-card-dup" : "venue-quick-note"}>{view.quickNote}</p>
        ) : null}
        <div className="venue-header-actions">
          {view.primaryBooking ? (
            // On wide screens the right-hand card carries the Book button.
            <a className="button button-primary venue-card-dup" href={view.primaryBooking.href} rel="noopener noreferrer" target="_blank">
              {view.primaryBooking.label}
            </a>
          ) : null}
          {gettingThere.directionsUrl ? (
            <a className="button button-secondary" href={gettingThere.directionsUrl} rel="noopener noreferrer" target="_blank">
              Get directions
            </a>
          ) : null}
          {visit.phone ? (
            // Wide screens show "Call" in the booking card on the right instead.
            <a className="button button-secondary venue-call-inline" href={visit.phone.href}>
              Call
            </a>
          ) : null}
          <ShareIconButton title={fullName} />
        </div>
        <p className={view.primaryBooking ? "venue-header-meta venue-card-dup" : "venue-header-meta"}>
          <UsualHoursToday hours={view.weeklyHours} />
        </p>
        {view.video ? (
          <VenueVideo video={view.video} />
        ) : (
          <VenueIllustration primaryType={view.primaryType} glow={/\bglow/i.test(overview.intro ?? "")} />
        )}
        <p className="venue-header-meta">
          <a href="#sources" className="venue-checked">
            Official details checked {overview.meta.checked}
          </a>
        </p>
      </header>

      {takeLines.length ? (
        <section className="venue-take" aria-labelledby="take-h">
          <h2 id="take-h">Compass take</h2>
          {takeLines.some((l) => l.label) ? (
            <dl className="venue-take-list">
              {takeLines.map((l, i) => (
                <div key={i}>
                  {l.label ? <dt>{l.label}</dt> : null}
                  <dd>{l.text}</dd>
                </div>
              ))}
            </dl>
          ) : (
            takeLines.map((l, i) => <p key={i}>{l.text}</p>)
          )}
          <p className="venue-muted">
            {experience.firstHand.length
              ? "Based on official venue information and a Compass visit."
              : "Based on official venue information. Compass hasn't visited yet."}
          </p>
        </section>
      ) : null}

      <VenueSection id="suit" title="Will it suit my kids?">
        {/* The quick facts at the top already answer these when present. */}
        {view.quickFacts.length < 3 ? (
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
                  <span className="venue-checked">
                    {" "}
                    {snapshot.visitLength.basis}.
                    {snapshot.visitLength.checked !== overview.meta.checked ? ` Checked ${snapshot.visitLength.checked}.` : ""}
                  </span>
                </>
              ) : (
                "Not confirmed"
              )}
            </dd>
          </div>
        </dl>
        ) : null}
        <h3>By age</h3>
        <div className="venue-table-scroll">
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
                    {b.meta && !bandsMeta ? <> <Checked meta={b.meta} /></> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bandsMeta ? <Checked meta={bandsMeta} /> : null}
        <Rules heading="Age, height and weight limits" lines={snapshot.restrictions} />
        <Rules heading="Supervision" lines={snapshot.supervision} />
        {snapshot.activityLevel.length || snapshot.whoItSuits.length ? (
          <ul className="venue-list">
            {[...snapshot.whoItSuits, ...snapshot.activityLevel].map((t, i) => (
              <Theme key={i} t={t} />
            ))}
          </ul>
        ) : null}

        <h3>What&apos;s there</h3>
        {view.activities.length ? (
          <>
            {view.activitiesAllIncluded ? <p className="venue-lead">Everything here is included in your ticket.</p> : null}
            <ul className="venue-activities">
              {view.activities.map((a) => (
                <Activity key={a.name} a={a} compact={activitiesMeta !== null} allIncluded={view.activitiesAllIncluded} />
              ))}
            </ul>
            {activitiesMeta ? <Checked meta={activitiesMeta} /> : null}
          </>
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
        {showAgeTool ? <AgeCheckTool tool={view.ageTool} /> : null}
      </VenueSection>

      <VenueSection id="cost" title="What will it cost?">
        {view.familyPrice ? (
          <FamilyPriceTool model={view.familyPrice} />
        ) : view.costEstimator ? (
          <CostEstimator model={view.costEstimator} />
        ) : null}
        {admission ? (
          view.admissionRows ? (
            <>
              <h3>All ticket prices</h3>
              <DayPriceTable rows={view.admissionRows} caption="Admission prices by day" firstColumn="Ticket" />
              <p className="venue-muted">
                {[admission.lines.find((l) => l.details.some((d) => d.startsWith("Includes")))?.details.find((d) => d.startsWith("Includes")), plusTaxNote(admission.lines)]
                  .filter(Boolean)
                  .join(". ")}
                {" "}
                <Checked meta={admission.lines[0].meta} />
              </p>
            </>
          ) : (
            <PriceList section={admission} />
          )
        ) : (
          <NotConfirmed>Prices not confirmed yet — check the venue&apos;s website.</NotConfirmed>
        )}
        {paymentNotes.map((l) => (
          <p key={l.text} className="venue-muted">
            {l.text}
          </p>
        ))}
        {view.otherPrices.length ? (
          <details className="venue-more">
            <summary>
              Coming often? {view.otherPrices.map((s) => s.heading.toLowerCase()).join(", ").replace(/^./, (c) => c.toUpperCase())}
            </summary>
            {view.otherPrices.map((s) => (
              <PriceList key={s.kind} section={s} />
            ))}
          </details>
        ) : null}
      </VenueSection>

      <VenueSection id="when" title="When to go">
        <h3>Hours</h3>
        {visit.hours.kind === "weekly" ? (
          <>
            <table className="venue-hours">
              <tbody>
                {visit.hours.rows.map((r) => (
                  <tr key={r.day}>
                    <th scope="row">{r.day}</th>
                    <td>{r.ranges.length ? r.ranges.join(", ") : "Closed"}</td>
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
        <Rules heading="Booking" lines={visit.bookingRules} />
      </VenueSection>

      <VenueSection id="before" title="Before you go">
        {view.beforeYouGo.length ? (
          <>
            {view.beforeYouGoGroups.home.length ? (
              <VisitChecklist
                storageKey={view.overview.name}
                groups={[{ heading: "Before you leave home", items: view.beforeYouGoGroups.home }]}
              />
            ) : null}
            {view.beforeYouGoGroups.atVenue.length ? (
              <>
                <h3>At the venue</h3>
                <ul className="venue-rule-list">
                  {view.beforeYouGoGroups.atVenue.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}
        {view.checkWithVenue.length ? (
          <p className="venue-notice">
            <strong>Check with the venue:</strong> {view.checkWithVenue.join(", ").toLowerCase()} — not confirmed yet.
          </p>
        ) : null}
        <Rules heading="Waiver" lines={visit.waiver} />
        <Rules heading="Arrival and check-in" lines={visit.arrival} />
        <Rules heading="What to wear" lines={visit.dress} />
        <Rules heading="Food and re-entry" lines={visit.food} />
        <Rules heading="Cancellations and refunds" lines={visit.cancellation} />
        <Rules heading="Good to know" lines={[...paymentNotes, ...otherNotes]} />

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

        <h3>Amenities and access</h3>
        {confirmedAmenities.length ? <p className="venue-muted">As stated by the venue.</p> : null}
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
      </VenueSection>

      {view.parties.lines.length || view.parties.rules.length ? (
        <VenueSection id="parties" title="Birthday parties" openOnDesktop={false}>
          {partyTeaser ? <p className="venue-lead">{partyTeaser}</p> : null}
          {view.parties.rows ? (
            <details className="venue-more">
              <summary>Compare all party packages</summary>
              <DayPriceTable rows={view.parties.rows} caption="Party prices by day" firstColumn="Party" />
              <p className="venue-muted">
                {plusTaxNote(view.parties.lines)} <Checked meta={view.parties.lines[0].meta} />
              </p>
            </details>
          ) : view.parties.lines.length ? (
            <PriceList section={{ heading: "Party prices", kind: "party", lines: view.parties.lines }} />
          ) : null}
          {view.parties.rules.length ? (
            <ul className="venue-list">
              {view.parties.rules.map((l) => (
                <li key={l.text}>
                  {l.text} <Checked meta={l.meta} />
                </li>
              ))}
            </ul>
          ) : null}
        </VenueSection>
      ) : null}

      <VenueSection id="experience" title="What to expect" openOnDesktop={false}>
        {noExperience ? (
          <>
            <p>
              Compass hasn&apos;t visited this venue yet. The details above come from the venue&apos;s
              official information. Parent-experience notes, such as cleanliness, crowding, seating,
              noise and washrooms, are still being verified.
            </p>
            <p>
              <a href={`mailto:hello@compassbyvavy.ca?subject=${encodeURIComponent(`Parent tip: ${fullName}`)}`}>
                Been here? Share a parent tip
              </a>
            </p>
          </>
        ) : null}
        {!noExperience && experience.status === "limited" ? (
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

        {noExperience ? null : (
          <>
            <h3>Review sources</h3>
            <p>
              {reviews.coverage}
              {reviews.lastChecked ? ` Last checked ${reviews.lastChecked}.` : ""}
            </p>
          </>
        )}
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
        {!reviews.automatedRetrieval && !noExperience ? (
          <p className="venue-muted">
            Review sources are checked by hand. Compass does not pull reviews automatically.
          </p>
        ) : null}
      </VenueSection>

      <VenueSection id="sources" title="How we verified this page" openOnDesktop={false}>
        <p className="venue-lead">
          {view.verification.facts} official details checked · last checked {view.verification.lastChecked}
          {view.verification.conflicts
            ? ` · ${view.verification.conflicts} ${view.verification.conflicts === 1 ? "detail needs" : "details need"} reconfirming`
            : ""}
        </p>
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
      </VenueSection>
    </article>
      {bookCard ? (
        <aside className="venue-aside" aria-label="Book">
          <div className="venue-book-card">
            {bookCard}
            {view.quickNote ? <p className="venue-muted">{view.quickNote}</p> : null}
            <UsualHoursToday hours={view.weeklyHours} />
            {gettingThere.directionsUrl ? (
              <a href={gettingThere.directionsUrl} rel="noopener noreferrer" target="_blank">
                Get directions
              </a>
            ) : null}
            {visit.phone ? <a href={visit.phone.href}>Call {visit.phone.display}</a> : null}
          </div>
        </aside>
      ) : null}
      {bookCard ? <StickyBookBar>{bookCard}</StickyBookBar> : null}
    </div>
  );
}
