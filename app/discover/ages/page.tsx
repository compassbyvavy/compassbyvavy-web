import { SiblingAgeMatrix } from "@/components/discover/SiblingAgeMatrix";
import { loadCampsCatalogForRequest } from "@/lib/camps/campsServerCatalog";
import { campSessionToListing } from "@/lib/listings/fromCamps";
import { EXAMPLE_OVERLAP_LISTINGS } from "@/lib/listings/examples";
import "./ages.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sibling age overlap",
  description:
    "See which listings fit every child's age on the same row. Unknown ages stay unknown.",
};

export default async function SiblingAgePage() {
  const catalog = await loadCampsCatalogForRequest();
  const providers = new Map((catalog?.providers ?? []).map((p) => [p.id, p]));
  const venues = new Map((catalog?.venues ?? []).map((v) => [v.id, v]));
  const programs = new Map((catalog?.programs ?? []).map((p) => [p.id, p]));

  const campSources = (catalog?.sessions ?? []).flatMap((session) => {
    const program = programs.get(session.programId);
    if (!program) return [];
    const provider = providers.get(program.providerId);
    if (!provider) return [];
    const venue = session.venueId ? venues.get(session.venueId) : null;
    return [
      {
        listing: campSessionToListing({ program, provider, session, venue }),
        session,
      },
    ];
  });

  return (
    <div className="container">
      <SiblingAgeMatrix
        campSources={campSources}
        exampleListings={EXAMPLE_OVERLAP_LISTINGS}
      />
    </div>
  );
}
