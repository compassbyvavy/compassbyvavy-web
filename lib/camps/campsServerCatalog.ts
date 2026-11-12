import { cache } from "react";
import { headers } from "next/headers";
import {
  loadCampsCatalog,
  type CampsCatalogBundle,
  type CampsCatalogLoadResult,
} from "@/lib/camps/catalog";

const loadStatus = cache(async (hostname: string | undefined): Promise<CampsCatalogLoadResult> => {
  return loadCampsCatalog({ hostname });
});

/** Published read for pages that show camps. One fetch per request. */
export async function loadCampsCatalogStatusForRequest(): Promise<CampsCatalogLoadResult> {
  const hostname = (await headers()).get("host") ?? undefined;
  return loadStatus(hostname);
}

/**
 * Bundle for pages that already show camps. A failed or empty production
 * read is null, the same shape those pages used when production was empty.
 */
export async function loadCampsCatalogForRequest(): Promise<CampsCatalogBundle | null> {
  const result = await loadCampsCatalogStatusForRequest();
  return result.status === "ready" ? result.catalog : null;
}
