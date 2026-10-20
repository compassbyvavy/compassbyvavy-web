"use client";

import { useId, useMemo, useState } from "react";
import {
  ageCheck,
  estimateFamilyCost,
  type CostEstimatorModel,
  type PriceLine,
  type VenueDetailView,
} from "@/lib/discover/venueDetail";

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
