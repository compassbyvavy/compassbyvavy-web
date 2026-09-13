/**
 * Fallback extractor for any HTML camp page.
 *
 * It reads only what a page states in plain sight — a name, an age band, a date
 * window, daily hours, a price, a registration link — and records where each
 * value came from. Everything it produces is discounted in confidence and
 * warned as `generic_extractor_low_confidence`, because a page written for
 * humans is not a schema: a site-specific extractor should replace it for any
 * source Compass cares about.
 *
 * It does not invent narrative, categories, or eligibility rules.
 */

import type { CampExtractedRecord } from "@/data/camps/ingestion/types";
import { clampConfidence } from "@/lib/camps/ingestion/confidence";
import {
  buildExtractedRecord,
  makeFieldObservation,
  type CampExtractor,
  type ExtractorInput,
  type ExtractorResult,
} from "@/lib/camps/ingestion/extractors/types";
import {
  documentLines,
  findAgeRange,
  findDateRange,
  findPrice,
  findTimeRange,
  statedDocumentYear,
} from "@/lib/camps/ingestion/extractors/textScan";
import {
  findRegistrationLink,
  normalizeRegistrationPlatform,
} from "@/lib/camps/ingestion/normalize/registrationPlatform";

export const GENERIC_HTML_EXTRACTOR_KEY = "generic_html";

/** A page read by a generic parser is never treated as a confident read. */
const GENERIC_CONFIDENCE_DISCOUNT = 0.9;
const GENERIC_WARNING = "generic_extractor_low_confidence";

function extract(input: ExtractorInput): ExtractorResult {
  const { document, source, snapshot, extractionRunId, newId } = input;
  const observedAt = (input.now ?? new Date()).toISOString();
  const lines = documentLines(document);

  const name = (document.headings[0] ?? document.title ?? "").trim();
  const ageHit = findAgeRange(lines);
  const dateScan = findDateRange(lines, { explicitYear: statedDocumentYear(document) });
  const dateHit = dateScan.hit;
  const timeHit = findTimeRange(lines);
  const priceHit = findPrice(lines);
  const registrationLink = findRegistrationLink(document.links);
  const registrationPlatform = normalizeRegistrationPlatform({
    links: document.links,
    text: document.text,
  });

  const factCount = [ageHit, dateHit, timeHit, priceHit].filter(Boolean).length;
  const warnings: string[] = [GENERIC_WARNING, ...dateScan.unparsedWarnings];
  for (const hit of [ageHit, dateHit, timeHit, priceHit]) {
    warnings.push(...(hit?.result.warnings ?? []));
  }

  if (name === "" && factCount === 0) {
    return {
      status: "failed",
      records: [],
      warnings: [...new Set([...warnings, "no_recognizable_camp_facts"])],
    };
  }

  const observation = <T,>(
    value: T,
    hit: { line: string; result: { confidence: number } } | null,
  ) =>
    makeFieldObservation(value, {
      rawValue: hit?.line ?? null,
      sourceUrl: source.canonicalUrl,
      sourceSnapshotId: snapshot.id,
      observedAt,
      confidence: clampConfidence((hit?.result.confidence ?? 0) * GENERIC_CONFIDENCE_DISCOUNT),
      extractionMethod: "regex",
    });

  const records: CampExtractedRecord[] = [];

  if (name !== "") {
    const programObservations: Record<string, unknown> = {
      name: observation(name, { line: name, result: { confidence: 0.8 } }),
    };
    if (ageHit) {
      programObservations.typicalAgeMin = observation(ageHit.result.value.ageMin, ageHit);
      programObservations.typicalAgeMax = observation(ageHit.result.value.ageMax, ageHit);
    }
    records.push(
      buildExtractedRecord({
        id: newId(),
        extractionRunId,
        recordType: "program",
        sourceIdentity: `${source.canonicalUrl}#program`,
        rawFields: { heading: document.headings[0] ?? null, title: document.title },
        normalizedFields: {
          providerId: source.providerId,
          name,
          typicalAgeMin: ageHit?.result.value.ageMin ?? null,
          typicalAgeMax: ageHit?.result.value.ageMax ?? null,
          registrationUrl: registrationLink?.href ?? null,
          registrationPlatform,
          sourceUrl: source.canonicalUrl,
          observations: programObservations,
        },
        confidence: clampConfidence(0.7 * GENERIC_CONFIDENCE_DISCOUNT),
        warnings: [GENERIC_WARNING],
      }),
    );
  }

  if (dateHit?.result.value.startDate) {
    const { startDate, endDate } = dateHit.result.value;
    const sessionObservations: Record<string, unknown> = {
      startDate: observation(startDate, dateHit),
      endDate: observation(endDate, dateHit),
    };
    if (ageHit) {
      sessionObservations.ageMin = observation(ageHit.result.value.ageMin, ageHit);
      sessionObservations.ageMax = observation(ageHit.result.value.ageMax, ageHit);
    }
    if (priceHit) {
      sessionObservations.priceAmount = observation(priceHit.result.value.amount, priceHit);
    }
    if (timeHit) {
      sessionObservations.coreHoursStart = observation(timeHit.result.value.startTime, timeHit);
      sessionObservations.coreHoursEnd = observation(timeHit.result.value.endTime, timeHit);
    }

    const contributing = [dateHit, ageHit, priceHit, timeHit]
      .filter((hit): hit is NonNullable<typeof hit> => hit !== null)
      .map((hit) => hit.result.confidence);

    records.push(
      buildExtractedRecord({
        id: newId(),
        extractionRunId,
        recordType: "session",
        sourceIdentity: `${source.canonicalUrl}#session:${startDate}`,
        rawFields: {
          dates: dateHit.line,
          ages: ageHit?.line ?? null,
          price: priceHit?.line ?? null,
          hours: timeHit?.line ?? null,
        },
        normalizedFields: {
          externalId: `${source.canonicalUrl}#session:${startDate}`,
          providerId: source.providerId,
          programName: name === "" ? null : name,
          startDate,
          endDate,
          ageMin: ageHit?.result.value.ageMin ?? null,
          ageMax: ageHit?.result.value.ageMax ?? null,
          priceAmount: priceHit?.result.value.amount ?? null,
          priceUnit: priceHit?.result.value.unit ?? null,
          currency: priceHit?.result.value.currency ?? null,
          coreHoursStart: timeHit?.result.value.startTime ?? null,
          coreHoursEnd: timeHit?.result.value.endTime ?? null,
          registrationUrl: registrationLink?.href ?? null,
          sourceUrl: source.canonicalUrl,
          observations: sessionObservations,
        },
        confidence: clampConfidence(
          Math.min(...contributing, 1) * GENERIC_CONFIDENCE_DISCOUNT,
        ),
        warnings: [GENERIC_WARNING],
      }),
    );
  }

  const status = records.length === 0 ? "failed" : factCount >= 2 ? "success" : "partial";
  if (status === "partial") warnings.push("extraction_partial_facts");

  return { status, records, warnings: [...new Set(warnings)] };
}

export const genericHtmlExtractor: CampExtractor = {
  key: GENERIC_HTML_EXTRACTOR_KEY,
  version: "0.2.0",
  /** Last-resort extractor: it accepts any HTML page. */
  supports: () => true,
  extract,
};
