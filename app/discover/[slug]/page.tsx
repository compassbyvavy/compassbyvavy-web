import { notFound, redirect } from "next/navigation";
import { ComingSoonCategory } from "@/components/discover/ComingSoonCategory";
import {
  DISCOVER_CATEGORIES,
  getDiscoverCategory,
} from "@/lib/discover/categories";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return DISCOVER_CATEGORIES.filter((c) => c.slug !== "camps").map((c) => ({
    slug: c.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "camps") {
    return { title: "Camps" };
  }
  const category = getDiscoverCategory(slug);
  if (!category) {
    return { title: "Discover" };
  }
  return {
    title: `${category.title} — coming soon`,
    description: `${category.blurb} Listings are not live yet.`,
    robots: { index: false, follow: true },
  };
}

export default async function DiscoverCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "camps") {
    redirect("/camps");
  }
  const category = getDiscoverCategory(slug);
  if (!category) {
    notFound();
  }
  return <ComingSoonCategory category={category} />;
}
