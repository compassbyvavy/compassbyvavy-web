import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampListingPage } from "@/components/camps/pages/CampListingPage";
import { CookSmartWinterPage } from "@/components/camps/pages/CookSmartWinterPage";
import { BATCH_1_TOKEN_RECORD, listingBySlug } from "@/lib/camps/pages/batch1";
import { COOKSMART_WINTER_SLUG } from "@/lib/camps/pages/cooksmartWinter";
import { previewAccess } from "@/lib/camps/pages/preview";
import { approvalDate, editedSummary } from "@/lib/camps/pages/review";
import { readReviewState } from "@/lib/camps/pages/store";
import { buildCampListingPage } from "@/lib/camps/pages/view";
import { torontoToday } from "@/lib/camps/campPage";
import { parentCopy } from "@/lib/voice/copy";
import "@/app/camps/listing.css";
import "@/app/camps/cooksmart-winter.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Camp preview",
    robots: { index: false, follow: false },
  };
}

export default async function CampPreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { t } = await searchParams;
  const listing = listingBySlug(slug);
  const state = readReviewState();
  const access = previewAccess({
    batch: listing ? BATCH_1_TOKEN_RECORD : null,
    supplied: t,
    today: torontoToday(),
    publishedOn: state.publishedOn,
  });
  if (!listing || access !== "ok") notFound();

  if (listing.slug === COOKSMART_WINTER_SLUG) {
    return <CookSmartWinterPage banner={parentCopy.previewBanner} />;
  }

  const edited = editedSummary(state, listing.slug);
  const page = buildCampListingPage(listing, {
    today: torontoToday(),
    approvedOn: approvalDate(state, listing.slug),
    ...(edited === undefined ? {} : { summary: edited }),
  });
  return <CampListingPage page={page} banner={parentCopy.previewBanner} />;
}
