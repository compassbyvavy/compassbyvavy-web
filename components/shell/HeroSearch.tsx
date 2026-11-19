"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildHeroSearchHref } from "@/lib/shell/heroSearch";
import type { LocationOption } from "@/lib/taxonomy/catalog";

const WHEN = [
  { label: "Any time", href: "" },
  { label: "This weekend", href: "/plan?view=weekend" },
  { label: "Winter break", href: "/camps/winter-break" },
  { label: "PA day", href: "/camps/pa-days" },
  { label: "March break", href: "/camps/march-break" },
  { label: "Summer", href: "/camps/summer" },
];

const AGE_KEY = "compass.age.1";

export function HeroSearch({ city, locations }: { city: string; locations: LocationOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [where, setWhere] = useState("");
  const [chosenSlug, setChosenSlug] = useState<string | null>(null);
  const [agesOpen, setAgesOpen] = useState(false);
  const [ages, setAges] = useState("");
  const [what, setWhat] = useState("");
  const matches = useMemo(() => {
    const needle = where.trim().toLowerCase();
    if (!needle) return locations.filter((item) => item.group !== "city").slice(0, 6);
    return locations.filter((item) => item.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [locations, where]);

  useEffect(() => {
    const stored = window.localStorage.getItem(AGE_KEY);
    if (stored) setAges(stored);
  }, []);

  function citySlug(): string | null {
    if (chosenSlug) return chosenSlug;
    const needle = where.trim().toLowerCase();
    if (!needle) return city || null;
    const exact = locations.find((item) => item.name.toLowerCase() === needle);
    return exact?.slug ?? null;
  }

  function searchHref(): string {
    return buildHeroSearchHref({ citySlug: citySlug(), ages, words: what });
  }

  function rememberCity() {
    const slug = citySlug();
    if (!slug) return;
    document.cookie = `compass_city=${slug}; path=/; max-age=31536000; samesite=lax`;
  }

  function goSearch() {
    rememberCity();
    router.push(searchHref());
  }

  function chooseWhere(slug: string) {
    const item = locations.find((location) => location.slug === slug);
    setChosenSlug(slug);
    setWhere(item?.name ?? "");
  }

  function chooseWhen(href: string) {
    if (!href) return;
    router.push(href.startsWith("/camps") ? `/${city}${href}` : href);
  }

  function onAgesChange(value: string) {
    setAges(value);
    window.localStorage.setItem(AGE_KEY, value);
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
            onChange={(event) => {
              setWhere(event.target.value);
              setChosenSlug(null);
            }}
            aria-label="City or region"
          />
        </label>
        {where.trim() && !chosenSlug ? (
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
        <label>
          Who
          {agesOpen ? (
            <>
              <input
                inputMode="numeric"
                aria-label="Child age"
                placeholder="Add ages"
                value={ages}
                autoFocus
                onChange={(event) => onAgesChange(event.target.value)}
              />
              <p className="age-note">Ages stay on this device. Nothing is filled in for you.</p>
            </>
          ) : (
            <button className="hero-field-control" type="button" onClick={() => setAgesOpen(true)}>
              {ages.trim() ? ages : <span className="hero-placeholder">Add ages</span>}
            </button>
          )}
        </label>
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
                goSearch();
              }
            }}
          />
        </label>
        <Link className="button hero-search-submit" href={searchHref()} onClick={rememberCity}>
          Search
        </Link>
      </div>
    </div>
  );
}
