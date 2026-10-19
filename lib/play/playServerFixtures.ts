import { headers } from "next/headers";
import { loadIndoorPlayDevFixtures } from "@/lib/play/devFixtures";

/** Incoming Host only — never X-Forwarded-Host. */
export async function loadIndoorPlayDevFixturesForRequest() {
  const hostname = (await headers()).get("host") ?? undefined;
  return loadIndoorPlayDevFixtures({ hostname });
}
