/**
 * Looks for a fact in a web page. Spacing, dashes and "$" are folded so
 * "$350 – $370" matches "350-$370". Nothing else is rewritten.
 */

const DASHES = /[‐‑‒–—―−]/g;

export function normalizeForSourceMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(DASHES, "-")
    .replace(/\$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function valueFoundInPage(value: string, pageText: string): boolean {
  const needle = normalizeForSourceMatch(value);
  if (!needle) return false;
  return normalizeForSourceMatch(pageText).includes(needle);
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&[a-z]+;/gi, " ");
}
