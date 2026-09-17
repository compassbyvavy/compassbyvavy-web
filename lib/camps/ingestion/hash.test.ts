/**
 * Tests for source content hashing / unchanged detection.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashSourceContent,
  normalizeContentForHash,
  shortHash,
  sourceContentUnchanged,
} from "@/lib/camps/ingestion/hash";

describe("hashSourceContent", () => {
  it("is stable and algorithm-prefixed", () => {
    const hash = hashSourceContent("<html>Camp</html>");
    assert.match(hash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(hash, hashSourceContent("<html>Camp</html>"));
  });

  it("differs when facts differ", () => {
    assert.notEqual(
      hashSourceContent("<p>Price $350</p>"),
      hashSourceContent("<p>Price $370</p>"),
    );
  });

  it("ignores line endings and trailing whitespace", () => {
    assert.equal(
      hashSourceContent("<p>Ages 4-12</p>\r\n<p>$350</p>   \r\n"),
      hashSourceContent("<p>Ages 4-12</p>\n<p>$350</p>"),
    );
  });

  it("collapses runs of blank lines only", () => {
    assert.equal(normalizeContentForHash("a\n\n\n\nb"), "a\n\nb");
    assert.notEqual(hashSourceContent("a\nb"), hashSourceContent("a\n\nb"));
  });
});

describe("sourceContentUnchanged", () => {
  it("compares two hashes", () => {
    const html = "<p>Full week $350</p>";
    assert.equal(
      sourceContentUnchanged(hashSourceContent(html), hashSourceContent(html)),
      true,
    );
  });

  it("compares raw content against a stored hash", () => {
    const html = "<p>Full week $350</p>";
    assert.equal(sourceContentUnchanged(hashSourceContent(html), html), true);
    assert.equal(
      sourceContentUnchanged(hashSourceContent(html), "<p>Full week $370</p>"),
      false,
    );
  });

  it("treats a missing side as changed rather than unchanged", () => {
    const hash = hashSourceContent("x");
    assert.equal(sourceContentUnchanged(null, hash), false);
    assert.equal(sourceContentUnchanged(hash, undefined), false);
    assert.equal(sourceContentUnchanged(undefined, undefined), false);
  });
});

describe("shortHash", () => {
  it("trims the algorithm prefix for display", () => {
    assert.equal(shortHash(hashSourceContent("x")).length, 12);
    assert.equal(shortHash(null), "—");
  });
});
