import { SavedPage } from "@/components/shell/PlanViews";
import { requestCity } from "@/lib/shell/city";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Saved",
  description: "Places and guides you save stay on this device.",
  path: "/plan/saved",
});

export default async function SavedRoute() {
  const city = await requestCity();
  return <SavedPage cityName={city.name} />;
}
