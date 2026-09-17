/**
 * Tests for camp source URL canonicalization.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalHost,
  canonicalizeSourceUrl,
  sameCanonicalHost,
  sameCanonicalUrl,
  tryCanonicalizeSourceUrl,
} from "@/lib/camps/ingestion/canonicalizeUrl";
import { ingestionSources } from "@/data/camps/ingestion/fixtures";

describe("canonicalizeSourceUrl", () => {
  it("drops tracking parameters and fragments", () => {
    assert.equal(
      canonicalizeSourceUrl(
        "https://www.creativekidsplace.com/summer-camp?utm_source=newsletter&utm_medium=email&gclid=abc#pricing",
      ),
      "https://www.creativekidsplace.com/summer-camp",
    );
  });

  it("keeps parameters that identify a session or registration form", () => {
    assert.equal(
      canonicalizeSourceUrl(
        "https://example.com/register?session=jul13&utm_campaign=summer",
      ),
      "https://example.com/register?session=jul13",
    );
    assert.equal(
      canonicalizeSourceUrl("https://example.com/reg?activityId=884&week=3"),
      "https://example.com/reg?activityId=884&week=3",
    );
  });

  it("keeps ambiguous parameters rather than merging distinct pages", () => {
    assert.equal(
      canonicalizeSourceUrl("https://example.com/camps?ref=partner"),
      "https://example.com/camps?ref=partner",
    );
  });

  it("normalizes scheme case, host case, default port, and trailing slash", () => {
    assert.equal(
      canonicalizeSourceUrl("HTTPS://WWW.Example.COM:443/Summer-Camp/"),
      "https://www.example.com/Summer-Camp",
    );
    assert.equal(
      canonicalizeSourceUrl("http://example.com:80/camps//summer/"),
      "http://example.com/camps/summer",
    );
  });

  it("keeps the root path slash", () => {
    assert.equal(canonicalizeSourceUrl("https://example.com/"), "https://example.com/");
  });

  it("sorts remaining parameters for stable identity", () => {
    assert.equal(
      canonicalizeSourceUrl("https://example.com/r?week=2&session=a"),
      canonicalizeSourceUrl("https://example.com/r?session=a&week=2"),
    );
  });

  it("normalizes non-web source schemes without inventing structure", () => {
    assert.equal(
      canonicalizeSourceUrl("MANUAL://nutty-scientists/operator-notes"),
      "manual://nutty-scientists/operator-notes",
    );
  });

  it("returns unparseable values trimmed instead of throwing", () => {
    assert.equal(canonicalizeSourceUrl("  not a url  "), "not a url");
    assert.equal(tryCanonicalizeSourceUrl("not a url"), null);
    assert.equal(tryCanonicalizeSourceUrl(""), null);
  });

  it("reproduces the canonical URLs recorded on fixture sources", () => {
    for (const source of ingestionSources) {
      assert.equal(
        canonicalizeSourceUrl(source.sourceUrl),
        source.canonicalUrl,
        `canonical mismatch for ${source.id}`,
      );
    }
  });

  it("collapses duplicate source registrations to one identity", () => {
    assert.equal(
      sameCanonicalUrl(
        "https://www.nuttyscientists.ca/summer-camp?utm_source=demo",
        "https://www.nuttyscientists.ca/summer-camp/",
      ),
      true,
    );
    assert.equal(
      sameCanonicalUrl(
        "https://www.nuttyscientists.ca/summer-camp",
        "https://www.nuttyscientists.ca/register",
      ),
      false,
    );
    assert.equal(sameCanonicalUrl(null, "https://example.com"), false);
  });
});

describe("canonicalHost", () => {
  it("lowercases the host and ignores www when comparing", () => {
    assert.equal(canonicalHost("https://WWW.Example.com/x"), "www.example.com");
    assert.equal(canonicalHost("nonsense"), null);
    assert.equal(
      sameCanonicalHost("https://www.example.com/a", "https://example.com/b"),
      true,
    );
    assert.equal(
      sameCanonicalHost("https://example.com", "https://other.example.org"),
      false,
    );
  });
});
