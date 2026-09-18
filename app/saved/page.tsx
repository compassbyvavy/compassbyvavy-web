import { Suspense } from "react";
import { SavedListClient } from "@/components/shortlist/SavedListClient";
import { loadCampsCatalog } from "@/lib/camps/catalog";

export const dynamic = "force-dynamic";

export default function SavedPage() {
  const catalog = loadCampsCatalog();
  return (
    <div className="container camps-listing-page">
      <Suspense fallback={<p className="camp-card-note">Loading saved list…</p>}>
        <SavedListClient
          catalog={catalog}
          nowIso="2026-08-28T16:00:00.000Z"
        />
      </Suspense>
    </div>
  );
}
