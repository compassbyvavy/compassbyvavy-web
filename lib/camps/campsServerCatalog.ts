import { headers } from "next/headers";
import { loadActiveNetAvailabilityBySessionId } from "@/lib/camps/availability/activenet/service";
import type { ActiveNetAvailabilitySnapshot } from "@/lib/camps/availability/activenet/types";
import { loadCampsCatalog } from "@/lib/camps/catalog";

/** Incoming Host only — never X-Forwarded-Host. */
export async function loadCampsCatalogForRequest() {
  const hostname = (await headers()).get("host") ?? undefined;
  return loadCampsCatalog({ hostname });
}

/** Page-load refresh for mapped ActiveNet sessions. Failures stay on the snapshot. */
export async function loadCampsAvailabilityForSessions(
  sessionIds: readonly string[],
): Promise<Record<string, ActiveNetAvailabilitySnapshot>> {
  if (sessionIds.length === 0) return {};
  return loadActiveNetAvailabilityBySessionId(sessionIds);
}
