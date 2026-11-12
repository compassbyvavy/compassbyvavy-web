import { notFound } from "next/navigation";
import { CampPage } from "@/components/camps/CampPage";
import { buildCampPageView } from "@/lib/camps/campPage";
import { CampsCatalogUnavailable } from "@/components/camps/CampsCatalogUnavailable";
import { loadCampsCatalogStatusForRequest } from "@/lib/camps/campsServerCatalog";
import {
  formatCampsCatalogBanner,
  resolveCatalogProgramBySlug,
} from "@/lib/camps/catalog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Camp program detail — Prompt 5.
 * Same catalog as listing (shared session truth). A failed read says so.
 * Unknown slug or an empty published catalog → 404. Never substitutes
 * another program.
 */
export default async function CampDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await loadCampsCatalogStatusForRequest();
  if (result.status === "failed") {
    return <CampsCatalogUnavailable reason="failed" />;
  }
  const published =
    result.status === "ready"
      ? resolveCatalogProgramBySlug(result.catalog, slug)
      : null;
  if (!published || result.status !== "ready") {
    notFound();
  }
  const catalog = result.catalog;

  const banner = formatCampsCatalogBanner(catalog);

  const view = buildCampPageView({
    program: published.program,
    provider: published.provider,
    sessions: published.sessions,
    venuesById: published.venuesById,
  });

  return (
    <div className="container camp-detail-page">
      <CampPage view={view} program={published.program} sessions={published.sessions} banner={banner} />
    </div>
  );
}
