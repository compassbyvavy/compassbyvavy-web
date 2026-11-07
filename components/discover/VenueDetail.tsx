import type { ReactNode } from "react";
import { VenueIllustration } from "@/components/discover/VenueIllustration";
import {
  AgeCheckTool,
  BookCardPrice,
  CostEstimator,
  FamilyPriceTool,
  SessionPriceTool,
  ShareIconButton,
  StickyBookBar,
  UsualHoursToday,
  VenueSection,
  VenueVideo,
  VisitChecklist,
  WeekStrip,
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

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
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
    // Focusable so keyboard users can scroll it when it's wider than a small phone.
    <div className="venue-table-scroll" tabIndex={0} role="region" aria-label={caption}>
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

function PriceList({ section, level = 3 }: { section: PriceSection; level?: 3 | 4 }) {
  const shared = sharedMeta(section.lines.map((l) => l.meta));
  const Heading = level === 4 ? "h4" : "h3";
  return (
    <div className="venue-price-group">
      <Heading>{section.heading}</Heading>
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
  // Parking shows under "Getting there", so it isn't repeated in the amenities list.
  const confirmedAmenities = view.amenities.filter(
    (a) => a.status !== "not_confirmed" && !view.gettingThere.parking.some((p) => p.kind === a.kind),
  );
  const unconfirmedAmenities = view.amenities.filter((a) => a.status === "not_confirmed");
  const admission = view.prices.find((s) => s.kind === "admission");
  const paymentNotes = visit.other.filter((l) => /\bcash/i.test(l.text));
  const otherNotes = visit.other.filter((l) => !/\bcash/i.test(l.text));
  const showAgeTool = view.ageTool.activities.some((a) => a.ageMin !== null || a.ageMax !== null);
  const fullName = `${overview.name}${overview.branchName ? ` — ${overview.branchName}` : ""}`;
  const activitiesMeta = sharedMeta(view.activities.map((a) => a.meta));
  const listed = new Set([...view.beforeYouGoGroups.home, ...view.beforeYouGoGroups.atVenue]);
  const storageKnown = view.amenities.some((a) => a.kind === "stroller_storage" && a.status !== "not_confirmed");
  const unconfirmedList = unconfirmedAmenities.filter(
    (a) => !view.checkWithVenue.includes(a.label) && !(a.kind === "stroller_access" && storageKnown),
  );
  const sessionVenue = view.sessionPriceGroups.length > 0;
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
      ? `Party packages for ${firstParty.label.replace(" + ", " and ")} start at ${[
          firstParty.weekday ? `${firstParty.weekday.amount} on weekdays` : null,
          firstParty.weekend ? `${firstParty.weekend.amount} on weekends` : null,
        ]
          .filter(Boolean)
          .join(" and ")}${plusTaxNote(view.parties.lines) ? ", plus HST" : ""}.`
      : null;

  const bookCard = view.primaryBooking ? (
    <>
      {view.familyPrice || view.sessionPrice ? (
        <BookCardPrice price={view.priceFrom} label={priceLabel} />
      ) : view.priceFrom ? (
        <p className="venue-book-price">
          {view.priceFrom}
          <span>{priceLabel}</span>
        </p>
      ) : null}
      <a className="button button-primary venue-plan-book" href={view.primaryBooking.href} rel="noopener noreferrer" target="_blank">
        {view.primaryBooking.label}
      </a>
    </>
  ) : null;
  // The price tool lives in the "Plan your visit" card: right-hand column on
  // wide screens, straight after the header on phones.
  const priceTool = view.sessionPrice ? (
    <SessionPriceTool model={view.sessionPrice} />
  ) : view.familyPrice ? (
    <FamilyPriceTool model={view.familyPrice} />
  ) : view.costEstimator ? (
    <CostEstimator model={view.costEstimator} />
  ) : null;
  const hasPlanCard = Boolean(bookCard || priceTool);
  const tabs = [
    { id: "suit", label: "Ages and what's inside" },
    { id: "cost", label: "Prices" },
    { id: "when", label: "Hours" },
    { id: "before", label: "Before you go" },
    ...(view.parties.lines.length || view.parties.rules.length ? [{ id: "parties", label: "Parties" }] : []),
    { id: "experience", label: "What to expect" },
    { id: "sources", label: "How we checked" },
  ];
  const visited = experience.firstHand.length > 0;

  return (
    <article className="venue-layout" aria-labelledby="venue-title">
      <header className="venue-header venue-area-head" id="overview">
        {banner ? (
          <p className="venue-banner" role="status">
            {banner}
          </p>
        ) : null}
        <p className="venue-crumb">
          {overview.cityName ? <span>{overview.cityName}</span> : null}
          {overview.cityName && (view.primaryType || overview.categoryTitle) ? <span aria-hidden="true"> › </span> : null}
          {view.primaryType ? (
            sentenceCase(view.primaryType)
          ) : overview.categoryHref ? (
            <a href={overview.categoryHref}>{overview.categoryTitle}</a>
          ) : (
            overview.categoryTitle
          )}
        </p>
        <div className="venue-title-row">
          <div>
            <h1 id="venue-title">
              {overview.name}
              {overview.branchName ? <span className="venue-branch"> — {overview.branchName}</span> : null}
            </h1>
            <p className="venue-address">{overview.address ?? "Address not confirmed"}</p>
            <p className="venue-header-meta">
              <UsualHoursToday hours={view.weeklyHours} />
            </p>
          </div>
          <div className="venue-header-actions">
            {/* With a plan card, booking, directions and calling live there. */}
            {!hasPlanCard && view.primaryBooking ? (
              <a className="button button-primary" href={view.primaryBooking.href} rel="noopener noreferrer" target="_blank">
                {view.primaryBooking.label}
              </a>
            ) : null}
            {!hasPlanCard && gettingThere.directionsUrl ? (
              <a className="button button-secondary" href={gettingThere.directionsUrl} rel="noopener noreferrer" target="_blank">
                Directions
              </a>
            ) : null}
            {!hasPlanCard && visit.phone ? (
              <a className="button button-secondary" href={visit.phone.href}>
                Call
              </a>
            ) : null}
            <ShareIconButton title={fullName} />
          </div>
        </div>
        {view.video ? (
          <VenueVideo video={view.video} />
        ) : (
          <VenueIllustration
            primaryType={view.primaryType}
            glow={/\bglow/i.test(overview.intro ?? "")}
            playroom={/\b(montessori|playroom)\b/i.test(overview.intro ?? "")}
          />
        )}
        <p className="venue-trust">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span>
            <strong>Official details checked {overview.meta.checked}</strong>
            {visited ? " · Compass has visited" : ""}
          </span>
          <a href="#sources">How we checked</a>
        </p>
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
        {view.quickNote && !hasPlanCard ? <p className="venue-quick-note">{view.quickNote}</p> : null}
      </header>

      {hasPlanCard ? (
        <aside className="venue-aside venue-area-aside" aria-labelledby="plan-h">
          <div className="venue-book-card venue-plan">
            <h2 id="plan-h" className="venue-plan-title">
              Plan your visit
            </h2>
            {priceTool}
            {bookCard}
            {view.quickNote ? <p className="venue-muted">{view.quickNote}</p> : null}
            {view.hoursVary ? <p className="venue-muted">No fixed hours: times change by session.</p> : null}
            <div className="venue-plan-links">
              {gettingThere.directionsUrl ? (
                <a className="button button-secondary" href={gettingThere.directionsUrl} rel="noopener noreferrer" target="_blank">
                  Directions
                </a>
              ) : null}
              {visit.phone ? (
                <a className="button button-secondary" href={visit.phone.href} aria-label={`Call ${visit.phone.display}`}>
                  Call
                </a>
              ) : null}
            </div>
            {gettingThere.address || visit.phone ? (
              <p className="venue-plan-contact">
                {gettingThere.address}
                {gettingThere.address && visit.phone ? <br /> : null}
                {visit.phone ? visit.phone.display : null}
              </p>
            ) : null}
          </div>
        </aside>
      ) : null}

      <div className="venue-page venue-area-body">
      <nav className="venue-toc" aria-label="On this page">
        {tabs.map((t) => (
          <a key={t.id} href={`#${t.id}`}>
            {t.label}
          </a>
        ))}
      </nav>

      {takeLines.length ? (
        <section className="venue-take" aria-labelledby="take-h">
          <h2 id="take-h">The Compass take</h2>
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
            {visited
              ? "Based on official venue information and a Compass visit."
              : "Based on official venue information. Compass hasn't visited yet."}
          </p>
        </section>
      ) : null}

      <VenueSection id="suit" title="Will it suit my kids?" openOnPhone>
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
        <ol className="venue-agebar">
          {snapshot.ageBands.map((b) => (
            <li key={b.band} className={`is-${b.fit ?? "unconfirmed"}`}>
              <strong>{b.label}</strong>
              <span>{b.fitLabel}</span>
            </li>
          ))}
        </ol>
        {snapshot.ageBands.some((b) => b.note || (b.meta && !bandsMeta)) ? (
          <ul className="venue-agebar-notes">
            {snapshot.ageBands
              .filter((b) => b.note || (b.meta && !bandsMeta))
              .map((b) => (
                <li key={b.band}>
                  <strong>{b.label}:</strong> {b.note ?? b.fitLabel}
                  {b.meta && !bandsMeta ? <> <Checked meta={b.meta} /></> : null}
                </li>
              ))}
          </ul>
        ) : null}
        {bandsMeta ? <Checked meta={bandsMeta} /> : null}
        <Rules heading={snapshot.restrictionsHeading} lines={snapshot.restrictions} />
        <Rules heading="Supervision" lines={snapshot.supervision} />
        {snapshot.activityLevel.length || snapshot.whoItSuits.length ? (
          <ul className="venue-list">
            {[...snapshot.whoItSuits, ...snapshot.activityLevel].map((t, i) => (
              <Theme key={i} t={t} />
            ))}
          </ul>
        ) : null}

        {/* A session venue (no fixed attractions) describes its sessions below instead. */}
        {view.activities.length || !view.programs.length ? <h3>What&apos;s there</h3> : null}
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
        ) : view.programs.length ? null : (
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
            <h3>{sessionVenue ? "Sessions and classes" : "Programs and special sessions"}</h3>
            {sessionVenue ? (
              <p className="venue-lead">
                Every visit is a booked session. Some you stay for; at drop-off sessions you can leave your child with the staff.
              </p>
            ) : null}
            <ul className="venue-activities venue-sessions">
              {(sessionVenue ? view.programs.filter((p) => p.attendance) : view.programs).map((p) => (
                <li key={p.name} className="venue-activity">
                  <h4>{p.name}</h4>
                  {p.attendance ? (
                    <p className={p.attendance === "Drop-off" ? "venue-attend is-drop" : "venue-attend"}>{p.attendance}</p>
                  ) : null}
                  {p.description ? <p>{p.description}</p> : null}
                  <ul className="venue-tags">
                    {p.ages ? <li>{p.ages}</li> : null}
                    {p.price ? <li>{p.price}</li> : null}
                    {p.when && !sessionVenue ? <li>{p.when}</li> : null}
                  </ul>
                  {p.when && sessionVenue ? <p className="venue-muted venue-session-when">{p.when}</p> : null}
                  {p.registrationUrl && p.registrationUrl !== view.primaryBooking?.href ? (
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
            {sessionVenue && view.programs.some((p) => !p.attendance) ? (
              <>
                <h4>Also on the schedule</h4>
                <ul className="venue-list">
                  {view.programs
                    .filter((p) => !p.attendance)
                    .map((p) => (
                      <li key={p.name}>
                        <strong>{p.name}:</strong> {p.description}
                        {p.price ? ` ${p.price}.` : ""} <Checked meta={p.meta} />
                      </li>
                    ))}
                </ul>
              </>
            ) : null}
            {sessionVenue && view.primaryBooking ? (
              <p>
                <a href={view.primaryBooking.href} rel="noopener noreferrer" target="_blank">
                  See this week&apos;s times and book
                </a>
              </p>
            ) : null}
          </>
        ) : null}
        {showAgeTool ? <AgeCheckTool tool={view.ageTool} /> : null}
      </VenueSection>

      <VenueSection id="cost" title="What will it cost?" openOnPhone>
        {priceTool && hasPlanCard ? (
          <p className="venue-muted venue-plan-pointer">
            Add your family in <a href="#plan-h">Plan your visit</a> to see your total.
          </p>
        ) : null}
        {admission ? (
          sessionVenue ? (
            <>
              <h3>All session prices</h3>
              {view.sessionPriceGroups.map((g) => (
                <PriceList key={g.name} section={{ heading: g.name || "Other prices", kind: "admission", lines: g.lines }} level={4} />
              ))}
            </>
          ) : view.admissionRows ? (
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
          <div className="venue-save-ways">
            <h3>Passes, memberships and extras</h3>
            {view.otherPrices.map((s) => (
              <PriceList key={s.kind} section={s} level={4} />
            ))}
          </div>
        ) : null}
      </VenueSection>

      <VenueSection id="when" title="When to go" openOnPhone>
        <h3>Hours</h3>
        {visit.hours.kind === "weekly" ? (
          <>
            <WeekStrip rows={visit.hours.rows} />
            {visit.hours.seasonal.length ? (
              <ul className="venue-list">
                {visit.hours.seasonal.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            {visit.hours.checked && visit.hours.checked !== overview.meta.checked ? (
              <p className="venue-checked">Hours checked {visit.hours.checked}</p>
            ) : null}
          </>
        ) : visit.hours.kind === "statement" ? (
          <p>
            {visit.hours.text}
            {visit.hours.checked && visit.hours.checked !== overview.meta.checked ? (
              <span className="venue-checked"> Checked {visit.hours.checked}</span>
            ) : null}
          </p>
        ) : (
          <NotConfirmed>Hours not confirmed yet — check with the venue before you go.</NotConfirmed>
        )}
        <Rules heading={view.hoursVary ? "How the schedule works" : "Holiday and special hours"} lines={visit.hoursNotes} />

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
      </VenueSection>

      <VenueSection id="before" title="Before you go" openOnPhone>
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
        {/* Rules already in the lists above aren't repeated. */}
        <Rules heading="Waiver" lines={visit.waiver.filter((l) => !listed.has(l.text))} />
        <Rules heading="Arrival and check-in" lines={visit.arrival.filter((l) => !listed.has(l.text))} />
        <Rules heading="What to wear" lines={visit.dress.filter((l) => !listed.has(l.text))} />
        <Rules heading="Food and re-entry" lines={visit.food.filter((l) => !listed.has(l.text))} />
        <Rules heading="Cancellations and refunds" lines={visit.cancellation} />
        <Rules heading="Good to know" lines={[...paymentNotes, ...otherNotes].filter((l) => !listed.has(l.text))} />

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

        <h3>Facilities</h3>
        {confirmedAmenities.length ? <p className="venue-muted">As stated by the venue.</p> : null}
        {confirmedAmenities.length ? null : <NotConfirmed>No amenities confirmed yet.</NotConfirmed>}
        {confirmedAmenities.length || view.checkWithVenue.length ? (
          <ul className="venue-amenities">
            {confirmedAmenities.map((a) => (
              <Amenity key={`${a.kind}-${a.label}`} a={a} />
            ))}
            {/* The things parents ask most that we're checking with the venue. */}
            {view.checkWithVenue.map((label) => (
              <li key={`ask-${label}`} className="venue-amenity is-asking">
                <span className="venue-amenity-label">{label}</span>
                <span className="venue-amenity-status">We&apos;re still asking the venue</span>
              </li>
            ))}
          </ul>
        ) : null}
        {unconfirmedList.length ? (
          <p className="venue-muted">
            Not confirmed yet: {unconfirmedList.map((a) => a.label.toLowerCase()).join(", ")}.
          </p>
        ) : null}
      </VenueSection>

      {view.parties.lines.length || view.parties.rules.length ? (
        <VenueSection id="parties" title="Birthday parties">
          {partyTeaser ? <p className="venue-lead">{partyTeaser}</p> : null}
          {view.parties.rows ? (
            <>
              <DayPriceTable rows={view.parties.rows} caption="Party prices by day" firstColumn="Party" />
              <p className="venue-muted">
                {plusTaxNote(view.parties.lines)} <Checked meta={view.parties.lines[0].meta} />
              </p>
            </>
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

      <VenueSection id="experience" title="What to expect">
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

      <VenueSection id="sources" title="How we checked this page">
        <ol className="venue-timeline">
          <li className="is-done">
            <strong>Read the venue&apos;s own pages</strong>
            <span>
              {view.sources.length} official {view.sources.length === 1 ? "page" : "pages"} · last checked {view.verification.lastChecked}
            </span>
          </li>
          <li className={visited ? "is-done" : "is-next"}>
            <strong>Compass family visit</strong>
            <span>{visited ? "Done: notes from our visit are below" : "Coming soon: our own photos and notes"}</span>
          </li>
        </ol>
        <p className="venue-lead">
          {view.verification.facts} official details checked · last checked {view.verification.lastChecked}
          {view.verification.conflicts
            ? ` · ${view.verification.conflicts} ${view.verification.conflicts === 1 ? "detail needs" : "details need"} reconfirming`
            : ""}
        </p>
        {view.conflicts.length ? (
          <div className="venue-notice venue-disagree">
            <p>
              <strong>When sources disagree, we show it.</strong> The venue&apos;s own pages disagree on:
            </p>
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
      </div>
      {bookCard ? <StickyBookBar>{bookCard}</StickyBookBar> : null}
    </article>
  );
}
