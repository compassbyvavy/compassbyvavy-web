"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatActiveNetAvailabilityDisplay } from "@/lib/camps/availability/activenet/display";
import type { ActiveNetAvailabilitySnapshot } from "@/lib/camps/availability/activenet/types";

export type ActiveNetAvailabilityPanelProps = {
  candidateId: string;
  sessionId?: string;
  initialSnapshot?: ActiveNetAvailabilitySnapshot | null;
};

async function readSnapshot(
  candidateId: string,
  force: boolean,
  sessionId?: string,
): Promise<ActiveNetAvailabilitySnapshot> {
  const qs = force ? "?refresh=1" : "";
  const response = await fetch(
    sessionId
      ? `/api/camps/availability/activenet/session/${encodeURIComponent(sessionId)}${qs}`
      : `/api/camps/availability/activenet/${encodeURIComponent(candidateId)}${qs}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`availability_http_${response.status}`);
  }
  return (await response.json()) as ActiveNetAvailabilitySnapshot;
}

export function ActiveNetAvailabilityPanel({
  candidateId,
  sessionId,
  initialSnapshot = null,
}: ActiveNetAvailabilityPanelProps) {
  const [snapshot, setSnapshot] = useState<ActiveNetAvailabilitySnapshot | null>(
    initialSnapshot,
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [requestError, setRequestError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(
    async (force: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      try {
        const next = await readSnapshot(candidateId, force, sessionId);
        setSnapshot(next);
        setRequestError(null);
      } catch {
        setRequestError("Availability could not be refreshed from Compass.");
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [candidateId, sessionId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    setSnapshot(initialSnapshot);
    setRequestError(null);
  }, [sessionId, initialSnapshot]);

  const refreshMs = snapshot?.refreshIntervalMs ?? 60_000;
  // Poll only while the page is visible: a hidden tab never asks the City.
  // Coming back to the tab refreshes straight away (the server reuses any
  // reading still within the refresh interval).
  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const id = window.setInterval(() => {
      if (visible()) void load(false);
    }, refreshMs);
    const onVisibilityChange = () => {
      if (visible()) void load(false);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load, refreshMs]);

  const copy = snapshot ? formatActiveNetAvailabilityDisplay(snapshot) : null;

  return (
    <section
      className="activenet-availability"
      aria-labelledby="activenet-availability-heading"
      data-candidate-id={candidateId}
      data-session-id={sessionId}
      data-freshness={snapshot?.freshness ?? "unavailable"}
    >
      <div className="activenet-availability-head">
        <h3 id="activenet-availability-heading">City of Mississauga availability</h3>
        <button
          type="button"
          className="activenet-availability-refresh"
          onClick={() => void load(true)}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {copy?.liveLabel ? (
        <p className="activenet-availability-live">{copy.liveLabel}</p>
      ) : null}
      <p className="activenet-availability-headline" role="status">
        {copy?.headline ?? "Checking availability with the City of Mississauga…"}
      </p>
      {copy?.timestampLabel ? (
        <p className="activenet-availability-time">{copy.timestampLabel}</p>
      ) : loading ? null : (
        <p className="activenet-availability-time">
          Retrieval time unavailable — not confirmed current
        </p>
      )}
      {requestError ? (
        <p className="camp-card-note" role="status">
          {requestError}
        </p>
      ) : null}
      <p className="camp-card-note">
        Public activity number {snapshot?.activityNumber ?? "—"}. Compass reads
        openings from the city site; a seat is not guaranteed.
      </p>
      {copy?.ctaText && copy.ctaHref ? (
        <p className="activenet-availability-cta">
          <a
            className="camp-card-cta"
            href={copy.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            data-shortlist-outbound="true"
          >
            {copy.ctaText}
          </a>
        </p>
      ) : null}
    </section>
  );
}
