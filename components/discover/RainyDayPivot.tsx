"use client";

import { useEffect, useState } from "react";
import {
  WEATHER_AREAS,
  WEATHER_AREA_STORAGE_KEY,
  buildForecastUrl,
  parseOpenMeteoPayload,
  type RegionalWeather,
} from "@/lib/weather/openMeteo";

export type RainyDayPivotProps = {
  pivot: boolean;
  onToggle: (next: boolean) => void;
  hiddenOutdoor: number;
  hiddenBecauseUnknown: number;
};

export function RainyDayPivot({
  pivot,
  onToggle,
  hiddenOutdoor,
  hiddenBecauseUnknown,
}: RainyDayPivotProps) {
  const [areaId, setAreaId] = useState(WEATHER_AREAS[0].id);
  const [report, setReport] = useState<RegionalWeather | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(WEATHER_AREA_STORAGE_KEY);
    if (stored && WEATHER_AREAS.some((area) => area.id === stored)) {
      setAreaId(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(WEATHER_AREA_STORAGE_KEY, areaId);
    const area = WEATHER_AREAS.find((item) => item.id === areaId) ?? WEATHER_AREAS[0];
    const controller = new AbortController();
    setError(null);
    fetch(buildForecastUrl(area), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("status");
        return response.json();
      })
      .then((payload) => {
        const parsed = parseOpenMeteoPayload(area.label, payload);
        if (!parsed) throw new Error("shape");
        setReport(parsed);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setReport(null);
        setError("Weather check unavailable. Listings are unchanged.");
      });
    return () => controller.abort();
  }, [areaId]);

  return (
    <section className="rainy-pivot" aria-label="Rainy day pivot">
      <div className="rainy-pivot-row">
        <button
          type="button"
          className={pivot ? "ages-badge is-on rainy-toggle" : "rainy-toggle"}
          aria-pressed={pivot}
          onClick={() => onToggle(!pivot)}
        >
          {pivot ? "Showing indoor alternatives" : "Rainy-day indoor pivot"}
        </button>
        <label>
          <span className="visually-hidden">Regional weather area</span>
          <select
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
          >
            {WEATHER_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {report ? (
        <p className="rainy-note" role="status">
          {report.areaLabel} was {report.phrase} at {report.observedAt}.
          {report.inclement
            ? " Wet weather is on the regional check — turn on the pivot to keep sessions with a verified indoor or indoor-fallback setting."
            : " This regional check is not a live badge on any camp."}
        </p>
      ) : (
        <p className="rainy-note" role="status">
          {error ?? "Checking the regional forecast…"}
        </p>
      )}
      {pivot ? (
        <p className="rainy-note">
          Outdoor sessions hidden: {hiddenOutdoor}. Setting not verified, so
          not swapped in: {hiddenBecauseUnknown}. A camp name that says indoor
          does not count.
        </p>
      ) : null}
    </section>
  );
}
