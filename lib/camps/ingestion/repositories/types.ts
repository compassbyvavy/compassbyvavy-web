/**
 * Persistence contracts for ingestion.
 *
 * Ingestion owns its own tables (`camp_sources`, `camp_source_snapshots`,
 * `camp_extraction_runs`, `camp_extracted_records`, `camp_candidates`,
 * `camp_candidate_changes`, `camp_ingestion_runs`, `camp_review_decisions`).
 * None of these repositories can touch published catalog rows — there is
 * deliberately no write path from ingestion into `Provider` / `CampProgram` /
 * `CampSession` / `Venue`.
 *
 * Candidate-level `recordReviewDecision` and append-only `CampReviewDecision`
 * rows both record human judgment. Neither publishes.
 */

import type {
  CampCandidate,
  CampExtractedRecord,
  CampExtractionRun,
  CampIngestionRunSummary,
  CampReviewDecision,
  CampSource,
  CampSourceSnapshot,
  CandidateReviewDecision,
  CandidateStatus,
  CandidateType,
} from "@/data/camps/ingestion/types";

/** Result of one check attempt, written back to the source registry row. */
export type SourceCheckMark = {
  sourceId: string;
  checkedAt: string;
  /** Hash of the content just seen; omit when the fetch produced none. */
  contentHash?: string | null;
  /**
   * Fact fingerprint from a successful extraction; omit when extraction did
   * not run or failed so a prior fingerprint is retained for the next cycle.
   */
  factFingerprint?: string | null;
  changed: boolean;
  successful: boolean;
  nextCheckAt: string | null;
  /** Error text when the check failed; null clears a previous error. */
  error?: string | null;
};

export type CampSourceRepository = {
  listSources(): Promise<CampSource[]>;
  /** Active sources whose `nextCheckAt` has passed (or was never set). */
  listDueSources(now: Date, limit?: number): Promise<CampSource[]>;
  getSource(id: string): Promise<CampSource | null>;
  upsertSource(source: CampSource): Promise<CampSource>;
  markSourceChecked(mark: SourceCheckMark): Promise<CampSource | null>;
};

export type CampSnapshotRepository = {
  saveSnapshot(snapshot: CampSourceSnapshot): Promise<CampSourceSnapshot>;
  latestSnapshot(sourceId: string): Promise<CampSourceSnapshot | null>;
  listSnapshots(sourceId?: string, limit?: number): Promise<CampSourceSnapshot[]>;
};

export type CampExtractionRepository = {
  /** Upsert by id — the runner writes a run, then completes it. */
  saveExtractionRun(run: CampExtractionRun): Promise<CampExtractionRun>;
  saveExtractedRecords(records: CampExtractedRecord[]): Promise<CampExtractedRecord[]>;
  listExtractionRuns(limit?: number): Promise<CampExtractionRun[]>;
  listExtractedRecords(extractionRunId?: string): Promise<CampExtractedRecord[]>;
};

export type CandidateFilter = {
  status?: CandidateStatus | readonly CandidateStatus[];
  sourceId?: string;
  candidateType?: CandidateType;
};

export type CandidateReviewInput = {
  candidateId: string;
  decision: CandidateReviewDecision;
  reviewedBy: string;
  reviewedAt: string;
  /** Optional operator note appended to the candidate's review reason. */
  note?: string | null;
};

export type CampCandidateRepository = {
  saveCandidate(candidate: CampCandidate): Promise<CampCandidate>;
  getCandidate(id: string): Promise<CampCandidate | null>;
  listCandidates(filter?: CandidateFilter): Promise<CampCandidate[]>;
  /**
   * Persist a review decision (approve / reject / ignore / needs_review).
   * Never writes catalog tables: approval records reviewed truth, and
   * publishing stays a separate, explicit step.
   */
  recordReviewDecision(input: CandidateReviewInput): Promise<CampCandidate | null>;
};

export type CampIngestionRunRepository = {
  saveRunSummary(summary: CampIngestionRunSummary): Promise<CampIngestionRunSummary>;
  latestRunSummary(): Promise<CampIngestionRunSummary | null>;
  listRunSummaries(limit?: number): Promise<CampIngestionRunSummary[]>;
};

/**
 * Append-only field-level review audit (`camp_review_decisions`).
 * `createDecision` always inserts; never updates a prior row.
 */
export type CampReviewDecisionRepository = {
  createDecision(decision: CampReviewDecision): Promise<CampReviewDecision>;
  getDecision(id: string): Promise<CampReviewDecision | null>;
  listDecisionsForCandidate(candidateId: string): Promise<CampReviewDecision[]>;
  getLatestDecisionForCandidate(candidateId: string): Promise<CampReviewDecision | null>;
};

export type IngestionStoreKind = "memory" | "supabase";

export type CampIngestionStore = {
  readonly kind: IngestionStoreKind;
  readonly sources: CampSourceRepository;
  readonly snapshots: CampSnapshotRepository;
  readonly extractions: CampExtractionRepository;
  readonly candidates: CampCandidateRepository;
  readonly runs: CampIngestionRunRepository;
  readonly reviewDecisions: CampReviewDecisionRepository;
};

/**
 * Published catalog rows the matcher and change set compare against
 * (read-only input — nothing in ingestion writes these).
 *
 * The optional fields are the ones a source can restate, so they must be
 * present here for a diff to be meaningful: a field the snapshot omits looks
 * like an addition rather than a change.
 */
export type IngestionCatalogSnapshot = {
  providers: ReadonlyArray<{
    id: string;
    name: string;
    websiteUrl?: string | null;
    registrationInfoUrl?: string | null;
  }>;
  programs: ReadonlyArray<{
    id: string;
    providerId: string;
    name: string;
    slug: string;
    typicalAgeMin?: number | null;
    typicalAgeMax?: number | null;
    primaryCategory?: string | null;
  }>;
  sessions: ReadonlyArray<{
    id: string;
    programId: string;
    startDate?: string | null;
    endDate?: string | null;
    sourceUrl?: string | null;
    /** External source identity — includes ages for CKP 8B grain. */
    externalId?: string | null;
    ageMin?: number | null;
    ageMax?: number | null;
    themeTitle?: string | null;
    themeTitleNormalized?: string | null;
    /** Published session format — TypeScript/read-model only; no migration. */
    scheduleFormat?: string | null;
    priceAmount?: number | null;
    coreHoursStart?: string | null;
    coreHoursEnd?: string | null;
    registrationUrl?: string | null;
    venueId?: string | null;
    priceUnit?: string | null;
    currency?: string | null;
  }>;
  venues: ReadonlyArray<{
    id: string;
    name: string;
    addressLine?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
  }>;
};
