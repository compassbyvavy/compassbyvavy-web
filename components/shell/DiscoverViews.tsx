import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/shell/icons";
import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { BoardPicker } from "@/components/shell/BoardPicker";
import { WHAT_WE_CHECK } from "@/lib/shell/questions";
import {
  fillCity,
  isInSeason,
  livePlaceTypesFor,
  livePlaceTypesForCategory,
  orderForSeason,
  publicCategories,
  subcategoriesFor,
  type DiscoverCategory,
  type DiscoverSubcategory,
} from "@/lib/taxonomy/catalog";

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
  const placeTypes = livePlaceTypesForCategory(category.id);
  return (
    <article className="band">
      <div className="shell-wrap prose">
        <p className="kicker">
          <Link href={city === "ontario" ? "/discover" : `/${city}/discover`}>Discover</Link>
          {" · "}
          {cityName}
        </p>
        <h1>{fillCity(category.pageTitle, cityName)}</h1>
        <p className="lede">{category.cardCopy}</p>
        {when.length > 0 ? <ChipRow city={city} category={category.slug} label="When" rows={when} /> : null}
        {type.length > 0 ? <ChipRow city={city} category={category.slug} label="Type" rows={type} /> : null}
        {plain.length > 0 ? <ChipRow city={city} category={category.slug} rows={plain} /> : null}
        <p className="empty-note">
          We&apos;re checking {category.name} in {cityName} before listings go on Compass. Get a note when it opens.
        </p>
        <h2>What you&apos;ll find here</h2>
        <ul className="type-list">
          {placeTypes.map((row) => (
            <li key={row.id}>{row.name}</li>
          ))}
        </ul>
        <CheckList />
        <div id="notify">
          <h2>Notify me</h2>
          <WaitlistForm
            idPrefix={`notify-${category.slug}`}
            sourcePage={`/${city}/${category.slug}`}
            category={category.slug}
            city={cityName}
            buttonLabel="Notify me"
          />
        </div>
      </div>
    </article>
  );
}

export function SubcategoryView({
  city,
  cityName,
  category,
  subcategory,
}: {
  city: string;
  cityName: string;
  category: DiscoverCategory;
  subcategory: DiscoverSubcategory;
}) {
  const siblings = orderForSeason(subcategoriesFor(category.id));
  const types = livePlaceTypesFor(subcategory.id);
  const inSeason = isInSeason(subcategory.inSeasonMonths);
  return (
    <article className="band">
      <div className="shell-wrap prose">
        <p className="kicker">
          <Link href={`/${city}/${category.slug}`}>{category.name}</Link>
          {" · "}
          {cityName}
        </p>
        <h1>{fillCity(subcategory.pageTitle || subcategory.name, cityName)}</h1>
        <p className="lede">{subcategory.description}</p>
        {subcategory.inSeasonMonths ? (
          <p className="season-note">
            {inSeason ? "In season" : "Out of season"} · {subcategory.inSeasonMonths}
            {subcategory.seasonalOnly ? " · Seasonal" : ""}
          </p>
        ) : null}
        <ChipRow city={city} category={category.slug} rows={siblings} current={subcategory.slug} />
        {category.slug === "camps" && subcategory.slug === "pa-days" ? <BoardPicker /> : null}
        <p className="empty-note">
          {subcategory.name} in {cityName} are coming soon, each one checked by a parent.
        </p>
        <h2>What you&apos;ll find here</h2>
        {types.length > 0 ? (
          <ul className="type-list">
            {types.map((row) => (
              <li key={row.id}>{row.name}</li>
            ))}
          </ul>
        ) : (
          <p>Place types for this page are still being sorted.</p>
        )}
        <CheckList />
        <div id="notify">
          <h2>Notify me</h2>
          <WaitlistForm
            idPrefix={`notify-${subcategory.slug}`}
            sourcePage={`/${city}/${category.slug}/${subcategory.slug}`}
            category={category.slug}
            subcategory={subcategory.slug}
            city={cityName}
            buttonLabel="Notify me"
          />
        </div>
      </div>
    </article>
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
            {row.inSeasonMonths && !isInSeason(row.inSeasonMonths) ? <span> · {row.inSeasonMonths}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

function CheckList() {
  return (
    <>
      <h2>What we check</h2>
      <ul className="check-list">
        {WHAT_WE_CHECK.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
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
