/**
 * Camps ingestion library — public surface.
 *
 * Flow: Source → Snapshot → Extraction → Candidate → Review → Catalog.
 * Everything up to Review is automated; the last arrow is a human, and nothing
 * in this library writes published catalog tables.
 *
 * Deep imports remain valid and are preferred inside the library itself; this
 * barrel exists for call sites outside it (admin pages, scripts, tests).
 *
 * Server-only: `repositories/supabaseStore` needs the service-role key and
 * refuses to construct in a browser. Import it only from server code.
 */

export {
  canonicalHost,
  canonicalizeSourceUrl,
  sameCanonicalHost,
  sameCanonicalUrl,
  tryCanonicalizeSourceUrl,
} from "@/lib/camps/ingestion/canonicalizeUrl";

export {
  DEFAULT_CHANGE_CONFIDENCE,
  changeSetConfidence,
  changedFieldNames,
  generateChangeSet,
  hasMaterialChanges,
  materialChanges,
  type GenerateChangeSetOptions,
} from "@/lib/camps/ingestion/changeSet";

export {
  HIGH_CONFIDENCE_MIN,
  MEDIUM_CONFIDENCE_MIN,
  clampConfidence,
  confidenceBand,
  isLowerRiskReviewEligible,
  mayAutoPublishToCatalog,
  weakestConfidence,
} from "@/lib/camps/ingestion/confidence";

export {
  areIngestionFixturesAvailable,
  loadIngestionDevFixtures,
  requireIngestionDevFixtures,
} from "@/lib/camps/ingestion/devFixtures";

export {
  LIVE_FETCH_ENV_VAR,
  areIngestionDevFixturesAllowed,
  assertIngestionDevOnly,
  assertLiveSourceFetchEnabled,
  isLiveSourceFetchEnabled,
  isProductionRuntime,
} from "@/lib/camps/ingestion/devGate";

export {
  FixtureSourceFetcher,
  type CampSourceFetcher,
  type FetchSourceContext,
  type FixturePayload,
  type FixtureSourceFetcherOptions,
} from "@/lib/camps/ingestion/fetcher";

export {
  DEFAULT_CHECK_INTERVAL_HOURS,
  FRESH_MAX_HOURS,
  RECENTLY_CHECKED_MAX_HOURS,
  freshnessLabel,
  hoursSince,
  isSourceDue,
  isSourceStale,
  nextCheckAtFrom,
} from "@/lib/camps/ingestion/freshness";

export {
  hashSourceContent,
  normalizeContentForHash,
  shortHash,
  sourceContentUnchanged,
} from "@/lib/camps/ingestion/hash";

export {
  buildFactFingerprintPayload,
  factsUnchanged,
  hashFactFingerprint,
  type FactFingerprintRecord,
} from "@/lib/camps/ingestion/factFingerprint";

export {
  HttpCampSourceFetcher,
  type FetchLike,
  type HttpCampSourceFetcherOptions,
} from "@/lib/camps/ingestion/httpFetcher";

export {
  createPrefixedIdFactory,
  createSequentialIdFactory,
  newIngestionId,
  type IdFactory,
} from "@/lib/camps/ingestion/ids";

export {
  exactProgramMatcher,
  exactProviderMatcher,
  exactSessionMatcher,
  exactVenueMatcher,
  isNewSessionCandidate,
  normalizeMatchText,
  type SessionCatalogRow,
} from "@/lib/camps/ingestion/matchers";

export {
  decideExtraction,
  resolveCandidateOutcome,
  type CandidateResolution,
  type CandidateResolutionInput,
  type DecideExtractionInput,
  type ExtractionDecision,
  type ExtractionDecisionReason,
} from "@/lib/camps/ingestion/pipeline";

export {
  applyMatchQualityFlags,
  mergeQualityFlags,
  qualityFlagsForExtractedSession,
  sourceHealthLabel,
  sourceQualityFlags,
  type ExtractedSessionQualityContext,
  type MatchQualityInput,
} from "@/lib/camps/ingestion/qualityFlags";

export {
  cleanHtmlToDocument,
  decodeHtmlEntities,
  htmlToText,
  type CleanHtmlOptions,
} from "@/lib/camps/ingestion/html/cleanHtml";

export {
  ALLOWED_FETCH_PORTS,
  ALLOWED_FETCH_PROTOCOLS,
  COMPASS_CAMP_FETCH_USER_AGENT,
  UnsafeFetchTargetError,
  assertSafeHttpUrl,
  assertSafeRedirectTarget,
  assertSafeResolvedHost,
  classifyFetchHost,
  isSafeFetchHost,
  type UnsafeFetchReason,
} from "@/lib/camps/ingestion/security/ssrf";

export * from "@/lib/camps/ingestion/normalize";

export {
  CAMP_EXTRACTORS,
  SITE_EXTRACTORS,
  getExtractorByKey,
  listExtractorKeys,
  resolveExtractor,
  suggestExtractorKey,
  type ResolveExtractorInput,
} from "@/lib/camps/ingestion/extractors/registry";

export {
  buildExtractedRecord,
  extractorVersionLabel,
  makeFieldObservation,
  type CampExtractor,
  type ExtractorInput,
  type ExtractorResult,
  type ExtractorSupportInput,
  type GrainComparison,
  type GrainFieldRef,
  type OfferingGrain,
  type OfferingGrainDimension,
} from "@/lib/camps/ingestion/extractors/types";

export {
  CREATIVE_KIDS_PLACE_OFFERING_GRAIN,
  FRONT_LINE_HOCKEY_OFFERING_GRAIN,
  GYMNASTICS_MISSISSAUGA_OFFERING_GRAIN,
  NUTTY_SCIENTISTS_OFFERING_GRAIN,
  RIVERWOOD_CONSERVANCY_OFFERING_GRAIN,
} from "@/lib/camps/ingestion/extractors/offeringGrain";

export {
  CREATIVE_KIDS_PLACE_EXTRACTOR_KEY,
  CREATIVE_KIDS_PLACE_HOST,
  CREATIVE_KIDS_PLACE_PROVIDER_NAME,
  creativeKidsPlaceExtractor,
  parseCreativeKidsPlaceFacts,
  type CreativeKidsPlaceFacts,
  type CreativeKidsPlacePriceTier,
} from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
export {
  NUTTY_SCIENTISTS_EXTRACTOR_KEY,
  NUTTY_SCIENTISTS_HOST,
  NUTTY_SCIENTISTS_PROVIDER_NAME,
  NUTTY_SCIENTISTS_PROGRAM_NAME,
  NUTTY_SCIENTISTS_VENUE_NAME,
  nuttyScientistsExtractor,
  parseNuttyScientistsFacts,
  parseNuttyWeekWindows,
  parseNuttyScientistsSchedule,
  nuttySessionSourceIdentity,
  nuttyWeekIdentity,
  type NuttyScientistsFacts,
  type NuttyScientistsPriceTier,
} from "@/lib/camps/ingestion/extractors/nuttyScientistsExtractor";
export {
  RIVERWOOD_CONSERVANCY_EXTRACTOR_KEY,
  RIVERWOOD_CONSERVANCY_HOST,
  RIVERWOOD_CONSERVANCY_PROVIDER_NAME,
  RIVERWOOD_CONSERVANCY_PROGRAM_NAME,
  RIVERWOOD_CONSERVANCY_VENUE_NAME,
  riverwoodConservancyExtractor,
  parseRiverwoodConservancyFacts,
  parseRiverwoodSchedule,
  parseRiverwoodGradeEligibility,
  riverwoodSessionSourceIdentity,
  type RiverwoodConservancyFacts,
} from "@/lib/camps/ingestion/extractors/riverwoodConservancyExtractor";
export {
  FRONT_LINE_HOCKEY_EXTRACTOR_KEY,
  FRONT_LINE_HOCKEY_HOST,
  FRONT_LINE_HOCKEY_PROVIDER_NAME,
  FRONT_LINE_HOCKEY_VENUE_NAME,
  frontLineHockeyExtractor,
  parseFrontLineHockeyFacts,
  frontLineSessionSourceIdentity,
  frontLineProductSlugFromUrl,
  frontLineCampToken,
  type FrontLineHockeyFacts,
} from "@/lib/camps/ingestion/extractors/frontLineHockeyExtractor";
export {
  GYMNASTICS_MISSISSAUGA_EXTRACTOR_KEY,
  GYMNASTICS_MISSISSAUGA_HOST,
  GYMNASTICS_MISSISSAUGA_PROVIDER_NAME,
  GYMNASTICS_MISSISSAUGA_PROGRAM_NAME,
  GYMNASTICS_MISSISSAUGA_VENUE_NAME,
  gymnasticsMississaugaExtractor,
  parseGymnasticsMississaugaFacts,
  gymnasticsSessionSourceIdentity,
  type GymnasticsMississaugaFacts,
} from "@/lib/camps/ingestion/extractors/gymnasticsMississaugaExtractor";
export {
  parseCreativeKidsPlaceSchedule,
  parseWeekAddOns,
  parseWeekDateWindows,
  isShortSessionWindow,
  sessionWindowDayCount,
  classifyPriceTier,
  themeSlug,
} from "@/lib/camps/ingestion/extractors/creativeKidsPlaceSchedule";

export {
  GENERIC_HTML_EXTRACTOR_KEY,
  genericHtmlExtractor,
} from "@/lib/camps/ingestion/extractors/genericHtmlExtractor";

export {
  createMemoryIngestionStore,
  type MemoryIngestionSeed,
  type MemoryIngestionStore,
} from "@/lib/camps/ingestion/repositories/memoryStore";

export {
  createSupabaseIngestionStore,
  readSupabaseConfigFromEnv,
  resolveIngestionStore,
  type IngestionEnv,
  type SupabaseIngestionConfig,
} from "@/lib/camps/ingestion/repositories/supabaseStore";

export type {
  CampCandidateRepository,
  CampReviewDecisionRepository,
  CampExtractionRepository,
  CampIngestionRunRepository,
  CampIngestionStore,
  CampSnapshotRepository,
  CampSourceRepository,
  CandidateFilter,
  CandidateReviewInput,
  IngestionCatalogSnapshot,
  IngestionStoreKind,
  SourceCheckMark,
} from "@/lib/camps/ingestion/repositories/types";

export {
  runDueCampSources,
  runCampSource,
  type RunDueCampSourcesOptions,
  type RunCampSourceOptions,
  type CampSourceRunResult,
  type CampSourceRunStatus,
} from "@/lib/camps/ingestion/runner/runDueCampSources";

export {
  REVIEW_ACTIONS,
  REVIEW_QUEUE_STATUSES,
  decisionForAction,
  describeDecision,
  isReviewAction,
  listReviewQueue,
  listReviewedCandidates,
  persistCandidateReview,
  reviewActionLabel,
  type PersistCandidateReviewInput,
  type PersistCandidateReviewResult,
  type ReviewAction,
  type ReviewFailureReason,
} from "@/lib/camps/ingestion/runner/reviewActions";


export {
  candidateStatusForReviewOutcome,
  computeReviewOutcome,
  isFieldDecision,
  type ReviewOutcomeComputation,
} from "@/lib/camps/ingestion/reviewOutcome";

export {
  describeFieldReview,
  parseFieldDecisionsFromFormData,
  persistFieldReview,
  type FieldReviewFailureReason,
  type PersistFieldReviewInput,
  type PersistFieldReviewResult,
} from "@/lib/camps/ingestion/runner/fieldReview";

export {
  fetchRegisteredSource,
  resolveRegisteredSource,
  type FetchRegisteredSourceInput,
  type FetchRegisteredSourceResult,
  type ResolveRegisteredSourceFailure,
  type ResolveRegisteredSourceResult,
} from "@/lib/camps/ingestion/sources/registeredSourceFetch";

export {
  CAMP_FETCH_ALLOWLIST,
  CREATIVE_KIDS_PLACE_PROVIDER_ID,
  CREATIVE_KIDS_PLACE_SOURCE_ID,
  CREATIVE_KIDS_PLACE_SOURCE_URL,
  NUTTY_SCIENTISTS_PROVIDER_ID,
  NUTTY_SCIENTISTS_SOURCE_ID,
  NUTTY_SCIENTISTS_SOURCE_URL,
  RIVERWOOD_CONSERVANCY_PROVIDER_ID,
  RIVERWOOD_CONSERVANCY_SOURCE_ID,
  RIVERWOOD_CONSERVANCY_SOURCE_URL,
  FRONT_LINE_HOCKEY_PROVIDER_ID,
  FRONT_LINE_HOCKEY_PROVIDER_URL,
  FRONT_LINE_HOCKEY_SOURCE_IDS,
  FRONT_LINE_HOCKEY_JULY_SOURCE_ID,
  FRONT_LINE_HOCKEY_JULY_SOURCE_URL,
  FRONT_LINE_HOCKEY_APRIL_SOURCE_ID,
  FRONT_LINE_HOCKEY_APRIL_SOURCE_URL,
  GYMNASTICS_MISSISSAUGA_PROVIDER_ID,
  GYMNASTICS_MISSISSAUGA_PROVIDER_URL,
  GYMNASTICS_MISSISSAUGA_SOURCE_ID,
  GYMNASTICS_MISSISSAUGA_SOURCE_URL,
  creativeKidsPlaceSource,
  nuttyScientistsSource,
  riverwoodConservancySource,
  frontLineHockeySources,
  frontLineHockeySourceById,
  gymnasticsMississaugaSource,
  isFetchAllowlisted,
  registerSeedCampSources,
  seedCampSources,
} from "@/lib/camps/ingestion/sources/seedSources";
