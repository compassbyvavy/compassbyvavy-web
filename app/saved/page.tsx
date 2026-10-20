import { Suspense } from "react";
import { SavedListClient } from "@/components/shortlist/SavedListClient";
import { loadCampsCatalogForRequest } from "@/lib/camps/campsServerCatalog";
import { loadDiscoverExampleCatalogForRequest } from "@/lib/discover/discoverServerCatalog";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const catalog = await loadCampsCatalogForRequest();
  const discoverCatalog = await loadDiscoverExampleCatalogForRequest();
  return (
    <div className="container camps-listing-page">
      <Suspense fallback={<p className="camp-card-note">Loading saved list…</p>}>
        <SavedListClient
          catalog={catalog}
          discoverListings={discoverCatalog?.listings ?? []}
          nowIso="2026-08-28T16:00:00.000Z"
        />
      </Suspense>
    </div>
  );
}
