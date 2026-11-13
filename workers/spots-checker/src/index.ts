import { activenet } from "./adapters/activenet";
import { iclasspro } from "./adapters/iclasspro";
import { jackrabbit } from "./adapters/jackrabbit";
import { squarespace } from "./adapters/squarespace";
import { fetchPage } from "./http";
import { runSpotCheck } from "./run";
import { loadDueRefs, loadStoppedSystems, saveResults, type CheckerEnv } from "./supabase";
import type { SpotAdapter } from "./types";

/** Systems the research note said to build. Acuity is absent on purpose. */
export const adapters: Record<string, SpotAdapter> = {
  iclasspro,
  jackrabbit,
  activenet,
  squarespace,
};

export default {
  async scheduled(_event: unknown, env: CheckerEnv, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<void> {
    ctx.waitUntil(checkSpots(env));
  },
};

export async function checkSpots(env: CheckerEnv, fetchImpl: typeof fetch = fetch, now = new Date()): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("spots checker is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const [refs, stoppedSystems] = await Promise.all([
    loadDueRefs(env, fetchImpl),
    loadStoppedSystems(env, now, fetchImpl),
  ]);
  const outcome = await runSpotCheck({
    now,
    refs,
    stoppedSystems,
    adapters,
    fetchPage: (url) => fetchPage(url, fetchImpl),
  });
  await saveResults(env, outcome.writes, outcome.runs, fetchImpl);
}
