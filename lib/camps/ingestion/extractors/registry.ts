/**
 * Extractor registry.
 *
 * Resolution order: the key recorded on the source (an operator decision),
 * then a site-specific extractor that recognizes the page, then the generic
 * fallback. Site-specific extractors are always preferred — the generic one is
 * a starting point, not a destination.
 */

import type { CampSource } from "@/data/camps/ingestion/types";
import {
  CREATIVE_KIDS_PLACE_EXTRACTOR_KEY,
  creativeKidsPlaceExtractor,
} from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
import {
  GENERIC_HTML_EXTRACTOR_KEY,
  genericHtmlExtractor,
} from "@/lib/camps/ingestion/extractors/genericHtmlExtractor";
import type {
  CampExtractor,
  ExtractorSupportInput,
} from "@/lib/camps/ingestion/extractors/types";

/** Site-specific extractors, most specific first. */
export const SITE_EXTRACTORS: readonly CampExtractor[] = [creativeKidsPlaceExtractor];

export const CAMP_EXTRACTORS: readonly CampExtractor[] = [
  ...SITE_EXTRACTORS,
  genericHtmlExtractor,
];

export function listExtractorKeys(): string[] {
  return CAMP_EXTRACTORS.map((extractor) => extractor.key);
}

export function getExtractorByKey(key: string | null | undefined): CampExtractor | null {
  if (!key) return null;
  return CAMP_EXTRACTORS.find((extractor) => extractor.key === key) ?? null;
}

export type ResolveExtractorInput = ExtractorSupportInput & {
  /** Extractor list override (tests, one-off runs). */
  extractors?: readonly CampExtractor[];
};

export function resolveExtractor(input: ResolveExtractorInput): CampExtractor {
  const available = input.extractors ?? CAMP_EXTRACTORS;
  const keyed = input.source.extractorKey
    ? available.find((extractor) => extractor.key === input.source.extractorKey)
    : null;
  if (keyed) return keyed;

  const recognized = available.find(
    (extractor) => extractor.key !== GENERIC_HTML_EXTRACTOR_KEY && extractor.supports(input),
  );
  if (recognized) return recognized;

  return (
    available.find((extractor) => extractor.key === GENERIC_HTML_EXTRACTOR_KEY) ??
    genericHtmlExtractor
  );
}

/** Extractor key to record on a newly registered source, when recognizable. */
export function suggestExtractorKey(source: Pick<CampSource, "canonicalUrl">): string {
  if (/creativekidsplace\.(ca|com)/i.test(source.canonicalUrl)) {
    return CREATIVE_KIDS_PLACE_EXTRACTOR_KEY;
  }
  return GENERIC_HTML_EXTRACTOR_KEY;
}
