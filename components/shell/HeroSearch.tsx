"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationOption } from "@/lib/taxonomy/catalog";

const WHEN = [
  { label: "Any time", href: "" },
  { label: "This weekend", href: "/plan?view=weekend" },
  { label: "Winter break", href: "/camps/winter-break" },
  { label: "PA day", href: "/camps/pa-days" },
  { label: "March break", href: "/camps/march-break" },
  { label: "Summer", href: "/camps/summer" },
];

export function HeroSearch({ city, locations }: { city: string; locations: LocationOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [where, setWhere] = useState("");
  const [agesOpen, setAgesOpen] = useState(false);
  const [what, setWhat] = useState("");
  const matches = useMemo(() => {
    const needle = where.trim().toLowerCase();
    if (!needle) return locations.filter((item) => item.group !== "city").slice(0, 6);
    return locations.filter((item) => item.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [locations, where]);

  function chooseWhere(slug: string) {
    document.cookie = `compass_city=${slug}; path=/; max-age=31536000; samesite=lax`;
    setWhere("");
    router.push(slug === "ontario" ? "/discover" : `/${slug}/discover`);
  }

  function chooseWhen(href: string) {
    if (!href) return;
    router.push(href.startsWith("/camps") ? `/${city}${href}` : href);
  }

  return (
    <div className="hero-search">
      <button className="hero-search-open" type="button" onClick={() => setOpen(true)}>
        Search places, camps, classes
      </button>
      <div className={open ? "hero-fields open" : "hero-fields"}>
        <label>
          Where
          <input
            placeholder="City or region"
            value={where}
            onChange={(event) => setWhere(event.target.value)}
            aria-label="City or region"
          />
        </label>
        {where.trim() ? (
          <ul className="where-results">
            {matches.map((item) => (
              <li key={item.slug}>
                <button type="button" onClick={() => chooseWhere(item.slug)}>
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label>
          When
          <select aria-label="When" defaultValue="" onChange={(event) => chooseWhen(event.target.value)}>
            {WHEN.map((option) => (
              <option key={option.label} value={option.href}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="who-field">
          <span>Who</span>
          <button className="text-button" type="button" onClick={() => setAgesOpen((value) => !value)}>
            Add ages
          </button>
          {agesOpen ? (
            <div className="age-fields">
              <label>
                Age
                <input
                  inputMode="numeric"
                  aria-label="Child age"
                  onChange={(event) => window.localStorage.setItem("compass.age.1", event.target.value)}
                />
              </label>
              <p>Ages stay on this device. Nothing is filled in for you.</p>
            </div>
          ) : null}
        </div>
        <label>
          What
          <input
            placeholder="Search places, camps, classes"
            aria-label="Search places, camps, classes"
            value={what}
            onChange={(event) => setWhat(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const params = what.trim() ? `?q=${encodeURIComponent(what.trim())}` : "";
                router.push(`/${city}/discover${params}`);
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}
