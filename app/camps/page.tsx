import { Suspense } from "react";
import { CampsCatalogUnavailable } from "@/components/camps/CampsCatalogUnavailable";
import { CampsListingClient } from "@/components/camps/CampsListingClient";
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
      <Suspense fallback={<p className="camp-card-note">Loading camps…</p>}>
        <CampsListingClient
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
