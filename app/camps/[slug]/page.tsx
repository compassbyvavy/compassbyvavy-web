import { notFound } from "next/navigation";
import { CampPage } from "@/components/camps/CampPage";
import { CampListingPage } from "@/components/camps/pages/CampListingPage";
import { CookSmartWinterPage } from "@/components/camps/pages/CookSmartWinterPage";
import { buildCampPageView, torontoToday } from "@/lib/camps/campPage";
import { googleMapsBrowserKey, mapsEmbedUrl } from "@/lib/camps/campMap";
import { CampsCatalogUnavailable } from "@/components/camps/CampsCatalogUnavailable";
import { loadCampsCatalogStatusForRequest } from "@/lib/camps/campsServerCatalog";
import {
  formatCampsCatalogBanner,
  resolveCatalogProgramBySlug,
} from "@/lib/camps/catalog";
import { listingBySlug } from "@/lib/camps/pages/batch1";
import { COOKSMART_WINTER_SLUG } from "@/lib/camps/pages/cooksmartWinter";
import { approvalDate, editedSummary, isCampLive } from "@/lib/camps/pages/review";
import { readReviewState } from "@/lib/camps/pages/store";
import { buildCampListingPage } from "@/lib/camps/pages/view";
import "@/app/camps/listing.css";
import "@/app/camps/cooksmart-winter.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Camp program detail — Prompt 5.
 * Same catalog as listing (shared session truth). A failed read says so.
 * Unknown slug or an empty published catalog → 404. Never substitutes
 * another program.
 */
export default async function CampDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = listingBySlug(slug);
  if (listing) {
    const state = readReviewState();
    if (!isCampLive(state, listing.slug)) notFound();
    if (listing.slug === COOKSMART_WINTER_SLUG) {
      return <CookSmartWinterPage />;
    }
    const edited = editedSummary(state, listing.slug);
    const page = buildCampListingPage(listing, {
      today: torontoToday(),
      approvedOn: approvalDate(state, listing.slug),
      ...(edited === undefined ? {} : { summary: edited }),
    });
    return <CampListingPage page={page} />;
  }
  const result = await loadCampsCatalogStatusForRequest();
  if (result.status === "failed") {
    return <CampsCatalogUnavailable reason="failed" />;
  }
  const published =
    result.status === "ready"
      ? resolveCatalogProgramBySlug(result.catalog, slug)
      : null;
  if (!published || result.status !== "ready") {
    notFound();
  }
  const catalog = result.catalog;

  const banner = formatCampsCatalogBanner(catalog);

  const view = buildCampPageView({
    program: published.program,
    provider: published.provider,
    sessions: published.sessions,
    venuesById: published.venuesById,
  });

  const mapsKey = googleMapsBrowserKey();
  const mapEmbedUrl = mapsKey && view.mapQuery ? mapsEmbedUrl(mapsKey, view.mapQuery) : null;

  return (
    <div className="container camp-detail-page">
      <CampPage
        view={view}
        program={published.program}
        sessions={published.sessions}
        banner={banner}
        mapEmbedUrl={mapEmbedUrl}
      />
    </div>
  );
}
