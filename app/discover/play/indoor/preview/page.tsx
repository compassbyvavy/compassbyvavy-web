import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IndoorPlayListingClient } from "@/components/play/IndoorPlayListingClient";
import { loadIndoorPlayDevFixtures } from "@/lib/play/devFixtures";

export const dynamic = "force-dynamic";

/**
 * Development-only Indoor Play listing preview.
 * Uses the fixture gate — production receives 404. Discover play stays
 * coming_soon. Cloudflare dual-gate tightening is phase 4.
 */
export default function IndoorPlayPreviewPage() {
  const fixtures = loadIndoorPlayDevFixtures();
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
