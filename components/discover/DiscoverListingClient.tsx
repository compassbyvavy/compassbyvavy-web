"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DiscoverListingCard } from "@/components/discover/DiscoverListingCard";
import { getCategoryPage } from "@/lib/discover/categoryPages";
import { getDiscoverCategory } from "@/lib/discover/categories";
import {
  buildDiscoverQueryHref,
  cityOptions,
  discoverQueryIsActive,
  emptyDiscoverQuery,
  filterDiscoverListings,
  parseDiscoverQuery,
  type DiscoverListingQuery,
} from "@/lib/discover/listingQuery";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";

export function DiscoverListingClient({
  slug,
  listings,
}: {
  slug: string;
  listings: readonly DiscoverPlaceListing[];
}) {
  const page = getCategoryPage(slug);
  const category = getDiscoverCategory(slug);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo(
    () => (page ? parseDiscoverQuery(searchParams, page) : null),
    [page, searchParams],
  );

  const cities = useMemo(() => cityOptions(listings), [listings]);

  if (!page || !category || !query) return null;

  const results = filterDiscoverListings(listings, query, page);

  function commit(next: DiscoverListingQuery) {
    router.replace(buildDiscoverQueryHref(pathname, next), { scroll: false });
  }

  function setFacet(id: string, value: "" | "yes" | "no") {
    commit({ ...query!, facets: { ...query!.facets, [id]: value } });
  }

  return (
    <div className="discover-listing">
      <header className="camps-listing-intro">
        <p className="camps-listing-kicker">
          Discover · {category.icon} {category.title}
        </p>
        <h1>{category.title}</h1>
        <p className="camps-listing-lede">{page.lede}</p>
        <p className="camp-card-note">
          Camps stay on their own listing. A heart here and a heart on a camp
          go to the same saved list.
        </p>
      </header>

      <div className="discover-banner" role="note">
        {page.exampleBanner}
      </div>
      {page.governanceNote ? (
        <div className="discover-banner discover-banner-services" role="note">
          {page.governanceNote}
        </div>
      ) : null}
      <p className="camp-card-note">{page.trustNote}</p>

      <form
        className="discover-filters"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="camps-field">
          Search
          <input
            type="search"
            value={query.q}
            placeholder="Name, area, or kind"
            onChange={(event) => commit({ ...query, q: event.target.value })}
          />
        </label>

        <div className="camps-timing-chips" role="group" aria-label="Kind">
          <button
            type="button"
            className={query.placeKind === "" ? "camps-chip camps-chip-active" : "camps-chip"}
            onClick={() => commit({ ...query, placeKind: "" })}
          >
            All kinds
          </button>
          {page.placeKinds.map((kind) => (
            <button
              key={kind.id}
              type="button"
              className={
                query.placeKind === kind.id
                  ? "camps-chip camps-chip-active"
                  : "camps-chip"
              }
              onClick={() => commit({ ...query, placeKind: kind.id })}
            >
              {kind.label}
            </button>
          ))}
        </div>

        <div className="discover-filter-grid">
          <label className="camps-field">
            City
            <select
              value={query.city}
              onChange={(event) => commit({ ...query, city: event.target.value })}
            >
              <option value="">Any city</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          {page.facets.map((facet) => (
            <label className="camps-field" key={facet.id}>
              {facet.label}
              <select
                value={query.facets[facet.id] ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setFacet(facet.id, value === "yes" || value === "no" ? value : "");
                }}
              >
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          ))}
        </div>
        <p className="camps-field-hint">
          Yes and No only match a confirmed fact. Unknown stays Unknown and
          is not treated as a match.
        </p>
        {discoverQueryIsActive(query) ? (
          <button
            type="button"
            className="camps-text-btn"
            onClick={() => commit(emptyDiscoverQuery(page))}
          >
            Clear filters
          </button>
        ) : null}
      </form>

      <p className="camps-result-count">
        {results.length} example{results.length === 1 ? "" : "s"}
      </p>

      {results.length === 0 ? (
        <div className="camps-empty" role="status">
          <h2>{page.emptyTitle}</h2>
          <p>{page.emptyBody}</p>
        </div>
      ) : (
        <div className="discover-grid">
          {results.map((listing) => (
            <DiscoverListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
