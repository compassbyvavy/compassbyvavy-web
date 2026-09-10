import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CampDetailClient } from "@/components/camps/CampDetailClient";
import {
  formatCampsCatalogBanner,
  resolvePublishedCampDetail,
} from "@/lib/camps/catalog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Camp program detail — Prompt 5.
 * Same catalog as listing (shared session truth). Unknown slug, missing
 * catalog, or production gate → 404. Never substitutes another program.
 */
export default async function CampDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const published = resolvePublishedCampDetail(slug);
  if (!published) {
    notFound();
  }

  const banner = formatCampsCatalogBanner(published.catalog);

  return (
    <div className="container camp-detail-page">
      <Suspense fallback={<p className="camp-card-note">Loading session details…</p>}>
        <CampDetailClient
          program={published.program}
          provider={published.provider}
          sessions={published.sessions}
          venuesById={published.venuesById}
          nowIso="2026-08-28T16:00:00.000Z"
          showDevBanner={Boolean(banner)}
          catalogBanner={banner}
        />
      </Suspense>
    </div>
  );
}
