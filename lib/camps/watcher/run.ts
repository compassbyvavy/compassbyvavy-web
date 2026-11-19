import { fetchPage, type PageFetch } from "../feeds/http";
import { filterJackrabbitClasses, jackrabbitOpeningsUrl, parseJackrabbitOpeningsJson } from "../feeds/jackrabbitJson";
import { hashSourceContent } from "../ingestion/hash";
import { assertSafeHttpUrl } from "../ingestion/security/ssrf";
import { fetchWatchedPage, WATCH_USER_AGENT } from "./fetchPage";
import { factsHash, outcomeForReading, sessionFromClass } from "./outcome";
import { pageWatchText } from "./pageText";
import { torontoDateKey } from "./toronto";
import type { Reading, WatchCycle, WatchFacts, WatchSource } from "./types";

const PHASE_ONE = new Set(["jackrabbit", "page", "manual"]);
const CHALLENGE_MARKERS = ["captcha", "cf-browser-verification", "checking your browser", "request unsuccessful. incapsula"];

export function isSourceDue(source: WatchSource, now: Date): boolean {
  if (!source.active) return false;
  if (!source.lastCheckedAt) return true;
  const last = new Date(source.lastCheckedAt);
  if (Number.isNaN(last.getTime())) return true;
  if (source.checkEvery === "weekly") return now.getTime() - last.getTime() >= 7 * 24 * 60 * 60 * 1000;
  return torontoDateKey(last) !== torontoDateKey(now);
}

function failureFromFetch(fetched: Extract<PageFetch, { ok: false }>): Reading {
  const httpStatus = fetched.status === 0 ? null : fetched.status;
  if (fetched.error.startsWith("stopped:") || [401, 403, 405, 406, 429, 451].includes(fetched.status)) {
    return { status: "blocked", httpStatus, error: fetched.error };
  }
  if (fetched.status === 0 || fetched.status >= 500) {
    return { status: "unreachable", httpStatus, error: fetched.error };
  }
  return { status: "error", httpStatus, error: fetched.error };
}

function readingFromJackrabbit(source: WatchSource, fetched: PageFetch): Reading {
  if (!fetched.ok) {
    if (fetched.status === 0 && fetched.error !== "timeout" && fetched.error !== "fetch failed") {
      return { status: "error", httpStatus: null, error: fetched.error };
    }
    return failureFromFetch(fetched);
  }
  const head = fetched.body.slice(0, 4000).toLowerCase();
  if (CHALLENGE_MARKERS.some((marker) => head.includes(marker))) {
    return { status: "blocked", httpStatus: fetched.status, error: "bot_challenge_detected" };
  }
  const parsed = parseJackrabbitOpeningsJson(fetched.body);
  if (!parsed.ok) return { status: "error", httpStatus: fetched.status, error: parsed.error };
  const classes = filterJackrabbitClasses(parsed.classes, source.adapterParams);
  const facts: WatchFacts = { sessions: classes.map(sessionFromClass) };
  return { status: "ok", httpStatus: fetched.status, facts, contentHash: factsHash(facts) };
}

function readingFromPage(fetched: Awaited<ReturnType<typeof fetchWatchedPage>>): Reading {
  if (fetched.status !== "ok") {
    return { status: fetched.status, httpStatus: fetched.httpStatus, error: fetched.error };
  }
  const facts: WatchFacts = { pageText: pageWatchText(fetched.body) };
  return { status: "ok", httpStatus: fetched.httpStatus, facts, contentHash: hashSourceContent(facts.pageText ?? "") };
}

function manualReading(): Reading {
  const reminder = "Call or email";
  const facts: WatchFacts = { reminder };
  return { status: "ok", httpStatus: null, facts, contentHash: hashSourceContent(reminder) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWatchCycle(args: {
  now: Date;
  sources: WatchSource[];
  previousFacts: Map<string, WatchFacts | null>;
  fetchImpl?: typeof fetch;
  delayMs?: number;
}): Promise<WatchCycle> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const delayMs = args.delayMs ?? 0;
  const cycle: WatchCycle = { snapshots: [], changes: [], updates: [], logs: [] };
  const due = args.sources.filter((source) => isSourceDue(source, args.now));
  const jackrabbitGroups = new Map<string, WatchSource[]>();
  const rest: WatchSource[] = [];

  for (const source of due) {
    if (!PHASE_ONE.has(source.adapter)) {
      const outcome = outcomeForReading({
        source,
        now: args.now,
        previousFacts: null,
        reading: { status: "error", httpStatus: null, error: `skipped unknown adapter ${source.adapter}` },
      });
      cycle.updates.push(outcome.update);
      cycle.logs.push(...outcome.logs);
      continue;
    }
    if (source.adapter === "jackrabbit") {
      const url = jackrabbitOpeningsUrl(source.adapterParams);
      const group = jackrabbitGroups.get(url) ?? [];
      group.push(source);
      jackrabbitGroups.set(url, group);
    } else {
      rest.push(source);
    }
  }

  let fetches = 0;
  for (const [url, group] of jackrabbitGroups) {
    if (fetches > 0 && delayMs > 0) await sleep(delayMs);
    let fetched: PageFetch;
    if (!url) {
      fetched = { ok: false, status: 0, url: "", error: "missing jackrabbit OrgID" };
    } else {
      try {
        assertSafeHttpUrl(url);
        fetched = await fetchPage(url, fetchImpl, WATCH_USER_AGENT);
        fetches += 1;
      } catch (error) {
        fetched = {
          ok: false,
          status: 0,
          url,
          error: error instanceof Error ? error.message : "unsafe url",
        };
      }
    }
    for (const source of group) {
      const outcome = outcomeForReading({
        source,
        now: args.now,
        previousFacts: args.previousFacts.get(source.id) ?? null,
        reading: readingFromJackrabbit(source, fetched),
      });
      if (outcome.snapshot) cycle.snapshots.push(outcome.snapshot);
      cycle.changes.push(...outcome.changes);
      cycle.updates.push(outcome.update);
      cycle.logs.push(...outcome.logs);
    }
  }

  for (const source of rest) {
    let reading: Reading;
    if (source.adapter === "manual") {
      reading = manualReading();
    } else if (!source.watchUrl) {
      reading = { status: "error", httpStatus: null, error: "missing watch url" };
    } else {
      if (fetches > 0 && delayMs > 0) await sleep(delayMs);
      const fetched = await fetchWatchedPage(source.watchUrl, fetchImpl);
      fetches += 1;
      reading = readingFromPage(fetched);
    }
    const outcome = outcomeForReading({
      source,
      now: args.now,
      previousFacts: args.previousFacts.get(source.id) ?? null,
      reading,
    });
    if (outcome.snapshot) cycle.snapshots.push(outcome.snapshot);
    cycle.changes.push(...outcome.changes);
    cycle.updates.push(outcome.update);
    cycle.logs.push(...outcome.logs);
  }

  return cycle;
}
