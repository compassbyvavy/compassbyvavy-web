import { notFound } from "next/navigation";
import { CampCard } from "@/components/camps/CampCard";
import { CampPage } from "@/components/camps/CampPage";
import type { CampProgram, CampSession, Provider, Venue } from "@/data/camps/types";
import { buildCampPageView } from "@/lib/camps/campPage";
import { loadCampsDevFixtures } from "@/lib/camps/devFixtures";

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
    <div className="camps-preview-page">
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

        <h2 className="camps-preview-section-title" id="spots-fresh">
          Fresh checker reading
        </h2>
        <CampPage
          view={buildCampPageView({
            program: spotProgram,
            provider: spotProvider,
            sessions: [spotSession(freshCheck)],
            venuesById: { [spotVenue.id]: spotVenue },
            today: "2026-11-13",
            now: spotNow,
          })}
          program={spotProgram}
          sessions={[spotSession(freshCheck)]}
        />

        <h2 className="camps-preview-section-title" id="spots-aged">
          Checker reading from Nov 11
        </h2>
        <CampPage
          view={buildCampPageView({
            program: spotProgram,
            provider: spotProvider,
            sessions: [spotSession(agedCheck)],
            venuesById: { [spotVenue.id]: spotVenue },
            today: "2026-11-13",
            now: spotNow,
          })}
          program={spotProgram}
          sessions={[spotSession(agedCheck)]}
        />
      </div>
    </div>
  );
}

const spotNow = new Date("2026-11-13T11:45:00.000Z");

const spotProvider: Provider = {
  id: "prov-preview-spots",
  name: "Preview Camp Co",
  websiteUrl: "https://example.invalid/preview",
};

const spotVenue: Venue = {
  id: "venue-preview-spots",
  name: "Preview Hall",
  neighbourhood: "Port Credit",
  addressLine: "1 Preview Road",
  city: "Mississauga",
  province: "Ontario",
  postalCode: "L5G 1A1",
};

const spotProgram: CampProgram = {
  id: "preview-spots",
  slug: "preview-spots",
  providerId: spotProvider.id,
  name: "Preview Winter Camp",
  description: "A fictional camp used to show a dated spots line.",
  primaryCategory: "Traditional & Multi-Activity",
};

const freshCheck: NonNullable<CampSession["spotCheck"]> = {
  spotsLeft: 8,
  state: "available",
  checkedAt: "2026-11-13T11:15:00.000Z",
};

const agedCheck: NonNullable<CampSession["spotCheck"]> = {
  spotsLeft: 8,
  state: "available",
  checkedAt: "2026-11-11T11:15:00.000Z",
};

function spotSession(spotCheck: NonNullable<CampSession["spotCheck"]>): CampSession {
  return {
    id: "preview-spots-session",
    programId: spotProgram.id,
    venueId: spotVenue.id,
    startDate: "2026-12-21",
    endDate: "2026-12-23",
    coreHoursStart: "09:00",
    coreHoursEnd: "16:00",
    priceAmount: 98,
    priceUnit: "per_day",
    currency: "CAD",
    registrationStatus: "registration_open",
    registrationUrl: "https://example.invalid/book",
    sourceUrl: "https://example.invalid/book",
    sourceCheckedDate: "2026-11-01",
    seatAvailability: "confirmed_available",
    ageMin: 5,
    ageMax: 12,
    spotCheck,
  };
}
