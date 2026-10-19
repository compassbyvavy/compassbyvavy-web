import { AccessOverlays } from "@/components/discover/AccessOverlays";
import { loadCampsCatalogForRequest } from "@/lib/camps/campsServerCatalog";
import { accessRows, transitStops } from "@/lib/access/overlays";
import "./access.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Access overlays",
  description:
    "Sensory room, elevator, low-step, and transit notes. Unknown stays unknown.",
};

export default async function AccessPage() {
  const catalog = await loadCampsCatalogForRequest();
  return (
    <div className="container">
      <p className="access-banner">
        Dev fixtures may carry example access facts. Those rows are fictional.
        A missing fact is unknown, not a verified yes.
      </p>
      <AccessOverlays
        rows={accessRows({
          programs: catalog?.programs ?? [],
          providers: catalog?.providers ?? [],
          sessions: catalog?.sessions ?? [],
        })}
        stops={transitStops(catalog?.venues ?? [])}
      />
    </div>
  );
}
