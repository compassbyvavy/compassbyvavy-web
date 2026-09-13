/**
 * Tests for the allowlisted HTTP camp source fetcher (mock fetch — no network).
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { HttpCampSourceFetcher, type FetchLike } from "@/lib/camps/ingestion/httpFetcher";
import { COMPASS_CAMP_FETCH_USER_AGENT } from "@/lib/camps/ingestion/security/ssrf";

const NOW = new Date("2026-09-12T16:00:00.000Z");
const HTML = "<html><head><title>Summer Camp</title></head><body><p>Ages 4-12</p></body></html>";

function source(overrides: Partial<CampSource> = {}): CampSource {
  return {
    id: "src-ckp",
    providerId: "prov-ckp",
    sourceType: "provider_website",
    sourceUrl: "https://www.creativekidsplace.com/summer-camp",
    canonicalUrl: "https://www.creativekidsplace.com/summer-camp",
    registrationPlatform: null,
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "daily",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

type Call = { url: string; init?: RequestInit };

function recordingFetch(
  responder: (url: string, init?: RequestInit) => Response | Promise<Response>,
): { fetchImpl: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return responder(url, init);
  };
  return { fetchImpl, calls };
}

function htmlResponse(
  body: string,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: { "content-type": "text/html; charset=utf-8", ...(init.headers ?? {}) },
  });
}

function makeFetcher(
  fetchImpl: FetchLike,
  overrides: Partial<ConstructorParameters<typeof HttpCampSourceFetcher>[0]> = {},
): HttpCampSourceFetcher {
  return new HttpCampSourceFetcher({
    allowedSourceIds: ["src-ckp"],
    fetchImpl,
    now: () => NOW,
    newId: () => "snap-test",
    ...overrides,
  });
}

describe("HttpCampSourceFetcher allowlist", () => {
  it("never fetches a source that is not allowlisted", async () => {
    const { fetchImpl, calls } = recordingFetch(() => htmlResponse(HTML));
    const fetcher = makeFetcher(fetchImpl);

    const snapshot = await fetcher.fetchSource(source({ id: "src-not-allowed" }));

    assert.equal(calls.length, 0);
    assert.equal(snapshot.fetchStatus, "unsupported");
    assert.equal(snapshot.fetchError, "source_not_in_fetch_allowlist");
    assert.equal(snapshot.rawContent, null);
    assert.equal(fetcher.isAllowed("src-not-allowed"), false);
    assert.equal(fetcher.isAllowed("src-ckp"), true);
  });

  it("does not fetch non-html crawl strategies", async () => {
    const { fetchImpl, calls } = recordingFetch(() => htmlResponse(HTML));
    const snapshot = await makeFetcher(fetchImpl).fetchSource(
      source({ crawlStrategy: "pdf" }),
    );
    assert.equal(calls.length, 0);
    assert.equal(snapshot.fetchStatus, "unsupported");
    assert.equal(snapshot.fetchError, "crawl_strategy_not_supported:pdf");
  });
});

describe("HttpCampSourceFetcher success path", () => {
  it("produces a snapshot with a content hash and provenance metadata", async () => {
    const { fetchImpl, calls } = recordingFetch(() =>
      htmlResponse(HTML, { headers: { etag: 'W/"abc123"', "last-modified": "Wed, 09 Sep 2026 10:00:00 GMT" } }),
    );
    const snapshot = await makeFetcher(fetchImpl).fetchSource(source());

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://www.creativekidsplace.com/summer-camp");
    assert.equal(snapshot.fetchStatus, "success");
    assert.equal(snapshot.httpStatus, 200);
    assert.equal(snapshot.sourceId, "src-ckp");
    assert.equal(snapshot.id, "snap-test");
    assert.equal(snapshot.retrievedAt, NOW.toISOString());
    assert.equal(snapshot.rawContent, HTML);
    assert.equal(snapshot.contentHash, hashSourceContent(HTML));
    assert.equal(snapshot.fetchError, null);

    const metadata = snapshot.rawMetadata ?? {};
    assert.equal(metadata.finalUrl, "https://www.creativekidsplace.com/summer-camp");
    assert.equal(metadata.etag, 'W/"abc123"');
    assert.deepEqual(metadata.redirectChain, []);
  });

  it("identifies Compass and asks for HTML", async () => {
    const { fetchImpl, calls } = recordingFetch(() => htmlResponse(HTML));
    await makeFetcher(fetchImpl).fetchSource(source());

    const headers = (calls[0].init?.headers ?? {}) as Record<string, string>;
    assert.equal(headers["user-agent"], COMPASS_CAMP_FETCH_USER_AGENT);
    assert.match(headers.accept, /text\/html/);
    assert.equal(calls[0].init?.redirect, "manual");
  });

  it("sends conditional headers from the previous snapshot", async () => {
    const { fetchImpl, calls } = recordingFetch(() => new Response(null, { status: 304 }));
    const previousSnapshot: CampSourceSnapshot = {
      id: "snap-previous",
      sourceId: "src-ckp",
      retrievedAt: "2026-09-11T16:00:00.000Z",
      contentHash: hashSourceContent(HTML),
      rawContent: HTML,
      rawMetadata: { etag: 'W/"abc123"', lastModified: "Wed, 09 Sep 2026 10:00:00 GMT" },
      fetchStatus: "success",
    };

    const snapshot = await makeFetcher(fetchImpl).fetchSource(source(), { previousSnapshot });

    const headers = (calls[0].init?.headers ?? {}) as Record<string, string>;
    assert.equal(headers["if-none-match"], 'W/"abc123"');
    assert.equal(headers["if-modified-since"], "Wed, 09 Sep 2026 10:00:00 GMT");
    assert.equal(snapshot.fetchStatus, "not_modified");
    assert.equal(snapshot.contentHash, previousSnapshot.contentHash);
    assert.equal(snapshot.previousSnapshotId, "snap-previous");
  });

  it("truncates oversized bodies and records that it did", async () => {
    const long = `<html><body>${"camp ".repeat(1000)}</body></html>`;
    const { fetchImpl } = recordingFetch(() => htmlResponse(long));
    const snapshot = await makeFetcher(fetchImpl, { maxBytes: 100 }).fetchSource(source());

    assert.equal(snapshot.rawContent?.length, 100);
    assert.equal(snapshot.rawMetadata?.truncated, true);
    assert.equal(snapshot.rawMetadata?.contentLength, long.length);
  });
});

describe("HttpCampSourceFetcher redirects", () => {
  it("follows safe redirects and records the chain", async () => {
    const { fetchImpl, calls } = recordingFetch((url) => {
      if (url.endsWith("/summer-camp")) {
        return new Response(null, { status: 301, headers: { location: "/camps/summer" } });
      }
      return htmlResponse(HTML);
    });

    const snapshot = await makeFetcher(fetchImpl).fetchSource(source());

    assert.equal(calls.length, 2);
    assert.equal(snapshot.fetchStatus, "success");
    assert.deepEqual(snapshot.rawMetadata?.redirectChain, [
      "https://www.creativekidsplace.com/camps/summer",
    ]);
  });

  it("refuses a redirect into a private address", async () => {
    const { fetchImpl, calls } = recordingFetch((url) => {
      if (url.endsWith("/summer-camp")) {
        return new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        });
      }
      return htmlResponse("secret");
    });

    const snapshot = await makeFetcher(fetchImpl).fetchSource(source());

    assert.equal(calls.length, 1);
    assert.equal(snapshot.fetchStatus, "error");
    assert.equal(snapshot.fetchError, "unsafe_fetch_target:metadata_address");
    assert.equal(snapshot.rawContent, null);
  });

  it("gives up after the redirect budget", async () => {
    let hop = 0;
    const { fetchImpl } = recordingFetch(() => {
      hop += 1;
      return new Response(null, {
        status: 302,
        headers: { location: `https://www.creativekidsplace.com/hop-${hop}` },
      });
    });

    const snapshot = await makeFetcher(fetchImpl, { maxRedirects: 2 }).fetchSource(source());
    assert.equal(snapshot.fetchStatus, "error");
    assert.equal(snapshot.fetchError, "too_many_redirects");
  });
});

describe("HttpCampSourceFetcher refusals and failures", () => {
  it("refuses an unsafe source URL without fetching", async () => {
    const { fetchImpl, calls } = recordingFetch(() => htmlResponse(HTML));
    const snapshot = await makeFetcher(fetchImpl).fetchSource(
      source({ sourceUrl: "http://127.0.0.1:8080/admin" }),
    );
    assert.equal(calls.length, 0);
    assert.equal(snapshot.fetchStatus, "error");
    assert.match(String(snapshot.fetchError), /^unsafe_fetch_target:/);
  });

  it("refuses a public host that resolves to a private address", async () => {
    const { fetchImpl, calls } = recordingFetch(() => htmlResponse(HTML));
    const snapshot = await makeFetcher(fetchImpl, {
      resolveHost: async () => ["10.1.2.3"],
    }).fetchSource(source());
    assert.equal(calls.length, 0);
    assert.equal(snapshot.fetchError, "unsafe_fetch_target:private_address");
  });

  it("reports an unresolvable host as a DNS failure, not as an unsafe target", async () => {
    const { fetchImpl, calls } = recordingFetch(() => htmlResponse(HTML));
    const snapshot = await makeFetcher(fetchImpl, {
      resolveHost: async () => {
        throw new Error("getaddrinfo EAI_AGAIN www.example-camps.test");
      },
    }).fetchSource(source());
    assert.equal(calls.length, 0);
    assert.equal(snapshot.fetchStatus, "error");
    assert.match(String(snapshot.fetchError), /^dns_lookup_failed:/);
  });

  it("records a bot wall as blocked rather than an error", async () => {
    const { fetchImpl } = recordingFetch(() =>
      htmlResponse("forbidden", { status: 403, headers: { "retry-after": "600" } }),
    );
    const snapshot = await makeFetcher(fetchImpl).fetchSource(source());
    assert.equal(snapshot.fetchStatus, "blocked");
    assert.equal(snapshot.fetchError, "http_403_blocked");
    assert.equal(snapshot.rawMetadata?.retryAfter, "600");
  });

  it("detects an in-page challenge and does not attempt to solve it", async () => {
    const { fetchImpl } = recordingFetch(() =>
      htmlResponse("<html><body>Checking your browser before access…</body></html>"),
    );
    const snapshot = await makeFetcher(fetchImpl).fetchSource(source());
    assert.equal(snapshot.fetchStatus, "blocked");
    assert.equal(snapshot.fetchError, "bot_challenge_detected");
  });

  it("records server errors", async () => {
    const { fetchImpl } = recordingFetch(() => htmlResponse("oops", { status: 500 }));
    const snapshot = await makeFetcher(fetchImpl).fetchSource(source());
    assert.equal(snapshot.fetchStatus, "error");
    assert.equal(snapshot.fetchError, "http_500");
  });

  it("refuses unsupported content types instead of guessing a parser", async () => {
    const { fetchImpl } = recordingFetch(
      () => new Response("%PDF-1.7", { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    const snapshot = await makeFetcher(fetchImpl).fetchSource(source());
    assert.equal(snapshot.fetchStatus, "unsupported");
    assert.equal(snapshot.fetchError, "content_type_not_supported:application/pdf");
  });

  it("turns a network failure into an error snapshot", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError("fetch failed");
    };
    const snapshot = await makeFetcher(fetchImpl).fetchSource(source());
    assert.equal(snapshot.fetchStatus, "error");
    assert.equal(snapshot.fetchError, "fetch_failed:fetch failed");
  });

  it("times out slow sources", async () => {
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    const snapshot = await makeFetcher(fetchImpl, { timeoutMs: 10 }).fetchSource(source());
    assert.equal(snapshot.fetchStatus, "error");
    assert.equal(snapshot.fetchError, "timeout_after_10ms");
  });
});
