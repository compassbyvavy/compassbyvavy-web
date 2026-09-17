/**
 * Regex HTML cleaner: raw fetched markup → `CleanSourceDocument`.
 *
 * Deliberately not a DOM. Extractors need the *stated text* of a camp page
 * (dates, prices, ages, hours), its headings, its links, and its meta tags —
 * not a queryable tree. Regex cleaning keeps ingestion free of a browser
 * engine or parser dependency, and every extractor is written against the
 * cleaned text so a markup change cannot silently alter a parsed fact.
 *
 * What it removes: comments, script/style/noscript/template/svg content, and
 * all remaining tags. Block-level boundaries become newlines so "Ages 4-12"
 * and "$350" never merge into one line.
 */

import type { CleanSourceDocument } from "@/data/camps/ingestion/types";

export type CleanHtmlOptions = {
  /** Resolves relative link hrefs when known. */
  baseUrl?: string | null;
  /** Hard cap on extracted text (default 400k chars). */
  maxTextLength?: number;
  maxLinks?: number;
  maxHeadings?: number;
};

const DEFAULT_MAX_TEXT_LENGTH = 400_000;
const DEFAULT_MAX_LINKS = 500;
const DEFAULT_MAX_HEADINGS = 200;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  shy: "",
  mdash: "—",
  ndash: "–",
  minus: "−",
  hellip: "…",
  lsquo: "\u2018",
  rsquo: "\u2019",
  sbquo: "\u201a",
  ldquo: "\u201c",
  rdquo: "\u201d",
  bdquo: "\u201e",
  bull: "•",
  middot: "·",
  laquo: "«",
  raquo: "»",
  deg: "°",
  cent: "¢",
  pound: "£",
  euro: "€",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  ocirc: "ô",
  uuml: "ü",
};

/** Decode the entity forms real provider pages use. Unknown names stay literal. */
export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const isHex = entity[1] === "x" || entity[1] === "X";
      const codePoint = Number.parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    const named = NAMED_ENTITIES[entity.toLowerCase()];
    return named === undefined ? match : named;
  });
}

function stripNonContentRegions(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, " ")
    .replace(/<template\b[\s\S]*?<\/template\s*>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, " ")
    .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, " ");
}

const BLOCK_BOUNDARY =
  /<\s*\/?\s*(?:p|div|section|article|main|header|footer|aside|nav|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|th|td|h[1-6]|br|hr|figure|figcaption|blockquote|form|fieldset|legend|label|option|address)\b[^>]*>/gi;

/** Tag-stripped, entity-decoded, whitespace-collapsed text. */
export function htmlToText(html: string): string {
  return strippedHtmlToText(stripNonContentRegions(html));
}

/**
 * Marks a block boundary while all other whitespace collapses. HTML treats
 * source newlines as insignificant, so only block edges become line breaks —
 * that keeps the cleaned text stable when a provider re-indents their markup.
 */
const BLOCK_SENTINEL = "\u0001";

function strippedHtmlToText(stripped: string): string {
  const decoded = decodeHtmlEntities(
    stripped.replace(BLOCK_BOUNDARY, BLOCK_SENTINEL).replace(/<[^>]*>/g, " "),
  );
  return decoded
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .split(BLOCK_SENTINEL)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n")
    .trim();
}

/** Inline text of one element's inner HTML (headings, link labels). */
function inlineText(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  if (!match) return null;
  const title = inlineText(match[1]);
  return title === "" ? null : title;
}

function extractMetadata(html: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const metaTag = /<meta\b([^>]*)>/gi;
  for (const match of html.matchAll(metaTag)) {
    const attributes = match[1];
    const key =
      readAttribute(attributes, "name") ??
      readAttribute(attributes, "property") ??
      readAttribute(attributes, "http-equiv") ??
      readAttribute(attributes, "itemprop");
    const content = readAttribute(attributes, "content");
    if (!key || content === null) continue;
    const normalizedKey = key.trim().toLowerCase();
    if (normalizedKey === "" || normalizedKey in metadata) continue;
    metadata[normalizedKey] = inlineText(content);
  }
  const canonical = /<link\b[^>]*\brel\s*=\s*["']?canonical["']?[^>]*>/i.exec(html);
  if (canonical) {
    const href = readAttribute(canonical[0], "href");
    if (href) metadata.canonical = href.trim();
  }
  return metadata;
}

function readAttribute(attributes: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const match = pattern.exec(attributes);
  if (!match) return null;
  return decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? "");
}

function extractHeadings(html: string, limit: number): string[] {
  const headings: string[] = [];
  for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)) {
    const text = inlineText(match[2]);
    if (text !== "") headings.push(text);
    if (headings.length >= limit) break;
  }
  return headings;
}

function extractLinks(
  html: string,
  baseUrl: string | null,
  limit: number,
): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const rawHref = readAttribute(match[1], "href");
    if (!rawHref) continue;
    const href = resolveHref(rawHref.trim(), baseUrl);
    if (!href) continue;
    const text = inlineText(match[2]);
    const key = `${href}\u0000${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ href, text });
    if (links.length >= limit) break;
  }
  return links;
}

function resolveHref(href: string, baseUrl: string | null): string | null {
  if (href === "" || href.startsWith("#")) return null;
  if (/^javascript:/i.test(href) || /^data:/i.test(href) || /^vbscript:/i.test(href)) {
    return null;
  }
  if (!baseUrl) return href;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

/**
 * Clean fetched HTML into the document shape extractors consume.
 *
 * `metadata.compass_text_truncated` is set when the page exceeded the text cap,
 * so an extractor can refuse to claim it saw the whole page.
 */
export function cleanHtmlToDocument(
  html: string,
  options: CleanHtmlOptions = {},
): CleanSourceDocument {
  const maxTextLength = options.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH;
  const stripped = stripNonContentRegions(html);

  const metadata = extractMetadata(stripped);
  const fullText = strippedHtmlToText(stripped);
  const truncated = fullText.length > maxTextLength;
  if (truncated) metadata.compass_text_truncated = "true";

  return {
    title: extractTitle(stripped),
    text: truncated ? fullText.slice(0, maxTextLength) : fullText,
    headings: extractHeadings(stripped, options.maxHeadings ?? DEFAULT_MAX_HEADINGS),
    links: extractLinks(stripped, options.baseUrl ?? null, options.maxLinks ?? DEFAULT_MAX_LINKS),
    metadata,
  };
}
