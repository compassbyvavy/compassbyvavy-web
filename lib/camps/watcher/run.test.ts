import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CAMP_FETCH_ALLOWLIST } from "@/lib/camps/ingestion/sources/seedSources";
import { emailLine, renderMorningEmail, sampleMorningEmail } from "@/lib/camps/watcher/email";
import { fetchWatchedPage, WATCH_USER_AGENT } from "@/lib/camps/watcher/fetchPage";
import { isSourceDue, runWatchCycle } from "@/lib/camps/watcher/run";
import { handleScheduled, scheduledJob } from "@/lib/camps/watcher/schedule";
import { buildSeedSql, loadSeedRows } from "@/lib/camps/watcher/seed";
import type { WatchSource } from "@/lib/camps/watcher/types";
import { parseAdapterParams } from "@/lib/camps/feeds/adapterParams";

const csvPath = new URL("../../../docs/camps/watcher/camp_sources_seed.csv", import.meta.url);
const samplePath = new URL("../../../workers/camp-watcher/fixtures/jackrabbit-openings-sample.json", import.meta.url);

function source(overrides: Partial<WatchSource> = {}): WatchSource {
  return {
    id: "src-1",
    sourceKey: "gymnastics-mississauga--winter",
    camp: "Gymnastics Mississauga",
    break: "winter",
    adapter: "jackrabbit",
    watchUrl: "https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsJson?OrgID=537009",
    adapterParams: parseAdapterParams("OrgID=537009; category1=Winter Break Camp"),
    checkEvery: "daily",
    active: true,
    lastCheckedAt: null,
    lastStatus: null,
    ...overrides,
  };
}

describe("seed file", () => {
  it("loads 133 sources and does not widen the ingestion allowlist", () => {
    const rows = loadSeedRows(readFileSync(csvPath, "utf8"));
    assert.equal(rows.length, 133);
    assert.equal(new Set(rows.map((row) => row.source_key)).size, 133);
    const count = (adapter: string) => rows.filter((row) => row.adapter === adapter).length;
    assert.equal(count("page"), 97);
    assert.equal(count("manual"), 18);
    assert.equal(count("jackrabbit"), 5);
    const cooksmart = rows.find((row) => row.source_key === "cooksmart--winter");
    assert.match(cooksmart?.adapter_params ?? "", /99733065,99732924/);
    assert.equal(CAMP_FETCH_ALLOWLIST.length, 10);
    assert.equal(CAMP_FETCH_ALLOWLIST.includes("src-air-riderz"), false);
    const sql = buildSeedSql(rows);
    assert.match(sql, /on conflict \(source_key\) do update/);
    assert.doesNotMatch(sql, /last_checked_at = excluded/);
    assert.match(sql, /CJ''s Skatepark/);
    assert.doesNotMatch(sql, /supabase\.co|service_role/i);
  });
});

describe("when a source is due", () => {
  const checked = "2026-11-16T05:20:00.000Z";

  it("checks a daily source on the next Toronto date", () => {
    assert.equal(isSourceDue(source({ lastCheckedAt: checked }), new Date("2026-11-16T15:00:00.000Z")), false);
    assert.equal(isSourceDue(source({ lastCheckedAt: checked }), new Date("2026-11-17T05:20:00.000Z")), true);
    assert.equal(isSourceDue(source(), new Date(checked)), true);
  });

  it("checks a manual source once a week", () => {
    const manual = source({ adapter: "manual", checkEvery: "weekly", lastCheckedAt: "2026-11-10T05:20:00.000Z" });
    assert.equal(isSourceDue(manual, new Date("2026-11-16T05:20:00.000Z")), false);
    assert.equal(
      isSourceDue(source({ adapter: "manual", checkEvery: "weekly", lastCheckedAt: "2026-11-09T05:20:00.000Z" }), new Date("2026-11-16T05:20:00.000Z")),
      true,
    );
  });
});

describe("watcher cycle", () => {
  it("fetches one Jackrabbit url for every source that shares it", async () => {
    const body = readFileSync(samplePath, "utf8");
    const calls: string[] = [];
    const winter = source();
    const march = source({
      id: "src-2",
      sourceKey: "gymnastics-mississauga--march_break",
      break: "march_break",
      adapterParams: parseAdapterParams("OrgID=537009; watch for March Break category"),
    });
    const cycle = await runWatchCycle({
      now: new Date("2026-11-16T05:20:00.000Z"),
      sources: [winter, march],
      previousFacts: new Map(),
      delayMs: 0,
      fetchImpl: async (url) => {
        calls.push(String(url));
        return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
      },
    });
    assert.deepEqual(calls, [
      "https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsJson?OrgID=537009",
    ]);
    assert.equal(cycle.snapshots.length, 2);
    const winterFacts = cycle.snapshots.find((row) => row.source_id === "src-1")?.facts.sessions ?? [];
    const marchFacts = cycle.snapshots.find((row) => row.source_id === "src-2")?.facts.sessions ?? [];
    assert.deepEqual(winterFacts.map((row) => row.id), ["22377848"]);
    assert.equal(marchFacts.length, 3);
    assert.deepEqual(cycle.changes, []);
  });

  it("writes no change when only the open spot count moves", async () => {
    const parsed = JSON.parse(readFileSync(samplePath, "utf8")) as { rows: Array<Record<string, unknown>> };
    const sourceRow = parsed.rows[0];
    assert.ok(sourceRow);
    const row = structuredClone(sourceRow);
    row.openings = { calculated_openings: 40 };
    const winter = source({ lastCheckedAt: "2026-11-15T05:20:00.000Z", lastStatus: "ok" });
    const cycle = await runWatchCycle({
      now: new Date("2026-11-16T05:20:00.000Z"),
      sources: [winter],
      previousFacts: new Map([
        [
          winter.id,
          {
            sessions: [
              {
                id: "22377848",
                name: "Holiday Camp, Monday Dec 21",
                dates: "2026-12-21",
                hours: "09:00-16:30",
                ages: "P05Y00M-P14Y00M",
                price: "80",
                spots: 47,
                registration: "2026-10-01",
                registerUrl: "https://app.jackrabbitclass.com/reg.asp?id=537009&preLoadClassID=22377848",
              },
            ],
          },
        ],
      ]),
      fetchImpl: async () => new Response(JSON.stringify({ rows: [row] }), { status: 200 }),
    });
    assert.deepEqual(cycle.changes, []);
    assert.equal(cycle.snapshots.length, 1);
    assert.equal(cycle.updates[0]?.last_status, "ok");
  });

  it("raises a price change and not a spots-only change", async () => {
    const parsed = JSON.parse(readFileSync(samplePath, "utf8")) as { rows: Array<Record<string, unknown>> };
    const priced = structuredClone(parsed);
    const row = priced.rows[0];
    if (row) row.tuition = { fee: 90 };
    const winter = source({ lastCheckedAt: "2026-11-15T05:20:00.000Z", lastStatus: "ok" });
    const previous = {
      sessions: [
        {
          id: "22377848",
          name: "Holiday Camp, Monday Dec 21",
          dates: "2026-12-21",
          hours: "09:00-16:30",
          ages: "P05Y00M-P14Y00M",
          price: "80",
          spots: 40,
          registration: "2026-10-01",
          registerUrl: "https://app.jackrabbitclass.com/reg.asp?id=537009&preLoadClassID=22377848",
        },
      ],
    };
    const cycle = await runWatchCycle({
      now: new Date("2026-11-16T05:20:00.000Z"),
      sources: [winter],
      previousFacts: new Map([[winter.id, previous]]),
      fetchImpl: async () => new Response(JSON.stringify(priced), { status: 200 }),
    });
    assert.equal(cycle.changes.length, 1);
    assert.equal(cycle.changes[0]?.field, "price");
    assert.equal(cycle.changes[0]?.kind, "review");
    assert.equal(cycle.changes[0]?.old_value, "80");
    assert.equal(cycle.changes[0]?.new_value, "90");
    assert.equal(cycle.snapshots.length, 1);
  });

  it("marks open to full urgent and never calls a failed read no change", async () => {
    const full = JSON.parse(readFileSync(samplePath, "utf8")) as { rows: Array<Record<string, unknown>> };
    const first = full.rows[0];
    if (first) first.openings = { calculated_openings: 0 };
    const winter = source({ lastCheckedAt: "2026-11-15T05:20:00.000Z", lastStatus: "ok" });
    const openToFull = await runWatchCycle({
      now: new Date("2026-11-16T05:20:00.000Z"),
      sources: [winter],
      previousFacts: new Map([
        [
          winter.id,
          {
            sessions: [
              {
                id: "22377848",
                name: "Holiday Camp, Monday Dec 21",
                dates: "2026-12-21",
                hours: "09:00-16:30",
                ages: "P05Y00M-P14Y00M",
                price: "80",
                spots: 47,
                registration: "2026-10-01",
                registerUrl: null,
              },
            ],
          },
        ],
      ]),
      fetchImpl: async () => new Response(JSON.stringify({ rows: [full.rows[0]] }), { status: 200 }),
    });
    assert.equal(openToFull.changes[0]?.field, "spots");
    assert.equal(openToFull.changes[0]?.note, "urgent");

    const down = source({
      id: "page-1",
      sourceKey: "cj-s-skatepark--winter",
      camp: "CJ's Skatepark",
      adapter: "page",
      watchUrl: "https://cjsskatepark.com/?page_id=1007",
      adapterParams: parseAdapterParams(""),
      lastStatus: null,
    });
    const firstNight = await runWatchCycle({
      now: new Date("2026-11-16T05:20:00.000Z"),
      sources: [down],
      previousFacts: new Map(),
      fetchImpl: async () => new Response("nope", { status: 503 }),
    });
    assert.equal(firstNight.snapshots.length, 0);
    assert.deepEqual(firstNight.changes, []);
    assert.equal(firstNight.updates[0]?.last_status, "unreachable");
    assert.equal(firstNight.logs.join(" ").includes("no change"), false);

    const second = source({ ...down, lastCheckedAt: "2026-11-16T05:20:00.000Z", lastStatus: "unreachable" });
    const secondNight = await runWatchCycle({
      now: new Date("2026-11-17T05:20:00.000Z"),
      sources: [second],
      previousFacts: new Map(),
      fetchImpl: async () => new Response("still down", { status: 503 }),
    });
    assert.equal(secondNight.snapshots.length, 0);
    assert.equal(secondNight.changes[0]?.field, "unreachable");
    assert.equal(secondNight.changes[0]?.kind, "review");
  });

  it("writes a weekly call reminder and skips an adapter that is not in phase 1", async () => {
    const manual = source({
      id: "manual-1",
      sourceKey: "funday--march_break",
      camp: "Funday",
      break: "march_break",
      adapter: "manual",
      watchUrl: null,
      checkEvery: "weekly",
    });
    const acuity = source({
      id: "acuity-1",
      sourceKey: "cooksmart--winter",
      camp: "COOKSMART",
      adapter: "acuity",
      watchUrl: "https://cooksmartscheduling.as.me/schedule/7b98e4f9",
    });
    let fetches = 0;
    const cycle = await runWatchCycle({
      now: new Date("2026-11-16T05:20:00.000Z"),
      sources: [manual, acuity],
      previousFacts: new Map(),
      fetchImpl: async () => {
        fetches += 1;
        return new Response("no", { status: 200 });
      },
    });
    assert.equal(fetches, 0);
    assert.equal(cycle.changes.filter((change) => change.field === "needs_call").length, 1);
    assert.equal(cycle.snapshots.some((row) => row.source_id === "acuity-1"), false);
    assert.equal(cycle.updates.find((row) => row.id === "acuity-1")?.last_status, "error");
    assert.match(cycle.logs.join("\n"), /skipped unknown adapter acuity/);
  });
});

describe("page fetch", () => {
  it("does not follow a redirect to a private address", async () => {
    const calls: string[] = [];
    const result = await fetchWatchedPage("https://camps.example/winter", async (url) => {
      calls.push(String(url));
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } });
    });
    assert.equal(result.status, "error");
    assert.deepEqual(calls, ["https://camps.example/winter"]);
  });

  it("records a refusal as blocked and names the watcher", async () => {
    let agent = "";
    const blocked = await fetchWatchedPage("https://camps.example/winter", async (_url, init) => {
      agent = new Headers(init?.headers).get("User-Agent") ?? "";
      return new Response("no", { status: 403 });
    });
    assert.equal(blocked.status, "blocked");
    assert.equal(agent, WATCH_USER_AGENT);
    const challenge = await fetchWatchedPage("https://camps.example/winter", async () => {
      return new Response("<html>checking your browser</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    });
    assert.equal(challenge.status, "blocked");
    if (challenge.status === "blocked") assert.equal(challenge.error, "bot_challenge_detected");
  });
});

describe("morning email", () => {
  it("sends nothing when the night was empty", () => {
    assert.equal(renderMorningEmail(new Date("2026-11-18T12:00:00.000Z"), []), null);
  });

  it("puts urgent lines first, in the spec's shape", () => {
    const rendered = sampleMorningEmail();
    assert.equal(rendered.subject, "Camp Watcher, Nov 18: 4 to review");
    const preview = readFileSync(new URL("../../../workers/camp-watcher/preview/sample-email.html", import.meta.url), "utf8");
    assert.equal(preview, rendered.html);
    const lines = rendered.text.split("\n").filter((line) => line.includes(":"));
    assert.deepEqual(lines, [
      "Camp Watcher, Nov 18: 4 to review",
      "Urgent: Futures Gymnastics March Break, full (was 3 open)",
      "Urgent: KSG Gymnastics winter, registration now open (was \"opens Nov 17, 1 pm\")",
      "CJ's Skatepark winter: site unreachable 2 nights",
      "Riverwood March Break: page changed, 2027 dates posted",
    ]);
    assert.match(rendered.html, /Futures Gymnastics March Break/);
    assert.equal(emailLine({
      camp: "KSG Gymnastics",
      break: "winter",
      field: "registration",
      oldValue: "opens Nov 17, 1 pm",
      newValue: "open",
      note: "urgent",
    }).startsWith("Urgent:"), true);
  });
});

describe("schedule", () => {
  it("checks at 05:20 UTC and emails at 07:00 Toronto in both standard time and daylight time", () => {
    assert.equal(scheduledJob("20 5 * * *", new Date("2026-11-16T05:20:00.000Z")), "check");
    assert.equal(scheduledJob("0 12 * * *", new Date("2026-11-16T12:00:00.000Z")), "email");
    assert.equal(scheduledJob("0 12 * * *", new Date("2026-07-16T12:00:00.000Z")), "skip");
    assert.equal(scheduledJob("0 11 * * *", new Date("2026-07-16T11:00:00.000Z")), "email");
  });

  it("does not send when nothing is pending", async () => {
    let sent = 0;
    const result = await handleScheduled({
      cron: "0 12 * * *",
      now: new Date("2026-11-18T12:00:00.000Z"),
      runCheck: async () => {
        throw new Error("check should not run at 07:00");
      },
      loadPending: async () => [],
      send: async () => {
        sent += 1;
      },
    });
    assert.equal(result, "skip");
    assert.equal(sent, 0);
  });
});

describe("worker files", () => {
  it("does not write spot counts or the published catalog, and keeps the service key out of wrangler", () => {
    const worker = readFileSync(new URL("../../../workers/camp-watcher/src/supabase.ts", import.meta.url), "utf8");
    const wrangler = readFileSync(new URL("../../../workers/camp-watcher/wrangler.jsonc", import.meta.url), "utf8");
    assert.equal(worker.includes("camp_session_spots"), false);
    assert.equal(worker.includes("camp_sessions"), false);
    assert.equal(wrangler.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.match(wrangler, /20 5 \* \* \*/);
    assert.match(wrangler, /hello@compassbyvavy\.ca/);
    const migration = readFileSync(
      new URL("../../../supabase/migrations/20261115215202_camp_watch_tables.sql", import.meta.url),
      "utf8",
    );
    assert.match(migration, /enable row level security/);
    assert.match(migration, /revoke all on table public.camp_watch_sources from anon, authenticated, public/);
    assert.doesNotMatch(migration, /create table if not exists public\.camp_sources\b/);
  });
});
