import { notFound } from "next/navigation";
import { CampCard } from "@/components/camps/CampCard";
import { loadCampsDevFixtures } from "@/lib/camps/devFixtures";
import { campsFontVariables } from "@/lib/camps/fonts";
import "../camps.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Camps card preview (dev only)",
  robots: { index: false, follow: false },
};

/**
 * Development-only CampCard preview.
 * Uses the enforceable fixture gate — production receives 404.
 */
export default function CampsCardPreviewPage() {
  const fixtures = loadCampsDevFixtures();
  if (!fixtures) {
    notFound();
  }

  const venuesById = Object.fromEntries(
    fixtures.campsDevVenues.map((v) => [v.id, v]),
  );
  const providersById = Object.fromEntries(
    fixtures.campsDevProviders.map((p) => [p.id, p]),
  );

  const stem = fixtures.campsDevPrograms.find(
    (p) => p.id === "prog-dev-stem-explorers",
  )!;
  const art = fixtures.campsDevPrograms.find(
    (p) => p.id === "prog-dev-art-trail",
  )!;
  const missing = fixtures.campsDevPrograms.find(
    (p) => p.id === "prog-dev-missing-info",
  )!;

  const stemSessions = fixtures.campsDevSessions.filter(
    (s) => s.programId === stem.id,
  );
  const artSessions = fixtures.campsDevSessions.filter(
    (s) => s.programId === art.id,
  );
  // Explicit empty matching set → dates_unverified (not "no upcoming sessions").
  const missingSessions: typeof stemSessions = [];

  const now = new Date("2026-08-27T16:00:00.000Z");

  return (
    <div className={`camps-theme ${campsFontVariables} camps-preview-page`}>
      <div className="container">
        <p className="camps-preview-banner">
          DEV ONLY — fictional camps fixtures. Not a public directory. Blocked
          in production via fixture gate.
        </p>

        <h1>CampCard preview</h1>
        <p>
          Mixed-status, multi-venue, and missing-information examples. Status
          from registration helper; price/dates/location from matching sessions
          only.
        </p>

        <h2 className="camps-preview-section-title">
          Mixed registration status
        </h2>
        <div className="camps-preview-grid">
          <CampCard
            program={stem}
            provider={providersById[stem.providerId]}
            matchingSessions={stemSessions}
            venuesById={venuesById}
            now={now}
          />
        </div>

        <h2 className="camps-preview-section-title">Multi-venue</h2>
        <div className="camps-preview-grid">
          <CampCard
            program={art}
            provider={providersById[art.providerId]}
            matchingSessions={artSessions}
            venuesById={venuesById}
            now={now}
          />
        </div>

        <h2 className="camps-preview-section-title">
          Missing information (empty matching sessions)
        </h2>
        <div className="camps-preview-grid two">
          <CampCard
            program={missing}
            provider={providersById[missing.providerId]}
            matchingSessions={missingSessions}
            venuesById={venuesById}
            now={now}
          />
          <CampCard
            program={stem}
            provider={providersById[stem.providerId]}
            matchingSessions={[stemSessions[0]]}
            venuesById={venuesById}
            now={now}
          />
        </div>
      </div>
    </div>
  );
}
