"use client";

import { useId, useState } from "react";
import { CampCostTool } from "@/components/camps/CampCostTool";
import type { CampOptionView } from "@/lib/camps/campPage";

/** "Spots available · checked Nov 11" → main + checked, so a shared check date is said once. */
export function splitChecked(text: string): { main: string; checked: string | null } {
  const m = text.match(/^(.*?)\s·\s(checked [^·]+?)(\s·\s.*)?$/);
  if (!m) return { main: text, checked: null };
  return { main: `${m[1]}${m[3] ?? ""}`, checked: m[2].trim() };
}

/**
 * Dates and prices: a Full day / Half day switch when the camp has more than
 * one option, then one row per date with its spots and a Book link. A check
 * date shared by every row is said once under the list.
 */
export function CampDatesPicker({
  options,
  providerName,
  withCost = false,
}: {
  options: CampOptionView[];
  providerName: string;
  /** Fold the cost tool under the dates, starting on the chosen option. */
  withCost?: boolean;
}) {
  const [active, setActive] = useState(options[0]?.key ?? "");
  const id = useId();
  const option = options.find((o) => o.key === active) ?? options[0];
  if (!option) return null;

  const rows = option.dates.map((d) => ({ ...d, ...splitChecked(d.spots.text) }));
  const checks = [...new Set(rows.map((r) => r.checked))];
  const sharedCheck = checks.length === 1 ? checks[0] : null;

  return (
    <div className="cp-dates">
      {options.length > 1 ? (
        <div className="cp-switch" role="tablist" aria-label="Camp day">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              role="tab"
              id={`${id}-${o.key}-tab`}
              aria-selected={o.key === option.key}
              aria-controls={`${id}-panel`}
              className={o.key === option.key ? "is-on" : undefined}
              onClick={() => setActive(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}

      <div id={`${id}-panel`} role={options.length > 1 ? "tabpanel" : undefined} aria-labelledby={options.length > 1 ? `${id}-${option.key}-tab` : undefined}>
        <p className="cp-option-line">
          {option.hours ? <span>{option.hours}</span> : null}
          {option.priceText ? (
            <span>
              <strong>{option.priceText}</strong>
              {option.withTaxText ? <span className="cp-muted"> ({option.withTaxText})</span> : null}
            </span>
          ) : (
            <span>Price: ask {providerName}</span>
          )}
        </p>

        <ul className="cp-date-list">
          {rows.map((r, i) => (
            <li key={`${r.text}-${i}`}>
              <span className="cp-date">{r.text}</span>
              <span className={`cp-spots is-${r.spots.tone}`}>
                {r.main}
                {!sharedCheck && r.checked ? <span className="cp-muted"> · {r.checked}</span> : null}
              </span>
              {r.bookUrl ? (
                <a className="cp-book-link" href={r.bookUrl} rel="noopener noreferrer" target="_blank" aria-label={`Book ${option.label.toLowerCase()} ${r.text} with ${providerName}`}>
                  Book
                </a>
              ) : null}
            </li>
          ))}
        </ul>

        <p className="cp-muted cp-small">
          {sharedCheck ? `Spots ${sharedCheck}. ` : ""}
          {option.perDay ? "Book any day on its own. " : ""}
          The camp&apos;s booking page always has the latest.
        </p>

        {option.feeNotes.length ? (
          <ul className="cp-notes">
            {option.feeNotes
              .filter((n) => !/pick only the days/i.test(n))
              .map((n) => (
                <li key={n}>{n}</li>
              ))}
          </ul>
        ) : null}
      </div>

      {withCost ? (
        <details className="cp-cost" id="cost">
          <summary>Work out the cost for your family</summary>
          <CampCostTool key={option.key} options={options} initialKey={option.key} />
        </details>
      ) : null}
    </div>
  );
}
