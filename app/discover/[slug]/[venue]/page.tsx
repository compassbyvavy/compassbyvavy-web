import { notFound } from "next/navigation";
import { DiscoverDetail } from "@/components/discover/DiscoverDetail";
import { VenueDetail } from "@/components/discover/VenueDetail";
import { getExampleListing } from "@/lib/discover/catalog";
import { getDiscoverCategory } from "@/lib/discover/categories";
import { loadDiscoverExampleCatalogForRequest } from "@/lib/discover/discoverServerCatalog";
import {
  buildVenueDetailView,
  resolvePublicVenue,
} from "@/lib/discover/venueDetail";
import { VENUE_DEV_BANNER, loadVenueCatalog } from "@/lib/discover/venuesCatalog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; venue: string }>;
};

/** Today in Toronto (YYYY-MM-DD), used to hide expired offers and past programs. */
function torontoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function loadVenue(slug: string, venue: string) {
  const catalog = await loadVenueCatalog();
  if (!catalog) return null;
  const record = resolvePublicVenue(catalog.records, slug, venue);
  return record ? { record, catalog } : null;
}

/** Example Discover listing for this category, only when the preview gate is on. */
async function loadExampleListing(slug: string, listingSlug: string) {
  const catalog = await loadDiscoverExampleCatalogForRequest();
  if (!catalog) return null;
  const listing = getExampleListing(slug, listingSlug);
  return listing && listing.category === slug ? listing : null;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, venue } = await params;
  const found = await loadVenue(slug, venue);
  if (found) {
    const p = found.record.place;
    const name = p.branchName ? `${p.name} — ${p.branchName}` : p.name;
    return {
      title: found.record.cityName ? `${name}, ${found.record.cityName}` : name,
      description: p.description ?? undefined,
      robots: { index: false, follow: true },
    };
  }
  const listing = await loadExampleListing(slug, venue);
  if (listing) {
    const category = getDiscoverCategory(slug);
    return {
      title: `${listing.title} — ${category?.title ?? "Discover"} example`,
      description: listing.exampleNote ?? listing.summary ?? undefined,
      robots: { index: false, follow: true },
    };
  }
  return { title: "Not found", robots: { index: false } };
}

/**
 * One detail page per place: /discover/<category>/<slug>.
 * A published venue location wins; otherwise a gated example listing in the
 * same category is shown. Production without the review-preview dual gate
 * never renders examples. Unknown slug or wrong category → 404.
 */
export default async function DiscoverDetailPage({ params }: PageProps) {
  const { slug, venue } = await params;
  const found = await loadVenue(slug, venue);
  if (found) {
    const view = buildVenueDetailView(found.record, { today: torontoToday() });
    return (
      <div className="container venue-container">
        <VenueDetail
          view={view}
          banner={found.catalog.sourceLabel === "dev_fixtures" ? VENUE_DEV_BANNER : null}
        />
      </div>
    );
  }
  const listing = await loadExampleListing(slug, venue);
  if (!listing) notFound();
  return (
    <div className="container camps-listing-page">
      <DiscoverDetail listing={listing} />
    </div>
  );
}
