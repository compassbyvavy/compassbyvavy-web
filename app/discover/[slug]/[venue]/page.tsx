import { notFound } from "next/navigation";
import { VenueDetail } from "@/components/discover/VenueDetail";
import {
  buildVenueDetailView,
  resolvePublicVenue,
} from "@/lib/discover/venueDetail";
import {
  VENUE_DEV_BANNER,
  loadVenueCatalog,
  venueIndexable,
} from "@/lib/discover/venuesCatalog";

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
  const catalog = await loadVenueCatalog({ venueSlug: venue });
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
    // "Sky Zone — Mississauga", not "Sky Zone — Mississauga, Mississauga".
    title:
      found.record.cityName && found.record.cityName !== p.branchName
        ? `${name}, ${found.record.cityName}`
        : name,
    description: p.description ?? undefined,
    // Only records read from the published production catalog are indexed;
    // dev fixtures and dev previews never are. Not found / drafts 404 (noindex).
    robots: venueIndexable(found.catalog.sourceLabel)
      ? { index: true, follow: true }
      : { index: false, follow: false },
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
        banner={found.catalog.sourceLabel === "dev_preview" ? VENUE_DEV_BANNER : null}
      />
    </div>
  );
}
