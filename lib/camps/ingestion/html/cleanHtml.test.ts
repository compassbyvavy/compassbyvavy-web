/**
 * Tests for the regex HTML cleaner.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanHtmlToDocument,
  decodeHtmlEntities,
  htmlToText,
} from "@/lib/camps/ingestion/html/cleanHtml";

const page = `<!doctype html>
<html lang="en">
  <head>
    <title>Summer Camp &mdash; Creative Kids Place</title>
    <meta charset="utf-8">
    <meta name="description" content="Ages 4&ndash;12 summer camp in Mississauga">
    <meta property="og:title" content="Summer Camp 2026">
    <link rel="canonical" href="https://www.example.com/summer-camp">
    <style>.hero { color: red; }</style>
    <script>window.dataLayer = [{ price: 999 }];</script>
  </head>
  <body>
    <!-- navigation -->
    <nav><a href="/">Home</a><a href="/summer-camp">Summer Camp</a></nav>
    <h1>Summer Camp 2026</h1>
    <p>Ages 4-12</p><p>Full Week&nbsp;$350</p>
    <ul><li>June 29 &ndash; August 28, 2026</li><li>9:00 a.m. &ndash; 4:00 p.m.</li></ul>
    <h2>Register</h2>
    <a href="https://app.activitymessenger.com/ckp/summer">Register on Activity Messenger</a>
    <a href="#top">Back to top</a>
    <a href="javascript:void(0)">Menu</a>
    <noscript><p>Enable JavaScript for $9999 deals</p></noscript>
    <svg><title>icon</title></svg>
  </body>
</html>`;

describe("decodeHtmlEntities", () => {
  it("decodes named, decimal, and hex entities", () => {
    assert.equal(decodeHtmlEntities("Ages 4&ndash;12"), "Ages 4–12");
    assert.equal(decodeHtmlEntities("Kids&#39; Camp"), "Kids' Camp");
    assert.equal(decodeHtmlEntities("Caf&#xe9;"), "Café");
    assert.equal(decodeHtmlEntities("A &amp;amp; B"), "A &amp; B");
  });

  it("leaves unknown entities literal instead of guessing", () => {
    assert.equal(decodeHtmlEntities("&notarealentity;"), "&notarealentity;");
  });

  it("turns non-breaking spaces into plain spaces", () => {
    assert.equal(decodeHtmlEntities("Full Week&nbsp;$350"), "Full Week $350");
  });
});

describe("htmlToText", () => {
  it("drops script and style content", () => {
    const text = htmlToText(page);
    assert.equal(text.includes("dataLayer"), false);
    assert.equal(text.includes("999"), false);
    assert.equal(text.includes("color: red"), false);
  });

  it("keeps block boundaries so adjacent facts stay separate", () => {
    const text = htmlToText("<p>Ages 4-12</p><p>$350</p>");
    assert.equal(text, "Ages 4-12\n$350");
  });

  it("collapses source whitespace, including newlines inside a block", () => {
    assert.equal(htmlToText("<p>Full   Week\n\n\n   $350</p>"), "Full Week $350");
  });

  it("does not multiply line breaks when markup nests blocks", () => {
    assert.equal(
      htmlToText("<div><section><p>Ages 4-12</p></section><div><p>$350</p></div></div>"),
      "Ages 4-12\n$350",
    );
  });

  it("keeps inline emphasis on one line", () => {
    assert.equal(htmlToText("<p>Ages <strong>4-12</strong> welcome</p>"), "Ages 4-12 welcome");
  });
});

describe("cleanHtmlToDocument", () => {
  it("extracts title, headings, text, links, and metadata", () => {
    const doc = cleanHtmlToDocument(page, { baseUrl: "https://www.example.com/summer-camp" });

    assert.equal(doc.title, "Summer Camp — Creative Kids Place");
    assert.deepEqual(doc.headings, ["Summer Camp 2026", "Register"]);
    assert.match(doc.text, /Ages 4-12/);
    assert.match(doc.text, /Full Week \$350/);
    assert.match(doc.text, /June 29 – August 28, 2026/);
    assert.equal(doc.metadata.description, "Ages 4–12 summer camp in Mississauga");
    assert.equal(doc.metadata["og:title"], "Summer Camp 2026");
    assert.equal(doc.metadata.canonical, "https://www.example.com/summer-camp");
  });

  it("resolves relative links against the base URL", () => {
    const doc = cleanHtmlToDocument(page, { baseUrl: "https://www.example.com/summer-camp" });
    const hrefs = doc.links.map((link) => link.href);
    assert.ok(hrefs.includes("https://www.example.com/"));
    assert.ok(hrefs.includes("https://www.example.com/summer-camp"));
    assert.ok(hrefs.includes("https://app.activitymessenger.com/ckp/summer"));
  });

  it("drops fragment-only and script links", () => {
    const doc = cleanHtmlToDocument(page, { baseUrl: "https://www.example.com/summer-camp" });
    assert.equal(
      doc.links.some((link) => link.text === "Back to top" || link.text === "Menu"),
      false,
    );
  });

  it("keeps link labels for extractor use", () => {
    const doc = cleanHtmlToDocument(page);
    const register = doc.links.find((link) => /activitymessenger/.test(link.href));
    assert.equal(register?.text, "Register on Activity Messenger");
  });

  it("keeps hrefs raw when no base URL is known", () => {
    const doc = cleanHtmlToDocument('<a href="/camps">Camps</a>');
    assert.deepEqual(doc.links, [{ href: "/camps", text: "Camps" }]);
  });

  it("ignores noscript and svg content", () => {
    const doc = cleanHtmlToDocument(page);
    assert.equal(doc.text.includes("9999"), false);
    assert.equal(doc.headings.includes("icon"), false);
  });

  it("marks truncation instead of pretending the page was fully read", () => {
    const long = `<p>${"camp ".repeat(200)}</p>`;
    const doc = cleanHtmlToDocument(long, { maxTextLength: 50 });
    assert.equal(doc.text.length, 50);
    assert.equal(doc.metadata.compass_text_truncated, "true");
    assert.equal(
      cleanHtmlToDocument("<p>short</p>").metadata.compass_text_truncated,
      undefined,
    );
  });

  it("returns an empty document for empty input rather than throwing", () => {
    const doc = cleanHtmlToDocument("");
    assert.deepEqual(doc, { title: null, text: "", headings: [], links: [], metadata: {} });
  });

  it("survives malformed markup", () => {
    const doc = cleanHtmlToDocument("<html><body><p>Ages 4-12<div>$350");
    assert.match(doc.text, /Ages 4-12/);
    assert.match(doc.text, /\$350/);
  });

  it("caps headings and links", () => {
    const many = Array.from({ length: 10 }, (_, i) => `<h2>H${i}</h2><a href="/l${i}">L${i}</a>`).join("");
    const doc = cleanHtmlToDocument(many, { maxHeadings: 3, maxLinks: 2 });
    assert.equal(doc.headings.length, 3);
    assert.equal(doc.links.length, 2);
  });
});
