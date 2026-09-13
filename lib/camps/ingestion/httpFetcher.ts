/**
 * Real HTTP fetcher for registered camp sources.
 *
 * Constraints that make live fetching acceptable:
 * - **Allowlist.** Only source ids explicitly passed in are fetched. Everything
 *   else records an `unsupported` snapshot without opening a socket, so adding
 *   a row to the registry can never start crawling on its own.
 * - **SSRF check on every hop**, including each redirect target.
 * - **One request per source, per run**, with a timeout and a byte cap.
 * - **Identified.** Requests carry the Compass bot user agent and a contact URL.
 * - **No challenge bypass.** A bot wall is recorded as `blocked`; CAPTCHAs,
 *   headless browsers, and cookie replay are out of scope by design.
 *
 * Failures become snapshots, not exceptions: the registry must be able to show
 * why a source went quiet.
 */

import type {
  CampSource,
  CampSourceSnapshot,
  SnapshotFetchStatus,
} from "@/data/camps/ingestion/types";
import type { CampSourceFetcher, FetchSourceContext } from "@/lib/camps/ingestion/fetcher";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createPrefixedIdFactory, type IdFactory } from "@/lib/camps/ingestion/ids";
import {
  COMPASS_CAMP_FETCH_USER_AGENT,
  UnsafeFetchTargetError,
  assertSafeHttpUrl,
  assertSafeRedirectTarget,
  assertSafeResolvedHost,
} from "@/lib/camps/ingestion/security/ssrf";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type HttpCampSourceFetcherOptions = {
  /** The only source ids this fetcher will ever request. */
  allowedSourceIds: Iterable<string>;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  userAgent?: string;
  now?: () => Date;
  newId?: IdFactory;
  /**
   * Optional DNS resolver (e.g. `dns.promises.lookup`). When supplied, every
   * resolved address is checked too, closing the "public name, private address"
   * hole that URL inspection alone cannot see.
   */
  resolveHost?: (hostname: string) => Promise<readonly string[]>;
};

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 3_000_000;

const SUPPORTED_CONTENT_TYPES = ["text/html", "application/xhtml+xml", "text/plain"];

/** Status codes that mean "the provider is refusing automation", not "broken". */
const BLOCKED_STATUSES = new Set([401, 403, 405, 406, 429, 451]);

/** Bot-wall markers. Recorded honestly — never worked around. */
const CHALLENGE_MARKERS = [
  "captcha",
  "are you a robot",
  "cf-browser-verification",
  "checking your browser",
  "access denied",
  "request unsuccessful. incapsula",
];

export class HttpCampSourceFetcher implements CampSourceFetcher {
  readonly kind = "http";

  private readonly allowedSourceIds: ReadonlySet<string>;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly maxRedirects: number;
  private readonly maxBytes: number;
  private readonly userAgent: string;
  private readonly now: () => Date;
  private readonly newId: IdFactory;
  private readonly resolveHost?: (hostname: string) => Promise<readonly string[]>;

  constructor(options: HttpCampSourceFetcherOptions) {
    this.allowedSourceIds = new Set(options.allowedSourceIds);
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.userAgent = options.userAgent ?? COMPASS_CAMP_FETCH_USER_AGENT;
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? createPrefixedIdFactory("snap");
    this.resolveHost = options.resolveHost;
  }

  isAllowed(sourceId: string): boolean {
    return this.allowedSourceIds.has(sourceId);
  }

  async fetchSource(
    source: CampSource,
    context: FetchSourceContext = {},
  ): Promise<CampSourceSnapshot> {
    const started = context.now ?? this.now();
    const base = {
      id: context.snapshotId ?? this.newId(),
      sourceId: source.id,
      retrievedAt: started.toISOString(),
      previousSnapshotId: context.previousSnapshot?.id ?? null,
    };

    if (!this.isAllowed(source.id)) {
      return failedSnapshot(base, "unsupported", "source_not_in_fetch_allowlist");
    }
    if (source.crawlStrategy !== "html") {
      return failedSnapshot(
        base,
        "unsupported",
        `crawl_strategy_not_supported:${source.crawlStrategy}`,
      );
    }

    let target: URL;
    try {
      target = assertSafeHttpUrl(source.sourceUrl);
      await this.assertResolvedHostSafe(target);
    } catch (error) {
      return failedSnapshot(base, "error", describeTargetFailure(error));
    }

    const redirectChain: string[] = [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let currentUrl = target.toString();
      let response: Response | null = null;

      for (let hop = 0; hop <= this.maxRedirects; hop += 1) {
        response = await this.fetchImpl(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: this.requestHeaders(context),
        });

        const location = response.status >= 300 && response.status < 400
          ? response.headers.get("location")
          : null;
        if (!location) break;

        if (hop === this.maxRedirects) {
          return failedSnapshot(base, "error", "too_many_redirects", {
            redirectChain,
            finalUrl: currentUrl,
          });
        }
        const next = assertSafeRedirectTarget(currentUrl, location);
        await this.assertResolvedHostSafe(next);
        redirectChain.push(next.toString());
        currentUrl = next.toString();
      }

      if (!response) {
        return failedSnapshot(base, "error", "no_response");
      }
      return await this.snapshotFromResponse({
        base,
        response,
        finalUrl: currentUrl,
        redirectChain,
        previousSnapshot: context.previousSnapshot ?? null,
        startedAtMs: started.getTime(),
      });
    } catch (error) {
      if (isAbortError(error)) {
        return failedSnapshot(base, "error", `timeout_after_${this.timeoutMs}ms`, {
          redirectChain,
        });
      }
      if (error instanceof UnsafeFetchTargetError) {
        return failedSnapshot(base, "error", describeTargetFailure(error), { redirectChain });
      }
      return failedSnapshot(base, "error", `fetch_failed:${errorMessage(error)}`, {
        redirectChain,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private requestHeaders(context: FetchSourceContext): Record<string, string> {
    const headers: Record<string, string> = {
      "user-agent": this.userAgent,
      accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8",
      "accept-language": "en-CA,en;q=0.9",
    };
    const previousMetadata = context.previousSnapshot?.rawMetadata ?? null;
    const etag = readMetadataString(previousMetadata, "etag");
    const lastModified = readMetadataString(previousMetadata, "lastModified");
    // Conditional requests let a provider answer 304 instead of resending a page.
    if (etag) headers["if-none-match"] = etag;
    if (lastModified) headers["if-modified-since"] = lastModified;
    return headers;
  }

  private async assertResolvedHostSafe(url: URL): Promise<void> {
    if (!this.resolveHost) return;
    const addresses = await this.resolveHost(url.hostname);
    for (const address of addresses) {
      assertSafeResolvedHost(address, url.toString());
    }
  }

  private async snapshotFromResponse(input: {
    base: SnapshotBase;
    response: Response;
    finalUrl: string;
    redirectChain: string[];
    previousSnapshot: CampSourceSnapshot | null;
    startedAtMs: number;
  }): Promise<CampSourceSnapshot> {
    const { base, response, finalUrl, redirectChain, previousSnapshot } = input;
    const contentType = response.headers.get("content-type");
    const metadata: Record<string, unknown> = {
      fetcher: this.kind,
      finalUrl,
      redirectChain,
      httpStatus: response.status,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      elapsedMs: this.now().getTime() - input.startedAtMs,
    };

    if (response.status === 304) {
      return {
        ...base,
        httpStatus: 304,
        contentType,
        contentHash: previousSnapshot?.contentHash ?? hashSourceContent(""),
        rawContent: null,
        rawMetadata: metadata,
        fetchStatus: "not_modified",
        fetchError: null,
      };
    }

    if (BLOCKED_STATUSES.has(response.status)) {
      const retryAfter = response.headers.get("retry-after");
      return {
        ...base,
        httpStatus: response.status,
        contentType,
        contentHash: hashSourceContent(`blocked:${response.status}:${finalUrl}`),
        rawContent: null,
        rawMetadata: { ...metadata, retryAfter },
        fetchStatus: "blocked",
        fetchError: `http_${response.status}_blocked`,
      };
    }

    if (!response.ok) {
      return {
        ...base,
        httpStatus: response.status,
        contentType,
        contentHash: hashSourceContent(`error:${response.status}:${finalUrl}`),
        rawContent: null,
        rawMetadata: metadata,
        fetchStatus: "error",
        fetchError: `http_${response.status}`,
      };
    }

    if (contentType && !SUPPORTED_CONTENT_TYPES.some((type) => contentType.includes(type))) {
      return {
        ...base,
        httpStatus: response.status,
        contentType,
        contentHash: hashSourceContent(`unsupported:${contentType}:${finalUrl}`),
        rawContent: null,
        rawMetadata: metadata,
        fetchStatus: "unsupported",
        fetchError: `content_type_not_supported:${contentType}`,
      };
    }

    const body = await response.text();
    const truncated = body.length > this.maxBytes;
    const content = truncated ? body.slice(0, this.maxBytes) : body;
    if (truncated) metadata.truncated = true;
    metadata.contentLength = body.length;

    if (isChallengePage(content)) {
      return {
        ...base,
        httpStatus: response.status,
        contentType,
        contentHash: hashSourceContent(content),
        rawContent: content,
        rawMetadata: metadata,
        fetchStatus: "blocked",
        fetchError: "bot_challenge_detected",
      };
    }

    return {
      ...base,
      httpStatus: response.status,
      contentType,
      contentHash: hashSourceContent(content),
      rawContent: content,
      rawMetadata: metadata,
      fetchStatus: "success",
      fetchError: null,
    };
  }
}

type SnapshotBase = {
  id: string;
  sourceId: string;
  retrievedAt: string;
  previousSnapshotId: string | null;
};

function failedSnapshot(
  base: SnapshotBase,
  fetchStatus: SnapshotFetchStatus,
  fetchError: string,
  metadata: Record<string, unknown> = {},
): CampSourceSnapshot {
  return {
    ...base,
    httpStatus: null,
    contentType: null,
    contentHash: hashSourceContent(`${fetchStatus}:${fetchError}:${base.sourceId}`),
    rawContent: null,
    rawMetadata: { fetcher: "http", ...metadata },
    fetchStatus,
    fetchError,
  };
}

function isChallengePage(content: string): boolean {
  const head = content.slice(0, 4000).toLowerCase();
  return CHALLENGE_MARKERS.some((marker) => head.includes(marker));
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

/**
 * A refused target and an unreachable one are different problems. Only the SSRF
 * classifier's own verdict is reported as unsafe; a DNS failure is reported as
 * a DNS failure, so the registry does not accuse a provider of being malicious
 * when the network is simply down.
 */
function describeTargetFailure(error: unknown): string {
  if (error instanceof UnsafeFetchTargetError) {
    return `unsafe_fetch_target:${error.reason}`;
  }
  const message = errorMessage(error);
  if (/EAI_AGAIN|ENOTFOUND|EAI_NODATA|getaddrinfo/i.test(message)) {
    return `dns_lookup_failed:${message}`;
  }
  return `target_check_failed:${message}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}
