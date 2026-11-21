import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SubcategoryView } from "@/components/shell/DiscoverViews";
import {
  COOKSMART_WINTER_SLUG,
  cooksmartCheckedSoFarEligible,
} from "@/lib/camps/pages/cooksmartWinter";
import { isCampLive } from "@/lib/camps/pages/review";
import { readReviewState } from "@/lib/camps/pages/store";
import { shellMeta } from "@/lib/shell/meta";
import {
  categoryBySlug,
  fillCity,
  isLocationSlug,
  locationName,
  publicCategories,
  subcategoryBySlug,
  subcategoriesFor,
} from "@/lib/taxonomy/catalog";

type Props = { params: Promise<{ city: string; category: string; subcategory: string }> };

export function generateStaticParams() {
  return publicCategories().flatMap((category) =>
    subcategoriesFor(category.id).map((row) => ({
      city: "ontario",
      category: category.slug,
      subcategory: row.slug,
    })),
  );
}

export async function generateMetadata({ params }: Props) {
  const { city, category: categorySlug, subcategory: subcategorySlug } = await params;
  const category = categoryBySlug(categorySlug);
  const subcategory = category ? subcategoryBySlug(category.id, subcategorySlug) : undefined;
  if (!category || !subcategory || !isLocationSlug(city)) return {};
  const name = locationName(city);
  return shellMeta({
    title: fillCity(subcategory.pageTitle || subcategory.name, name),
    description: subcategory.description,
    path: `/${city}/${category.slug}/${subcategory.slug}`,
    index: false,
  });
}

export default async function SubcategoryPage({ params }: Props) {
  const { city, category: categorySlug, subcategory: subcategorySlug } = await params;
  const category = categoryBySlug(categorySlug);
  const subcategory = category ? subcategoryBySlug(category.id, subcategorySlug) : undefined;
  if (!category || !subcategory || !isLocationSlug(city)) notFound();

  // Only winter-break (ontario/mississauga) opts into request-time rendering for the live check.
  // Other subcategory paths never call connection(), so generateStaticParams stays static.
  let showCooksmartCheckedSoFar = false;
  if (
    cooksmartCheckedSoFarEligible({
      city,
      categorySlug: category.slug,
      subcategorySlug: subcategory.slug,
    })
  ) {
    await connection();
    showCooksmartCheckedSoFar = isCampLive(readReviewState(), COOKSMART_WINTER_SLUG);
  }

  return (
    <SubcategoryView
      city={city}
      cityName={locationName(city)}
      category={category}
      subcategory={subcategory}
      showCooksmartCheckedSoFar={showCooksmartCheckedSoFar}
    />
  );
}
