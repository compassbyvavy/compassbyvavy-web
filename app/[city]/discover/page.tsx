import { notFound } from "next/navigation";
import { DiscoverHub } from "@/components/shell/DiscoverViews";
import { shellMeta } from "@/lib/shell/meta";
import { isLocationSlug, locationName } from "@/lib/taxonomy/catalog";

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props) {
  const { city } = await params;
  if (!isLocationSlug(city)) return {};
  const name = locationName(city);
  return shellMeta({
    title: `Discover in ${name}`,
    description: `Everything to do with kids in ${name}. Nine categories. Listings open as each place is checked.`,
    path: city === "ontario" ? "/discover" : `/${city}/discover`,
  });
}

export default async function CityDiscoverPage({ params }: Props) {
  const { city } = await params;
  if (!isLocationSlug(city)) notFound();
  return <DiscoverHub city={city} cityName={locationName(city)} />;
}
