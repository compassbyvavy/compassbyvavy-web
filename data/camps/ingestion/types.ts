/**
 * Camp data ingestion domain — separate from published catalog contracts.
 *
 * Parent-facing catalog records stay out of this module. Currency and price-unit
 * labels below are ingestion-local copies so extractors do not import UI types.
 *
 * Flow: Source → Snapshot → Extraction → Candidate → Review → Catalog
 *
 * Never silently overwrite approved catalog data from external sources.
 */

export type CrawlStrategy =
  | "html"
  | "browser"
  | "pdf"
  | "api"
  | "manual"
  | "unsupported";

export type CampSourceType =
  | "provider_website"
  | "registration_page"
  | "municipal_catalog"
  | "pdf"
  | "structured_api"
  | "manual"
  | "other";

/** Nullable normalized platform label — not a closed vendor enum. */
export type RegistrationPlatform = string | null;

/** Ingestion-local currency label. Unknown stays unknown. */
export type CampCurrency = "CAD" | "USD" | "unknown";

/** Ingestion-local price unit. Unknown stays unknown. */
export type PriceUnit =
  | "per_day"
  | "per_week"
  | "full_program"
  | "per_session"
  | "other"
  | "unknown";

export type CampSource = {
  id: string;
  providerId: string;
  sourceType: CampSourceType;
  sourceUrl: string;
  canonicalUrl: string;
  registrationPlatform: RegistrationPlatform;
  isActive: boolean;
  crawlStrategy: CrawlStrategy;
  crawlFrequency: string;
  /** Hours between automatic checks. Used by runDueCampSources. */
  checkIntervalHours?: number;
  /** When this source is next due. */
  nextCheckAt?: string | null;
  /** Extractor registry key (e.g. "creative_kids_place", "generic_html"). */
  extractorKey?: string | null;
  lastCheckedAt?: string | null;
  lastSuccessfulAt?: string | null;
  lastChangedAt?: string | null;
  lastContentHash?: string | null;
  /**
   * Fingerprint of the last successfully extracted normalized facts.
   * When raw content changes but this stays the same, the runner persists the
   * new snapshot/check and skips candidate + review creation.
   */
  lastFactFingerprint?: string | null;
  lastErrorAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SnapshotFetchStatus =
  | "success"
  | "not_modified"
  | "blocked"
  | "error"
  | "unsupported";

export type CampSourceSnapshot = {
  id: string;
  sourceId: string;
  retrievedAt: string;
  httpStatus?: number | null;
  contentType?: string | null;
  contentHash: string;
  /**
   * Fingerprint of extracted normalized facts for this snapshot.
   * Null when extraction did not run (raw-hash short-circuit) or failed.
   */
  factFingerprint?: string | null;
  rawContent?: string | null;
  rawContentRef?: string | null;
  rawMetadata?: Record<string, unknown> | null;
  fetchStatus: SnapshotFetchStatus;
  fetchError?: string | null;
  previousSnapshotId?: string | null;
};

export type ExtractionRunStatus =
  | "pending"
  | "running"
  | "success"
  | "partial"
  | "failed";

export type CampExtractionRun = {
  id: string;
  snapshotId: string;
  extractorVersion: string;
  startedAt: string;
  completedAt?: string | null;
  status: ExtractionRunStatus;
  warnings: string[];
  error?: string | null;
};

export type ExtractedRecordType = "provider" | "program" | "session" | "venue";

export type CampExtractedRecord = {
  id: string;
  extractionRunId: string;
  recordType: ExtractedRecordType;
  sourceIdentity: string;
  rawFields: Record<string, unknown>;
  normalizedFields: Record<string, unknown>;
  confidence: number;
  warnings: string[];
};

export type ExtractionMethod =
  | "structured"
  | "selector"
  | "regex"
  | "ai"
  | "manual";

export type FieldObservation<T> = {
  value: T;
  rawValue?: string | null;
  sourceUrl?: string | null;
  sourceSnapshotId?: string | null;
  observedAt: string;
  confidence: number;
  extractionMethod: ExtractionMethod;
};

export type CandidateType = "provider" | "program" | "session" | "venue";

export type CandidateStatus =
  | "new"
  | "matched"
  | "changed"
  | "needs_review"
  | "approved"
  | "rejected"
  | "ignored";

export type CampFieldChangeType = "added" | "removed" | "changed" | "unchanged";

export type CampFieldChange = {
  field: string;
  changeType: CampFieldChangeType;
  oldValue?: unknown;
  newValue?: unknown;
  confidence: number;
  sourceSnapshotId?: string | null;
};

export type IngestionQualityFlag =
  | "missing_dates"
  | "missing_price"
  | "missing_age"
  | "missing_location"
  | "missing_registration_url"
  | "conflicting_sources"
  | "ambiguous_match"
  | "possible_duplicate"
  | "source_stale"
  | "source_blocked"
  | "extraction_partial"
  | "possible_removed_session";

/** Outcome of one source through the Prompt 8 pipeline. */
export type PipelineOutcome =
  | "NEW"
  | "MATCHED_UNCHANGED"
  | "MATCHED_CHANGED"
  | "AMBIGUOUS"
  | "FAILED"
  | "UNCHANGED_SOURCE"
  /** Raw page bytes changed, but extracted normalized facts did not. */
  | "UNCHANGED_FACTS"
  | "BLOCKED"
  | "UNSUPPORTED";

export type CampCandidate = {
  id: string;
  candidateType: CandidateType;
  sourceRecordIds: string[];
  matchedCatalogId?: string | null;
  matchConfidence?: number | null;
  candidateData: Record<string, unknown>;
  changeSet: CampFieldChange[];
  status: CandidateStatus;
  reviewReason?: string | null;
  qualityFlags: IngestionQualityFlag[];
  pipelineOutcome?: PipelineOutcome | null;
  sourceId?: string | null;
  snapshotId?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
};

/** Approve persists review only — does not publish to catalog (Prompt 8). */
export type CandidateReviewDecision =
  | "approved"
  | "rejected"
  | "ignored"
  | "needs_review";

/**
 * Per-field human verification (Prompt 7B).
 * Keys in `CampReviewDecision.fieldDecisions` MUST use the same vocabulary as
 * `CampFieldChange.field` for that candidate.
 */
export type FieldDecision = "approved" | "rejected" | "needs_followup";

/**
 * Overall outcome of one field-level review pass.
 * Computed server-side from `fieldDecisions` — never trust a client value.
 */
export type ReviewOutcome =
  | "fully_approved"
  | "partially_approved"
  | "needs_followup"
  | "rejected";

/**
 * Append-only audit row for one human review pass.
 * Reviewing the same candidate twice creates a second row; the first is never updated.
 * Approval here does NOT publish into CampProgram / CampSession.
 */
export type CampReviewDecision = {
  id: string;
  candidateId: string;
  /** Snapshot that supplied the evidence visible when this review occurred. */
  sourceSnapshotId: string | null;
  fieldDecisions: Record<string, FieldDecision>;
  overallStatus: ReviewOutcome;
  notes: string | null;
  reviewedBy: string;
  reviewedAt: string;
};

export type CampIngestionRunSummary = {
  id: string;
  startedAt: string;
  completedAt?: string | null;
  sourcesAttempted: number;
  sourcesSucceeded: number;
  sourcesUnchanged: number;
  /** Raw hash changed; extracted facts did not. No candidates. */
  sourcesNonSemanticChange: number;
  sourcesChanged: number;
  extractionsSucceeded: number;
  candidatesCreated: number;
  errors: Array<{ sourceId?: string; message: string }>;
};

export type CleanSourceDocument = {
  title: string | null;
  text: string;
  headings: string[];
  links: Array<{ href: string; text: string }>;
  metadata: Record<string, string>;
};

export type MatchResultKind =
  | "EXACT_IDENTITY"
  | "SAFE_RECONCILIATION"
  | "IDENTITY_CHANGED"
  | "AMBIGUOUS"
  | "NO_MATCH";

export type MatchResult = {
  kind: MatchResultKind;
  catalogId: string | null;
  confidence: number;
  reasons: string[];
};

export type GrainComparison = "exact" | "normalized_text" | "number";

export type GrainFieldRef = {
  scope: "record" | "normalized";
  fields: readonly string[];
};

export type OfferingGrainDimension = {
  /** Human/debug name only; matcher must not branch on this name. */
  name: string;
  /** First stated extracted field wins. */
  extracted: GrainFieldRef;
  /** First stated catalog field wins. */
  catalogFields: readonly string[];
  compare: GrainComparison;
};

/**
 * Extractor-declared offering grain. Identity defines the same semantic row;
 * reconciliation may locate a prior row when identity itself changed, but never
 * overrides an identity mismatch. Descriptive / pricingVariant are A2 docs only.
 */
export type OfferingGrain = {
  identity: readonly OfferingGrainDimension[];
  reconciliation: readonly OfferingGrainDimension[];
  descriptive: readonly string[];
  pricingVariant: readonly string[];
};

export type SessionCatalogMatchRow = {
  id: string;
  programId: string;
  startDate?: string | null;
  endDate?: string | null;
  sourceUrl?: string | null;
  externalId?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  themeTitle?: string | null;
  themeTitleNormalized?: string | null;
  /** Published session format — read-only match field; not a new persistence column. */
  scheduleFormat?: string | null;
};

export type ProviderMatcher = {
  match(
    extracted: CampExtractedRecord,
    catalog: ReadonlyArray<{ id: string; name: string; websiteUrl?: string | null }>,
  ): MatchResult;
};

export type ProgramMatcher = {
  match(
    extracted: CampExtractedRecord,
    catalog: ReadonlyArray<{
      id: string;
      providerId: string;
      name: string;
      slug: string;
    }>,
  ): MatchResult;
};

export type SessionMatcher = {
  match(
    extracted: CampExtractedRecord,
    catalog: ReadonlyArray<SessionCatalogMatchRow>,
    grain?: OfferingGrain | null,
  ): MatchResult;
};

export type VenueMatcher = {
  match(
    extracted: CampExtractedRecord,
    catalog: ReadonlyArray<{ id: string; name: string; addressLine?: string | null }>,
  ): MatchResult;
};

export type SourceHealthLabel =
  | "Healthy"
  | "Changed"
  | "Failed"
  | "Blocked"
  | "Manual"
  | "Unsupported";

export type FreshnessLabel = "Fresh" | "Recently checked" | "Stale" | "Unknown";

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";
