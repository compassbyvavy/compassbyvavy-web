/**
 * Extractor contract.
 *
 * An extractor reads a cleaned document and reports what the source *states* —
 * nothing more. It never fills a gap from another page, another provider, or a
 * plausible default, and it never writes narrative copy: experience summaries,
 * packing lists, accessibility claims, and ratings are editorial, and scraped
 * HTML is not evidence for them.
 *
 * Extractors are versioned so a run can be traced to the parser that produced
 * it, and every uncertain read carries a warning instead of a quiet assumption.
 */

import type {
  CampExtractedRecord,
  CampSource,
  CampSourceSnapshot,
  CleanSourceDocument,
  ExtractedRecordType,
  ExtractionMethod,
  ExtractionRunStatus,
  FieldObservation,
} from "@/data/camps/ingestion/types";
import type { IdFactory } from "@/lib/camps/ingestion/ids";

export type ExtractorInput = {
  source: CampSource;
  snapshot: CampSourceSnapshot;
  document: CleanSourceDocument;
  rawHtml: string;
  extractionRunId: string;
  /** Ids for produced records — injected so runs can be deterministic. */
  newId: IdFactory;
  now?: Date;
};

export type ExtractorSupportInput = Pick<ExtractorInput, "source" | "document" | "rawHtml">;

export type ExtractorResult = {
  /** `failed` when the page yielded nothing usable; `partial` when facts are thin. */
  status: ExtractionRunStatus;
  records: CampExtractedRecord[];
  warnings: string[];
};

export interface CampExtractor {
  /** Registry key stored on `CampSource.extractorKey`. */
  readonly key: string;
  /** Recorded on the extraction run (`extractorVersion`). */
  readonly version: string;
  /** Cheap recognition check — no fetching, no side effects. */
  supports(input: ExtractorSupportInput): boolean;
  extract(input: ExtractorInput): ExtractorResult;
}

export function extractorVersionLabel(extractor: CampExtractor): string {
  return `${extractor.key}@${extractor.version}`;
}

export type FieldObservationOptions = {
  rawValue?: string | null;
  sourceUrl?: string | null;
  sourceSnapshotId?: string | null;
  observedAt?: string;
  confidence?: number;
  extractionMethod?: ExtractionMethod;
};

/**
 * Wrap a parsed value with its provenance. Stored inside
 * `CampExtractedRecord.normalizedFields.observations` so a reviewer can see the
 * raw text a field came from, which snapshot, and how it was read.
 */
export function makeFieldObservation<T>(
  value: T,
  options: FieldObservationOptions = {},
): FieldObservation<T> {
  return {
    value,
    rawValue: options.rawValue ?? null,
    sourceUrl: options.sourceUrl ?? null,
    sourceSnapshotId: options.sourceSnapshotId ?? null,
    observedAt: options.observedAt ?? new Date().toISOString(),
    confidence: options.confidence ?? 0,
    extractionMethod: options.extractionMethod ?? "regex",
  };
}

export type BuildRecordInput = {
  id: string;
  extractionRunId: string;
  recordType: ExtractedRecordType;
  sourceIdentity: string;
  rawFields: Record<string, unknown>;
  normalizedFields: Record<string, unknown>;
  confidence: number;
  warnings?: string[];
};

export function buildExtractedRecord(input: BuildRecordInput): CampExtractedRecord {
  return {
    id: input.id,
    extractionRunId: input.extractionRunId,
    recordType: input.recordType,
    sourceIdentity: input.sourceIdentity,
    rawFields: input.rawFields,
    normalizedFields: input.normalizedFields,
    confidence: input.confidence,
    warnings: input.warnings ?? [],
  };
}
