import { isSourceDue, runWatchCycle } from "../../../lib/camps/watcher/run";
import { handleScheduled } from "../../../lib/camps/watcher/schedule";
import type { WatchFacts } from "../../../lib/camps/watcher/types";
import { sendRenderedEmail, type CampWatcherEnv } from "./sendEmail";
import { loadLatestFacts, loadRecentChanges, loadSources, saveCycle } from "./supabase";

export default {
  async scheduled(
    event: { cron: string },
    env: CampWatcherEnv,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<void> {
    ctx.waitUntil(runScheduled(env, event.cron, new Date()));
  },
};

export async function runScheduled(
  env: CampWatcherEnv,
  cron: string,
  now: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await handleScheduled({
    cron,
    now,
    log: (line) => console.log(line),
    runCheck: async () => {
      const sources = await loadSources(env, fetchImpl);
      const due = sources.filter((source) => isSourceDue(source, now));
      const previousFacts = new Map<string, WatchFacts | null>();
      for (const source of due) {
        previousFacts.set(
          source.id,
          source.lastCheckedAt ? await loadLatestFacts(env, source.id, fetchImpl) : null,
        );
      }
      const cycle = await runWatchCycle({
        now,
        sources,
        previousFacts,
        fetchImpl,
        delayMs: 250,
      });
      await saveCycle(env, cycle, fetchImpl);
      for (const line of cycle.logs) console.log(line);
      console.log(`camp watcher checked ${cycle.updates.length}, ${cycle.changes.length} to review`);
    },
    loadPending: () => loadRecentChanges(env, now, fetchImpl),
    send: async (message) => {
      await sendRenderedEmail(env, message);
    },
  });
}
