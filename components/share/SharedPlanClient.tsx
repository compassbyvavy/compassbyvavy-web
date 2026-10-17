"use client";

import { useEffect, useState } from "react";
import {
  eachPlanDate,
  openBuddyPlan,
  overlappingDates,
  readBuddyHash,
  type BuddyPlan,
} from "@/lib/share/campBuddies";

export function SharedPlanClient() {
  const [plan, setPlan] = useState<BuddyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parts = readBuddyHash(window.location.hash);
    if (!parts) {
      setError("This page needs the private fragment from a Camp Buddies link.");
      return;
    }
    openBuddyPlan(parts.data, parts.key)
      .then(setPlan)
      .catch(() => setError("This link could not be opened. Nothing was sent to a server."));
  }, []);

  if (error) return <p role="status">{error}</p>;
  if (!plan) return <p>Opening the private plan on this device…</p>;

  const overlaps = new Set(overlappingDates(plan.items));
  const dates = [...new Set(plan.items.flatMap((item) => eachPlanDate(item.startDate, item.endDate)))].sort();

  return (
    <div>
      <h1>Shared plan</h1>
      <p>Titles and dates only. No names and no addresses travelled with this link.</p>
      {dates.length === 0 ? (
        <p>No verified dates were included.</p>
      ) : (
        <ol>
          {dates.map((date) => (
            <li key={date}>
              <strong>{date}</strong>
              {overlaps.has(date) ? " · overlap" : ""}
              <ul>
                {plan.items
                  .filter((item) => eachPlanDate(item.startDate, item.endDate).includes(date))
                  .map((item) => (
                    <li key={item.id}>{item.title}</li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
