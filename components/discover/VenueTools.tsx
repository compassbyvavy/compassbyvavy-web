"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { PriceDayType } from "@/data/discover/venueTypes";
import {
  DAY_LABELS,
  ageCheck,
  estimateFamilyCost,
  familyPrice,
  type CostEstimatorModel,
  type FamilyPriceModel,
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

/** "What will it cost?" — enter each child's age, pick the day, see the matching tickets. */
export function FamilyPriceTool({ model }: { model: FamilyPriceModel }) {
  const id = useId();
  const [day, setDay] = useState<PriceDayType>(model.days[0]);
  const [ages, setAges] = useState<string[]>([""]);
  const [adults, setAdults] = useState(1);
  const [buySocks, setBuySocks] = useState(false);
  const parsed = ages
    .map((a) => (a.trim() === "" ? NaN : Number(a)))
    .filter((n) => Number.isFinite(n) && n >= 0 && n < 18);
  const result = familyPrice(model, { ages: parsed, adults, day, buySocks });

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
      {model.socks ? (
        <label className="venue-check" htmlFor={`${id}-socks`}>
          <input id={`${id}-socks`} type="checkbox" checked={buySocks} onChange={(e) => setBuySocks(e.target.checked)} />
          <span>Buying grip socks there ({model.socks.amount} a pair)</span>
        </label>
      ) : null}
      <div aria-live="polite">
        {parsed.length === 0 ? (
          <p className="venue-estimate">Enter your children&apos;s ages.</p>
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
                <p className="venue-estimate">
                  ${result.bestTotal.toFixed(2)} <span className="venue-estimate-tax">before tax</span>
                </p>
                <p className="venue-save">You save ${result.better.saving.toFixed(2)} on separate tickets</p>
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
      aria-label={copied ? "Link copied" : "Share this page"}
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
