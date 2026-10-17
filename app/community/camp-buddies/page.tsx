import { CampBuddiesClient } from "@/components/share/CampBuddiesClient";
import { loadCampsCatalogForRequest } from "@/lib/camps/campsServerCatalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Camp Buddies",
  description:
    "A private encrypted link of camp titles and dates. No family name or address is included.",
};

export default async function CampBuddiesPage() {
  const catalog = await loadCampsCatalogForRequest();
  return (
    <div className="container" style={{ padding: "28px 0 72px" }}>
      <CampBuddiesClient
        sessions={catalog?.sessions ?? []}
        programs={catalog?.programs ?? []}
        providers={catalog?.providers ?? []}
      />
    </div>
  );
}
