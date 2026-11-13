import type { DueRef, RunLog, SpotWrite } from "./types";

export type CheckerEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

function headers(env: CheckerEnv, prefer?: string): HeadersInit {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    Accept: "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function root(env: CheckerEnv): string {
  return env.SUPABASE_URL.replace(/\/$/, "");
}

type RefRow = {
  session_id?: string;
  booking_system?: string;
  external_ref?: Record<string, unknown> | null;
  enabled?: boolean;
  camp_sessions?: {
    publication_state?: string | null;
    published_at?: string | null;
    end_date?: string | null;
  } | null;
};

export async function loadDueRefs(env: CheckerEnv, fetchImpl: typeof fetch = fetch): Promise<DueRef[]> {
  const url =
    `${root(env)}/rest/v1/camp_session_booking_refs` +
    "?select=session_id,booking_system,external_ref,enabled,camp_sessions(publication_state,published_at,end_date)";
  const response = await fetchImpl(url, { headers: headers(env) });
  if (!response.ok) throw new Error(`booking refs http ${response.status}`);
  const rows = (await response.json()) as RefRow[];
  return rows.flatMap((row) => {
    if (!row.session_id || !row.booking_system) return [];
    const session = row.camp_sessions;
    return [
      {
        sessionId: row.session_id,
        bookingSystem: row.booking_system,
        externalRef: row.external_ref ?? {},
        enabled: row.enabled !== false,
        published: session?.publication_state === "published" && Boolean(session.published_at),
        endDate: session?.end_date ?? null,
      },
    ];
  });
}

export function torontoDayStartIso(now: Date): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // Toronto midnight as an instant. EST/EDT is resolved by formatting the guess.
  const guess = new Date(`${date}T00:00:00-05:00`);
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(guess);
  if (hour === "00") return guess.toISOString();
  return new Date(`${date}T00:00:00-04:00`).toISOString();
}

export async function loadStoppedSystems(
  env: CheckerEnv,
  now: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<Set<string>> {
  const since = encodeURIComponent(torontoDayStartIso(now));
  const url =
    `${root(env)}/rest/v1/camp_spot_check_runs` +
    `?select=booking_system,errors&started_at=gte.${since}`;
  const response = await fetchImpl(url, { headers: headers(env) });
  if (!response.ok) throw new Error(`check runs http ${response.status}`);
  const rows = (await response.json()) as Array<{ booking_system?: string; errors?: string | null }>;
  const stopped = new Set<string>();
  for (const row of rows) {
    if (!row.booking_system || !row.errors) continue;
    if (row.errors.includes("stopped:403") || row.errors.includes("stopped:429")) {
      stopped.add(row.booking_system);
    }
  }
  return stopped;
}

export async function saveResults(
  env: CheckerEnv,
  writes: SpotWrite[],
  runs: RunLog[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (writes.length) {
    const response = await fetchImpl(
      `${root(env)}/rest/v1/camp_session_spots?on_conflict=session_id`,
      {
        method: "POST",
        headers: { ...headers(env, "resolution=merge-duplicates"), "Content-Type": "application/json" },
        body: JSON.stringify(writes),
      },
    );
    if (!response.ok) throw new Error(`spots upsert http ${response.status}`);
  }
  if (runs.length) {
    const response = await fetchImpl(`${root(env)}/rest/v1/camp_spot_check_runs`, {
      method: "POST",
      headers: { ...headers(env), "Content-Type": "application/json" },
      body: JSON.stringify(
        runs.map((run) => ({
          booking_system: run.booking_system,
          sessions_checked: run.sessions_checked,
          errors: run.errors,
        })),
      ),
    });
    if (!response.ok) throw new Error(`run log http ${response.status}`);
  }
}
