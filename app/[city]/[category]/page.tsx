import { notFound } from "next/navigation";
import { CategoryView } from "@/components/shell/DiscoverViews";
import { shellMeta } from "@/lib/shell/meta";
import { categoryBySlug, fillCity, isLocationSlug, locationName, publicCategories } from "@/lib/taxonomy/catalog";

type Props = { params: Promise<{ city: string; category: string }> };

export function generateStaticParams() {
  return publicCategories().map((category) => ({ city: "ontario", category: category.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { city, category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category || !isLocationSlug(city)) return {};
  const name = locationName(city);
  const title = fillCity(category.pageTitle, name);
  return shellMeta({
    title,
    description: category.cardCopy,
    path: `/${city}/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { city, category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category || !isLocationSlug(city)) notFound();
  return <CategoryView city={city} cityName={locationName(city)} category={category} />;
}
