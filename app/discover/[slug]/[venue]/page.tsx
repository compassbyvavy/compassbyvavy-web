import { notFound } from "next/navigation";
import { DiscoverDetail } from "@/components/discover/DiscoverDetail";
import { VenueDetail } from "@/components/discover/VenueDetail";
import { getExampleListing } from "@/lib/discover/catalog";
import { getDiscoverCategory } from "@/lib/discover/categories";
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

/** Example Discover listing for this category, if the slug isn't a published venue. */
function loadExampleListing(slug: string, listingSlug: string) {
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
      // Dev fixtures are never indexed.
      robots: { index: false, follow: true },
    };
  }
  const listing = loadExampleListing(slug, venue);
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
 * A published venue location wins; otherwise an example listing in the same
 * category is shown. Unknown slug, wrong category, unpublished, unverified or
 * closed → 404. Never substitutes another branch or another category.
 *
 * Venue pages (plan-ready fields) and example listings (shared Discover
 * contract) share this one route because Next.js can't tell two dynamic
 * segments at the same level apart.
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
  const listing = loadExampleListing(slug, venue);
  if (!listing) notFound();
  return (
    <div className="container camps-listing-page">
      <DiscoverDetail listing={listing} />
    </div>
  );
}
