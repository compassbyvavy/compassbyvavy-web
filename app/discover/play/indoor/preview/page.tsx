import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IndoorPlayListingClient } from "@/components/play/IndoorPlayListingClient";
import { loadIndoorPlayDevFixturesForRequest } from "@/lib/play/playServerFixtures";

export const dynamic = "force-dynamic";

/**
 * Development-only Indoor Play listing preview.
 * Local non-production loads fixtures. Production is 404 unless the
 * Cloudflare review-preview dual gate is on (preview Host + env flag).
 * Discover → Play stays coming soon.
 */
export default async function IndoorPlayPreviewPage() {
  const fixtures = await loadIndoorPlayDevFixturesForRequest();
  if (!fixtures) {
    notFound();
  }

  return (
    <div className="container">
      <Suspense fallback={<p className="play-listing-lede">Loading places…</p>}>
        <IndoorPlayListingClient
          venues={fixtures.venues}
          showDevBanner
        />
      </Suspense>
    </div>
  );
}
