import { notFound } from "next/navigation";
import { DiscoverDetail } from "@/components/discover/DiscoverDetail";
import { getExampleListing, listingsForCategory } from "@/lib/discover/catalog";
import { getDiscoverCategory } from "@/lib/discover/categories";

type PageProps = {
  params: Promise<{ slug: string; listing: string }>;
};

export function generateStaticParams() {
  const params: { slug: string; listing: string }[] = [];
  const categories = [
    "parks",
    "play",
    "learning",
    "events",
    "classes",
    "food",
    "travel",
    "shopping",
    "services",
  ] as const;
  for (const slug of categories) {
    const rows = listingsForCategory(slug);
    if (!rows) continue;
    for (const row of rows) {
      params.push({ slug, listing: row.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, listing: listingSlug } = await params;
  const listing = getExampleListing(slug, listingSlug);
  if (!listing) return { title: "Listing not found" };
  const category = getDiscoverCategory(slug);
  return {
    title: `${listing.title} — ${category?.title ?? "Discover"} example`,
    description: listing.exampleNote ?? listing.summary ?? undefined,
    robots: { index: false, follow: true },
  };
}

export default async function DiscoverListingDetailPage({ params }: PageProps) {
  const { slug, listing: listingSlug } = await params;
  const listing = getExampleListing(slug, listingSlug);
  if (!listing || listing.category !== slug) notFound();

  return (
    <div className="container camps-listing-page">
      <DiscoverDetail listing={listing} />
    </div>
  );
}
