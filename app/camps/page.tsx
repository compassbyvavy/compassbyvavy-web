import { Suspense } from "react";
import { CampsListingClient } from "@/components/camps/CampsListingClient";
import { loadCampsCatalog } from "@/lib/camps/catalog";

export const dynamic = "force-dynamic";

/**
 * Public Camps listing.
 *
 * Reads from the shared catalog layer (development: real-dev adapter for
 * MSC-0201 only). Fictional fixtures are not loaded here. Production soft-loads
 * empty until a published data source exists.
 */
export default function CampsListingPage() {
  const catalog = loadCampsCatalog();

  if (!catalog) {
    return (
      <div className="camps-listing camps-listing-empty-prod">
        <div className="container">
          <header className="camps-listing-intro">
            <p className="camps-listing-kicker">Mississauga camps</p>
            <h1>Every camp we can verify — not just our favourites</h1>
            <p className="camps-listing-lede">
              The public directory is available without an account. Verified
              program and session data is not loaded in this environment yet —
              no fictional fixture records are shown here.
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

  const banner =
    catalog.sourceLabel === "real_dev"
      ? `DEV ONLY — real-data preview (candidate ${catalog.sourceCandidateId ?? "MSC-0201"}). Source-checked ${catalog.sourceCheckedDate ?? ""} from the provider site. Not fictional fixtures; not a full Mississauga directory.`
      : null;

  return (
    <div className="container camps-listing-page">
      <Suspense fallback={<p className="camp-card-note">Loading camps…</p>}>
        <CampsListingClient
          programs={catalog.programs}
          providers={catalog.providers}
          sessions={catalog.sessions}
          venues={catalog.venues}
          nowIso="2026-08-28T16:00:00.000Z"
          catalogBanner={banner}
        />
      </Suspense>
    </div>
  );
}
