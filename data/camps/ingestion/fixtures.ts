/**
 * DEV ONLY — ingestion lifecycle fixtures (Nutty Scientists + edge cases).
 * Not published catalog data. Load only through the ingestion dev gate.
 */

import type {
  CampCandidate,
  CampExtractedRecord,
  CampExtractionRun,
  CampSource,
  CampSourceSnapshot,
} from "@/data/camps/ingestion/types";
import { generateChangeSet } from "@/lib/camps/ingestion/changeSet";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import type { IngestionCatalogSnapshot } from "@/lib/camps/ingestion/repositories/types";

export const DEV_ONLY_INGESTION_FIXTURES = true as const;

const NOW = "2026-09-12T16:00:00.000Z";
const EARLIER = "2026-09-12T12:00:00.000Z";

export const publishedProvider = {
  id: "prov-nutty-scientists",
  name: "Nutty Scientists",
  websiteUrl: "https://www.nuttyscientists.ca/",
  registrationInfoUrl: "https://www.nuttyscientists.ca/register",
};

export const publishedVenue = {
  id: "venue-nutty-lab",
  name: "Nutty Lab — Port Credit",
  neighbourhood: "Port Credit",
  addressLine: "31 Lakeshore Road East",
  city: "Mississauga",
  province: "ON",
  postalCode: "L5G 1C7",
};

export const publishedProgram = {
  id: "prog-nutty-summer-science",
  slug: "nutty-summer-science-camp",
  providerId: publishedProvider.id,
  name: "Nutty Summer Science Camp",
  primaryCategory: "STEM",
  typicalAgeMin: 6,
  typicalAgeMax: 10,
};

export const publishedSession = {
  id: "sess-nutty-jul-13-17",
  programId: publishedProgram.id,
  venueId: publishedVenue.id,
  startDate: "2026-07-13",
  endDate: "2026-07-17",
  timingLabel: "Summer",
  scheduleFormat: "full_day",
  stayType: "day",
  deliveryMode: "in_person",
  coreHoursStart: "09:00",
  coreHoursEnd: "16:00",
  priceAmount: 399,
  priceUnit: "per_week",
  currency: "CAD",
  registrationStatus: "not_yet_open",
  registrationOpensOn: "2026-03-01",
  registrationUrl: "https://www.nuttyscientists.ca/register?session=jul13",
  sourceUrl: "https://www.nuttyscientists.ca/summer-camp",
  sourceCheckedDate: "2026-09-01",
  ageMin: 6,
  ageMax: 10,
  ageMinInclusive: true,
  ageMaxInclusive: true,
  ageAssessmentRule: "as_of_session_start",
};

const changedHtml =
  "<html><body><h1>Nutty Summer Science Camp</h1><p>Ages 6-11</p><p>July 13-17, 2026 · 9:00-16:00</p><p>Price $425 CAD</p></body></html>";
const unchangedHtml =
  "<html><body><h1>Nutty Summer Science Camp</h1><p>Ages 6-10</p><p>July 13-17, 2026 · 9:00-16:00</p><p>Price $399 CAD</p></body></html>";

export const ingestionSources: CampSource[] = [
  {
    id: "src-nutty-provider-page",
    providerId: publishedProvider.id,
    sourceType: "provider_website",
    sourceUrl: "https://www.nuttyscientists.ca/summer-camp?utm_source=demo",
    canonicalUrl: "https://www.nuttyscientists.ca/summer-camp",
    registrationPlatform: null,
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "hourly",
    lastCheckedAt: NOW,
    lastSuccessfulAt: NOW,
    lastChangedAt: NOW,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: NOW,
  },
  {
    id: "src-nutty-registration",
    providerId: publishedProvider.id,
    sourceType: "registration_page",
    sourceUrl: "https://www.nuttyscientists.ca/register?session=jul13",
    canonicalUrl: "https://www.nuttyscientists.ca/register?session=jul13",
    registrationPlatform: "unknown",
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "hourly",
    lastCheckedAt: NOW,
    lastSuccessfulAt: NOW,
    lastChangedAt: EARLIER,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: NOW,
  },
  {
    id: "src-duplicate-provider-page",
    providerId: publishedProvider.id,
    sourceType: "provider_website",
    sourceUrl: "https://www.nuttyscientists.ca/summer-camp/",
    canonicalUrl: "https://www.nuttyscientists.ca/summer-camp",
    registrationPlatform: null,
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "daily",
    lastCheckedAt: EARLIER,
    lastSuccessfulAt: EARLIER,
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: EARLIER,
  },
  {
    id: "src-blocked-municipal",
    providerId: "prov-city-mississauga",
    sourceType: "municipal_catalog",
    sourceUrl: "https://example.mississauga.ca/camps-blocked",
    canonicalUrl: "https://example.mississauga.ca/camps-blocked",
    registrationPlatform: "active_network",
    isActive: true,
    crawlStrategy: "browser",
    crawlFrequency: "hourly",
    lastCheckedAt: NOW,
    lastErrorAt: NOW,
    lastError: "HTTP 403 — bot challenge",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: NOW,
  },
  {
    id: "src-unsupported-pdf",
    providerId: "prov-city-mississauga",
    sourceType: "pdf",
    sourceUrl: "https://example.mississauga.ca/camps.pdf",
    canonicalUrl: "https://example.mississauga.ca/camps.pdf",
    registrationPlatform: null,
    isActive: true,
    crawlStrategy: "unsupported",
    crawlFrequency: "manual",
    lastCheckedAt: EARLIER,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: EARLIER,
  },
  {
    id: "src-manual-intake",
    providerId: publishedProvider.id,
    sourceType: "manual",
    sourceUrl: "manual://nutty-scientists/operator-notes",
    canonicalUrl: "manual://nutty-scientists/operator-notes",
    registrationPlatform: null,
    isActive: true,
    crawlStrategy: "manual",
    crawlFrequency: "manual",
    lastCheckedAt: EARLIER,
    lastSuccessfulAt: EARLIER,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: EARLIER,
  },
];

export const ingestionSnapshots: CampSourceSnapshot[] = [
  {
    id: "snap-nutty-provider-prev",
    sourceId: "src-nutty-provider-page",
    retrievedAt: EARLIER,
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(unchangedHtml),
    rawContent: unchangedHtml,
    fetchStatus: "success",
  },
  {
    id: "snap-nutty-provider-changed",
    sourceId: "src-nutty-provider-page",
    retrievedAt: NOW,
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(changedHtml),
    rawContent: changedHtml,
    fetchStatus: "success",
    previousSnapshotId: "snap-nutty-provider-prev",
  },
  {
    id: "snap-nutty-reg-same",
    sourceId: "src-nutty-registration",
    retrievedAt: NOW,
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(unchangedHtml),
    rawContent: unchangedHtml,
    fetchStatus: "not_modified",
    previousSnapshotId: "snap-nutty-provider-prev",
  },
  {
    id: "snap-blocked",
    sourceId: "src-blocked-municipal",
    retrievedAt: NOW,
    httpStatus: 403,
    contentType: "text/html",
    contentHash: hashSourceContent("forbidden"),
    rawContent: "forbidden",
    fetchStatus: "blocked",
    fetchError: "HTTP 403 — bot challenge",
  },
  {
    id: "snap-failed-extract-source",
    sourceId: "src-nutty-registration",
    retrievedAt: EARLIER,
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent("<html>malformed"),
    rawContent: "<html>malformed",
    fetchStatus: "success",
  },
];

export const ingestionExtractionRuns: CampExtractionRun[] = [
  {
    id: "run-nutty-changed",
    snapshotId: "snap-nutty-provider-changed",
    extractorVersion: "fixture-extractor@0.1.0",
    startedAt: NOW,
    completedAt: NOW,
    status: "success",
    warnings: [],
  },
  {
    id: "run-failed",
    snapshotId: "snap-failed-extract-source",
    extractorVersion: "fixture-extractor@0.1.0",
    startedAt: EARLIER,
    completedAt: EARLIER,
    status: "failed",
    warnings: [],
    error: "Parser could not locate session blocks",
  },
  {
    id: "run-partial-new-camp",
    snapshotId: "snap-nutty-provider-changed",
    extractorVersion: "fixture-extractor@0.1.0",
    startedAt: NOW,
    completedAt: NOW,
    status: "partial",
    warnings: ["venue address incomplete"],
  },
];

export const ingestionExtractedRecords: CampExtractedRecord[] = [
  {
    id: "ext-session-changed",
    extractionRunId: "run-nutty-changed",
    recordType: "session",
    sourceIdentity: "nutty:session:jul-13-17-2026",
    rawFields: {
      title: "Nutty Summer Science Camp",
      ages: "6-11",
      price: "$425",
      hours: "9:00-16:00",
      dates: "July 13-17, 2026",
    },
    normalizedFields: {
      externalId: "nutty:session:jul-13-17-2026",
      programId: publishedProgram.id,
      startDate: "2026-07-13",
      endDate: "2026-07-17",
      ageMin: 6,
      ageMax: 11,
      priceAmount: 425,
      coreHoursStart: "09:00",
      coreHoursEnd: "16:00",
      registrationUrl: "https://www.nuttyscientists.ca/register?session=jul13",
      venueName: "Nutty Lab — Port Credit",
    },
    confidence: 0.96,
    warnings: [],
  },
  {
    id: "ext-session-unchanged",
    extractionRunId: "run-nutty-changed",
    recordType: "session",
    sourceIdentity: "nutty:session:jul-13-17-2026-mirror",
    rawFields: { price: "$399", ages: "6-10" },
    normalizedFields: {
      externalId: "nutty:session:jul-13-17-2026",
      programId: publishedProgram.id,
      startDate: "2026-07-13",
      endDate: "2026-07-17",
      ageMin: 6,
      ageMax: 10,
      priceAmount: 399,
      coreHoursStart: "09:00",
      coreHoursEnd: "16:00",
      registrationUrl: "https://www.nuttyscientists.ca/register?session=jul13",
      venueName: "Nutty Lab — Port Credit",
    },
    confidence: 0.97,
    warnings: [],
  },
  {
    id: "ext-session-new-week",
    extractionRunId: "run-nutty-changed",
    recordType: "session",
    sourceIdentity: "nutty:session:jul-20-24-2026",
    rawFields: { dates: "July 20-24, 2026", price: "$425" },
    normalizedFields: {
      externalId: "nutty:session:jul-20-24-2026",
      programId: publishedProgram.id,
      startDate: "2026-07-20",
      endDate: "2026-07-24",
      ageMin: 6,
      ageMax: 11,
      priceAmount: 425,
      coreHoursStart: "09:00",
      coreHoursEnd: "16:00",
      registrationUrl: "https://www.nuttyscientists.ca/register?session=jul20",
      venueName: "Nutty Lab — Port Credit",
    },
    confidence: 0.93,
    warnings: [],
  },
  {
    id: "ext-program-new-camp",
    extractionRunId: "run-partial-new-camp",
    recordType: "program",
    sourceIdentity: "robotics-quest:program:summer-2026",
    rawFields: { name: "Robotics Quest Summer" },
    normalizedFields: {
      externalId: "robotics-quest:program:summer-2026",
      providerId: "prov-robotics-quest",
      name: "Robotics Quest Summer",
      typicalAgeMin: 8,
      typicalAgeMax: 12,
    },
    confidence: 0.88,
    warnings: ["provider not yet in catalog"],
  },
  {
    id: "ext-program-ambiguous",
    extractionRunId: "run-nutty-changed",
    recordType: "program",
    sourceIdentity: "name-only:science-camp",
    rawFields: { name: "Science Camp" },
    normalizedFields: { name: "Science Camp" },
    confidence: 0.55,
    warnings: ["name-only match is ambiguous"],
  },
  {
    id: "ext-session-cancelled",
    extractionRunId: "run-nutty-changed",
    recordType: "session",
    sourceIdentity: "nutty:session:aug-10-14-2026",
    rawFields: { status: "cancelled" },
    normalizedFields: {
      externalId: "nutty:session:aug-10-14-2026",
      programId: publishedProgram.id,
      startDate: "2026-08-10",
      endDate: "2026-08-14",
      registrationStatus: "registration_closed",
      cancelled: true,
    },
    confidence: 0.9,
    warnings: ["session marked cancelled on source"],
  },
];

const publishedSessionFields: Record<string, unknown> = {
  startDate: publishedSession.startDate,
  endDate: publishedSession.endDate,
  ageMin: publishedSession.ageMin,
  ageMax: publishedSession.ageMax,
  priceAmount: publishedSession.priceAmount,
  coreHoursStart: publishedSession.coreHoursStart,
  coreHoursEnd: publishedSession.coreHoursEnd,
  registrationUrl: publishedSession.registrationUrl,
};

const changedProposed: Record<string, unknown> = {
  startDate: "2026-07-13",
  endDate: "2026-07-17",
  ageMin: 6,
  ageMax: 11,
  priceAmount: 425,
  coreHoursStart: "09:00",
  coreHoursEnd: "16:00",
  registrationUrl: "https://www.nuttyscientists.ca/register?session=jul13",
};

export const ingestionCandidates: CampCandidate[] = [
  {
    id: "cand-session-changed",
    candidateType: "session",
    sourceRecordIds: ["ext-session-changed"],
    matchedCatalogId: publishedSession.id,
    matchConfidence: 0.96,
    candidateData: changedProposed,
    changeSet: generateChangeSet(publishedSessionFields, changedProposed, {
      confidenceByField: { ageMax: 0.92, priceAmount: 0.98 },
      sourceSnapshotId: "snap-nutty-provider-changed",
    }),
    status: "needs_review",
    reviewReason: "Price and age max changed on official provider page",
    qualityFlags: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cand-session-unchanged",
    candidateType: "session",
    sourceRecordIds: ["ext-session-unchanged"],
    matchedCatalogId: publishedSession.id,
    matchConfidence: 0.97,
    candidateData: publishedSessionFields,
    changeSet: [],
    status: "matched",
    reviewReason: "Hash/content equivalent — no material field changes",
    qualityFlags: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cand-session-new-week",
    candidateType: "session",
    sourceRecordIds: ["ext-session-new-week"],
    matchedCatalogId: null,
    matchConfidence: 0.85,
    candidateData: {
      programId: publishedProgram.id,
      startDate: "2026-07-20",
      endDate: "2026-07-24",
      ageMin: 6,
      ageMax: 11,
      priceAmount: 425,
      coreHoursStart: "09:00",
      coreHoursEnd: "16:00",
      registrationUrl: "https://www.nuttyscientists.ca/register?session=jul20",
    },
    changeSet: generateChangeSet(
      null,
      {
        startDate: "2026-07-20",
        endDate: "2026-07-24",
        ageMin: 6,
        ageMax: 11,
        priceAmount: 425,
      },
      { sourceSnapshotId: "snap-nutty-provider-changed" },
    ),
    status: "new",
    reviewReason: "New session week under existing program",
    qualityFlags: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cand-program-new",
    candidateType: "program",
    sourceRecordIds: ["ext-program-new-camp"],
    matchedCatalogId: null,
    matchConfidence: 0,
    candidateData: {
      name: "Robotics Quest Summer",
      typicalAgeMin: 8,
      typicalAgeMax: 12,
      externalId: "robotics-quest:program:summer-2026",
    },
    changeSet: generateChangeSet(
      null,
      {
        name: "Robotics Quest Summer",
        typicalAgeMin: 8,
        typicalAgeMax: 12,
      },
      { defaultConfidence: 0.88 },
    ),
    status: "new",
    reviewReason: "Completely new camp program",
    qualityFlags: ["missing_location", "missing_registration_url"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cand-program-ambiguous",
    candidateType: "program",
    sourceRecordIds: ["ext-program-ambiguous"],
    matchedCatalogId: null,
    matchConfidence: 0.3,
    candidateData: { name: "Science Camp" },
    changeSet: [],
    status: "needs_review",
    reviewReason: "Ambiguous program name — multiple possible catalog hits",
    qualityFlags: ["ambiguous_match"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cand-session-cancelled",
    candidateType: "session",
    sourceRecordIds: ["ext-session-cancelled"],
    matchedCatalogId: null,
    matchConfidence: 0.9,
    candidateData: {
      startDate: "2026-08-10",
      endDate: "2026-08-14",
      cancelled: true,
      registrationStatus: "registration_closed",
    },
    changeSet: generateChangeSet(
      null,
      {
        startDate: "2026-08-10",
        endDate: "2026-08-14",
        cancelled: true,
      },
      { defaultConfidence: 0.9 },
    ),
    status: "needs_review",
    reviewReason: "Removed/cancelled session candidate from source",
    qualityFlags: ["missing_price", "missing_age"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cand-duplicate-source",
    candidateType: "session",
    sourceRecordIds: ["ext-session-changed", "ext-session-unchanged"],
    matchedCatalogId: publishedSession.id,
    matchConfidence: 0.9,
    candidateData: changedProposed,
    changeSet: generateChangeSet(publishedSessionFields, changedProposed, {
      sourceSnapshotId: "snap-nutty-provider-changed",
    }),
    status: "needs_review",
    reviewReason: "Duplicate source URLs resolve to the same canonical page",
    qualityFlags: ["possible_duplicate", "conflicting_sources"],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export type IngestionFixturesBundle = {
  DEV_ONLY_INGESTION_FIXTURES: true;
  sources: CampSource[];
  snapshots: CampSourceSnapshot[];
  extractionRuns: CampExtractionRun[];
  extractedRecords: CampExtractedRecord[];
  candidates: CampCandidate[];
  published: IngestionCatalogSnapshot;
  scenarioIds: {
    changedExistingSession: "cand-session-changed";
    unchangedSession: "cand-session-unchanged";
    newSessionUnderProgram: "cand-session-new-week";
    completelyNewCamp: "cand-program-new";
    ambiguousProgramMatch: "cand-program-ambiguous";
    duplicateSource: "cand-duplicate-source";
    blockedSource: "src-blocked-municipal";
    failedExtraction: "run-failed";
    cancelledSession: "cand-session-cancelled";
  };
};

export function buildIngestionFixturesBundle(): IngestionFixturesBundle {
  return {
    DEV_ONLY_INGESTION_FIXTURES,
    sources: ingestionSources,
    snapshots: ingestionSnapshots,
    extractionRuns: ingestionExtractionRuns,
    extractedRecords: ingestionExtractedRecords,
    candidates: ingestionCandidates,
    published: {
      providers: [publishedProvider],
      programs: [publishedProgram],
      sessions: [publishedSession],
      venues: [publishedVenue],
    },
    scenarioIds: {
      changedExistingSession: "cand-session-changed",
      unchangedSession: "cand-session-unchanged",
      newSessionUnderProgram: "cand-session-new-week",
      completelyNewCamp: "cand-program-new",
      ambiguousProgramMatch: "cand-program-ambiguous",
      duplicateSource: "cand-duplicate-source",
      blockedSource: "src-blocked-municipal",
      failedExtraction: "run-failed",
      cancelledSession: "cand-session-cancelled",
    },
  };
}
