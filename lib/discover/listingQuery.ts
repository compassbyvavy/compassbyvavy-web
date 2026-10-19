/**
 * Search and filters for a Discover category page.
 * A Yes/No facet matches only that confirmed value. Unknown never matches.
 */

import type { CategoryPage } from "@/lib/discover/categoryPages";
import { placeKindLabel } from "@/lib/discover/categoryPages";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";

export type FacetChoice = "" | "yes" | "no";

export type DiscoverListingQuery = {
  q: string;
  placeKind: string;
  city: string;
  facets: Record<string, FacetChoice>;
};

export function emptyDiscoverQuery(page: CategoryPage): DiscoverListingQuery {
  const facets: Record<string, FacetChoice> = {};
  for (const facet of page.facets) facets[facet.id] = "";
  return { q: "", placeKind: "", city: "", facets };
}

export function parseDiscoverQuery(
  params: Pick<URLSearchParams, "get">,
  page: CategoryPage,
): DiscoverListingQuery {
  const query = emptyDiscoverQuery(page);
  query.q = params.get("q") ?? "";
  const kind = params.get("kind") ?? "";
  query.placeKind = page.placeKinds.some((option) => option.id === kind)
    ? kind
    : "";
  query.city = params.get("city") ?? "";
  for (const facet of page.facets) {
    const raw = params.get(facet.id);
    query.facets[facet.id] = raw === "yes" || raw === "no" ? raw : "";
  }
  return query;
}

export function buildDiscoverQueryHref(
  pathname: string,
  query: DiscoverListingQuery,
): string {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) params.set("q", q);
  if (query.placeKind) params.set("kind", query.placeKind);
  if (query.city) params.set("city", query.city);
  for (const [id, value] of Object.entries(query.facets)) {
    if (value === "yes" || value === "no") params.set(id, value);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function discoverQueryIsActive(query: DiscoverListingQuery): boolean {
  if (query.q.trim() || query.placeKind || query.city) return true;
  return Object.values(query.facets).some((value) => value === "yes" || value === "no");
}

function searchHaystack(listing: DiscoverPlaceListing, page: CategoryPage): string {
  const kind = placeKindLabel(page.slug, listing.extension.placeKind);
  return [
    listing.title,
    listing.summary,
    listing.providerName,
    listing.city,
    listing.neighbourhood,
    listing.areaLabel,
    listing.addressLine,
    listing.hoursSummary,
    listing.costSummary,
    kind,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLowerCase();
}

export function cityOptions(listings: readonly DiscoverPlaceListing[]): string[] {
  const cities = new Set<string>();
  for (const listing of listings) {
    const city = listing.city?.trim();
    if (city) cities.add(city);
  }
  return [...cities].sort((a, b) => a.localeCompare(b, "en"));
}

export function filterDiscoverListings(
  listings: readonly DiscoverPlaceListing[],
  query: DiscoverListingQuery,
  page: CategoryPage,
): DiscoverPlaceListing[] {
  const tokens = query.q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return listings
    .filter((listing) => {
      if (listing.category !== page.slug) return false;
      if (query.placeKind && listing.extension.placeKind !== query.placeKind) {
        return false;
      }
      if (query.city) {
        if ((listing.city ?? "").toLowerCase() !== query.city.toLowerCase()) {
          return false;
        }
      }
      for (const facet of page.facets) {
        const want = query.facets[facet.id];
        if (want !== "yes" && want !== "no") continue;
        if (facet.read(listing) !== want) return false;
      }
      if (tokens.length === 0) return true;
      const haystack = searchHaystack(listing, page);
      return tokens.every((token) => haystack.includes(token));
    })
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, "en"));
}
