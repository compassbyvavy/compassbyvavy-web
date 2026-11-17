import { notFound, redirect } from "next/navigation";
import { isLocationSlug } from "@/lib/taxonomy/catalog";

export default async function CityIndex({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  if (city === "ontario") redirect("/discover");
  if (!isLocationSlug(city)) notFound();
  redirect(`/${city}/discover`);
}
