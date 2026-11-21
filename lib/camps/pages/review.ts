/**
 * Approve, Fix, Decline, and Publish batch.
 * Fix and Decline stay unpublished. Publish puts approved camps live
 * and records each camp's publish date. A camp can be published later
 * without republishing the whole batch.
 */
export type ReviewStatus = "pending" | "approved" | "fix" | "declined";

export type CampDecision = {
  status: ReviewStatus;
  note: string | null;
  decidedOn: string | null;
  /** Set when this camp was published. Absent/null means not live yet. */
  publishedOn?: string | null;
};

export type ReviewState = {
  /**
   * Legacy batch-wide publish date. New publishes set per-camp `publishedOn`
   * on the decision; this field is still read so older files keep working.
   */
  publishedOn: string | null;
  decisions: Record<string, CampDecision>;
  /** Provider sentences Vineeta edited. Absent key keeps the listing default. */
  summaries: Record<string, string>;
};

export function emptyReviewState(): ReviewState {
  return { publishedOn: null, decisions: {}, summaries: {} };
}

export function decisionFor(state: ReviewState, slug: string): CampDecision {
  return (
    state.decisions[slug] ?? {
      status: "pending",
      note: null,
      decidedOn: null,
      publishedOn: null,
    }
  );
}

/** Per-camp publish date, falling back to the legacy batch-wide field. */
export function campPublishedOn(state: ReviewState, slug: string): string | null {
  const decision = decisionFor(state, slug);
  if (decision.publishedOn) return decision.publishedOn;
  if (state.publishedOn && decision.status === "approved") return state.publishedOn;
  return null;
}

export function decideCamp(
  state: ReviewState,
  input: { slug: string; status: Exclude<ReviewStatus, "pending">; note?: string | null; today: string },
): { ok: true; state: ReviewState } | { ok: false; error: string } {
  const note = input.note?.trim() || null;
  if ((input.status === "fix" || input.status === "declined") && !note) {
    return { ok: false, error: input.status === "fix" ? "Fix needs a note." : "Decline needs a reason." };
  }
  const previous = decisionFor(state, input.slug);
  return {
    ok: true,
    state: {
      publishedOn: state.publishedOn,
      summaries: state.summaries,
      decisions: {
        ...state.decisions,
        [input.slug]: {
          status: input.status,
          note,
          decidedOn: input.today,
          publishedOn: previous.publishedOn ?? null,
        },
      },
    },
  };
}

export function publishBatch(
  state: ReviewState,
  input: { slugs: string[]; today: string },
): { ok: true; state: ReviewState; published: string[] } | { ok: false; error: string } {
  const published = input.slugs.filter((slug) => {
    const decision = decisionFor(state, slug);
    return decision.status === "approved" && !campPublishedOn(state, slug);
  });
  if (!published.length) {
    return { ok: false, error: "Nothing new to publish." };
  }
  const decisions = { ...state.decisions };
  for (const slug of published) {
    const previous = decisionFor(state, slug);
    decisions[slug] = {
      ...previous,
      status: "approved",
      publishedOn: input.today,
    };
  }
  return { ok: true, published, state: { ...state, decisions } };
}

export function isCampLive(state: ReviewState, slug: string): boolean {
  return decisionFor(state, slug).status === "approved" && Boolean(campPublishedOn(state, slug));
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
