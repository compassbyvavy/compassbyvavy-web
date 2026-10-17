import { notFound, redirect } from "next/navigation";
import { ComingSoonCategory } from "@/components/discover/ComingSoonCategory";
import { IndoorPlaygroundsBrowse } from "@/components/discover/IndoorPlaygroundsBrowse";
import {
  DISCOVER_CATEGORIES,
  getDiscoverCategory,
} from "@/lib/discover/categories";
import {
  filterIndoorPlaygrounds,
  indoorPlayCard,
  loadIndoorPlaygroundBrowse,
  parseIndoorPlayQuery,
} from "@/lib/discover/indoorPlaygrounds";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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
  if (slug === "play") {
    return {
      title: "Indoor playgrounds — Mississauga, Oakville, and Brampton",
      description:
        "Verified indoor playgrounds, soft play, and adventure play. Trampoline parks and other entertainment stay in their own categories.",
      robots: { index: false, follow: true },
    };
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

export default async function DiscoverCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (slug === "camps") {
    redirect("/camps");
  }
  const category = getDiscoverCategory(slug);
  if (!category) {
    notFound();
  }
  if (slug === "play") {
    const browse = await loadIndoorPlaygroundBrowse();
    const query = parseIndoorPlayQuery((await searchParams) ?? {});
    const matched = filterIndoorPlaygrounds(browse.listed, query, browse.filters);
    return (
      <IndoorPlaygroundsBrowse
        banner={browse.banner}
        preview={browse.preview}
        cards={matched.map(indoorPlayCard)}
        totalListed={browse.listed.length}
        query={query}
        filters={browse.filters}
      />
    );
  }
  return <ComingSoonCategory category={category} />;
}
