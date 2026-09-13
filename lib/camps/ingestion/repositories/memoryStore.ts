/**
 * In-memory ingestion store.
 *
 * Used by tests and by the development admin surfaces, where a real Supabase
 * project is neither available nor desirable. Rows are cloned in and out so a
 * caller cannot mutate stored state by holding a reference — the same isolation
 * a database gives, which keeps runner tests honest.
 */

import type {
  CampCandidate,
  CampExtractedRecord,
  CampExtractionRun,
  CampIngestionRunSummary,
  CampReviewDecision,
  CampSource,
  CampSourceSnapshot,
  CandidateStatus,
} from "@/data/camps/ingestion/types";
import { isSourceDue } from "@/lib/camps/ingestion/freshness";
import type {
  CampIngestionStore,
  CandidateFilter,
  CandidateReviewInput,
  SourceCheckMark,
} from "@/lib/camps/ingestion/repositories/types";

export type MemoryIngestionSeed = {
  sources?: readonly CampSource[];
  snapshots?: readonly CampSourceSnapshot[];
  extractionRuns?: readonly CampExtractionRun[];
  extractedRecords?: readonly CampExtractedRecord[];
  candidates?: readonly CampCandidate[];
  runSummaries?: readonly CampIngestionRunSummary[];
  reviewDecisions?: readonly CampReviewDecision[];
};

export type MemoryIngestionStore = CampIngestionStore & {
  readonly kind: "memory";
  /** Full state for assertions and dev rendering. */
  snapshotState(): {
    sources: CampSource[];
    snapshots: CampSourceSnapshot[];
    extractionRuns: CampExtractionRun[];
    extractedRecords: CampExtractedRecord[];
    candidates: CampCandidate[];
    runSummaries: CampIngestionRunSummary[];
    reviewDecisions: CampReviewDecision[];
  };
  reset(seed?: MemoryIngestionSeed): void;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function upsertById<T extends { id: string }>(rows: T[], row: T): T {
  const index = rows.findIndex((existing) => existing.id === row.id);
  const stored = clone(row);
  if (index === -1) {
    rows.push(stored);
  } else {
    rows[index] = stored;
  }
  return clone(stored);
}

function matchesCandidateFilter(candidate: CampCandidate, filter: CandidateFilter): boolean {
  if (filter.sourceId && candidate.sourceId !== filter.sourceId) return false;
  if (filter.candidateType && candidate.candidateType !== filter.candidateType) return false;
  if (filter.status) {
    const wanted: readonly CandidateStatus[] = Array.isArray(filter.status)
      ? filter.status
      : [filter.status as CandidateStatus];
    if (!wanted.includes(candidate.status)) return false;
  }
  return true;
}

export function createMemoryIngestionStore(
  seed: MemoryIngestionSeed = {},
): MemoryIngestionStore {
  let sources: CampSource[] = [];
  let snapshots: CampSourceSnapshot[] = [];
  let extractionRuns: CampExtractionRun[] = [];
  let extractedRecords: CampExtractedRecord[] = [];
  let candidates: CampCandidate[] = [];
  let runSummaries: CampIngestionRunSummary[] = [];
  let reviewDecisions: CampReviewDecision[] = [];

  function load(next: MemoryIngestionSeed): void {
    sources = clone([...(next.sources ?? [])]);
    snapshots = clone([...(next.snapshots ?? [])]);
    extractionRuns = clone([...(next.extractionRuns ?? [])]);
    extractedRecords = clone([...(next.extractedRecords ?? [])]);
    candidates = clone([...(next.candidates ?? [])]);
    runSummaries = clone([...(next.runSummaries ?? [])]);
    reviewDecisions = clone([...(next.reviewDecisions ?? [])]);
  }

  load(seed);

  return {
    kind: "memory",

    sources: {
      async listSources() {
        return clone(sources);
      },
      async listDueSources(now, limit) {
        const due = sources
          .filter((source) => isSourceDue(source, now))
          .sort((a, b) => (a.nextCheckAt ?? "").localeCompare(b.nextCheckAt ?? ""));
        return clone(limit === undefined ? due : due.slice(0, limit));
      },
      async getSource(id) {
        const found = sources.find((source) => source.id === id);
        return found ? clone(found) : null;
      },
      async upsertSource(source) {
        return upsertById(sources, source);
      },
      async markSourceChecked(mark: SourceCheckMark) {
        const index = sources.findIndex((source) => source.id === mark.sourceId);
        if (index === -1) return null;
        const current = sources[index];
        const updated: CampSource = {
          ...current,
          lastCheckedAt: mark.checkedAt,
          lastSuccessfulAt: mark.successful ? mark.checkedAt : current.lastSuccessfulAt ?? null,
          lastChangedAt: mark.changed ? mark.checkedAt : current.lastChangedAt ?? null,
          lastContentHash: mark.contentHash ?? current.lastContentHash ?? null,
          lastFactFingerprint:
            mark.factFingerprint !== undefined
              ? mark.factFingerprint
              : (current.lastFactFingerprint ?? null),
          lastErrorAt: mark.error ? mark.checkedAt : current.lastErrorAt ?? null,
          lastError: mark.error ?? (mark.successful ? null : current.lastError ?? null),
          nextCheckAt: mark.nextCheckAt,
          updatedAt: mark.checkedAt,
        };
        sources[index] = updated;
        return clone(updated);
      },
    },

    snapshots: {
      async saveSnapshot(snapshot) {
        return upsertById(snapshots, snapshot);
      },
      async latestSnapshot(sourceId) {
        const latest = snapshots
          .filter((snapshot) => snapshot.sourceId === sourceId)
          .sort((a, b) => b.retrievedAt.localeCompare(a.retrievedAt))[0];
        return latest ? clone(latest) : null;
      },
      async listSnapshots(sourceId, limit) {
        const rows = snapshots
          .filter((snapshot) => !sourceId || snapshot.sourceId === sourceId)
          .sort((a, b) => b.retrievedAt.localeCompare(a.retrievedAt));
        return clone(limit === undefined ? rows : rows.slice(0, limit));
      },
    },

    extractions: {
      async saveExtractionRun(run) {
        return upsertById(extractionRuns, run);
      },
      async saveExtractedRecords(records) {
        return records.map((record) => upsertById(extractedRecords, record));
      },
      async listExtractionRuns(limit) {
        const rows = [...extractionRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        return clone(limit === undefined ? rows : rows.slice(0, limit));
      },
      async listExtractedRecords(extractionRunId) {
        return clone(
          extractedRecords.filter(
            (record) => !extractionRunId || record.extractionRunId === extractionRunId,
          ),
        );
      },
    },

    candidates: {
      async saveCandidate(candidate) {
        return upsertById(candidates, candidate);
      },
      async getCandidate(id) {
        const found = candidates.find((candidate) => candidate.id === id);
        return found ? clone(found) : null;
      },
      async listCandidates(filter = {}) {
        return clone(
          candidates
            .filter((candidate) => matchesCandidateFilter(candidate, filter))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      },
      async recordReviewDecision(input: CandidateReviewInput) {
        const index = candidates.findIndex((candidate) => candidate.id === input.candidateId);
        if (index === -1) return null;
        const current = candidates[index];
        const updated: CampCandidate = {
          ...current,
          status: input.decision,
          reviewedAt: input.reviewedAt,
          reviewedBy: input.reviewedBy,
          reviewReason: input.note ?? current.reviewReason ?? null,
          updatedAt: input.reviewedAt,
        };
        candidates[index] = updated;
        return clone(updated);
      },
    },

    runs: {
      async saveRunSummary(summary) {
        return upsertById(runSummaries, summary);
      },
      async latestRunSummary() {
        const latest = [...runSummaries].sort((a, b) =>
          b.startedAt.localeCompare(a.startedAt),
        )[0];
        return latest ? clone(latest) : null;
      },
      async listRunSummaries(limit) {
        const rows = [...runSummaries].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        return clone(limit === undefined ? rows : rows.slice(0, limit));
      },
    },

    reviewDecisions: {
      async createDecision(decision) {
        // Append-only: never overwrite an existing id. Duplicate ids are a bug.
        if (reviewDecisions.some((row) => row.id === decision.id)) {
          throw new Error(
            `camp_review_decisions is append-only; decision ${decision.id} already exists`,
          );
        }
        reviewDecisions.push(clone(decision));
        return clone(decision);
      },
      async getDecision(id) {
        const found = reviewDecisions.find((row) => row.id === id);
        return found ? clone(found) : null;
      },
      async listDecisionsForCandidate(candidateId) {
        return clone(
          reviewDecisions
            .filter((row) => row.candidateId === candidateId)
            .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)),
        );
      },
      async getLatestDecisionForCandidate(candidateId) {
        const latest = reviewDecisions
          .filter((row) => row.candidateId === candidateId)
          .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
        return latest ? clone(latest) : null;
      },
    },

    snapshotState() {
      return clone({
        sources,
        snapshots,
        extractionRuns,
        extractedRecords,
        candidates,
        runSummaries,
        reviewDecisions,
      });
    },

    reset(next: MemoryIngestionSeed = {}) {
      load(next);
    },
  };
}
