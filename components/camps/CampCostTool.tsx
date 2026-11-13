"use client";

import { useId, useMemo, useState } from "react";
import { campCost, money, type CampOptionView } from "@/lib/camps/campPage";

/**
 * "What will it cost us?" — pick the option (full or half day), the days or
 * sessions, and how many children. Shows tax when the camp's price is plus HST.
 * Discounts the camp doesn't price (sibling codes) are never subtracted.
 */
export function CampCostTool({ options, initialKey }: { options: CampOptionView[]; initialKey?: string }) {
  const priced = options.filter((o) => o.price != null && o.units.length > 0);
  const [optionKey, setOptionKey] = useState(
    priced.some((o) => o.key === initialKey) ? initialKey! : (priced[0]?.key ?? ""),
  );
  const option = priced.find((o) => o.key === optionKey) ?? priced[0];
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(option ? option.units.map((u) => u.id) : []));
  const [children, setChildren] = useState(1);
  const id = useId();

  const cost = useMemo(
    () => (option ? campCost(option, option.units.filter((u) => chosen.has(u.id)).length, children) : null),
    [option, chosen, children],
  );
  if (!option) return null;

  const pickOption = (key: string) => {
    setOptionKey(key);
    const next = priced.find((o) => o.key === key);
    setChosen(new Set(next ? next.units.map((u) => u.id) : []));
  };
  const toggle = (unitId: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  const count = option.units.filter((u) => chosen.has(u.id)).length;
  const unitWord = option.perDay ? (count === 1 ? "day" : "days") : count === 1 ? "session" : "sessions";
  const siblingNote = option.feeNotes.find((n) => /sibling/i.test(n));

  return (
    <div className="camp-cost">
      <h3 className="camp-cost-title">What it costs for your family</h3>
      {priced.length > 1 ? (
        <fieldset className="camp-cost-field">
          <legend>Which camp day?</legend>
          <div className="camp-cost-choices">
            {priced.map((o) => (
              <label key={o.key} className={o.key === option.key ? "camp-choice is-on" : "camp-choice"}>
                <input
                  type="radio"
                  name={`${id}-option`}
                  value={o.key}
                  checked={o.key === option.key}
                  onChange={() => pickOption(o.key)}
                />
                <span>
                  {o.label}
                  <small>
                    {o.hours} · {o.priceText}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="camp-cost-field">
        <legend>{option.perDay ? "Which days?" : "Which sessions?"}</legend>
        <div className="camp-cost-days">
          {option.units.map((u) => (
            <label key={u.id} className={chosen.has(u.id) ? "camp-day is-on" : "camp-day"}>
              <input type="checkbox" checked={chosen.has(u.id)} onChange={() => toggle(u.id)} />
              <span>{u.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="camp-cost-field camp-cost-kids">
        <label htmlFor={`${id}-kids`}>Children</label>
        <div className="camp-stepper">
          <button type="button" aria-label="One fewer child" onClick={() => setChildren((n) => Math.max(1, n - 1))}>
            −
          </button>
          <input
            id={`${id}-kids`}
            inputMode="numeric"
            value={children}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ""));
              setChildren(Number.isFinite(n) && n > 0 ? Math.min(n, 9) : 1);
            }}
          />
          <button type="button" aria-label="One more child" onClick={() => setChildren((n) => Math.min(9, n + 1))}>
            +
          </button>
        </div>
      </div>

      <div className="camp-cost-result" aria-live="polite">
        {cost ? (
          <>
            <p className="camp-cost-line">
              {count} {unitWord} × {children} {children === 1 ? "child" : "children"} × {money(option.price!)}
              <span>{money(cost.subtotal)}</span>
            </p>
            {option.plusTax ? (
              <p className="camp-cost-line">
                HST (13%)<span>{money(cost.tax)}</span>
              </p>
            ) : null}
            <p className="camp-cost-total">
              Total<span>{money(cost.total)}</span>
            </p>
          </>
        ) : (
          <p className="venue-muted">Pick at least one {option.perDay ? "day" : "session"}.</p>
        )}
        {siblingNote ? <p className="venue-muted">{siblingNote} The discount isn&apos;t included above.</p> : null}
      </div>
    </div>
  );
}
