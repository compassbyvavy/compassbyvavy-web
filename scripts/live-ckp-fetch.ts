/**
 * Controlled live fetch for Prompt 8A — registered Creative Kids Place source only.
 * Does not commit. Does not publish.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { HttpCampSourceFetcher } from "@/lib/camps/ingestion/httpFetcher";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import {
  creativeKidsPlaceExtractor,
  parseCreativeKidsPlaceFacts,
} from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
import { createMemoryIngestionStore } from "@/lib/camps/ingestion/repositories/memoryStore";
import { registerSeedCampSources, CREATIVE_KIDS_PLACE_SOURCE_ID, CREATIVE_KIDS_PLACE_SOURCE_URL } from "@/lib/camps/ingestion/sources/seedSources";
import { runCampSource } from "@/lib/camps/ingestion/runner/runDueCampSources";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { CAMP_FETCH_ALLOWLIST } from "@/lib/camps/ingestion/sources/seedSources";

async function main() {
  const store = createMemoryIngestionStore();
  await registerSeedCampSources(store);
  const source = await store.sources.getSource(CREATIVE_KIDS_PLACE_SOURCE_ID);
  if (!source) {
    console.log(JSON.stringify({ ok: false, reason: "seed_missing" }, null, 2));
    process.exit(1);
  }

  const fetcher = new HttpCampSourceFetcher({
    allowedSourceIds: CAMP_FETCH_ALLOWLIST,
  });

  const newId = createSequentialIdFactory("live");
  let liveError: string | null = null;
  let result: Awaited<ReturnType<typeof runCampSource>> | null = null;
  try {
    result = await runCampSource({
      sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
      store,
      fetcher,
      catalog: { providers: [], programs: [], sessions: [], venues: [] },
      now: () => new Date(),
      newId,
    });
  } catch (error) {
    liveError = error instanceof Error ? error.message : String(error);
  }

  const snapshot = await store.snapshots.latestSnapshot(CREATIVE_KIDS_PLACE_SOURCE_ID);
  const goldHtml = readFileSync(
    "data/camps/ingestion/benchmarks/creative-kids-place-square-one.html",
    "utf8",
  );
  const goldDoc = cleanHtmlToDocument(goldHtml, { baseUrl: CREATIVE_KIDS_PLACE_SOURCE_URL });
  const goldFacts = parseCreativeKidsPlaceFacts(goldDoc, { sourceUrl: CREATIVE_KIDS_PLACE_SOURCE_URL });

  let liveFacts = null;
  if (snapshot?.rawContent && snapshot.fetchStatus === "success") {
    const liveDoc = cleanHtmlToDocument(snapshot.rawContent, {
      baseUrl: source.canonicalUrl,
    });
    liveFacts = parseCreativeKidsPlaceFacts(liveDoc, { sourceUrl: source.canonicalUrl });
  }

  const classify = (field: string, gold: unknown, live: unknown) => {
    if (liveFacts == null) return { field, classification: "LIVE_UNAVAILABLE", gold, live };
    if (JSON.stringify(gold) === JSON.stringify(live)) {
      return { field, classification: "MATCH", gold, live };
    }
    return { field, classification: "SOURCE_CHANGED_OR_EXTRACTION_DIFF", gold, live };
  };

  const comparisons = liveFacts
    ? [
        classify("ageMin", goldFacts.program.ageMin, liveFacts.program.ageMin),
        classify("ageMax", goldFacts.program.ageMax, liveFacts.program.ageMax),
        classify("seasonStart", goldFacts.program.seasonStartDate, liveFacts.program.seasonStartDate),
        classify("seasonEnd", goldFacts.program.seasonEndDate, liveFacts.program.seasonEndDate),
        classify("hoursStart", goldFacts.program.coreHoursStart, liveFacts.program.coreHoursStart),
        classify("hoursEnd", goldFacts.program.coreHoursEnd, liveFacts.program.coreHoursEnd),
        classify("fullWeek", goldFacts.priceTiers.find((t) => t.key === "full_week")?.priceAmount, liveFacts.priceTiers.find((t) => t.key === "full_week")?.priceAmount),
        classify("shortWeek", goldFacts.priceTiers.find((t) => t.key === "short_week")?.priceAmount, liveFacts.priceTiers.find((t) => t.key === "short_week")?.priceAmount),
        classify("creatorCamp", goldFacts.priceTiers.find((t) => t.key === "creator_camp")?.priceAmount, liveFacts.priceTiers.find((t) => t.key === "creator_camp")?.priceAmount),
        classify("venueAddress", goldFacts.venue?.addressLine, liveFacts.venue?.addressLine),
        classify("businessAddress", goldFacts.businessAddress?.addressLine, liveFacts.businessAddress?.addressLine),
        classify("platform", goldFacts.provider.registrationPlatform, liveFacts.provider.registrationPlatform),
        classify("nutFree", goldFacts.policies.nutFree, liveFacts.policies.nutFree),
        classify("extendedFee", goldFacts.policies.extendedHoursFeeCad, liveFacts.policies.extendedHoursFeeCad),
        classify("cancelWeeks", goldFacts.policies.cancellationNoticeWeeks, liveFacts.policies.cancellationNoticeWeeks),
        classify("cancelFee", goldFacts.policies.cancellationFeeCad, liveFacts.policies.cancellationFeeCad),
        classify("ratioGeneral", goldFacts.policies.staffRatioGeneral, liveFacts.policies.staffRatioGeneral),
        classify("ratioYoungest", goldFacts.policies.staffRatioYoungest, liveFacts.policies.staffRatioYoungest),
        classify("knownGaps", goldFacts.knownGaps, liveFacts.knownGaps),
      ]
    : [];

  const report = {
    sourceId: CREATIVE_KIDS_PLACE_SOURCE_ID,
    sourceUrl: CREATIVE_KIDS_PLACE_SOURCE_URL,
    liveError,
    run: result,
    snapshot: snapshot
      ? {
          id: snapshot.id,
          httpStatus: snapshot.httpStatus,
          contentType: snapshot.contentType,
          fetchStatus: snapshot.fetchStatus,
          fetchError: snapshot.fetchError,
          contentHash: snapshot.contentHash,
          finalUrl: (snapshot.rawMetadata as { finalUrl?: string } | null)?.finalUrl ?? null,
          goldHash: hashSourceContent(goldHtml),
          hashMatchesGold: snapshot.contentHash === hashSourceContent(goldHtml),
          byteLength: snapshot.rawContent?.length ?? 0,
        }
      : null,
    extractor: creativeKidsPlaceExtractor.key,
    liveFacts,
    goldFactsSummary: {
      ages: [goldFacts.program.ageMin, goldFacts.program.ageMax],
      prices: goldFacts.priceTiers.map((t) => [t.key, t.priceAmount]),
      gaps: goldFacts.knownGaps,
    },
    comparisons,
  };

  writeFileSync("/tmp/ckp-live-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
