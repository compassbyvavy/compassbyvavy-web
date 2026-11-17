import { HashDiscover } from "@/components/shell/HashDiscover";
import { HomeView } from "@/components/shell/HomeView";
import { requestCity } from "@/lib/shell/city";
import { locationOptions } from "@/lib/taxonomy/catalog";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Less searching. More childhood adventures.",
  description: "Family fun across Ontario, checked by a parent.",
  path: "/",
});

export default async function HomePage() {
  const city = await requestCity();
  return (
    <>
      <HashDiscover />
      <HomeView city={city.slug} cityName={city.name} locations={locationOptions()} />
    </>
  );
}
