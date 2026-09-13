/**
 * Tests for the ingestion normalizers.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeAgeRange,
  normalizeDateRange,
  normalizePriceCad,
  normalizeTimeRange,
  normalizeUrl,
} from "@/lib/camps/ingestion/normalize";

describe("normalizeAgeRange", () => {
  it("parses the common range spellings", () => {
    for (const raw of [
      "Ages 4-12",
      "ages 4 – 12",
      "4 to 12 years",
      "Ages: 4—12 yrs",
      "For children 4 through 12",
    ]) {
      const result = normalizeAgeRange(raw);
      assert.deepEqual(result.value, { ageMin: 4, ageMax: 12 }, `failed on "${raw}"`);
      assert.equal(result.raw, raw.trim());
      assert.deepEqual(result.warnings, []);
    }
  });

  it("keeps an open-ended band honest", () => {
    const result = normalizeAgeRange("Ages 6+");
    assert.deepEqual(result.value, { ageMin: 6, ageMax: null });
    assert.deepEqual(result.warnings, ["open_ended_upper_bound"]);
  });

  it("handles upper-bound-only wording", () => {
    assert.deepEqual(normalizeAgeRange("up to 12 years").value, { ageMin: null, ageMax: 12 });
    assert.deepEqual(normalizeAgeRange("under 6").value, { ageMin: null, ageMax: 5 });
  });

  it("refuses grade bands and month-based ages", () => {
    assert.deepEqual(normalizeAgeRange("Grades 1-6").warnings, ["grade_band_not_age"]);
    assert.deepEqual(normalizeAgeRange("18 months - 3 years").warnings, ["age_unit_not_years"]);
    assert.deepEqual(normalizeAgeRange("Grades 1-6").value, { ageMin: null, ageMax: null });
  });

  it("refuses implausible and reversed ranges but keeps the raw text", () => {
    const tooBig = normalizeAgeRange("Ages 4-99");
    assert.deepEqual(tooBig.value, { ageMin: null, ageMax: null });
    assert.equal(tooBig.raw, "Ages 4-99");
    assert.deepEqual(normalizeAgeRange("Ages 12-4").warnings, ["age_range_reversed"]);
  });

  it("reports a single stated age at low confidence", () => {
    const result = normalizeAgeRange("Age 7 only");
    assert.deepEqual(result.value, { ageMin: 7, ageMax: 7 });
    assert.deepEqual(result.warnings, ["single_age_stated"]);
    assert.ok(result.confidence < 0.7);
  });

  it("fails cleanly on unusable input", () => {
    assert.equal(normalizeAgeRange("").confidence, 0);
    assert.deepEqual(normalizeAgeRange("school age").warnings, ["age_not_recognized"]);
  });
});

describe("normalizePriceCad", () => {
  it("parses plain dollar amounts and assumes CAD explicitly", () => {
    const result = normalizePriceCad("$350");
    assert.equal(result.value.amount, 350);
    assert.equal(result.value.currency, "CAD");
    assert.ok(result.warnings.includes("currency_symbol_only_assumed_cad"));
  });

  it("scores an explicit CAD marker higher", () => {
    const result = normalizePriceCad("CAD $350 per week");
    assert.equal(result.value.amount, 350);
    assert.equal(result.value.unit, "per_week");
    assert.equal(result.confidence, 0.97);
    assert.equal(result.warnings.includes("currency_symbol_only_assumed_cad"), false);
  });

  it("parses thousands separators and cents", () => {
    assert.equal(normalizePriceCad("$1,250.50").value.amount, 1250.5);
  });

  it("detects the price unit", () => {
    assert.equal(normalizePriceCad("$350 / week").value.unit, "per_week");
    assert.equal(normalizePriceCad("Full Week $350").value.unit, "per_week");
    assert.equal(normalizePriceCad("$105 per day").value.unit, "per_day");
    assert.equal(normalizePriceCad("$1,800 full program").value.unit, "full_program");
    assert.equal(normalizePriceCad("$280 each session").value.unit, "per_session");
  });

  it("keeps tax-on-top as a flag rather than folding it into the amount", () => {
    const result = normalizePriceCad("$350 + HST");
    assert.equal(result.value.amount, 350);
    assert.equal(result.value.taxExtra, true);
    assert.ok(result.warnings.includes("tax_charged_on_top"));
  });

  it("records a stated free camp as zero, not unknown", () => {
    const result = normalizePriceCad("Free drop-in week");
    assert.equal(result.value.amount, 0);
    assert.equal(result.value.currency, "CAD");
  });

  it("flags USD instead of silently treating it as CAD", () => {
    const result = normalizePriceCad("USD 350");
    assert.equal(result.value.currency, "USD");
    assert.ok(result.warnings.includes("currency_stated_usd"));
  });

  it("does not read a bare number as a price", () => {
    const result = normalizePriceCad("2026");
    assert.equal(result.value.amount, null);
    assert.deepEqual(result.warnings, ["price_not_recognized"]);
  });

  it("uses the first amount and says so when several appear", () => {
    const result = normalizePriceCad("$350 full week, $280 short week");
    assert.equal(result.value.amount, 350);
    assert.ok(result.warnings.includes("multiple_amounts_found_using_first"));
  });

  it("rejects implausible amounts", () => {
    assert.equal(normalizePriceCad("$9,051,234,567 cost").value.amount, null);
  });
});

describe("normalizeTimeRange", () => {
  it("parses explicit meridiem ranges", () => {
    const result = normalizeTimeRange("9:00 a.m. – 4:00 p.m.");
    assert.deepEqual(result.value, { startTime: "09:00", endTime: "16:00" });
    assert.deepEqual(result.warnings, []);
    assert.equal(result.confidence, 0.95);
  });

  it("infers a daytime clock for bare camp hours and says so", () => {
    const result = normalizeTimeRange("9:00 - 4:00");
    assert.deepEqual(result.value, { startTime: "09:00", endTime: "16:00" });
    assert.deepEqual(result.warnings, ["meridiem_inferred"]);
  });

  it("keeps a morning-only window in the morning", () => {
    assert.deepEqual(normalizeTimeRange("9:00-11:30").value, {
      startTime: "09:00",
      endTime: "11:30",
    });
  });

  it("reads an afternoon start as afternoon", () => {
    assert.deepEqual(normalizeTimeRange("1:00-4:00").value, {
      startTime: "13:00",
      endTime: "16:00",
    });
  });

  it("handles noon and 24-hour input", () => {
    assert.deepEqual(normalizeTimeRange("9:00 to noon").value, {
      startTime: "09:00",
      endTime: "12:00",
    });
    assert.deepEqual(normalizeTimeRange("09:30 - 16:30").value, {
      startTime: "09:30",
      endTime: "16:30",
    });
  });

  it("reports a single stated time without inventing an end", () => {
    const result = normalizeTimeRange("Drop-off at 8:45 am");
    assert.deepEqual(result.value, { startTime: "08:45", endTime: null });
    assert.ok(result.warnings.includes("single_time_stated"));
  });

  it("fails cleanly when no time is present", () => {
    const result = normalizeTimeRange("hours vary by week");
    assert.deepEqual(result.value, { startTime: null, endTime: null });
    assert.equal(result.confidence, 0);
  });
});

describe("normalizeDateRange", () => {
  it("parses a named-month range with the year stated once", () => {
    const result = normalizeDateRange("June 29 – August 28, 2026");
    assert.equal(result.value.startDate, "2026-06-29");
    assert.equal(result.value.endDate, "2026-08-28");
    assert.equal(result.value.yearInferred, true);
    assert.ok(result.warnings.includes("start_year_shared_from_range"));
  });

  it("parses a range with both years stated at full confidence", () => {
    const result = normalizeDateRange("Aug 3, 2026 to Aug 7, 2026");
    assert.equal(result.value.startDate, "2026-08-03");
    assert.equal(result.value.endDate, "2026-08-07");
    assert.equal(result.value.yearInferred, false);
    assert.equal(result.confidence, 0.97);
  });

  it("parses one month with two day numbers", () => {
    const result = normalizeDateRange("July 6th - 10th, 2026");
    assert.equal(result.value.startDate, "2026-07-06");
    assert.equal(result.value.endDate, "2026-07-10");
  });

  it("parses ISO ranges", () => {
    const result = normalizeDateRange("2026-06-29 to 2026-08-28");
    assert.equal(result.value.startDate, "2026-06-29");
    assert.equal(result.value.endDate, "2026-08-28");
  });

  it("never invents a year when the source states none", () => {
    const result = normalizeDateRange("July 6th - 10th");
    assert.deepEqual(result.value, { startDate: null, endDate: null, yearInferred: false });
    assert.equal(result.raw, "July 6th - 10th");
    assert.deepEqual(result.warnings, ["year_not_stated"]);
    assert.equal(result.confidence, 0);
  });

  it("uses a document-context year only when the caller supplies a stated one", () => {
    const result = normalizeDateRange("July 6 - 10", { explicitYear: 2026 });
    assert.equal(result.value.startDate, "2026-07-06");
    assert.equal(result.value.endDate, "2026-07-10");
    assert.equal(result.value.yearInferred, true);
    assert.ok(result.warnings.includes("year_from_document_context"));
  });

  it("rolls the start back a year when a window crosses New Year", () => {
    const result = normalizeDateRange("December 29 – January 2, 2027");
    assert.equal(result.value.startDate, "2026-12-29");
    assert.equal(result.value.endDate, "2027-01-02");
    assert.ok(result.warnings.includes("range_crosses_year_boundary"));
  });

  it("reports a single stated date without inventing an end", () => {
    const result = normalizeDateRange("July 6, 2026");
    assert.equal(result.value.startDate, "2026-07-06");
    assert.equal(result.value.endDate, null);
    assert.ok(result.warnings.includes("single_date_stated"));
  });

  it("rejects reversed and calendar-invalid ranges", () => {
    assert.equal(normalizeDateRange("Aug 28, 2026 to June 29, 2026").confidence, 0);
    assert.deepEqual(normalizeDateRange("February 30, 2026").warnings, [
      "calendar_date_invalid",
    ]);
  });

  it("fails cleanly on unusable input", () => {
    assert.deepEqual(normalizeDateRange("dates to be announced").warnings, [
      "date_range_not_recognized",
    ]);
    assert.equal(normalizeDateRange("").confidence, 0);
  });
});

describe("normalizeUrl", () => {
  it("resolves relative hrefs and canonicalizes", () => {
    const result = normalizeUrl("/summer-camp?utm_source=nav", {
      baseUrl: "https://www.creativekidsplace.com/programs",
    });
    assert.equal(result.value.url, "https://www.creativekidsplace.com/summer-camp?utm_source=nav");
    assert.equal(result.value.canonicalUrl, "https://www.creativekidsplace.com/summer-camp");
    assert.ok(result.warnings.includes("resolved_against_base_url"));
  });

  it("canonicalizes absolute URLs without a base", () => {
    const result = normalizeUrl("HTTPS://WWW.Example.com/Camps/");
    assert.equal(result.value.canonicalUrl, "https://www.example.com/Camps");
    assert.deepEqual(result.warnings, []);
  });

  it("keeps non-web URLs without giving them a canonical identity", () => {
    const result = normalizeUrl("mailto:hello@creativekidsplace.com");
    assert.equal(result.value.url, "mailto:hello@creativekidsplace.com");
    assert.equal(result.value.canonicalUrl, null);
    assert.deepEqual(result.warnings, ["non_http_url"]);
  });

  it("refuses script URLs, fragments, and unparseable values", () => {
    assert.deepEqual(normalizeUrl("javascript:void(0)").warnings, ["unsupported_url_scheme"]);
    assert.deepEqual(normalizeUrl("#register").warnings, ["url_is_fragment_only"]);
    assert.deepEqual(normalizeUrl("/relative-without-base").warnings, ["url_not_parseable"]);
    assert.deepEqual(normalizeUrl("").warnings, ["url_not_stated"]);
  });
});
