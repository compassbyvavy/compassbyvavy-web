/**
 * The spots checker's page fetch, shared so the Camp Watcher can call the same
 * helper. The default user agent, timeout, and 403/429 stop match the checker.
 * Callers that need a different identity pass one; they do not change the default.
 */

export const USER_AGENT = "CompassByVavyBot/1.0 (+https://compassbyvavy.ca; hello@compassbyvavy.ca)";
export const TIMEOUT_MS = 10_000;

export type PageFetch =
  | { ok: true; status: number; url: string; body: string }
  | { ok: false; status: number; url: string; error: string };

export async function fetchPage(
  url: string,
  fetchImpl: typeof fetch = fetch,
  userAgent: string = USER_AGENT,
): Promise<PageFetch> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    const body = await response.text();
    if (response.status === 403 || response.status === 429) {
      return { ok: false, status: response.status, url, error: `stopped:${response.status}` };
    }
    if (!response.ok) {
      return { ok: false, status: response.status, url, error: `http ${response.status}` };
    }
    return { ok: true, status: response.status, url, body };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { ok: false, status: 0, url, error: aborted ? "timeout" : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}
