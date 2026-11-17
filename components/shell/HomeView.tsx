import Link from "next/link";
import { headers } from "next/headers";
import { AlertTriangle, ArrowRight, CalendarCheck, CalendarDays, Check, CircleHelp, Heart, MapPin, Sparkles } from "lucide-react";
import { CategoryIcon } from "@/components/shell/icons";
import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { EverythingTabs } from "@/components/shell/EverythingTabs";
import { HeroSearch } from "@/components/shell/HeroSearch";
import { PrintableCard } from "@/components/shell/PrintableCard";
import { founderNoteVisibility } from "@/lib/shell/founderNote";
import { TRUST_LINES } from "@/lib/shell/questions";
import {
  orderForSeason,
  publicCategories,
  subcategoriesFor,
  type DiscoverCategory,
} from "@/lib/taxonomy/catalog";
import type { LocationOption } from "@/lib/taxonomy/catalog";

const BREAKS = [
  { slug: "winter-break", name: "Winter break", copy: "Holiday camps" },
  { slug: "pa-days", name: "PA days", copy: "Matched to your school board" },
  { slug: "march-break", name: "March break", copy: "Spring break camps" },
  { slug: "summer", name: "Summer", copy: "Day camps all summer" },
] as const;

const TRUST = [
  { icon: Check, line: TRUST_LINES[0] },
  { icon: CalendarDays, line: TRUST_LINES[1] },
  { icon: Heart, line: TRUST_LINES[2] },
] as const;

export async function HomeView({
  city,
  cityName,
  locations,
}: {
  city: string;
  cityName: string;
  locations: LocationOption[];
}) {
  const categories = publicCategories();
  const host = (await headers()).get("host");
  const founder = founderNoteVisibility(host);
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
        </div>
        <p className="photo-credit">
          Lake of Two Rivers, Algonquin Provincial Park. Photo by Tony Webster,{" "}
          <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>.
        </p>
      </section>

      <section className="band cream trust-band">
        <ul className="trust-strip">
          {TRUST.map(({ icon: Icon, line }) => (
            <li key={line}>
              <Icon aria-hidden="true" size={18} strokeWidth={1.75} color="#33503E" />
              <span>{line}</span>
            </li>
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
                  <CategoryIcon name={category.icon} camps={category.slug === "camps"} size={26} />
                </span>
                <span className="tile-text">
                  <strong>{category.name}</strong>
                  <span className="tile-copy">{category.editorial}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band cream">
        <div className="shell-wrap">
          <h2>Camps for every school break</h2>
          <div className="break-row">
            {BREAKS.map((item) => (
              <Link key={item.slug} className="break-tile" href={`/${city}/camps/${item.slug}`}>
                <CategoryIcon name="Tent" camps size={28} />
                <span className="tile-text">
                  <strong>{item.name}</strong>
                  <span className="tile-copy">{item.copy}</span>
                </span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.75} color="#33503E" />
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
              <li>
                <span className="step-num">1</span>
                <span>
                  <strong>Discover</strong>
                  Find places and camps that fit your kids
                </span>
              </li>
              <li>
                <span className="step-num">2</span>
                <span>
                  <strong>Save</strong>
                  Heart anything; it waits for you
                </span>
              </li>
              <li>
                <span className="step-num">3</span>
                <span>
                  <strong>Plan</strong>
                  See your week and fill free time in one tap
                </span>
              </li>
            </ol>
            <Link className="button light" href="/plan">
              Try the planner
            </Link>
          </div>
          <aside className="example-card" aria-label="Example week">
            <p className="example-flag">Example</p>
            <ul>
              <li>
                <strong>Fri</strong>
                <span className="day-status alert">
                  <AlertTriangle aria-hidden="true" size={16} strokeWidth={1.75} color="#8A4A1E" />
                  PA day — camp needed
                </span>
              </li>
              <li>
                <strong>Sat</strong>
                <span className="day-status">
                  <Check aria-hidden="true" size={16} strokeWidth={1.75} color="#33503E" />
                  Swim lesson · 9:00 AM
                </span>
              </li>
              <li>
                <strong>Sun</strong>
                <span className="day-status">
                  <Sparkles aria-hidden="true" size={16} strokeWidth={1.75} color="#8A6410" />
                  Free day — find ideas
                </span>
              </li>
            </ul>
            <p>One day needs a plan.</p>
          </aside>
        </div>
      </section>

      {founder === "placeholder" ? (
        <section className="band cream" aria-label="Founder note placeholder">
          <div className="shell-wrap founder">
            <p className="kicker">Preview only · not for publication</p>
            <h2>Founder note</h2>
            <p className="placeholder-note">
              Placeholder. Vineeta has not added her note or photo. This is not her writing, and this section is hidden on the live site until she provides both.
            </p>
          </div>
        </section>
      ) : null}

      <section className="band">
        <div className="shell-wrap">
          <h2>For the parenting learning curve</h2>
          <PrintableCard />
        </div>
      </section>

      <section className="band cream">
        <div className="shell-wrap">
          <h2>What &apos;checked&apos; means on Compass</h2>
          <ul className="check-meanings">
            <li>
              <MapPin aria-hidden="true" size={22} strokeWidth={1.75} color="#33503E" />
              <p>
                <strong>Vavy-checked:</strong> Vineeta visited in person, with the visit date.
              </p>
            </li>
            <li>
              <CalendarCheck aria-hidden="true" size={22} strokeWidth={1.75} color="#33503E" />
              <p>
                <strong>Verified [date]:</strong> details confirmed with the venue by phone, email or its website.
              </p>
            </li>
            <li>
              <CircleHelp aria-hidden="true" size={22} strokeWidth={1.75} color="#33503E" />
              <p>
                <strong>Not confirmed yet:</strong> if we don&apos;t know, we say so. We never guess.
              </p>
            </li>
          </ul>
          <Link className="button outline" href="/how-we-check">
            How we check places
          </Link>
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
