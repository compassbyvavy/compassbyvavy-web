import { PlanPreview } from "@/components/shell/PlanViews";
import { requestCity } from "@/lib/shell/city";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Plan",
  description: "An example week for families in Ontario. Planning opens with Compass.",
  path: "/plan",
});

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const city = await requestCity();
  return <PlanPreview view={view ?? "week"} cityName={city.name} />;
}
