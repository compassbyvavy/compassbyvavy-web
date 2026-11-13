import { Suspense } from "react";
import { CampsCatalogUnavailable } from "@/components/camps/CampsCatalogUnavailable";
import { CampsWithRainyDay } from "@/components/camps/CampsWithRainyDay";
import { loadCampsCatalogStatusForRequest } from "@/lib/camps/campsServerCatalog";
import { formatCampsCatalogBanner } from "@/lib/camps/catalog";
import { googleMapsBrowserKey, googleMapsMapId } from "@/lib/camps/campMap";

export const dynamic = "force-dynamic";

/**
 * Public Camps listing.
 *
 * Shared catalog layer: non-production uses gated real-dev + fixtures.
 * Production reads published rows. A failed read is not an empty list.
 */
export default async function CampsListingPage() {
  const result = await loadCampsCatalogStatusForRequest();

  if (result.status !== "ready") {
    return <CampsCatalogUnavailable reason={result.status} />;
  }

  const catalog = result.catalog;

  return (
    <div className="container camps-listing-page">
      <nav className="camps-tools" aria-label="Camp planning tools">
        <span className="camps-tools-label">Planning tools</span>
        <a href="/calendar">School PA days</a>
        <a href="/discover/ages">Sibling age check</a>
        <a href="/discover/access">Sensory &amp; transit access</a>
      </nav>
      <Suspense fallback={<p className="camp-card-note">Loading camps…</p>}>
        <CampsWithRainyDay
          programs={catalog.programs}
          providers={catalog.providers}
          sessions={catalog.sessions}
          venues={catalog.venues}
          // Published camps use today's date. The fixed date keeps the dev fixtures readable.
          nowIso={catalog.sourceLabel === "published" ? undefined : "2026-08-28T16:00:00.000Z"}
          catalogBanner={formatCampsCatalogBanner(catalog)}
          mapsKey={googleMapsBrowserKey()}
          mapId={googleMapsMapId()}
        />
      </Suspense>
    </div>
  );
}
