import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ComingSoonCategory } from "@/components/discover/ComingSoonCategory";
import { DiscoverListingClient } from "@/components/discover/DiscoverListingClient";
import { listingsForCategory } from "@/lib/discover/catalog";
import {
  DISCOVER_CATEGORIES,
  getDiscoverCategory,
} from "@/lib/discover/categories";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return DISCOVER_CATEGORIES.filter((category) => category.slug !== "camps").map(
    (category) => ({ slug: category.slug }),
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "camps") return { title: "Camps" };
  const category = getDiscoverCategory(slug);
  if (!category) return { title: "Discover" };
  const listings = listingsForCategory(slug);
  if (!listings) {
    return {
      title: `${category.title} — coming soon`,
      description: `${category.blurb} Listings are not published yet.`,
      robots: { index: false, follow: true },
    };
  }
  return {
    title: `${category.title} examples`,
    description: `${category.blurb} Labelled example listings, not a verified directory.`,
    robots: { index: false, follow: true },
  };
}

export default async function DiscoverCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "camps") redirect("/camps");
  const category = getDiscoverCategory(slug);
  if (!category) notFound();
  const listings = listingsForCategory(slug);
  if (!listings) return <ComingSoonCategory category={category} />;

  return (
    <div className="container camps-listing-page">
      <Suspense fallback={<p className="camp-card-note">Loading listings…</p>}>
        <DiscoverListingClient slug={slug} listings={listings} />
      </Suspense>
    </div>
  );
}
