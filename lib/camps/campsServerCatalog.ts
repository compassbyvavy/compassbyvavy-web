import { headers } from "next/headers";
import { loadCampsCatalog } from "@/lib/camps/catalog";

/** Incoming Host only — never X-Forwarded-Host. */
export async function loadCampsCatalogForRequest() {
  const hostname = (await headers()).get("host") ?? undefined;
  return loadCampsCatalog({ hostname });
}
