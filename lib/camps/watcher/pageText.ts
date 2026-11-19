import { htmlToText } from "../ingestion/html/cleanHtml";

const CHROME = /<(nav|header|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const COOKIE_LINE = /\b(cookie|cookies|consent|accept all)\b/i;

/**
 * Text the page adapter compares. Script and style come out through the
 * ingestion cleaner. Nav, header, and footer come out here so a date in the
 * site chrome is not a camp change. Short cookie-banner lines are dropped.
 * The ingestion allowlist is not involved.
 */
export function pageWatchText(html: string): string {
  const withoutChrome = html.replace(CHROME, " ");
  const text = htmlToText(withoutChrome);
  return text
    .split("\n")
    .filter((line) => line.length > 180 || !COOKIE_LINE.test(line))
    .join("\n")
    .trim();
}
