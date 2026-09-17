/**
 * Supabase (PostgREST) ingestion store.
 *
 * Server-only: it authenticates with the service role key, which must never
 * reach a browser bundle, so the factory refuses to construct in an environment
 * that has a `window`. Uses `fetch` against PostgREST rather than adding an SDK
 * dependency, matching the tables in
 * `supabase/migrations/20260912200000_camp_ingestion_tables.sql`.
 *
 * Ingestion tables only. There is no code path here that writes published camp
 * programs or sessions — approving a candidate stores a decision, and publishing
 * remains a separate, explicit step.
 *
 * When the environment has no Supabase credentials, `resolveIngestionStore()`
 * returns the in-memory store instead, so development and tests run offline.
 */

import type {
  CampCandidate,
  CampExtractedRecord,
  CampExtractionRun,
  CampFieldChange,
  CampIngestionRunSummary,
  CampReviewDecision,
  CampSource,
  CampSourceSnapshot,
  CandidateStatus,
  FieldDecision,
  IngestionQualityFlag,
  PipelineOutcome,
  ReviewOutcome,
} from "@/data/camps/ingestion/types";
import {
  createMemoryIngestionStore,
  type MemoryIngestionSeed,
} from "@/lib/camps/ingestion/repositories/memoryStore";
import type {
  CampIngestionStore,
  CandidateFilter,
  CandidateReviewInput,
  SourceCheckMark,
} from "@/lib/camps/ingestion/repositories/types";

export type SupabaseIngestionConfig = {
  url: string;
  serviceRoleKey: string;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  /** Request timeout per PostgREST call. */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;

/** Only two keys are read, so any string map will do. */
export type IngestionEnv = Record<string, string | undefined>;

export function readSupabaseConfigFromEnv(
  env: IngestionEnv = process.env,
): SupabaseIngestionConfig | null {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? null;
  if (!url || !serviceRoleKey) return null;
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

/**
 * Supabase-backed store when credentials are present, in-memory otherwise.
 * Seeds are only applied to the memory fallback.
 */
export function resolveIngestionStore(
  options: { env?: IngestionEnv; memorySeed?: MemoryIngestionSeed } = {},
): CampIngestionStore {
  const config = readSupabaseConfigFromEnv(options.env ?? process.env);
  if (!config) return createMemoryIngestionStore(options.memorySeed ?? {});
  return createSupabaseIngestionStore(config);
}

export function createSupabaseIngestionStore(
  config: SupabaseIngestionConfig,
): CampIngestionStore {
  if (typeof window !== "undefined") {
    throw new Error(
      "The Supabase ingestion store is server-only: the service role key must never reach the client.",
    );
  }
  const client = new PostgrestClient(config);

  return {
    kind: "supabase",

    sources: {
      async listSources() {
        const rows = await client.select<SourceRow>("camp_sources", {
          order: "created_at.asc",
        });
        return rows.map(toSource);
      },
      async listDueSources(now, limit) {
        const rows = await client.select<SourceRow>("camp_sources", {
          filters: {
            is_active: "eq.true",
            or: `(next_check_at.is.null,next_check_at.lte.${now.toISOString()})`,
          },
          order: "next_check_at.asc.nullsfirst",
          limit,
        });
        return rows.map(toSource);
      },
      async getSource(id) {
        const rows = await client.select<SourceRow>("camp_sources", {
          filters: { id: `eq.${id}` },
          limit: 1,
        });
        return rows[0] ? toSource(rows[0]) : null;
      },
      async upsertSource(source) {
        const rows = await client.upsert<SourceRow>("camp_sources", [fromSource(source)]);
        return rows[0] ? toSource(rows[0]) : source;
      },
      async markSourceChecked(mark: SourceCheckMark) {
        const patch: Record<string, unknown> = {
          last_checked_at: mark.checkedAt,
          next_check_at: mark.nextCheckAt,
          updated_at: mark.checkedAt,
        };
        if (mark.successful) patch.last_successful_at = mark.checkedAt;
        if (mark.changed) patch.last_changed_at = mark.checkedAt;
        if (mark.contentHash !== undefined) patch.last_content_hash = mark.contentHash;
        if (mark.factFingerprint !== undefined) {
          patch.last_fact_fingerprint = mark.factFingerprint;
        }
        if (mark.error) {
          patch.last_error = mark.error;
          patch.last_error_at = mark.checkedAt;
        } else if (mark.successful) {
          patch.last_error = null;
        }
        const rows = await client.patch<SourceRow>("camp_sources", { id: `eq.${mark.sourceId}` }, patch);
        return rows[0] ? toSource(rows[0]) : null;
      },
    },

    snapshots: {
      async saveSnapshot(snapshot) {
        const rows = await client.upsert<SnapshotRow>("camp_source_snapshots", [
          fromSnapshot(snapshot),
        ]);
        return rows[0] ? toSnapshot(rows[0]) : snapshot;
      },
      async latestSnapshot(sourceId) {
        const rows = await client.select<SnapshotRow>("camp_source_snapshots", {
          filters: { source_id: `eq.${sourceId}` },
          order: "retrieved_at.desc",
          limit: 1,
        });
        return rows[0] ? toSnapshot(rows[0]) : null;
      },
      async listSnapshots(sourceId, limit) {
        const rows = await client.select<SnapshotRow>("camp_source_snapshots", {
          filters: sourceId ? { source_id: `eq.${sourceId}` } : undefined,
          order: "retrieved_at.desc",
          limit,
        });
        return rows.map(toSnapshot);
      },
    },

    extractions: {
      async saveExtractionRun(run) {
        const rows = await client.upsert<ExtractionRunRow>("camp_extraction_runs", [
          fromExtractionRun(run),
        ]);
        return rows[0] ? toExtractionRun(rows[0]) : run;
      },
      async saveExtractedRecords(records) {
        if (records.length === 0) return [];
        const rows = await client.upsert<ExtractedRecordRow>(
          "camp_extracted_records",
          records.map(fromExtractedRecord),
        );
        return rows.map(toExtractedRecord);
      },
      async listExtractionRuns(limit) {
        const rows = await client.select<ExtractionRunRow>("camp_extraction_runs", {
          order: "started_at.desc",
          limit,
        });
        return rows.map(toExtractionRun);
      },
      async listExtractedRecords(extractionRunId) {
        const rows = await client.select<ExtractedRecordRow>("camp_extracted_records", {
          filters: extractionRunId ? { extraction_run_id: `eq.${extractionRunId}` } : undefined,
        });
        return rows.map(toExtractedRecord);
      },
    },

    candidates: {
      async saveCandidate(candidate) {
        const rows = await client.upsert<CandidateRow>("camp_candidates", [
          fromCandidate(candidate),
        ]);
        // Change rows are replaced wholesale: a change set is a snapshot of one
        // comparison, not an append-only log.
        await client.delete("camp_candidate_changes", { candidate_id: `eq.${candidate.id}` });
        if (candidate.changeSet.length > 0) {
          await client.insert(
            "camp_candidate_changes",
            candidate.changeSet.map((change) => fromChange(candidate.id, change)),
          );
        }
        return rows[0] ? { ...toCandidate(rows[0]), changeSet: candidate.changeSet } : candidate;
      },
      async getCandidate(id) {
        const rows = await client.select<CandidateRow>("camp_candidates", {
          filters: { id: `eq.${id}` },
          limit: 1,
        });
        if (!rows[0]) return null;
        const changes = await client.select<ChangeRow>("camp_candidate_changes", {
          filters: { candidate_id: `eq.${id}` },
          order: "created_at.asc",
        });
        return { ...toCandidate(rows[0]), changeSet: changes.map(toChange) };
      },
      async listCandidates(filter: CandidateFilter = {}) {
        const filters: Record<string, string> = {};
        if (filter.sourceId) filters.source_id = `eq.${filter.sourceId}`;
        if (filter.candidateType) filters.candidate_type = `eq.${filter.candidateType}`;
        if (filter.status) {
          const wanted = Array.isArray(filter.status)
            ? filter.status
            : [filter.status as CandidateStatus];
          filters.status = `in.(${wanted.join(",")})`;
        }
        const rows = await client.select<CandidateRow>("camp_candidates", {
          filters,
          order: "created_at.desc",
        });
        if (rows.length === 0) return [];
        const changes = await client.select<ChangeRow>("camp_candidate_changes", {
          filters: { candidate_id: `in.(${rows.map((row) => row.id).join(",")})` },
          order: "created_at.asc",
        });
        const byCandidate = new Map<string, CampFieldChange[]>();
        for (const change of changes) {
          const bucket = byCandidate.get(change.candidate_id) ?? [];
          bucket.push(toChange(change));
          byCandidate.set(change.candidate_id, bucket);
        }
        return rows.map((row) => ({
          ...toCandidate(row),
          changeSet: byCandidate.get(row.id) ?? [],
        }));
      },
      async recordReviewDecision(input: CandidateReviewInput) {
        const patch: Record<string, unknown> = {
          status: input.decision,
          reviewed_at: input.reviewedAt,
          reviewed_by: input.reviewedBy,
          updated_at: input.reviewedAt,
        };
        if (input.note !== undefined && input.note !== null) patch.review_reason = input.note;
        const rows = await client.patch<CandidateRow>(
          "camp_candidates",
          { id: `eq.${input.candidateId}` },
          patch,
        );
        if (!rows[0]) return null;
        const changes = await client.select<ChangeRow>("camp_candidate_changes", {
          filters: { candidate_id: `eq.${input.candidateId}` },
          order: "created_at.asc",
        });
        return { ...toCandidate(rows[0]), changeSet: changes.map(toChange) };
      },
    },

    runs: {
      async saveRunSummary(summary) {
        const rows = await client.upsert<RunSummaryRow>("camp_ingestion_runs", [
          fromRunSummary(summary),
        ]);
        return rows[0] ? toRunSummary(rows[0]) : summary;
      },
      async latestRunSummary() {
        const rows = await client.select<RunSummaryRow>("camp_ingestion_runs", {
          order: "started_at.desc",
          limit: 1,
        });
        return rows[0] ? toRunSummary(rows[0]) : null;
      },
      async listRunSummaries(limit) {
        const rows = await client.select<RunSummaryRow>("camp_ingestion_runs", {
          order: "started_at.desc",
          limit,
        });
        return rows.map(toRunSummary);
      },
    },

    reviewDecisions: {
      async createDecision(decision) {
        // Append-only insert — never upsert. A second review of the same
        // candidate is a new row; prior rows stay unchanged forever.
        const rows = await client.insert<ReviewDecisionRow>("camp_review_decisions", [
          fromReviewDecision(decision),
        ]);
        return rows[0] ? toReviewDecision(rows[0]) : decision;
      },
      async getDecision(id) {
        const rows = await client.select<ReviewDecisionRow>("camp_review_decisions", {
          filters: { id: `eq.${id}` },
          limit: 1,
        });
        return rows[0] ? toReviewDecision(rows[0]) : null;
      },
      async listDecisionsForCandidate(candidateId) {
        const rows = await client.select<ReviewDecisionRow>("camp_review_decisions", {
          filters: { candidate_id: `eq.${candidateId}` },
          order: "reviewed_at.desc",
        });
        return rows.map(toReviewDecision);
      },
      async getLatestDecisionForCandidate(candidateId) {
        const rows = await client.select<ReviewDecisionRow>("camp_review_decisions", {
          filters: { candidate_id: `eq.${candidateId}` },
          order: "reviewed_at.desc",
          limit: 1,
        });
        return rows[0] ? toReviewDecision(rows[0]) : null;
      },
    },
  };
}

type SelectOptions = {
  filters?: Record<string, string>;
  order?: string;
  limit?: number;
};

class PostgrestClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: (input: string, init?: RequestInit) => Promise<Response>;
  private readonly timeoutMs: number;

  constructor(config: SupabaseIngestionConfig) {
    this.baseUrl = `${config.url.replace(/\/+$/, "")}/rest/v1`;
    this.headers = {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json",
    };
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async select<T>(table: string, options: SelectOptions = {}): Promise<T[]> {
    const params = new URLSearchParams({ select: "*" });
    for (const [key, value] of Object.entries(options.filters ?? {})) {
      params.append(key, value);
    }
    if (options.order) params.append("order", options.order);
    if (options.limit !== undefined) params.append("limit", String(options.limit));
    return this.request<T[]>(`${table}?${params.toString()}`, { method: "GET" });
  }

  async insert<T>(table: string, rows: ReadonlyArray<Record<string, unknown>>): Promise<T[]> {
    return this.request<T[]>(table, {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(rows),
    });
  }

  async upsert<T>(table: string, rows: ReadonlyArray<Record<string, unknown>>): Promise<T[]> {
    return this.request<T[]>(table, {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(rows),
    });
  }

  async patch<T>(
    table: string,
    filters: Record<string, string>,
    patch: Record<string, unknown>,
  ): Promise<T[]> {
    const params = new URLSearchParams(filters);
    return this.request<T[]>(`${table}?${params.toString()}`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
  }

  async delete(table: string, filters: Record<string, string>): Promise<void> {
    const params = new URLSearchParams(filters);
    await this.request<unknown>(`${table}?${params.toString()}`, { method: "DELETE" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/${path}`, {
        ...init,
        signal: controller.signal,
        headers: { ...this.headers, ...(init.headers as Record<string, string> | undefined) },
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Supabase ingestion request failed (${response.status} ${init.method} ${path}): ${detail}`,
        );
      }
      if (response.status === 204) return [] as unknown as T;
      const text = await response.text();
      return (text === "" ? [] : JSON.parse(text)) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

type SourceRow = {
  id: string;
  provider_id: string;
  source_type: string;
  source_url: string;
  canonical_url: string;
  registration_platform: string | null;
  is_active: boolean;
  crawl_strategy: string;
  crawl_frequency: string;
  check_interval_hours: number | null;
  extractor_key: string | null;
  next_check_at: string | null;
  last_checked_at: string | null;
  last_successful_at: string | null;
  last_changed_at: string | null;
  last_content_hash: string | null;
  last_fact_fingerprint: string | null;
  last_error_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

function toSource(row: SourceRow): CampSource {
  return {
    id: row.id,
    providerId: row.provider_id,
    sourceType: row.source_type as CampSource["sourceType"],
    sourceUrl: row.source_url,
    canonicalUrl: row.canonical_url,
    registrationPlatform: row.registration_platform,
    isActive: row.is_active,
    crawlStrategy: row.crawl_strategy as CampSource["crawlStrategy"],
    crawlFrequency: row.crawl_frequency,
    checkIntervalHours: row.check_interval_hours ?? undefined,
    extractorKey: row.extractor_key,
    nextCheckAt: row.next_check_at,
    lastCheckedAt: row.last_checked_at,
    lastSuccessfulAt: row.last_successful_at,
    lastChangedAt: row.last_changed_at,
    lastContentHash: row.last_content_hash,
    lastFactFingerprint: row.last_fact_fingerprint,
    lastErrorAt: row.last_error_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromSource(source: CampSource): Record<string, unknown> {
  return {
    id: source.id,
    provider_id: source.providerId,
    source_type: source.sourceType,
    source_url: source.sourceUrl,
    canonical_url: source.canonicalUrl,
    registration_platform: source.registrationPlatform,
    is_active: source.isActive,
    crawl_strategy: source.crawlStrategy,
    crawl_frequency: source.crawlFrequency,
    check_interval_hours: source.checkIntervalHours ?? null,
    extractor_key: source.extractorKey ?? null,
    next_check_at: source.nextCheckAt ?? null,
    last_checked_at: source.lastCheckedAt ?? null,
    last_successful_at: source.lastSuccessfulAt ?? null,
    last_changed_at: source.lastChangedAt ?? null,
    last_content_hash: source.lastContentHash ?? null,
    last_fact_fingerprint: source.lastFactFingerprint ?? null,
    last_error_at: source.lastErrorAt ?? null,
    last_error: source.lastError ?? null,
    created_at: source.createdAt,
    updated_at: source.updatedAt,
  };
}

type SnapshotRow = {
  id: string;
  source_id: string;
  retrieved_at: string;
  http_status: number | null;
  content_type: string | null;
  content_hash: string;
  fact_fingerprint: string | null;
  raw_content: string | null;
  raw_content_ref: string | null;
  raw_metadata: Record<string, unknown> | null;
  fetch_status: string;
  fetch_error: string | null;
  previous_snapshot_id: string | null;
};

function toSnapshot(row: SnapshotRow): CampSourceSnapshot {
  return {
    id: row.id,
    sourceId: row.source_id,
    retrievedAt: row.retrieved_at,
    httpStatus: row.http_status,
    contentType: row.content_type,
    contentHash: row.content_hash,
    factFingerprint: row.fact_fingerprint,
    rawContent: row.raw_content,
    rawContentRef: row.raw_content_ref,
    rawMetadata: row.raw_metadata,
    fetchStatus: row.fetch_status as CampSourceSnapshot["fetchStatus"],
    fetchError: row.fetch_error,
    previousSnapshotId: row.previous_snapshot_id,
  };
}

function fromSnapshot(snapshot: CampSourceSnapshot): Record<string, unknown> {
  return {
    id: snapshot.id,
    source_id: snapshot.sourceId,
    retrieved_at: snapshot.retrievedAt,
    http_status: snapshot.httpStatus ?? null,
    content_type: snapshot.contentType ?? null,
    content_hash: snapshot.contentHash,
    fact_fingerprint: snapshot.factFingerprint ?? null,
    raw_content: snapshot.rawContent ?? null,
    raw_content_ref: snapshot.rawContentRef ?? null,
    raw_metadata: snapshot.rawMetadata ?? null,
    fetch_status: snapshot.fetchStatus,
    fetch_error: snapshot.fetchError ?? null,
    previous_snapshot_id: snapshot.previousSnapshotId ?? null,
  };
}

type ExtractionRunRow = {
  id: string;
  snapshot_id: string;
  extractor_version: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  warnings: string[] | null;
  error: string | null;
};

function toExtractionRun(row: ExtractionRunRow): CampExtractionRun {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    extractorVersion: row.extractor_version,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status as CampExtractionRun["status"],
    warnings: row.warnings ?? [],
    error: row.error,
  };
}

function fromExtractionRun(run: CampExtractionRun): Record<string, unknown> {
  return {
    id: run.id,
    snapshot_id: run.snapshotId,
    extractor_version: run.extractorVersion,
    started_at: run.startedAt,
    completed_at: run.completedAt ?? null,
    status: run.status,
    warnings: run.warnings,
    error: run.error ?? null,
  };
}

type ExtractedRecordRow = {
  id: string;
  extraction_run_id: string;
  record_type: string;
  source_identity: string;
  raw_fields: Record<string, unknown> | null;
  normalized_fields: Record<string, unknown> | null;
  confidence: number | string;
  warnings: string[] | null;
};

function toExtractedRecord(row: ExtractedRecordRow): CampExtractedRecord {
  return {
    id: row.id,
    extractionRunId: row.extraction_run_id,
    recordType: row.record_type as CampExtractedRecord["recordType"],
    sourceIdentity: row.source_identity,
    rawFields: row.raw_fields ?? {},
    normalizedFields: row.normalized_fields ?? {},
    confidence: Number(row.confidence),
    warnings: row.warnings ?? [],
  };
}

function fromExtractedRecord(record: CampExtractedRecord): Record<string, unknown> {
  return {
    id: record.id,
    extraction_run_id: record.extractionRunId,
    record_type: record.recordType,
    source_identity: record.sourceIdentity,
    raw_fields: record.rawFields,
    normalized_fields: record.normalizedFields,
    confidence: record.confidence,
    warnings: record.warnings,
  };
}

type CandidateRow = {
  id: string;
  candidate_type: string;
  source_record_ids: string[] | null;
  matched_catalog_id: string | null;
  match_confidence: number | string | null;
  candidate_data: Record<string, unknown> | null;
  status: string;
  review_reason: string | null;
  quality_flags: string[] | null;
  pipeline_outcome: string | null;
  source_id: string | null;
  snapshot_id: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

function toCandidate(row: CandidateRow): CampCandidate {
  return {
    id: row.id,
    candidateType: row.candidate_type as CampCandidate["candidateType"],
    sourceRecordIds: row.source_record_ids ?? [],
    matchedCatalogId: row.matched_catalog_id,
    matchConfidence: row.match_confidence === null ? null : Number(row.match_confidence),
    candidateData: row.candidate_data ?? {},
    changeSet: [],
    status: row.status as CandidateStatus,
    reviewReason: row.review_reason,
    qualityFlags: (row.quality_flags ?? []) as IngestionQualityFlag[],
    pipelineOutcome: (row.pipeline_outcome as PipelineOutcome | null) ?? null,
    sourceId: row.source_id,
    snapshotId: row.snapshot_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

function fromCandidate(candidate: CampCandidate): Record<string, unknown> {
  return {
    id: candidate.id,
    candidate_type: candidate.candidateType,
    source_record_ids: candidate.sourceRecordIds,
    matched_catalog_id: candidate.matchedCatalogId ?? null,
    match_confidence: candidate.matchConfidence ?? null,
    candidate_data: candidate.candidateData,
    status: candidate.status,
    review_reason: candidate.reviewReason ?? null,
    quality_flags: candidate.qualityFlags,
    pipeline_outcome: candidate.pipelineOutcome ?? null,
    source_id: candidate.sourceId ?? null,
    snapshot_id: candidate.snapshotId ?? null,
    created_at: candidate.createdAt,
    updated_at: candidate.updatedAt,
    reviewed_at: candidate.reviewedAt ?? null,
    reviewed_by: candidate.reviewedBy ?? null,
  };
}

type ChangeRow = {
  candidate_id: string;
  field: string;
  change_type: string;
  old_value: unknown;
  new_value: unknown;
  confidence: number | string;
  source_snapshot_id: string | null;
};

function toChange(row: ChangeRow): CampFieldChange {
  return {
    field: row.field,
    changeType: row.change_type as CampFieldChange["changeType"],
    oldValue: row.old_value ?? undefined,
    newValue: row.new_value ?? undefined,
    confidence: Number(row.confidence),
    sourceSnapshotId: row.source_snapshot_id,
  };
}

function fromChange(candidateId: string, change: CampFieldChange): Record<string, unknown> {
  return {
    candidate_id: candidateId,
    field: change.field,
    change_type: change.changeType,
    old_value: change.oldValue ?? null,
    new_value: change.newValue ?? null,
    confidence: change.confidence,
    source_snapshot_id: change.sourceSnapshotId ?? null,
  };
}

type RunSummaryRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  sources_attempted: number;
  sources_succeeded: number;
  sources_unchanged: number;
  sources_non_semantic_change: number;
  sources_changed: number;
  extractions_succeeded: number;
  candidates_created: number;
  errors: Array<{ sourceId?: string; message: string }> | null;
};

function toRunSummary(row: RunSummaryRow): CampIngestionRunSummary {
  return {
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    sourcesAttempted: row.sources_attempted,
    sourcesSucceeded: row.sources_succeeded,
    sourcesUnchanged: row.sources_unchanged,
    sourcesNonSemanticChange: row.sources_non_semantic_change ?? 0,
    sourcesChanged: row.sources_changed,
    extractionsSucceeded: row.extractions_succeeded,
    candidatesCreated: row.candidates_created,
    errors: row.errors ?? [],
  };
}

function fromRunSummary(summary: CampIngestionRunSummary): Record<string, unknown> {
  return {
    id: summary.id,
    started_at: summary.startedAt,
    completed_at: summary.completedAt ?? null,
    sources_attempted: summary.sourcesAttempted,
    sources_succeeded: summary.sourcesSucceeded,
    sources_unchanged: summary.sourcesUnchanged,
    sources_non_semantic_change: summary.sourcesNonSemanticChange,
    sources_changed: summary.sourcesChanged,
    extractions_succeeded: summary.extractionsSucceeded,
    candidates_created: summary.candidatesCreated,
    errors: summary.errors,
  };
}

type ReviewDecisionRow = {
  id: string;
  candidate_id: string;
  source_snapshot_id: string | null;
  field_decisions: Record<string, string> | null;
  overall_status: string;
  notes: string | null;
  reviewed_by: string;
  reviewed_at: string;
};

function toReviewDecision(row: ReviewDecisionRow): CampReviewDecision {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    sourceSnapshotId: row.source_snapshot_id,
    fieldDecisions: (row.field_decisions ?? {}) as CampReviewDecision["fieldDecisions"],
    overallStatus: row.overall_status as ReviewOutcome,
    notes: row.notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
}

function fromReviewDecision(decision: CampReviewDecision): Record<string, unknown> {
  return {
    id: decision.id,
    candidate_id: decision.candidateId,
    source_snapshot_id: decision.sourceSnapshotId,
    field_decisions: decision.fieldDecisions,
    overall_status: decision.overallStatus,
    notes: decision.notes,
    reviewed_by: decision.reviewedBy,
    reviewed_at: decision.reviewedAt,
  };
}

