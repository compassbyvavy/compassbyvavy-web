import { assertSafeHttpUrl, assertSafeRedirectTarget } from "../ingestion/security/ssrf";

export const WATCH_USER_AGENT = "CompassCampWatcher/1.0 (+https://compassbyvavy.ca)";

const BLOCKED_STATUSES = new Set([401, 403, 405, 406, 429, 451]);
const CHALLENGE_MARKERS = [
  "captcha",
  "are you a robot",
  "cf-browser-verification",
  "checking your browser",
  "access denied",
  "request unsuccessful. incapsula",
];
const MAX_REDIRECTS = 3;
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 10_000;

export type WatchedFetch =
  | { status: "ok"; httpStatus: number; body: string; finalUrl: string }
  | { status: "unreachable" | "blocked" | "error"; httpStatus: number | null; error: string };

function isChallenge(body: string): boolean {
  const head = body.slice(0, 4000).toLowerCase();
  return CHALLENGE_MARKERS.some((marker) => head.includes(marker));
}

/**
 * One GET for a page source. Each redirect is checked again. A bot wall is
 * recorded as blocked. This does not use the ingestion allowlist.
 */
export async function fetchWatchedPage(url: string, fetchImpl: typeof fetch = fetch): Promise<WatchedFetch> {
  let current: string;
  try {
    current = assertSafeHttpUrl(url).toString();
  } catch (error) {
    return { status: "error", httpStatus: null, error: error instanceof Error ? error.message : "unsafe url" };
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": WATCH_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return { status: "error", httpStatus: response.status, error: "redirect without location" };
        try {
          current = assertSafeRedirectTarget(current, location).toString();
        } catch (error) {
          return {
            status: "error",
            httpStatus: response.status,
            error: error instanceof Error ? error.message : "unsafe redirect",
          };
        }
        if (hop === MAX_REDIRECTS) return { status: "error", httpStatus: response.status, error: "too many redirects" };
        continue;
      }
      if (BLOCKED_STATUSES.has(response.status)) {
        return { status: "blocked", httpStatus: response.status, error: `blocked:${response.status}` };
      }
      if (response.status >= 500) {
        return { status: "unreachable", httpStatus: response.status, error: `http ${response.status}` };
      }
      if (!response.ok) {
        return { status: "error", httpStatus: response.status, error: `http ${response.status}` };
      }
      const body = await response.text();
      if (body.length > MAX_BYTES) {
        return { status: "error", httpStatus: response.status, error: "response too large" };
      }
      if (isChallenge(body)) {
        return { status: "blocked", httpStatus: response.status, error: "bot_challenge_detected" };
      }
      const type = response.headers.get("content-type") ?? "";
      if (type && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(type)) {
        return { status: "error", httpStatus: response.status, error: `content type ${type}` };
      }
      return { status: "ok", httpStatus: response.status, body, finalUrl: current };
    } catch (error) {
      const aborted = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
      return { status: "unreachable", httpStatus: null, error: aborted ? "timeout" : "fetch failed" };
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: "error", httpStatus: null, error: "too many redirects" };
}
