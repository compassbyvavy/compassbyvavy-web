import { Suspense } from "react";
import { CampsListingClient } from "@/components/camps/CampsListingClient";
import { loadCampsCatalogForRequest } from "@/lib/camps/campsServerCatalog";
import { formatCampsCatalogBanner } from "@/lib/camps/catalog";

export const dynamic = "force-dynamic";

/**
 * Public Camps listing.
 *
 * Shared catalog layer: non-production uses gated real-dev + fixtures;
 * production is empty unless the Cloudflare review-preview dual gate is on.
 */
export default async function CampsListingPage() {
  const catalog = await loadCampsCatalogForRequest();

  if (!catalog) {
    return (
      <div className="camps-listing camps-listing-empty-prod">
        <div className="container">
          <header className="camps-listing-intro">
            <p className="camps-listing-kicker">Mississauga camps</p>
            <h1>Every camp we can verify — not just our favourites</h1>
            <p className="camps-listing-lede">
              We’re still gathering verified Mississauga camp sessions you can
              compare by age, dates, hours, and cost. Check back soon — or tell
              us about a camp your family uses.
            </p>
          </header>
          <footer className="camps-trust-footer">
            <h2>Coverage &amp; trust</h2>
            <p>
              Know a Mississauga camp we should include?{" "}
              <a href="mailto:hello@compassbyvavy.ca?subject=Camp%20we%20missed">
                Tell us
              </a>
              .
            </p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="container camps-listing-page">
      <Suspense fallback={<p className="camp-card-note">Loading camps…</p>}>
        <CampsListingClient
          programs={catalog.programs}
          providers={catalog.providers}
          sessions={catalog.sessions}
          venues={catalog.venues}
          nowIso="2026-08-28T16:00:00.000Z"
          catalogBanner={formatCampsCatalogBanner(catalog)}
        />
      </Suspense>
    </div>
  );
}
