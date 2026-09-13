/**
 * Tests for the generic HTML fallback extractor.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import { genericHtmlExtractor } from "@/lib/camps/ingestion/extractors/genericHtmlExtractor";
import { cleanHtmlToDocument } from "@/lib/camps/ingestion/html/cleanHtml";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createSequentialIdFactory } from "@/lib/camps/ingestion/ids";

const source: CampSource = {
  id: "src-nutty",
  providerId: "prov-nutty-scientists",
  sourceType: "provider_website",
  sourceUrl: "https://www.nuttyscientists.ca/summer-camp?utm_source=demo",
  canonicalUrl: "https://www.nuttyscientists.ca/summer-camp",
  registrationPlatform: null,
  isActive: true,
  crawlStrategy: "html",
  crawlFrequency: "daily",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-09-12T16:00:00.000Z",
};

function run(html: string) {
  const snapshot: CampSourceSnapshot = {
    id: "snap-1",
    sourceId: source.id,
    retrievedAt: "2026-09-12T16:00:00.000Z",
    contentHash: hashSourceContent(html),
    rawContent: html,
    fetchStatus: "success",
  };
  return genericHtmlExtractor.extract({
    source,
    snapshot,
    document: cleanHtmlToDocument(html, { baseUrl: source.canonicalUrl }),
    rawHtml: html,
    extractionRunId: "run-1",
    newId: createSequentialIdFactory("ext"),
    now: new Date("2026-09-12T16:00:00.000Z"),
  });
}

describe("genericHtmlExtractor", () => {
  it("reads the facts a camp page states in plain sight", () => {
    const result = run(
      "<html><body><h1>Nutty Summer Science Camp</h1><p>Ages 6-11</p>" +
        "<p>July 13-17, 2026 · 9:00-16:00</p><p>Price $425 CAD</p>" +
        '<a href="/register?session=jul13">Register now</a></body></html>',
    );

    assert.equal(result.status, "success");
    assert.deepEqual(
      result.records.map((record) => record.recordType),
      ["program", "session"],
    );

    const session = result.records[1].normalizedFields;
    assert.equal(session.programName, "Nutty Summer Science Camp");
    assert.equal(session.startDate, "2026-07-13");
    assert.equal(session.endDate, "2026-07-17");
    assert.equal(session.ageMin, 6);
    assert.equal(session.ageMax, 11);
    assert.equal(session.priceAmount, 425);
    assert.equal(session.coreHoursStart, "09:00");
    assert.equal(session.coreHoursEnd, "16:00");
    assert.equal(
      session.registrationUrl,
      "https://www.nuttyscientists.ca/register?session=jul13",
    );
    assert.equal(session.providerId, "prov-nutty-scientists");
  });

  it("labels itself low-confidence so a site extractor replaces it", () => {
    const result = run("<h1>Camp</h1><p>Ages 6-10</p><p>Price $200</p>");
    assert.ok(result.warnings.includes("generic_extractor_low_confidence"));
    for (const record of result.records) {
      assert.ok(record.confidence < 0.9);
      assert.deepEqual(record.warnings, ["generic_extractor_low_confidence"]);
    }
  });

  it("never invents a year for a dateless week", () => {
    const result = run("<h1>Summer Camp</h1><p>Ages 5-9</p><p>July 6th - 10th</p>");
    const session = result.records.find((record) => record.recordType === "session");
    assert.equal(session, undefined);
    assert.ok(result.warnings.includes("year_not_stated"));
  });

  it("borrows a year only when the page states one elsewhere", () => {
    const result = run(
      "<title>Summer Camp 2026</title><h1>Summer Camp 2026</h1><p>Ages 5-9</p><p>July 6 - 10</p>",
    );
    const session = result.records.find((record) => record.recordType === "session");
    assert.equal(session?.normalizedFields.startDate, "2026-07-06");
    assert.ok(result.warnings.includes("year_from_document_context"));
  });

  it("reports partial extraction when a page states almost nothing", () => {
    const result = run("<h1>Camp Registration</h1><p>Ages 6-10</p>");
    assert.equal(result.status, "partial");
    assert.ok(result.warnings.includes("extraction_partial_facts"));
  });

  it("fails cleanly on a page with no camp facts at all", () => {
    const result = run("<html><body><script>var a = 1;</script></body></html>");
    assert.equal(result.status, "failed");
    assert.deepEqual(result.records, []);
    assert.ok(result.warnings.includes("no_recognizable_camp_facts"));
  });

  it("detects the registration platform from the outbound link", () => {
    const result = run(
      '<h1>Camp</h1><p>Ages 6-10</p><p>June 1 - 5, 2026</p><a href="https://app.activitymessenger.com/x/y">Register</a>',
    );
    const program = result.records[0].normalizedFields;
    assert.equal(program.registrationPlatform, "Activity Messenger");
  });
});
