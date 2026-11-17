/**
 * Follows redirects only when the next URL is a public http(s) address.
 * Anything else is not HTTP 200.
 */
import { assertSafeHttpUrl, assertSafeRedirectTarget } from "@/lib/camps/ingestion/security/ssrf";

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
