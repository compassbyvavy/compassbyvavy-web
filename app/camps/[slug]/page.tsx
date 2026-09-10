import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CampDetailClient } from "@/components/camps/CampDetailClient";
import {
  formatCampsCatalogBanner,
  loadCampsCatalog,
  resolveCatalogProgramBySlug,
} from "@/lib/camps/catalog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Camp program detail — same catalog as listing (shared session truth).
 * Unknown slug or missing catalog → 404. Production catalog is null today.
 */
export default async function CampDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const catalog = loadCampsCatalog();
  if (!catalog) {
    notFound();
  }

  const detail = resolveCatalogProgramBySlug(catalog, slug);
  if (!detail) {
    notFound();
  }

  const banner = formatCampsCatalogBanner(catalog);

  return (
    <div className="container camp-detail-page">
      <Suspense fallback={<p className="camp-card-note">Loading session details…</p>}>
        <CampDetailClient
          program={detail.program}
          provider={detail.provider}
          sessions={detail.sessions}
          venuesById={detail.venuesById}
          nowIso="2026-08-28T16:00:00.000Z"
          showDevBanner={Boolean(banner)}
          catalogBanner={banner}
        />
      </Suspense>
    </div>
  );
}
