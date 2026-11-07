import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ComingSoonCategory } from "@/components/discover/ComingSoonCategory";
import { DiscoverListingClient } from "@/components/discover/DiscoverListingClient";
import { listingsForCategoryFromCatalog } from "@/lib/discover/catalog";
import {
  DISCOVER_CATEGORIES,
  getDiscoverCategory,
} from "@/lib/discover/categories";
import { loadDiscoverExampleCatalogForRequest } from "@/lib/discover/discoverServerCatalog";
import { venueToDiscoverListing } from "@/lib/discover/venueListing";
import { VENUE_DEV_BANNER, loadCategoryVenues, venueIndexable } from "@/lib/discover/venuesCatalog";

// Published venues change without a rebuild, so this page renders per request.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return DISCOVER_CATEGORIES.filter((category) => category.slug !== "camps").map(
    (category) => ({ slug: category.slug }),
  );
}

/** Incoming Host header only — never X-Forwarded-Host. Null outside a request. */
async function requestHost(): Promise<string | null> {
  try {
    return (await headers()).get("host");
  } catch {
    return null;
  }
}

/**
 * Real venue listings for a category: published venues in production,
 * the preview catalog in development and gated previews. Only Play &
 * Entertainment has venue records so far.
 */
async function loadVenueListings(slug: string) {
  if (slug !== "play") return null;
  const catalog = await loadCategoryVenues({ categorySlug: slug, hostname: await requestHost() });
  if (!catalog) return null;
  const indexable = venueIndexable(catalog.sourceLabel);
  const listings = catalog.records.map((record) => venueToDiscoverListing(record, slug));
  return {
    // Preview listings (fixtures and drafts) carry the example banner, never the published look.
    listings: indexable
      ? listings
      : listings.map((listing) => ({ ...listing, verification: "example" as const, exampleNote: VENUE_DEV_BANNER })),
    indexable,
  };
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "camps") return { title: "Camps" };
  const category = getDiscoverCategory(slug);
  if (!category) return { title: "Discover" };
  const venues = await loadVenueListings(slug);
  if (venues) {
    return {
      title: `${category.title} in Mississauga`,
      description: category.blurb,
      robots: venues.indexable ? undefined : { index: false, follow: true },
    };
  }
  return {
    title: `${category.title} — coming soon`,
    description: `${category.blurb} Listings are not live yet.`,
    robots: { index: false, follow: true },
  };
}

export default async function DiscoverCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "camps") redirect("/camps");
  const category = getDiscoverCategory(slug);
  if (!category) notFound();

  const venues = await loadVenueListings(slug);
  if (venues) {
    return (
      <div className="container camps-listing-page">
        <Suspense fallback={<p className="camp-card-note">Loading listings…</p>}>
          <DiscoverListingClient slug={slug} listings={venues.listings} />
        </Suspense>
      </div>
    );
  }

  const catalog = await loadDiscoverExampleCatalogForRequest();
  const listings = listingsForCategoryFromCatalog(catalog, slug);
  if (!listings) return <ComingSoonCategory category={category} />;

  return (
    <div className="container camps-listing-page">
      <Suspense fallback={<p className="camp-card-note">Loading listings…</p>}>
        <DiscoverListingClient slug={slug} listings={listings} />
      </Suspense>
    </div>
  );
}
