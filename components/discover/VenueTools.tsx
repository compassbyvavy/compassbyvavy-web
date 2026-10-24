"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { PriceDayType } from "@/data/discover/venueTypes";
import {
  DAY_LABELS,
  ageCheck,
  estimateFamilyCost,
  familyPrice,
  sessionPrice,
  type CostEstimatorModel,
  type FamilyPriceModel,
  type SessionPriceModel,
  type PriceLine,
  type VenueDetailView,
} from "@/lib/discover/venueDetail";

/**
 * A page section that folds away. Open on wide screens and closed on phones by
 * default (set per section), and opened when the address bar points at it.
 */
export function VenueSection({
  id,
  title,
  children,
  openOnPhone = false,
  openOnDesktop = true,
}: {
  id: string;
  title: string;
  children: ReactNode;
  openOnPhone?: boolean;
  openOnDesktop?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wide = window.matchMedia("(min-width: 760px)").matches;
    if ((wide ? openOnDesktop : openOnPhone) || window.location.hash === `#${id}`) el.open = true;
  }, [id, openOnDesktop, openOnPhone]);
  return (
    <details ref={ref} id={id} className="venue-section venue-collapsible">
      <summary>
        <h2 id={`${id}-h`}>{title}</h2>
        <span className="venue-chevron" aria-hidden="true" />
      </summary>
      <div className="venue-section-body">{children}</div>
    </details>
  );
}

/**
 * The family estimate from the price tool, shared with the booking card and the
 * phone booking bar so they show "your family" instead of the ticket range.
 * One page shows one venue, so a single module-level value is enough.
 */
export type FamilyEstimate = { total: number; withTax: number | null; summary: string };
let familyEstimate: FamilyEstimate | null = null;
const estimateListeners = new Set<() => void>();
function setFamilyEstimate(next: FamilyEstimate | null) {
  if (
    next === familyEstimate ||
    (next && familyEstimate && next.total === familyEstimate.total && next.withTax === familyEstimate.withTax && next.summary === familyEstimate.summary)
  )
    return;
  familyEstimate = next;
  estimateListeners.forEach((l) => l());
}
function subscribeEstimate(listener: () => void) {
  estimateListeners.add(listener);
  return () => estimateListeners.delete(listener);
}

/** Price line on the booking card: the family estimate once the tool has one, else the ticket range. */
export function BookCardPrice({ price, label }: { price: string | null; label: string }) {
  const estimate = useSyncExternalStore(subscribeEstimate, () => familyEstimate, () => null);
  if (estimate) {
    return (
      <div className="venue-book-price is-family">
        <p>
          ${estimate.total.toFixed(2)}
          <span>
            Your family<span className="venue-book-detail">: {estimate.summary}</span>
            {estimate.withTax !== null ? " · before tax" : ""}
          </span>
        </p>
        {estimate.withTax !== null ? <p className="venue-muted venue-book-detail">About ${estimate.withTax.toFixed(2)} with HST</p> : null}
      </div>
    );
  }
  if (!price) return null;
  return (
    <p className="venue-book-price">
      {price}
      <span>{label}</span>
    </p>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "What will it cost?" — enter each child's age, pick the day, see the matching tickets. */
export function FamilyPriceTool({ model }: { model: FamilyPriceModel }) {
  const id = useId();
  const [day, setDay] = useState<PriceDayType>(model.days[0]);
  const [ages, setAges] = useState<string[]>([""]);
  const [adults, setAdults] = useState(1);
  const [socks, setSocks] = useState(0);
  const parsed = ages
    .map((a) => (a.trim() === "" ? NaN : Number(a)))
    .filter((n) => Number.isFinite(n) && n >= 0 && n < 18);
  // Socks are for children; never count more pairs than children entered.
  const pairs = Math.min(socks, parsed.length);
  const result = familyPrice(model, { ages: parsed, adults, day, socks: pairs });

  // Share the estimate with the booking card. Skip it while any child has no
  // listed ticket, since the total would leave that child out.
  const shareTotal = parsed.length > 0 && result.unmatchedAges.length === 0 && result.bestTotal > 0 ? result.bestTotal : null;
  const shareTax = shareTotal !== null ? result.bestWithTax : null;
  const shareSummary =
    shareTotal !== null
      ? [
          plural(parsed.length, "child", "children"),
          plural(adults, "adult", "adults"),
          model.days.length > 1 ? DAY_LABELS[day].toLowerCase() : null,
        ]
          .filter(Boolean)
          .join(", ")
      : "";
  useEffect(() => {
    setFamilyEstimate(shareTotal !== null ? { total: shareTotal, withTax: shareTax, summary: shareSummary } : null);
  }, [shareTotal, shareTax, shareSummary]);
  useEffect(() => () => setFamilyEstimate(null), []);

  return (
    <div className="venue-tool venue-family-price">
      <h3>Your family: fit and price</h3>
      {model.days.length > 1 ? (
        <fieldset className="venue-day-toggle">
          <legend>When are you going?</legend>
          {model.days.map((d) => (
            <label key={d} className={d === day ? "is-selected" : undefined}>
              <input type="radio" name={`${id}-day`} value={d} checked={d === day} onChange={() => setDay(d)} />
              {DAY_LABELS[d]}
            </label>
          ))}
        </fieldset>
      ) : null}
      <div className="venue-age-inputs">
        {ages.map((value, i) => (
          <label key={i} htmlFor={`${id}-age-${i}`} className="venue-field">
            <span>Child {i + 1} age</span>
            <input
              id={`${id}-age-${i}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={17}
              placeholder="e.g. 5"
              value={value}
              onChange={(e) => setAges((list) => list.map((v, j) => (j === i ? e.target.value : v)))}
            />
          </label>
        ))}
        <label htmlFor={`${id}-adults`} className="venue-field">
          <span>Total adults going</span>
          <input
            id={`${id}-adults`}
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            value={adults}
            onChange={(e) => setAdults(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
          />
        </label>
        {ages.length < 6 ? (
          <button type="button" className="venue-text-btn" onClick={() => setAges((l) => [...l, ""])}>
            Add a child
          </button>
        ) : null}
      </div>
      <p className="venue-muted">
        Babies: enter 0 or 1.{model.adultsNote ? ` ${model.adultsNote}` : ""}
      </p>
      {model.socks && parsed.length > 0 ? (
        <div className="venue-stepper" role="group" aria-labelledby={`${id}-socks-label`}>
          <span id={`${id}-socks-label`}>Grip socks to buy there ({model.socks.amount} a pair)</span>
          <button type="button" aria-label="One fewer pair" onClick={() => setSocks((n) => Math.max(0, Math.min(n, parsed.length) - 1))} disabled={pairs === 0}>
            −
          </button>
          <output aria-live="polite">
            {pairs}
            <span className="venue-sr-only"> {pairs === 1 ? "pair" : "pairs"} of grip socks</span>
          </output>
          <button type="button" aria-label="One more pair" onClick={() => setSocks((n) => Math.min(parsed.length, n + 1))} disabled={socks >= parsed.length}>
            +
          </button>
        </div>
      ) : null}
      <div aria-live="polite">
        {parsed.length === 0 ? (
          <p className="venue-muted">Add each child&apos;s age above to see your price.</p>
        ) : (
          <>
            {model.bands.length ? (
              <ul className="venue-fit-list">
                {result.fit.map((f, i) => (
                  <li key={i}>
                    <strong>Age {f.age}:</strong> {f.fitLabel}
                    {f.note ? ` — ${f.note}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {result.better ? (
              <div className="venue-best">
                <p className="venue-best-title">Best deal: {result.better.label}</p>
                {result.better.includes ? <p>{result.better.includes}</p> : null}
                {result.socksSubtotal ? (
                  <ul className="venue-best-lines">
                    <li>
                      <span>{result.better.label}</span>
                      <span>${result.better.total.toFixed(2)}</span>
                    </li>
                    <li>
                      <span>
                        {result.socksPairs} {result.socksPairs === 1 ? "pair" : "pairs"} of grip socks
                      </span>
                      <span>${result.socksSubtotal.toFixed(2)}</span>
                    </li>
                  </ul>
                ) : null}
                <p className="venue-estimate">
                  {result.socksSubtotal ? "Subtotal: " : ""}${result.bestTotal.toFixed(2)}{" "}
                  <span className="venue-estimate-tax">before tax</span>
                </p>
                <p className="venue-save">You save ${result.better.saving.toFixed(2)} versus separate tickets</p>
              </div>
            ) : (
              <p className="venue-estimate">
                ${result.bestTotal.toFixed(2)} <span className="venue-estimate-tax">before tax</span>
              </p>
            )}
            {result.bestWithTax !== null ? (
              <p className="venue-muted">About ${result.bestWithTax.toFixed(2)} with 13% HST.</p>
            ) : null}
            {result.unmatchedAges.map((a) => (
              <p key={`u${a}`} className="venue-notice">
                No ticket is listed for age {a} on this day — check with the venue.
              </p>
            ))}
            <details className="venue-more">
              <summary>How we calculated this</summary>
              <ul className="venue-assumptions">
                {result.better ? <li>Separate tickets would be:</li> : null}
                {result.lines.map((l) => (
                  <li key={l.label}>
                    {l.quantity} × {l.label} at {l.unit} = ${l.subtotal.toFixed(2)}
                  </li>
                ))}
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
                {result.better ? (
                  <li>
                    {result.better.label}: {result.better.amount}
                    {result.better.total !== Number(result.better.amount.replace(/[^0-9.]/g, ""))
                      ? ` plus extra adults = $${result.better.total.toFixed(2)}`
                      : ""}
                    {result.socksSubtotal ? `, plus grip socks $${result.socksSubtotal.toFixed(2)}` : ""}
                  </li>
                ) : null}
                <li>Uses the venue&apos;s published prices only. Where two tickets fit an age, it uses the narrower one.</li>
              </ul>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

/** "What will it cost?" for a session venue: pick the session, the length and each child's age. */
export function SessionPriceTool({ model }: { model: SessionPriceModel }) {
  const id = useId();
  const [session, setSession] = useState(model.sessions[0].name);
  const current = model.sessions.find((s) => s.name === session) ?? model.sessions[0];
  const [minutes, setMinutes] = useState<number | null>(null);
  const [ages, setAges] = useState<string[]>([""]);
  const [adults, setAdults] = useState(1);
  const lengths = current.base.map((l) => l.durationMinutes).filter((m): m is number => typeof m === "number");
  const chosen = minutes !== null && lengths.includes(minutes) ? minutes : lengths[0] ?? null;
  const parsed = ages
    .map((a) => (a.trim() === "" ? NaN : Number(a)))
    .filter((n) => Number.isFinite(n) && n >= 0 && n < 18);
  const result = sessionPrice(model, { session: current.name, ages: parsed, adults, minutes: chosen });
  const withParent = current.attendance === "with_parent";
  const hoursLabel = (m: number) => (m % 60 === 0 ? `${m / 60} ${m === 60 ? "hour" : "hours"}` : `${m} minutes`);

  // Share the estimate with the booking card.
  const shareTotal = result.children > 0 && result.total > 0 ? result.total : null;
  const shareSummary =
    shareTotal !== null
      ? [
          current.name,
          lengths.length > 1 && chosen !== null ? hoursLabel(chosen) : null,
          plural(result.children, "child", "children"),
          withParent && current.extraAdult ? plural(adults, "adult", "adults") : null,
        ]
          .filter(Boolean)
          .join(", ")
      : "";
  const shareTax = shareTotal !== null ? result.withTax : null;
  useEffect(() => {
    setFamilyEstimate(shareTotal !== null ? { total: shareTotal, withTax: shareTax, summary: shareSummary } : null);
  }, [shareTotal, shareTax, shareSummary]);
  useEffect(() => () => setFamilyEstimate(null), []);

  return (
    <div className="venue-tool venue-family-price">
      <h3>Your family: what it costs</h3>
      {model.sessions.length > 1 ? (
        <fieldset className="venue-day-toggle">
          <legend>What are you booking?</legend>
          {model.sessions.map((s) => (
            <label key={s.name} className={s.name === current.name ? "is-selected" : undefined}>
              <input type="radio" name={`${id}-session`} value={s.name} checked={s.name === current.name} onChange={() => setSession(s.name)} />
              {s.name}
            </label>
          ))}
        </fieldset>
      ) : null}
      <p className="venue-muted">
        {withParent
          ? "You stay with your child for this session."
          : model.dropOffRule ?? "A drop-off session: you can leave your child with the staff."}
      </p>
      {lengths.length > 1 ? (
        <fieldset className="venue-day-toggle">
          <legend>How long?</legend>
          {lengths.map((m) => (
            <label key={m} className={m === chosen ? "is-selected" : undefined}>
              <input type="radio" name={`${id}-length`} value={m} checked={m === chosen} onChange={() => setMinutes(m)} />
              {hoursLabel(m)}
            </label>
          ))}
        </fieldset>
      ) : null}
      <div className="venue-age-inputs">
        {ages.map((value, i) => (
          <label key={i} htmlFor={`${id}-age-${i}`} className="venue-field">
            <span>Child {i + 1} age</span>
            <input
              id={`${id}-age-${i}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={17}
              placeholder="e.g. 3"
              value={value}
              onChange={(e) => setAges((list) => list.map((v, j) => (j === i ? e.target.value : v)))}
            />
          </label>
        ))}
        {withParent && current.extraAdult ? (
          <label htmlFor={`${id}-adults`} className="venue-field">
            <span>Total adults going</span>
            <input
              id={`${id}-adults`}
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              value={adults}
              onChange={(e) => setAdults(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
            />
          </label>
        ) : null}
        {ages.length < 6 ? (
          <button type="button" className="venue-text-btn" onClick={() => setAges((l) => [...l, ""])}>
            Add a child
          </button>
        ) : null}
      </div>
      <p className="venue-muted">For a child under 2, enter 0 or 1.</p>
      <div aria-live="polite">
        {parsed.length === 0 ? (
          <p className="venue-muted">Add each child&apos;s age above to see your price.</p>
        ) : (
          <>
            {result.notEligible.map((n) => (
              <p key={`n${n.age}`} className="venue-notice">
                Age {n.age}: {n.reason}, so they aren&apos;t included.
              </p>
            ))}
            {result.cautions.map((c) => (
              <p key={c} className="venue-muted">
                {c}
              </p>
            ))}
            {result.children > 0 ? (
              <>
                <ul className="venue-best-lines">
                  {result.lines.map((l) => (
                    <li key={l.label}>
                      <span>
                        {l.quantity} × {l.label}
                      </span>
                      <span>${l.subtotal.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <p className="venue-estimate">
                  ${result.total.toFixed(2)}{" "}
                  <span className="venue-estimate-tax">{result.withTax !== null ? "before tax" : "total"}</span>
                </p>
                {result.withTax !== null ? (
                  <p className="venue-muted">About ${result.withTax.toFixed(2)} with 13% HST.</p>
                ) : null}
                {result.notes.length ? (
                  <ul className="venue-assumptions">
                    {result.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                ) : null}
                {model.bundle && lengths.length > 1 ? (
                  <p className="venue-save">
                    Coming back? The {model.bundle.label} is {model.bundle.amount} for {model.bundle.hours} hours ($
                    {model.bundle.perHour.toFixed(2)} an hour)
                    {model.bundle.notes ? `: ${model.bundle.notes.split(" · ").slice(0, 2).join(", ").toLowerCase()}` : ""}.
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Before-you-go checklist parents can tick off, in groups. Ticks are kept on
 * this device for a day (browser storage), and the list works without it.
 */
export function VisitChecklist({
  groups,
  storageKey,
}: {
  groups: Array<{ heading: string; items: string[] }>;
  storageKey: string;
}) {
  const id = useId();
  const key = `compass:checklist:${storageKey}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      const saved = raw ? (JSON.parse(raw) as { at: number; done: Record<string, boolean> }) : null;
      if (saved && Date.now() - saved.at < 24 * 60 * 60 * 1000) setDone(saved.done);
    } catch {
      /* storage unavailable: ticks just aren't kept */
    }
  }, [key]);
  const toggle = (item: string, value: boolean) =>
    setDone((d) => {
      const next = { ...d, [item]: value };
      try {
        window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), done: next }));
      } catch {
        /* ignore */
      }
      return next;
    });
  return (
    <div className="venue-checklist-groups">
      {groups
        .filter((g) => g.items.length)
        .map((g, gi) => (
          <div key={g.heading}>
            <h3>{g.heading}</h3>
            <ul className="venue-tick-list">
              {g.items.map((item, i) => (
                <li key={item}>
                  <label htmlFor={`${id}-${gi}-${i}`}>
                    <input
                      id={`${id}-${gi}-${i}`}
                      type="checkbox"
                      checked={done[item] ?? false}
                      onChange={(e) => toggle(item, e.target.checked)}
                    />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

const TORONTO_WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** "Usual hours today: 4–8 pm" in Toronto time. Holidays can differ, so it says "usual". */
export function UsualHoursToday({ hours }: { hours: VenueDetailView["weeklyHours"] }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      weekday: "short",
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const weekday = TORONTO_WEEKDAY[get("weekday")];
    const today = hours.filter((h) => h.weekday === weekday).sort((a, b) => a.opensAt.localeCompare(b.opensAt));
    setText(
      today.length
        ? `Today: ${today.map((h) => `${clock(h.opensAt)}–${clock(h.closesAt)}`).join(", ")}`
        : "Closed today",
    );
  }, [hours]);
  if (!hours.length || !text) return null;
  return (
    <span className="venue-today">
      <strong>{text}</strong>
      <span className="venue-muted"> · Holiday and private-event hours may differ.</span>
    </span>
  );
}

/** Share icon: the device share sheet, or copy the link. */
export function ShareIconButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="venue-icon-btn"
      aria-label={copied ? "Link copied" : `Share ${title}`}
      title={copied ? "Link copied" : "Share"}
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) {
            await navigator.share({ title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          /* cancelled or blocked */
        }
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="M7 8l5-5 5 5" />
        <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
    </button>
  );
}

/**
 * The venue's video. YouTube loads only after a tap (privacy-enhanced
 * youtube-nocookie.com); a supplied video file plays with controls.
 */
export function VenueVideo({ video }: { video: NonNullable<VenueDetailView["video"]> }) {
  const [play, setPlay] = useState(false);
  if (video.kind === "file") {
    return (
      <figure className="venue-hero venue-video">
        <video src={video.src} controls playsInline preload="metadata" aria-label={video.title} />
      </figure>
    );
  }
  return (
    <figure className="venue-hero venue-video">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className="venue-video-play" onClick={() => setPlay(true)} aria-label={`Play video: ${video.title}`}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
          <span>Watch the video</span>
        </button>
      )}
    </figure>
  );
}

/** "Will this work for my kids?" — check each child's age against verified limits. */
export function AgeCheckTool({ tool }: { tool: VenueDetailView["ageTool"] }) {
  const id = useId();
  const [ages, setAges] = useState<string[]>([""]);
  const results = useMemo(
    () =>
      ages.map((raw) => {
        const n = Number(raw);
        return raw.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 120
          ? { age: Math.floor(n), result: ageCheck(tool, n) }
          : null;
      }),
    [ages, tool],
  );

  return (
    <div className="venue-tool">
      <h3>Will this work for my kids?</h3>
      <p className="venue-muted">
        Enter each child&apos;s age. We check it against the age limits this venue
        publishes — nothing more.
      </p>
      <div className="venue-age-inputs">
        {ages.map((value, i) => (
          <label key={i} htmlFor={`${id}-age-${i}`} className="venue-field">
            <span>Child {i + 1} age</span>
            <input
              id={`${id}-age-${i}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={17}
              value={value}
              onChange={(e) =>
                setAges((list) => list.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          </label>
        ))}
        {ages.length < 6 ? (
          <button type="button" className="venue-text-btn" onClick={() => setAges((l) => [...l, ""])}>
            Add a child
          </button>
        ) : null}
      </div>
      <div aria-live="polite">
        {results.map((r, i) =>
          r ? (
            <div key={i} className="venue-age-result">
              <p>
                <strong>Age {r.age}:</strong>{" "}
                {r.result.band ? `${r.result.band.label} — ${r.result.band.fitLabel}` : "No age band confirmed"}
                {r.result.band?.note ? ` (${r.result.band.note})` : ""}
              </p>
              {r.result.fits.length ? <p>Can use: {r.result.fits.join(", ")}</p> : null}
              {r.result.tooYoung.length ? <p>Too young for: {r.result.tooYoung.join(", ")}</p> : null}
              {r.result.tooOld.length ? <p>Too old for: {r.result.tooOld.join(", ")}</p> : null}
              {r.result.noAgeInfo.length ? (
                <p className="venue-muted">No published age limit: {r.result.noAgeInfo.join(", ")}</p>
              ) : null}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

function PersonGroup({
  id,
  label,
  options,
  count,
  setCount,
  lineId,
  setLineId,
}: {
  id: string;
  label: string;
  options: PriceLine[];
  count: number;
  setCount: (n: number) => void;
  lineId: string;
  setLineId: (id: string) => void;
}) {
  return (
    <>
      <label className="venue-field" htmlFor={`${id}-count`}>
        <span>{label}</span>
        <input
          id={`${id}-count`}
          type="number"
          min={0}
          max={10}
          value={count}
          onChange={(e) => setCount(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
        />
      </label>
      {options.length > 1 ? (
        <label className="venue-field" htmlFor={`${id}-line`}>
          <span>{label} price</span>
          <select id={`${id}-line`} value={lineId} onChange={(e) => setLineId(e.target.value)}>
            {options.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label} — {l.amount}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}

/** Family cost estimate from verified prices, with the prices used and assumptions shown. */
export function CostEstimator({ model }: { model: CostEstimatorModel }) {
  const id = useId();
  const [children, setChildren] = useState(1);
  const [childLine, setChildLine] = useState(model.childOptions[0]?.id ?? "");
  const [playing, setPlaying] = useState(0);
  const [playingLine, setPlayingLine] = useState(model.participatingAdultOptions[0]?.id ?? "");
  const [watching, setWatching] = useState(1);
  const [watchingLine, setWatchingLine] = useState(model.watchingAdultOptions[0]?.id ?? "");
  const estimate = estimateFamilyCost(model, {
    children,
    childLineId: childLine || null,
    participatingAdults: playing,
    participatingAdultLineId: playingLine || null,
    watchingAdults: watching,
    watchingAdultLineId: watchingLine || null,
  });

  return (
    <div className="venue-tool">
      <h3>Family cost estimate</h3>
      <div className="venue-estimator-grid">
        <PersonGroup id={`${id}-c`} label="Children" options={model.childOptions} count={children} setCount={setChildren} lineId={childLine} setLineId={setChildLine} />
        <PersonGroup id={`${id}-p`} label="Adults taking part" options={model.participatingAdultOptions} count={playing} setCount={setPlaying} lineId={playingLine} setLineId={setPlayingLine} />
        <PersonGroup id={`${id}-w`} label="Adults watching" options={model.watchingAdultOptions} count={watching} setCount={setWatching} lineId={watchingLine} setLineId={setWatchingLine} />
      </div>
      <div aria-live="polite">
        {estimate ? (
          <>
            <p className="venue-estimate">Estimated total: ${estimate.total.toFixed(2)}</p>
            {estimate.lines.length ? (
              <ul className="venue-assumptions">
                {estimate.lines.map((l) => (
                  <li key={l.label}>
                    {l.quantity} × {l.label} at {l.unit} = ${l.subtotal.toFixed(2)}
                  </li>
                ))}
              </ul>
            ) : null}
            {estimate.excluded.length ? (
              <p className="venue-muted">Not included: {estimate.excluded.join("; ")}.</p>
            ) : null}
          </>
        ) : (
          <p className="venue-estimate">Choose a price for each group.</p>
        )}
      </div>
      <h4>Assumptions</h4>
      <ul className="venue-assumptions">
        {model.assumptions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  );
}

/** Share this page using the device share sheet, or copy the link. */
export function ShareButton({ title }: { title: string }) {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <span className="venue-share">
      <button
        type="button"
        className="button button-secondary venue-share-btn"
        onClick={async () => {
          const url = window.location.href;
          try {
            if (navigator.share) {
              await navigator.share({ title, url });
              return;
            }
            await navigator.clipboard.writeText(url);
            setStatus("Link copied");
          } catch {
            setStatus("Couldn't share — copy the address from your browser");
          }
        }}
      >
        Share this page
      </button>
      <span className="venue-muted" role="status">
        {status}
      </span>
    </span>
  );
}

/**
 * The phone booking bar. It slides in only once the page's own Book button
 * has scrolled out of view, so two Book buttons never show at once.
 */
export function StickyBookBar({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const target = document.querySelector(".venue-header-actions");
    if (!target || typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(target);
    return () => io.disconnect();
  }, []);
  return (
    // inert (not just aria-hidden) so the hidden bar's link can't take focus either.
    <div className={show ? "venue-sticky-book is-shown" : "venue-sticky-book"} inert={!show}>
      {children}
    </div>
  );
}
