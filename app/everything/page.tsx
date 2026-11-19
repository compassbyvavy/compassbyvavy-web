import { EverythingDirectory } from "@/components/shell/DiscoverViews";
import { requestCity } from "@/lib/shell/city";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Everything on Compass",
  description: "Every category and subcategory on Compass by Vavy.",
  path: "/everything",
});

export default async function EverythingPage() {
  const city = await requestCity();
  return <EverythingDirectory city={city.slug} />;
}
