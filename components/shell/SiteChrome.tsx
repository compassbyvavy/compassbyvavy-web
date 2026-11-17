"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Heart, Menu, Search, X } from "lucide-react";
import type { LocationOption } from "@/lib/taxonomy/catalog";
import { readSaved, subscribeSaved } from "@/components/shell/saved";
import { WaitlistForm } from "@/components/shell/WaitlistForm";

export type SearchEntry = {
  name: string;
  kind: "category" | "subcategory";
  categorySlug: string;
  subcategorySlug?: string;
  parentName?: string;
};

export const MAIN_NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/plan", label: "Plan" },
  { href: "/guides", label: "Guides" },
  { href: "/shop", label: "Shop" },
  { href: "/account", label: "Account" },
];

const CITY_KEY = "compass_city";

function savedCount() {
  return readSaved().length;
}

export function SiteHeader({
  city,
  locations,
  entries,
}: {
  city: string;
  locations: LocationOption[];
  entries: SearchEntry[];
}) {
  const router = useRouter();
  const count = useSyncExternalStore(subscribeSaved, savedCount, () => 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  const cityName = locations.find((item) => item.slug === city)?.name ?? "All of Ontario";
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return entries
      .filter((entry) => entry.name.toLowerCase().includes(needle) || entry.parentName?.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [entries, query]);

  const cityMatches = useMemo(() => {
    const needle = cityQuery.trim().toLowerCase();
    const pool = needle
      ? locations.filter((item) => item.name.toLowerCase().includes(needle))
      : locations;
    return {
      all: pool.filter((item) => item.group === "all"),
      cities: pool.filter((item) => item.group === "city").slice(0, 8),
      regions: pool.filter((item) => item.group === "region").slice(0, 8),
    };
  }, [cityQuery, locations]);

  function hrefFor(entry: SearchEntry) {
    return entry.subcategorySlug
      ? `/${city}/${entry.categorySlug}/${entry.subcategorySlug}`
      : `/${city}/${entry.categorySlug}`;
  }

  function chooseCity(slug: string) {
    document.cookie = `${CITY_KEY}=${slug}; path=/; max-age=31536000; samesite=lax`;
    setCityOpen(false);
    setSearchOpen(false);
    const path = window.location.pathname;
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 0 && locations.some((item) => item.slug === parts[0])) {
      parts[0] = slug === "ontario" && parts.length === 1 ? "ontario" : slug;
      if (slug === "ontario" && parts[1] === "discover") {
        router.push("/discover");
      } else {
        router.push(`/${parts.join("/")}`);
      }
      return;
    }
    router.push(slug === "ontario" ? "/discover" : `/${slug}/discover`);
    router.refresh();
  }

  return (
    <header className="shell-header">
      <div className="shell-header-bar">
        <Link className="wordmark" href="/" aria-label="Compass by Vavy home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.svg" alt="" width={36} height={36} />
          <span>Compass by Vavy</span>
        </Link>

        <form className="header-search" role="search" action={`/${city}/discover`} onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor="header-search">
            Search places, camps, classes
          </label>
          <Search aria-hidden="true" size={18} />
          <input
            id="header-search"
            placeholder="Search places, camps, classes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          <button type="button" className="city-trigger" onClick={() => setCityOpen((open) => !open)} aria-expanded={cityOpen}>
            {cityName}
          </button>
          {query.trim().length >= 2 ? (
            <ul className="search-results">
              {results.length === 0 ? <li>No matching categories yet.</li> : null}
              {results.map((entry) => (
                <li key={`${entry.kind}-${entry.name}`}>
                  <Link href={hrefFor(entry)} onClick={() => setQuery("")}>
                    <strong>{entry.name}</strong>
                    <span>{entry.parentName ?? "Category"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </form>

        <nav className="header-nav" aria-label="Main">
          {MAIN_NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <button className="icon-button search-toggle" type="button" aria-label="Search" onClick={() => setSearchOpen(true)}>
            <Search aria-hidden="true" size={22} />
          </button>
          <Link className="icon-button" href="/plan/saved" aria-label={count ? `Saved, ${count}` : "Saved"}>
            <Heart aria-hidden="true" size={22} />
            {count > 0 ? <span className="count">{count}</span> : null}
          </Link>
          <Link className="button header-waitlist" href="/waitlist">
            Join the waitlist
          </Link>
          <button className="icon-button menu-toggle" type="button" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Menu aria-hidden="true" size={22} />
          </button>
        </div>
      </div>

      {cityOpen ? (
        <div className="city-panel">
          <label className="sr-only" htmlFor="city-filter">
            City or region
          </label>
          <input
            id="city-filter"
            placeholder="City or region"
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
          />
          <CityGroup label="Ontario" items={cityMatches.all} onChoose={chooseCity} />
          <CityGroup label="Cities" items={cityMatches.cities} onChoose={chooseCity} />
          <CityGroup label="Regions" items={cityMatches.regions} onChoose={chooseCity} />
        </div>
      ) : null}

      {searchOpen ? (
        <div className="overlay" role="dialog" aria-label="Search">
          <button className="icon-button overlay-close" type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}>
            <X aria-hidden="true" size={22} />
          </button>
          <label className="sr-only" htmlFor="overlay-search">
            Search places, camps, classes
          </label>
          <input
            id="overlay-search"
            autoFocus
            placeholder="Search places, camps, classes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul className="overlay-results">
            {results.map((entry) => (
              <li key={`${entry.kind}-${entry.categorySlug}-${entry.subcategorySlug ?? ""}`}>
                <Link href={hrefFor(entry)} onClick={() => setSearchOpen(false)}>
                  {entry.name}
                  <span>{entry.parentName ?? "Category"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {menuOpen ? (
        <div className="overlay menu-overlay" role="dialog" aria-label="Menu">
          <button className="icon-button overlay-close" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <X aria-hidden="true" size={22} />
          </button>
          <nav>
            {MAIN_NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link className="button" href="/waitlist" onClick={() => setMenuOpen(false)}>
            Join the waitlist
          </Link>
        </div>
      ) : null}
    </header>
  );
}

function CityGroup({
  label,
  items,
  onChoose,
}: {
  label: string;
  items: LocationOption[];
  onChoose: (slug: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="city-label">{label}</p>
      <ul>
        {items.map((item) => (
          <li key={item.slug}>
            <button type="button" onClick={() => onChoose(item.slug)}>
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ city, cityName }: { city: string; cityName: string }) {
  const categories = [
    ["camps", "Camps"],
    ["play-fun", "Play & Fun"],
    ["parks-nature", "Parks & Nature"],
    ["animals-farms", "Animals & Farms"],
    ["learning-culture", "Learning & Culture"],
    ["classes-programs", "Classes & Programs"],
    ["events", "Events"],
    ["food-treats", "Food & Treats"],
    ["day-trips-getaways", "Day Trips & Getaways"],
  ];
  return (
    <footer className="shell-footer">
      <div className="shell-wrap footer-grid">
        <div>
          <Link className="wordmark light" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.svg" alt="" width={32} height={32} />
            <span>Compass by Vavy</span>
          </Link>
          <p>Family fun across Ontario, checked by a parent.</p>
        </div>
        <FooterColumn title="Explore">
          <Link href="/discover">Discover</Link>
          <Link href="/plan">Plan</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/everything">Everything</Link>
        </FooterColumn>
        <FooterColumn title="Categories">
          {categories.map(([slug, name]) => (
            <Link key={slug} href={`/${city}/${slug}`}>
              {name}
            </Link>
          ))}
        </FooterColumn>
        <FooterColumn title="For camps">
          <Link href="/for-camps">List your camp</Link>
          <Link href="/for-camps#update">Update a listing</Link>
        </FooterColumn>
        <FooterColumn title="Compass">
          <Link href="/about">About</Link>
          <Link href="/how-we-check">How we check</Link>
          <a href="mailto:hello@compassbyvavy.ca">Contact</a>
        </FooterColumn>
        <FooterColumn title="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/accessibility">Accessibility</Link>
        </FooterColumn>
        <div>
          <p className="footer-heading">Newsletter</p>
          <WaitlistForm
            idPrefix="footer-news"
            sourcePage="newsletter"
            city={cityName}
            buttonLabel="Notify me"
            consentLabel="Email me when Compass opens."
            stacked
          />
          <a className="instagram" href="https://instagram.com/compassbyvavy">
            Instagram
          </a>
        </div>
      </div>
      <p className="copyright">© {new Date().getFullYear()} Compass by Vavy. Made in Ontario.</p>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="footer-heading">{title}</p>
      <div className="footer-links">{children}</div>
    </div>
  );
}
