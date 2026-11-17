/**
 * Approve, Fix, Decline, and Publish batch.
 * Fix and Decline stay unpublished. Publish puts every approved camp live
 * and records the approval date the page shows under How we checked.
 */
export type ReviewStatus = "pending" | "approved" | "fix" | "declined";

export type CampDecision = {
  status: ReviewStatus;
  note: string | null;
  decidedOn: string | null;
};

export type ReviewState = {
  publishedOn: string | null;
  decisions: Record<string, CampDecision>;
  /** Provider sentences Vineeta edited. Absent key keeps the listing default. */
  summaries: Record<string, string>;
};

export function emptyReviewState(): ReviewState {
  return { publishedOn: null, decisions: {}, summaries: {} };
}

export function decisionFor(state: ReviewState, slug: string): CampDecision {
  return state.decisions[slug] ?? { status: "pending", note: null, decidedOn: null };
}

export function decideCamp(
  state: ReviewState,
  input: { slug: string; status: Exclude<ReviewStatus, "pending">; note?: string | null; today: string },
): { ok: true; state: ReviewState } | { ok: false; error: string } {
  const note = input.note?.trim() || null;
  if ((input.status === "fix" || input.status === "declined") && !note) {
    return { ok: false, error: input.status === "fix" ? "Fix needs a note." : "Decline needs a reason." };
  }
  return {
    ok: true,
    state: {
      publishedOn: state.publishedOn,
      summaries: state.summaries,
      decisions: {
        ...state.decisions,
        [input.slug]: { status: input.status, note, decidedOn: input.today },
      },
    },
  };
}

export function publishBatch(
  state: ReviewState,
  input: { slugs: string[]; today: string },
): { ok: true; state: ReviewState; published: string[] } | { ok: false; error: string } {
  if (state.publishedOn) return { ok: false, error: "This batch is already published." };
  const published = input.slugs.filter((slug) => decisionFor(state, slug).status === "approved");
  if (!published.length) return { ok: false, error: "Approve at least one camp before publishing the batch." };
  return { ok: true, published, state: { ...state, publishedOn: input.today } };
}

export function isCampLive(state: ReviewState, slug: string): boolean {
  return Boolean(state.publishedOn) && decisionFor(state, slug).status === "approved";
}

export function saveSummary(state: ReviewState, input: { slug: string; summary: string }): ReviewState {
  return {
    ...state,
    summaries: { ...state.summaries, [input.slug]: input.summary },
  };
}

/** Undefined means "use the listing default". A string, including empty, is Vineeta's edit. */
export function editedSummary(state: ReviewState, slug: string): string | undefined {
  if (!state.summaries || !Object.prototype.hasOwnProperty.call(state.summaries, slug)) return undefined;
  return state.summaries[slug];
}

export function approvalDate(state: ReviewState, slug: string): string | null {
  const decision = decisionFor(state, slug);
  return decision.status === "approved" ? decision.decidedOn : null;
}
