/**
 * One-shot live fetch check for the allowlisted camp source.
 *
 *   COMPASS_CAMPS_LIVE_FETCH=1 npx tsx scripts/camps/ingestionLiveFetch.ts
 *
 * Runs the real fetcher — allowlist, SSRF checks, timeout, byte cap, redirect
 * budget — against the provider's own page, then reads the result with the real
 * extractor and prints what it found. Exactly one request.
 *
 * Without `COMPASS_CAMPS_LIVE_FETCH` it refuses to run: opening a socket to a
 * provider must always be a deliberate act.
 */

import { lookup } from "node:dns/promises";
import { assertLiveSourceFetchEnabled } from "@/lib/camps/ingestion/devGate";
import { creativeKidsPlaceExtractor } from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { HttpCampSourceFetcher } from "@/lib/camps/ingestion/httpFetcher";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import {
  CAMP_FETCH_ALLOWLIST,
  creativeKidsPlaceSource,
} from "@/lib/camps/ingestion/sources/seedSources";

async function resolveHost(hostname: string): Promise<string[]> {
  const addresses = await lookup(hostname, { all: true });
  return addresses.map((entry) => entry.address);
}

async function main(): Promise<void> {
  assertLiveSourceFetchEnabled();

  const source = creativeKidsPlaceSource();
  const fetcher = new HttpCampSourceFetcher({
    allowedSourceIds: CAMP_FETCH_ALLOWLIST,
    resolveHost,
  });

  console.log(`source:      ${source.id}`);
  console.log(`url:         ${source.sourceUrl}`);
  console.log(`allowlisted: ${fetcher.isAllowed(source.id)}`);

  const snapshot = await fetcher.fetchSource(source, { snapshotId: "live-check" });
  console.log(`status:      ${snapshot.fetchStatus} (http ${snapshot.httpStatus ?? "—"})`);
  console.log(`error:       ${snapshot.fetchError ?? "none"}`);
  console.log(`hash:        ${snapshot.contentHash}`);
  console.log(`bytes:       ${snapshot.rawContent?.length ?? 0}`);
  console.log(`metadata:    ${JSON.stringify(snapshot.rawMetadata ?? {})}`);

  if (snapshot.fetchStatus !== "success" || !snapshot.rawContent) {
    console.log("\nNo content to extract.");
    return;
  }

  const document = cleanHtmlToDocument(snapshot.rawContent, { baseUrl: source.canonicalUrl });
  const result = creativeKidsPlaceExtractor.extract({
    source,
    snapshot,
    document,
    rawHtml: snapshot.rawContent,
    extractionRunId: "live-check-run",
    newId: createSequentialIdFactory("live"),
  });

  console.log(`\nextraction:  ${result.status}`);
  console.log(`warnings:    ${result.warnings.join(", ") || "none"}`);
  for (const record of result.records) {
    const { observations, ...fields } = record.normalizedFields;
    void observations;
    console.log(`\n${record.recordType} (${record.confidence.toFixed(2)})`);
    console.log(JSON.stringify(fields, null, 2));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
