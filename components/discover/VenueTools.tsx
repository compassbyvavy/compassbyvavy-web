"use client";

import { useId, useMemo, useState } from "react";
import {
  ageCheck,
  estimateFamilyCost,
  type CostEstimatorModel,
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

/** Family cost estimate from verified prices, with its assumptions shown. */
export function CostEstimator({ model }: { model: CostEstimatorModel }) {
  const id = useId();
  const [childLine, setChildLine] = useState(model.childOptions[0]?.id ?? "");
  const [children, setChildren] = useState(1);
  const [adultLine, setAdultLine] = useState(model.adultOptions[0]?.id ?? "");
  const [adults, setAdults] = useState(model.adultOptions.length ? 1 : 0);
  const total = estimateFamilyCost(model, {
    childLineId: childLine || null,
    children,
    adultLineId: adultLine || null,
    adults,
  });

  return (
    <div className="venue-tool">
      <h3>Family cost estimate</h3>
      <div className="venue-estimator-grid">
        <label className="venue-field" htmlFor={`${id}-child-line`}>
          <span>Child price</span>
          <select id={`${id}-child-line`} value={childLine} onChange={(e) => setChildLine(e.target.value)}>
            {model.childOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label} — {l.amount}
              </option>
            ))}
          </select>
        </label>
        <label className="venue-field" htmlFor={`${id}-children`}>
          <span>Children</span>
          <input
            id={`${id}-children`}
            type="number"
            min={0}
            max={10}
            value={children}
            onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        {model.adultOptions.length ? (
          <>
            <label className="venue-field" htmlFor={`${id}-adult-line`}>
              <span>Adult price</span>
              <select id={`${id}-adult-line`} value={adultLine} onChange={(e) => setAdultLine(e.target.value)}>
                {model.adultOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.amount}
                  </option>
                ))}
              </select>
            </label>
            <label className="venue-field" htmlFor={`${id}-adults`}>
              <span>Adults</span>
              <input
                id={`${id}-adults`}
                type="number"
                min={0}
                max={10}
                value={adults}
                onChange={(e) => setAdults(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          </>
        ) : null}
      </div>
      <p className="venue-estimate" aria-live="polite">
        {total === null ? "Choose a price for each person." : `Estimated total: $${total.toFixed(2)}`}
      </p>
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
