/**
 * Review decisions for the camp-page batches.
 *
 * The JSON is statically imported so Cloudflare Workers bundle it (same pattern
 * as discover.json). writeReviewState still writes the file on disk for local
 * approve → commit. A process-wide copy keeps a server action and the next
 * render on the same decisions without a restart. Production on
 * compassbyvavy.ca does not open the admin screen.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import bundledReviewState from "@/data/camps/pages/review-state.json";
import { emptyReviewState, type ReviewState } from "@/lib/camps/pages/review";

const FILE = path.join(process.cwd(), "data/camps/pages/review-state.json");
const KEY = "__compassCampPageReviewState";

type GlobalState = typeof globalThis & { [KEY]?: ReviewState };

function normalizeState(parsed: unknown): ReviewState {
  if (!parsed || typeof parsed !== "object") return emptyReviewState();
  const row = parsed as Partial<ReviewState>;
  if (!row.decisions || typeof row.decisions !== "object") return emptyReviewState();
  return {
    publishedOn: row.publishedOn ?? null,
    decisions: row.decisions,
    summaries: row.summaries ?? {},
  };
}

function readFileState(): ReviewState {
  try {
    return normalizeState(JSON.parse(readFileSync(FILE, "utf8")));
  } catch {
    // Worker / read-only deploy: use the bundled copy.
    return normalizeState(bundledReviewState);
  }
}

export function readReviewState(): ReviewState {
  const globalState = globalThis as GlobalState;
  if (!globalState[KEY]) globalState[KEY] = readFileState();
  return globalState[KEY];
}

export function writeReviewState(state: ReviewState): void {
  (globalThis as GlobalState)[KEY] = state;
  try {
    writeFileSync(FILE, `${JSON.stringify(state, null, 2)}\n`);
  } catch {
    // A read-only deploy keeps the decision in this process only.
  }
}

/** Test helper: drop the in-memory copy so the next read reloads. */
export function resetReviewStateCacheForTests(): void {
  delete (globalThis as GlobalState)[KEY];
}
