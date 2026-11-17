import { cookies } from "next/headers";
import { isLocationSlug, locationName, ONTARIO } from "@/lib/taxonomy/catalog";

export async function requestCity(): Promise<{ slug: string; name: string }> {
  const value = (await cookies()).get("compass_city")?.value;
  const slug = value && isLocationSlug(value) ? value : ONTARIO.slug;
  return { slug, name: locationName(slug) };
}
