/**
 * Rebuild Creative Kids Place gold expected JSON from the saved HTML fixture.
 * Run: npx tsx scripts/rebuild-ckp-expected.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  creativeKidsPlaceExtractor,
  parseCreativeKidsPlaceFacts,
} from "@/lib/camps/ingestion/extractors/creativeKidsPlaceExtractor";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";
import { creativeKidsPlaceSource } from "@/lib/camps/ingestion/sources/seedSources";

const SOURCE_URL =
  "https://www.creativekidsplace.ca/pages/camps/summer-camp-square-one-mississauga-on";
const HTML_PATH =
  "data/camps/ingestion/benchmarks/creative-kids-place-square-one.html";
const EXPECTED_PATH =
  "data/camps/ingestion/benchmarks/creative-kids-place.expected.json";

const html = readFileSync(HTML_PATH, "utf8");
const previous = JSON.parse(readFileSync(EXPECTED_PATH, "utf8")) as {
  benchmark: Record<string, unknown>;
  facts: unknown;
};

const document = cleanHtmlToDocument(html, { baseUrl: SOURCE_URL });
const facts = parseCreativeKidsPlaceFacts(document, { sourceUrl: SOURCE_URL });

const source = creativeKidsPlaceSource(new Date("2026-09-12T16:00:00.000Z"));
const extracted = creativeKidsPlaceExtractor.extract({
  source,
  snapshot: {
    id: "snap-ckp-benchmark",
    sourceId: source.id,
    retrievedAt: "2026-09-12T16:00:00.000Z",
    httpStatus: 200,
    contentType: "text/html",
    contentHash: hashSourceContent(html),
    rawContent: html,
    fetchStatus: "success",
  },
  document,
  rawHtml: html,
  extractionRunId: "run-ckp-benchmark",
  newId: createSequentialIdFactory("ext"),
  now: new Date("2026-09-12T16:00:00.000Z"),
});

const sessionWindows = new Set(
  facts.offerings.map((offering) => `${offering.startDate}:${offering.endDate}`),
);

const next = {
  ...previous,
  benchmark: {
    ...previous.benchmark,
    weekCount: facts.weeks.length,
    offeringCount: facts.offerings.length,
    sessionWindowCount: sessionWindows.size,
    note:
      "Week 1 heading splits into two short-week session windows: Jun 29–30 and Jul 2–3. Aug 4–7 remains its own short-week window.",
  },
  facts: JSON.parse(JSON.stringify(facts)),
};

writeFileSync(EXPECTED_PATH, `${JSON.stringify(next, null, 2)}\n`);

const sessions = extracted.records.filter((record) => record.recordType === "session");
console.log(
  JSON.stringify(
    {
      weeks: facts.weeks.length,
      offerings: facts.offerings.length,
      sessionWindows: sessionWindows.size,
      extractSessions: sessions.length,
      week1: facts.weeks
        .filter((week) => week.weekNumber === 1)
        .map((week) => ({
          weekIdentity: week.weekIdentity,
          startDate: week.startDate,
          endDate: week.endDate,
          isShortWeek: week.isShortWeek,
        })),
    },
    null,
    2,
  ),
);
