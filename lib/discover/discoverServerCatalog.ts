import { headers } from "next/headers";
import { loadDiscoverExampleCatalog } from "@/lib/discover/catalog";

/** Incoming Host only — never X-Forwarded-Host. */
export async function loadDiscoverExampleCatalogForRequest() {
  const hostname = (await headers()).get("host") ?? undefined;
  return loadDiscoverExampleCatalog({ hostname });
}
