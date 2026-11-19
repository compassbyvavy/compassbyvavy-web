/**
 * Follows redirects only when the next URL is a public http(s) address.
 * Anything else is not HTTP 200.
 */
import { assertSafeHttpUrl, assertSafeRedirectTarget } from "@/lib/camps/ingestion/security/ssrf";
import { htmlToText } from "@/lib/camps/pages/sourceText";

export async function registerLinkStatus(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ httpStatus: number | null }> {
  try {
    let current = assertSafeHttpUrl(url).toString();
    for (let hop = 0; hop < 4; hop += 1) {
      const response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        headers: { "user-agent": "CompassCampReview/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return { httpStatus: response.status };
        current = assertSafeRedirectTarget(current, location).toString();
        continue;
      }
      return { httpStatus: response.status };
    }
    return { httpStatus: null };
  } catch {
    return { httpStatus: null };
  }
}

/** Reads a public page as text. A non-200 or an unsafe address returns null. */
export async function fetchPageText(url: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    let current = assertSafeHttpUrl(url).toString();
    for (let hop = 0; hop < 4; hop += 1) {
      const response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        headers: { "user-agent": "CompassCampReview/1.0", accept: "text/html" },
        signal: AbortSignal.timeout(8000),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        current = assertSafeRedirectTarget(current, location).toString();
        continue;
      }
      if (response.status !== 200) return null;
      return htmlToText(await response.text()).slice(0, 500_000);
    }
    return null;
  } catch {
    return null;
  }
}
