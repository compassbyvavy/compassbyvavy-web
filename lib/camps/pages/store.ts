/**
 * Review decisions for the camp-page batches.
 *
 * The file is the store until the camp_page_review migration is applied.
 * A process-wide copy keeps a server action and the next render on the same
 * decisions. Production on compassbyvavy.ca does not open the admin screen.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { emptyReviewState, type ReviewState } from "@/lib/camps/pages/review";

const FILE = path.join(process.cwd(), "data/camps/pages/review-state.json");
const KEY = "__compassCampPageReviewState";

type GlobalState = typeof globalThis & { [KEY]?: ReviewState };

function readFileState(): ReviewState {
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as ReviewState;
    if (!parsed || typeof parsed !== "object" || !parsed.decisions) return emptyReviewState();
    return { publishedOn: parsed.publishedOn ?? null, decisions: parsed.decisions, summaries: parsed.summaries ?? {} };
  } catch {
    return emptyReviewState();
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
