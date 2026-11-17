"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getSavedServerSnapshot, readSaved, subscribeSaved } from "@/components/shell/saved";
import { WaitlistForm } from "@/components/shell/WaitlistForm";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EXAMPLE: Record<string, string> = {
  Fri: "PA day: camp needed",
  Sat: "Swim lesson",
  Sun: "Free: find ideas",
};

export function PlanPreview({ view, cityName }: { view: string; cityName: string }) {
  const mode = ["month", "week", "weekend", "day"].includes(view) ? view : "week";
  return (
    <section className="band">
      <div className="shell-wrap">
        <p className="kicker">Plan</p>
        <h1>Your week, in one place</h1>
        <div className="view-switch" role="tablist" aria-label="Planner view">
          {["month", "week", "weekend", "day"].map((item) => (
            <Link key={item} href={`/plan?view=${item}`} aria-current={item === mode ? "page" : undefined}>
              {item[0].toUpperCase() + item.slice(1)}
            </Link>
          ))}
        </div>
        <div className="plan-layout">
          <div>
            <p className="example-flag">Example</p>
            {mode === "month" ? <MonthGrid /> : null}
            {mode === "week" ? <WeekGrid /> : null}
            {mode === "weekend" ? <WeekendGrid /> : null}
            {mode === "day" ? <DayCard /> : null}
            <p className="empty-note">These labels are an example. Nothing here is a real listing.</p>
          </div>
          <SavedShelf />
        </div>
        <div className="waitlist-band">
          <h2>Get a note when planning opens</h2>
          <WaitlistForm idPrefix="plan-waitlist" sourcePage="/plan" city={cityName} />
        </div>
      </div>
    </section>
  );
}

function WeekGrid() {
  return (
    <ol className="week-grid">
      {DAYS.map((day) => (
        <li key={day}>
          <strong>{day}</strong>
          <span>{EXAMPLE[day] ?? "Open"}</span>
        </li>
      ))}
    </ol>
  );
}

function WeekendGrid() {
  return (
    <ol className="week-grid weekend">
      {["Sat", "Sun"].map((day) => (
        <li key={day}>
          <strong>{day}</strong>
          <span>{EXAMPLE[day]}</span>
        </li>
      ))}
    </ol>
  );
}

function DayCard() {
  return (
    <div className="day-card">
      <strong>Friday</strong>
      <span>PA day: camp needed</span>
    </div>
  );
}

function MonthGrid() {
  const cells = Array.from({ length: 28 }, (_, index) => index + 1);
  return (
    <ol className="month-grid">
      {cells.map((day) => (
        <li key={day}>
          <strong>{day}</strong>
          {day === 6 ? <span>PA day: camp needed</span> : null}
          {day === 7 ? <span>Swim lesson</span> : null}
          {day === 8 ? <span>Free: find ideas</span> : null}
        </li>
      ))}
    </ol>
  );
}

export function SavedShelf() {
  const items = useSyncExternalStore(subscribeSaved, readSaved, getSavedServerSnapshot);
  return (
    <aside className="saved-shelf" aria-label="Saved">
      <h2>Saved</h2>
      {items.length === 0 ? (
        <p>Tap the heart on anything you like. It stays here, on this device, until you&apos;re ready to plan.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href}>{item.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export function SavedPage({ cityName }: { cityName: string }) {
  return (
    <section className="band">
      <div className="shell-wrap">
        <h1>Saved</h1>
        <SavedShelf />
        <WaitlistForm idPrefix="saved-waitlist" sourcePage="/plan/saved" city={cityName} buttonLabel="Notify me" />
      </div>
    </section>
  );
}
