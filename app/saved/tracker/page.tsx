import { Suspense } from "react";
import { RegistrationTrackerClient } from "@/components/shortlist/RegistrationTrackerClient";
import { loadCampsCatalogForRequest } from "@/lib/camps/campsServerCatalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Registration Tracker",
  description:
    "Opens-on dates and registration notes on file for camps you saved. Compass does not process provider registration or show live seats.",
};

export default async function RegistrationTrackerPage() {
  const catalog = await loadCampsCatalogForRequest();
  return (
    <div className="container camps-listing-page">
      <Suspense fallback={<p className="camp-card-note">Loading tracker…</p>}>
        <RegistrationTrackerClient
          catalog={catalog}
          nowIso="2026-08-28T16:00:00.000Z"
        />
      </Suspense>
    </div>
  );
}
