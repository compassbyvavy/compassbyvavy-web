import { notFound } from "next/navigation";
import { VenueDetail } from "@/components/discover/VenueDetail";
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

export async function generateMetadata({ params }: PageProps) {
  const { slug, venue } = await params;
  const found = await loadVenue(slug, venue);
  if (!found) return { title: "Venue not found", robots: { index: false } };
  const p = found.record.place;
  const name = p.branchName ? `${p.name} — ${p.branchName}` : p.name;
  return {
    title: found.record.cityName ? `${name}, ${found.record.cityName}` : name,
    description: p.description ?? undefined,
    // Dev fixtures are never indexed.
    robots: { index: false, follow: true },
  };
}

/**
 * One page per venue location: /discover/<category>/<venue-slug>.
 * Unknown slug, wrong category, unpublished, unverified or closed → 404.
 * Never substitutes another branch.
 */
export default async function VenuePage({ params }: PageProps) {
  const { slug, venue } = await params;
  const found = await loadVenue(slug, venue);
  if (!found) notFound();
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
