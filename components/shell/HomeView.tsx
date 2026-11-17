import Link from "next/link";
import { CategoryIcon } from "@/components/shell/icons";
import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { EverythingTabs } from "@/components/shell/EverythingTabs";
import { HeroSearch } from "@/components/shell/HeroSearch";
import { TRUST_LINES } from "@/lib/shell/questions";
import {
  orderForSeason,
  publicCategories,
  subcategoriesFor,
  type DiscoverCategory,
} from "@/lib/taxonomy/catalog";
import type { LocationOption } from "@/lib/taxonomy/catalog";

const BREAKS = [
  ["winter-break", "Winter break"],
  ["pa-days", "PA days"],
  ["march-break", "March break"],
  ["summer", "Summer"],
] as const;

export function HomeView({
  city,
  cityName,
  locations,
}: {
  city: string;
  cityName: string;
  locations: LocationOption[];
}) {
  const categories = publicCategories();
  return (
    <>
      <section className="hero">
        {/*
          Lake of Two Rivers, Algonquin Provincial Park, Ontario.
          Photo by Tony Webster, CC BY 2.0.
          https://www.flickr.com/photos/diversey/29648245373/
          https://creativecommons.org/licenses/by/2.0/
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hero-photo"
          src="/photos/algonquin-lake-of-two-rivers.jpg"
          alt="Autumn forest along Lake of Two Rivers in Algonquin Provincial Park, Ontario"
        />
        <div className="hero-copy shell-wrap">
          <h1>Less searching. More childhood adventures.</h1>
          <p>Family fun across Ontario, checked by a parent.</p>
          <HeroSearch city={city} locations={locations} />
          <p className="photo-credit">
            Lake of Two Rivers, Algonquin Provincial Park. Photo by Tony Webster,{" "}
            <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>.
          </p>
        </div>
      </section>

      <section className="band cream">
        <ul className="trust-strip">
          {TRUST_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="band">
        <div className="shell-wrap">
          <h2>Nine ways to spend a day</h2>
          <div className="icon-row">
            {categories.map((category) => (
              <Link key={category.id} className="icon-tile" href={`/${city}/${category.slug}`}>
                <span className="icon-tile-mark">
                  <CategoryIcon name={category.icon} camps={category.slug === "camps"} />
                </span>
                <strong>{category.name}</strong>
                <span>{category.editorial}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band cream">
        <div className="shell-wrap">
          <h2>Camps for every school break</h2>
          <div className="break-row">
            {BREAKS.map(([slug, name]) => (
              <Link key={slug} className="break-tile" href={`/${city}/camps/${slug}`}>
                <CategoryIcon name="Tent" camps size={32} />
                <strong>{name}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band forest">
        <div className="shell-wrap planner-band">
          <div>
            <p className="kicker">How Compass works</p>
            <h2>One place for the week, the weekend, and the school break.</h2>
            <ol className="steps">
              <li>Tell us your city and ages</li>
              <li>See what&apos;s on, already checked</li>
              <li>Save what you like and build the week</li>
            </ol>
            <Link className="button light" href="/plan">
              Try the planner
            </Link>
          </div>
          <aside className="example-card" aria-label="Example week">
            <p className="example-flag">Example</p>
            <ul>
              <li>Friday — PA day: camp needed</li>
              <li>Saturday — Swim lesson</li>
              <li>Sunday — Free: find ideas</li>
            </ul>
            <p>One day needs a plan.</p>
          </aside>
        </div>
      </section>

      <section className="band cream">
        <div className="shell-wrap founder">
          <h2>Built by a parent, for parents.</h2>
          <p>Vineeta, Ontario parent of two and founder.</p>
        </div>
      </section>

      <section className="band">
        <div className="shell-wrap">
          <h2>Guides and printables</h2>
          <Link className="guide-card" href="/guides/printables/space-mission-scavenger-hunt">
            <span className="kicker">Free printable · Ages 6–8</span>
            <strong>Space Mission Scavenger Hunt</strong>
            <span>40 clue chits, from the Sun to the edge of the universe.</span>
          </Link>
        </div>
      </section>

      <section className="band cream">
        <div className="shell-wrap check-row">
          <div>
            <h2>How we check</h2>
            <ul>
              <li>The facts come from the source.</li>
              <li>A missing fact stays unknown.</li>
              <li>Every listing shows when it was checked.</li>
            </ul>
            <Link className="text-link" href="/how-we-check">
              How we check
            </Link>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="shell-wrap">
          <div className="section-head">
            <h2>Everything on Compass</h2>
            <Link href="/everything">See everything</Link>
          </div>
          <EverythingTabs city={city} categories={tabData(categories)} />
        </div>
      </section>

      <section className="band cream">
        <div className="shell-wrap waitlist-band">
          <h2>Compass is opening soon.</h2>
          <p>We&apos;ll email you when it&apos;s ready. No spam, just one note.</p>
          <WaitlistForm idPrefix="home-waitlist" sourcePage="/" city={cityName} />
        </div>
      </section>
    </>
  );
}

function tabData(categories: DiscoverCategory[]) {
  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    subs: orderForSeason(subcategoriesFor(category.id)).map((row) => ({
      slug: row.slug,
      name: row.name,
    })),
  }));
}
