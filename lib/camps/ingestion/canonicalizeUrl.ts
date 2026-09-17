/**
 * Canonical URL identity for camp sources.
 *
 * Two registered sources that resolve to the same page must collapse to one
 * canonical URL so the review queue does not show the same facts twice. The
 * rules stay deliberately conservative: strip fragments and well-known
 * tracking parameters, normalize case/port/trailing slash, and keep anything
 * that could identify *which* camp, program, session, or registration form the
 * page describes.
 *
 * Ambiguous parameters (`ref`, `source`, …) are kept. Dropping a parameter that
 * turns out to be meaningful merges two different pages into one identity,
 * which is worse than keeping a little noise.
 */

/** Parameters whose only job is campaign attribution. */
const TRACKING_PARAMS = new Set([
  "gclid",
  "gbraid",
  "wbraid",
  "gad_source",
  "gclsrc",
  "dclid",
  "fbclid",
  "msclkid",
  "yclid",
  "twclid",
  "igshid",
  "mkt_tok",
  "mc_cid",
  "mc_eid",
  "ref_src",
  "vero_id",
  "oly_enc_id",
  "oly_anon_id",
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "s_kwcid",
]);

/** Prefix families of tracking parameters (`utm_source`, `hsa_cam`, …). */
const TRACKING_PARAM_PREFIXES = ["utm_", "hsa_", "pk_", "piwik_", "matomo_"];

/**
 * Parameters that identify the camp/program/session being described. Kept even
 * when they collide with a tracking family.
 */
const IDENTITY_PARAM_HINTS = new Set([
  "activity",
  "activityid",
  "camp",
  "campid",
  "class",
  "classid",
  "course",
  "courseid",
  "event",
  "eventid",
  "id",
  "location",
  "offering",
  "program",
  "programid",
  "reg",
  "registration",
  "session",
  "sessionid",
  "session_id",
  "site",
  "sku",
  "term",
  "week",
]);

const DEFAULT_PORTS: Record<string, string> = {
  "http:": "80",
  "https:": "443",
};

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  if (IDENTITY_PARAM_HINTS.has(lower)) return false;
  if (TRACKING_PARAMS.has(lower)) return true;
  return TRACKING_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed.length > 1 && collapsed.endsWith("/")) {
    return collapsed.slice(0, -1);
  }
  return collapsed;
}

function lowercaseScheme(rawUrl: string): string {
  return rawUrl.replace(/^([a-zA-Z][a-zA-Z0-9+.\-]*):/, (_match, scheme: string) =>
    `${scheme.toLowerCase()}:`,
  );
}

/**
 * Best-effort canonical form. Unparseable input is returned trimmed rather
 * than thrown so a malformed registry row can still be displayed and fixed.
 */
export function canonicalizeSourceUrl(rawUrl: string): string {
  return tryCanonicalizeSourceUrl(rawUrl) ?? rawUrl.trim();
}

/** Strict canonical form: null when the value cannot be parsed as a URL. */
export function tryCanonicalizeSourceUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (trimmed === "") return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  // Non-web schemes (e.g. `manual://provider/notes`) carry no query/tracking
  // conventions — normalize the scheme and drop the fragment only.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return lowercaseScheme(trimmed.split("#")[0]);
  }

  parsed.hash = "";
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  if (parsed.port === DEFAULT_PORTS[parsed.protocol]) {
    parsed.port = "";
  }
  parsed.pathname = normalizePathname(parsed.pathname);

  const kept: Array<[string, string]> = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    if (isTrackingParam(key)) continue;
    kept.push([key, value]);
  }
  kept.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));

  const search = new URLSearchParams();
  for (const [key, value] of kept) {
    search.append(key, value);
  }
  const query = search.toString();

  return `${parsed.protocol}//${parsed.host}${parsed.pathname}${query ? `?${query}` : ""}`;
}

/** True when both URLs describe the same page identity. */
export function sameCanonicalUrl(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return canonicalizeSourceUrl(a) === canonicalizeSourceUrl(b);
}

/** Lowercased hostname, or null when the value is not a parseable URL. */
export function canonicalHost(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Same registrable-ish host, ignoring a leading `www.`. */
export function sameCanonicalHost(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const hostA = canonicalHost(a)?.replace(/^www\./, "");
  const hostB = canonicalHost(b)?.replace(/^www\./, "");
  if (!hostA || !hostB) return false;
  return hostA === hostB;
}
