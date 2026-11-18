import { readAdapterParams } from "../../../lib/camps/feeds/adapterParams";
import type { EmailChange } from "../../../lib/camps/watcher/email";
import type { WatchCycle, WatchFacts, WatchSource } from "../../../lib/camps/watcher/types";
import type { CampWatcherEnv } from "./sendEmail";

function headers(env: CampWatcherEnv, prefer?: string): HeadersInit {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
    Accept: "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function root(env: CampWatcherEnv): string {
  return (env.SUPABASE_URL ?? "").replace(/\/$/, "");
}

function requireEnv(env: CampWatcherEnv): void {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("camp watcher is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
}

type SourceRow = {
  id: string;
  source_key: string;
  camp: string;
  break: string;
  adapter: string;
  watch_url: string | null;
  adapter_params: unknown;
  check_every: string;
  active: boolean;
  last_checked_at: string | null;
  last_status: string | null;
};

function mapSource(row: SourceRow): WatchSource {
  return {
    id: row.id,
    sourceKey: row.source_key,
    camp: row.camp,
    break: row.break,
    adapter: row.adapter,
    watchUrl: row.watch_url,
    adapterParams: readAdapterParams(row.adapter_params),
    checkEvery: row.check_every,
    active: row.active,
    lastCheckedAt: row.last_checked_at,
    lastStatus: row.last_status,
  };
}

export async function loadSources(env: CampWatcherEnv, fetchImpl: typeof fetch = fetch): Promise<WatchSource[]> {
  requireEnv(env);
  const response = await fetchImpl(`${root(env)}/rest/v1/camp_watch_sources?active=eq.true&select=*`, {
    headers: headers(env),
  });
  if (!response.ok) throw new Error(`camp watcher sources http ${response.status}`);
  const rows = (await response.json()) as SourceRow[];
  return rows.map(mapSource);
}

export async function loadLatestFacts(
  env: CampWatcherEnv,
  sourceId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WatchFacts | null> {
  requireEnv(env);
  const response = await fetchImpl(
    `${root(env)}/rest/v1/camp_watch_snapshots?source_id=eq.${encodeURIComponent(sourceId)}&select=facts&order=checked_at.desc&limit=1`,
    { headers: headers(env) },
  );
  if (!response.ok) throw new Error(`camp watcher snapshots http ${response.status}`);
  const rows = (await response.json()) as Array<{ facts?: WatchFacts | null }>;
  return rows[0]?.facts ?? null;
}

export async function saveCycle(env: CampWatcherEnv, cycle: WatchCycle, fetchImpl: typeof fetch = fetch): Promise<void> {
  requireEnv(env);
  if (cycle.snapshots.length) {
    const response = await fetchImpl(`${root(env)}/rest/v1/camp_watch_snapshots`, {
      method: "POST",
      headers: { ...headers(env, "return=minimal"), "Content-Type": "application/json" },
      body: JSON.stringify(cycle.snapshots),
    });
    if (!response.ok) throw new Error(`camp watcher snapshot write http ${response.status}`);
  }
  if (cycle.changes.length) {
    const response = await fetchImpl(`${root(env)}/rest/v1/camp_watch_changes`, {
      method: "POST",
      headers: { ...headers(env, "return=minimal"), "Content-Type": "application/json" },
      body: JSON.stringify(cycle.changes),
    });
    if (!response.ok) throw new Error(`camp watcher change write http ${response.status}`);
  }
  for (const update of cycle.updates) {
    const response = await fetchImpl(`${root(env)}/rest/v1/camp_watch_sources?id=eq.${encodeURIComponent(update.id)}`, {
      method: "PATCH",
      headers: { ...headers(env, "return=minimal"), "Content-Type": "application/json" },
      body: JSON.stringify({
        last_checked_at: update.last_checked_at,
        last_status: update.last_status,
      }),
    });
    if (!response.ok) throw new Error(`camp watcher source update http ${response.status}`);
  }
}

type ChangeRow = {
  field?: string;
  old_value?: string | null;
  new_value?: string | null;
  note?: string | null;
  camp_watch_sources?: { camp?: string; break?: string } | { camp?: string; break?: string }[] | null;
};

export async function loadRecentChanges(
  env: CampWatcherEnv,
  now: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailChange[]> {
  requireEnv(env);
  const since = encodeURIComponent(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
  const response = await fetchImpl(
    `${root(env)}/rest/v1/camp_watch_changes?status=eq.pending&detected_at=gte.${since}&select=field,old_value,new_value,note,camp_watch_sources(camp,break)`,
    { headers: headers(env) },
  );
  if (!response.ok) throw new Error(`camp watcher changes http ${response.status}`);
  const rows = (await response.json()) as ChangeRow[];
  const changes: EmailChange[] = [];
  for (const row of rows) {
    const source = Array.isArray(row.camp_watch_sources) ? row.camp_watch_sources[0] : row.camp_watch_sources;
    if (!source?.camp || !source.break || !row.field) continue;
    changes.push({
      camp: source.camp,
      break: source.break,
      field: row.field,
      oldValue: row.old_value ?? null,
      newValue: row.new_value ?? null,
      note: row.note ?? null,
    });
  }
  return changes;
}
