import Link from "next/link";
import { Car, ChevronDown, ClipboardCheck, Clock, Ticket, Users, Wallet } from "lucide-react";
import { CategoryIcon } from "@/components/shell/icons";
import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { BoardPicker } from "@/components/shell/BoardPicker";
import {
  orderForSeason,
  publicCategories,
  subcategoriesFor,
  type DiscoverCategory,
  type DiscoverSubcategory,
} from "@/lib/taxonomy/catalog";
import { COOKSMART_CHECKED_SO_FAR } from "@/lib/camps/pages/cooksmartWinter";
import { parentCopy } from "@/lib/voice/copy";

export function DiscoverHub({ city, cityName }: { city: string; cityName: string }) {
  return (
    <section className="band">
      <div className="shell-wrap">
        <p className="kicker">Discover</p>
        <h1>Everything to do with kids in {cityName}</h1>
        <p className="lede">Nine categories. Listings open as each place is checked.</p>
        <div className="category-grid">
          {publicCategories().map((category) => {
            const subs = orderForSeason(subcategoriesFor(category.id));
            return (
              <article key={category.id} className="category-card">
                <span className="icon-tile-mark">
                  <CategoryIcon name={category.icon} camps={category.slug === "camps"} />
                </span>
                <h2>{category.name}</h2>
                {category.editorial ? <p className="editorial">{category.editorial}</p> : null}
                <p className="card-copy">{category.cardCopy}</p>
                <SubcategoryList city={city} category={category} rows={subs} />
                {category.status === "live" ? (
                  <Link className="button" href={`/${city}/${category.slug}`}>
                    Browse
                  </Link>
                ) : (
                  <Link className="button outline" href={`/${city}/${category.slug}#notify`}>
                    Notify me
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SubcategoryList({
  city,
  category,
  rows,
}: {
  city: string;
  category: DiscoverCategory;
  rows: DiscoverSubcategory[];
}) {
  const shown = rows.slice(0, 6);
  const rest = rows.length - shown.length;
  return (
    <div className="sub-list">
      <ul>
        {shown.map((row) => (
          <li key={row.id}>
            <Link href={`/${city}/${category.slug}/${row.slug}`}>{row.name}</Link>
          </li>
        ))}
      </ul>
      {rest > 0 ? (
        <details className="sub-more">
          <summary>
            <span className="when-closed">+ {rest} more</span>
            <span className="when-open">Show less</span>
            <ChevronDown aria-hidden="true" size={16} strokeWidth={1.75} />
          </summary>
          <ul>
            {rows.slice(6).map((row) => (
              <li key={row.id}>
                <Link href={`/${city}/${category.slug}/${row.slug}`}>{row.name}</Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function CategoryView({
  city,
  cityName,
  category,
}: {
  city: string;
  cityName: string;
  category: DiscoverCategory;
}) {
  const subs = orderForSeason(subcategoriesFor(category.id));
  const when = subs.filter((row) => row.chipRow === "when");
  const type = subs.filter((row) => row.chipRow === "type");
  const plain = when.length + type.length === 0 ? subs : [];
  return (
    <article className="band">
      <div className="shell-wrap">
        <p className="kicker">
          <Link href={city === "ontario" ? "/discover" : `/${city}/discover`}>Discover</Link>
          {" · "}
          {cityName}
        </p>
        <h1>{category.name} in {cityName}</h1>
        <p className="lede">{category.cardCopy}</p>
        {when.length > 0 ? <ChipRow city={city} category={category.slug} label="When" rows={when} /> : null}
        {type.length > 0 ? <ChipRow city={city} category={category.slug} label="Type" rows={type} /> : null}
        {plain.length > 0 ? <ChipRow city={city} category={category.slug} rows={plain} /> : null}
        <NotifyBox
          idPrefix={`notify-${category.slug}`}
          sourcePage={`/${city}/${category.slug}`}
          name={category.name}
          cityName={cityName}
          categorySlug={category.slug}
        />
        <ul className="sub-cards">
          {subs.map((row) => (
            <li key={row.id}>
              <Link className="sub-card" href={`/${city}/${category.slug}/${row.slug}`}>
                <strong>{row.name}</strong>
                <span>{asSentence(row.description)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <CheckList />
      </div>
    </article>
  );
}

export function SubcategoryView({
  city,
  cityName,
  category,
  subcategory,
  showCooksmartCheckedSoFar = false,
}: {
  city: string;
  cityName: string;
  category: DiscoverCategory;
  subcategory: DiscoverSubcategory;
  /** Request-time: only true when COOKSMART is live and this is winter-break. */
  showCooksmartCheckedSoFar?: boolean;
}) {
  const siblings = orderForSeason(subcategoriesFor(category.id));
  return (
    <article className="band">
      <div className="shell-wrap">
        <p className="kicker">
          <Link href={`/${city}/${category.slug}`}>{category.name}</Link>
          {" · "}
          {cityName}
        </p>
        <h1>{subcategory.name} in {cityName}</h1>
        <p className="lede">{asSentence(subcategory.description)}</p>
        <ChipRow city={city} category={category.slug} rows={siblings} current={subcategory.slug} />
        {category.slug === "camps" && subcategory.slug === "pa-days" ? <BoardPicker /> : null}
        {showCooksmartCheckedSoFar ? <CheckedSoFarCooksmart /> : null}
        <NotifyBox
          idPrefix={`notify-${subcategory.slug}`}
          sourcePage={`/${city}/${category.slug}/${subcategory.slug}`}
          name={subcategory.name}
          cityName={cityName}
          categorySlug={category.slug}
          subcategorySlug={subcategory.slug}
        />
        <CheckList />
      </div>
    </article>
  );
}

function CheckedSoFarCooksmart() {
  const card = COOKSMART_CHECKED_SO_FAR;
  return (
    <div className="checked-so-far">
      <h2>{parentCopy.checkedSoFar}</h2>
      <ul className="sub-cards checked-so-far-cards">
        <li>
          <Link className="sub-card" href={card.href}>
            <strong>{card.title}</strong>
            <span>{card.placeLine}</span>
            <span>{card.agesDates}</span>
            <span>{card.priceLine}</span>
            <span>{card.verified}</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

function ChipRow({
  city,
  category,
  rows,
  label,
  current,
}: {
  city: string;
  category: string;
  rows: DiscoverSubcategory[];
  label?: string;
  current?: string;
}) {
  return (
    <div className="chip-block">
      {label ? <p className="chip-label">{label}</p> : null}
      <div className="chip-row">
        {rows.map((row) => (
          <Link
            key={row.id}
            className={row.slug === current ? "chip current" : "chip"}
            href={`/${city}/${category}/${row.slug}`}
            aria-current={row.slug === current ? "page" : undefined}
          >
            {row.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

const CHECKS = [
  { icon: Wallet, line: "Price for the family" },
  { icon: Users, line: "Ages" },
  { icon: Clock, line: "When it's open" },
  { icon: Ticket, line: "Book or drop in" },
  { icon: Car, line: "Getting there and parking" },
  { icon: ClipboardCheck, line: "Last checked, and how" },
] as const;

function asSentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function NotifyBox({
  idPrefix,
  sourcePage,
  name,
  cityName,
  categorySlug,
  subcategorySlug,
}: {
  idPrefix: string;
  sourcePage: string;
  name: string;
  cityName: string;
  categorySlug: string;
  subcategorySlug?: string;
}) {
  return (
    <div className="notify-box" id="notify">
      <h2>Get a note when {name} opens</h2>
      <p>We&apos;re checking {name} in {cityName} before listings go on Compass.</p>
      <WaitlistForm
        idPrefix={idPrefix}
        sourcePage={sourcePage}
        category={categorySlug}
        subcategory={subcategorySlug}
        city={cityName}
        buttonLabel="Notify me"
      />
    </div>
  );
}

function CheckList() {
  return (
    <div className="check-short">
      <h2>What we check</h2>
      <ul>
        {CHECKS.map((item) => (
          <li key={item.line}>
            <item.icon aria-hidden="true" size={18} strokeWidth={1.75} color="#33503E" />
            <span>{item.line}</span>
          </li>
        ))}
      </ul>
      <Link href="/how-we-check">See everything we check</Link>
    </div>
  );
}

export function EverythingDirectory({ city }: { city: string }) {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Everything on Compass</h1>
        <p className="lede">Every category and subcategory. Listings are not on yet.</p>
        {publicCategories().map((category) => (
          <div key={category.id}>
            <h2>
              <Link href={`/${city}/${category.slug}`}>{category.name}</Link>
            </h2>
            <ul className="type-list">
              {orderForSeason(subcategoriesFor(category.id)).map((row) => (
                <li key={row.id}>
                  <Link href={`/${city}/${category.slug}/${row.slug}`}>{row.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
