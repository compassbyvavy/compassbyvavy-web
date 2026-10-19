"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AccessRow, AccessToggle, TransitStop } from "@/lib/access/overlays";
import { rowPassesToggles, stopsWithCoordinates } from "@/lib/access/overlays";

const TOGGLES: { id: AccessToggle; label: string }[] = [
  { id: "sensoryRoom", label: "Sensory room" },
  { id: "elevatorAccess", label: "Elevator" },
  { id: "lowStepAccess", label: "Low-step access" },
];

function badge(label: string, value: "yes" | "no" | "unknown") {
  if (value !== "yes") return null;
  return <span className="access-badge">{label}</span>;
}

export function AccessOverlays({
  rows,
  stops,
}: {
  rows: AccessRow[];
  stops: TransitStop[];
}) {
  const [on, setOn] = useState<AccessToggle[]>([]);
  const [transitOn, setTransitOn] = useState(false);
  const shown = useMemo(
    () => rows.filter((row) => rowPassesToggles(row, on)),
    [rows, on],
  );
  const plotted = stopsWithCoordinates(stops);

  return (
    <div className="access-page">
      <header>
        <p className="access-kicker">Discover</p>
        <h1>Sensory and transit access</h1>
        <p>
          A badge appears only when the record says yes. Unknown is not a no,
          and it is not access. There is no live elevator map.
        </p>
      </header>
      <div className="access-toggles" role="group" aria-label="Access filters">
        {TOGGLES.map((toggle) => {
          const active = on.includes(toggle.id);
          return (
            <button
              key={toggle.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setOn((current) =>
                  current.includes(toggle.id)
                    ? current.filter((id) => id !== toggle.id)
                    : [...current, toggle.id],
                )
              }
            >
              {toggle.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={transitOn}
          onClick={() => setTransitOn((current) => !current)}
        >
          Transit layer
        </button>
      </div>
      <ul className="access-list">
        {shown.map((row) => (
          <li key={row.programId}>
            <Link href={row.href}>{row.programName}</Link>
            <p>
              {row.providerName}
              {" · "}
              {row.lastVerifiedOn
                ? `Last verified ${row.lastVerifiedOn}`
                : "Last verified date unknown"}
            </p>
            <p>
              {badge("Sensory room", row.sensoryRoom)}
              {badge("Elevator", row.elevatorAccess)}
              {badge("Low-step", row.lowStepAccess)}
              {row.sensoryRoom !== "yes" &&
              row.elevatorAccess !== "yes" &&
              row.lowStepAccess !== "yes"
                ? "Access facts unknown"
                : null}
            </p>
          </li>
        ))}
      </ul>
      {transitOn ? (
        <section>
          <h2>Transit layer</h2>
          <p>
            Notes are shown only when a venue record includes one.
            {plotted.length === 0
              ? " No verified coordinates are on file, so nothing is plotted."
              : ` ${plotted.length} venue${plotted.length === 1 ? "" : "s"} can be placed from verified coordinates.`}
          </p>
          {stops.length === 0 ? (
            <p>No transit notes are verified.</p>
          ) : (
            <ul>
              {stops.map((stop) => (
                <li key={stop.venueId}>
                  <strong>{stop.venueName}</strong> — {stop.note}
                  {stop.latitude != null && stop.longitude != null
                    ? ` (${stop.latitude}, ${stop.longitude})`
                    : " · coordinates unknown"}
                  {stop.wheelchair === "yes" ? " · Wheelchair access verified" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
