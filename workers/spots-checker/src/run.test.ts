import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fetchPage, TIMEOUT_MS, USER_AGENT } from "./http";
import { runSpotCheck } from "./run";
import type { DueRef, SpotAdapter } from "./types";

const NOW = new Date("2026-11-13T11:45:00.000Z");

function ref(extra: Partial<DueRef> = {}): DueRef {
  return {
    sessionId: "s1",
    bookingSystem: "example",
    externalRef: { page: "https://example.invalid/camp" },
    enabled: true,
    published: true,
    endDate: "2026-12-23",
    ...extra,
  };
}

const adapter: SpotAdapter = {
  pageUrl(due) {
    return String(due.externalRef.page ?? "");
  },
  parse(_due, body) {
    const count = Number(body);
    if (!Number.isInteger(count)) return { error: "no count" };
    return { spots_left: count, state: "available", source_url: "https://example.invalid/camp" };
  },
};

describe("spot check run", () => {
  it("does not fetch a disabled ref", async () => {
    let calls = 0;
    const outcome = await runSpotCheck({
      now: NOW,
      refs: [ref({ enabled: false })],
      stoppedSystems: new Set(),
      adapters: { example: adapter },
      fetchPage: async () => {
        calls += 1;
        return { ok: true, status: 200, url: "x", body: "8" };
      },
    });
    assert.equal(calls, 0);
    assert.equal(outcome.writes.length, 0);
    assert.equal(outcome.runs.length, 0);
  });

  it("leaves a failed reading out of the writes", async () => {
    const outcome = await runSpotCheck({
      now: NOW,
      refs: [ref(), ref({ sessionId: "s2", externalRef: { page: "https://example.invalid/other" } })],
      stoppedSystems: new Set(),
      adapters: { example: adapter },
      fetchPage: async (url) => {
        if (url.endsWith("/other")) return { ok: false, status: 500, url, error: "http 500" };
        return { ok: true, status: 200, url, body: "8" };
      },
    });
    assert.deepEqual(
      outcome.writes.map((row) => row.session_id),
      ["s1"],
    );
    assert.equal(outcome.writes[0]?.spots_left, 8);
    assert.match(outcome.runs[0]?.errors ?? "", /s2: http 500/);
  });

  it("stops the rest of the system on 403 and does not write unknown", async () => {
    const fetched: string[] = [];
    const outcome = await runSpotCheck({
      now: NOW,
      refs: [
        ref({ externalRef: { page: "https://example.invalid/a" } }),
        ref({ sessionId: "s2", externalRef: { page: "https://example.invalid/b" } }),
      ],
      stoppedSystems: new Set(),
      adapters: { example: adapter },
      fetchPage: async (url) => {
        fetched.push(url);
        return { ok: false, status: 403, url, error: "stopped:403" };
      },
    });
    assert.deepEqual(fetched, ["https://example.invalid/a"]);
    assert.equal(outcome.writes.length, 0);
    assert.match(outcome.runs[0]?.errors ?? "", /stopped:403/);
    assert.equal(JSON.stringify(outcome).includes("unknown"), false);
  });

  it("does not fetch a system that already stopped today", async () => {
    let calls = 0;
    const outcome = await runSpotCheck({
      now: NOW,
      refs: [ref()],
      stoppedSystems: new Set(["example"]),
      adapters: { example: adapter },
      fetchPage: async () => {
        calls += 1;
        return { ok: true, status: 200, url: "x", body: "8" };
      },
    });
    assert.equal(calls, 0);
    assert.equal(outcome.runs[0]?.errors, "stopped earlier today");
  });

  it("skips a session that has already ended", async () => {
    let calls = 0;
    await runSpotCheck({
      now: NOW,
      refs: [ref({ endDate: "2026-11-01" })],
      stoppedSystems: new Set(),
      adapters: { example: adapter },
      fetchPage: async () => {
        calls += 1;
        return { ok: true, status: 200, url: "x", body: "8" };
      },
    });
    assert.equal(calls, 0);
  });

  it("fetches each page once", async () => {
    const fetched: string[] = [];
    const outcome = await runSpotCheck({
      now: NOW,
      refs: [ref({ sessionId: "a" }), ref({ sessionId: "b" })],
      stoppedSystems: new Set(),
      adapters: { example: adapter },
      fetchPage: async (url) => {
        fetched.push(url);
        return { ok: true, status: 200, url, body: "3" };
      },
    });
    assert.deepEqual(fetched, ["https://example.invalid/camp"]);
    assert.equal(outcome.writes.length, 2);
    assert.equal(outcome.runs[0]?.sessions_checked, 2);
  });
});

describe("polite fetch", () => {
  it("sends the Compass user agent and times out at 10 seconds", async () => {
    let init: RequestInit | undefined;
    const result = await fetchPage("https://example.invalid/camp", async (_url, options) => {
      init = options;
      return new Response("ok", { status: 200 });
    });
    assert.equal(result.ok, true);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("User-Agent"), USER_AGENT);
    assert.equal(init?.method, "GET");
    assert.equal(TIMEOUT_MS, 10_000);
  });

  it("keeps the service role key out of the website worker config", () => {
    const website = readFileSync(new URL("../../../wrangler.jsonc", import.meta.url), "utf8");
    const checker = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
    assert.equal(website.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(checker.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.match(checker, /\*\/15 \* \* \* \*/);
  });
});
