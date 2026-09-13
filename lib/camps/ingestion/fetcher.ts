/**
 * Source fetching contract.
 *
 * Every fetch — fixture or live — produces one immutable `CampSourceSnapshot`,
 * including failures. A blocked or errored fetch is a recorded observation, not
 * an exception to swallow, so the registry can show why a source went quiet.
 */

import type {
  CampSource,
  CampSourceSnapshot,
  SnapshotFetchStatus,
} from "@/data/camps/ingestion/types";
import { hashSourceContent } from "@/lib/camps/ingestion/hash";
import { createPrefixedIdFactory, type IdFactory } from "@/lib/camps/ingestion/ids";

export type FetchSourceContext = {
  now?: Date;
  /** Previous snapshot — enables conditional requests and hash comparison. */
  previousSnapshot?: CampSourceSnapshot | null;
  /** Explicit id for the produced snapshot (tests / deterministic runs). */
  snapshotId?: string;
};

export interface CampSourceFetcher {
  /** Short label recorded in run logs (`fixture`, `http`, …). */
  readonly kind: string;
  fetchSource(
    source: CampSource,
    context?: FetchSourceContext,
  ): Promise<CampSourceSnapshot>;
}

export type FixturePayload = {
  content?: string;
  contentType?: string | null;
  httpStatus?: number | null;
  fetchStatus?: SnapshotFetchStatus;
  fetchError?: string | null;
  rawMetadata?: Record<string, unknown> | null;
};

export type FixtureSourceFetcherOptions = {
  newId?: IdFactory;
  now?: () => Date;
};

/**
 * Offline fetcher used by tests and the dev admin surfaces.
 *
 * Payloads are keyed by source id, then canonical URL, then source URL, so a
 * fixture can be registered by whichever identity the caller has at hand.
 */
export class FixtureSourceFetcher implements CampSourceFetcher {
  readonly kind = "fixture";

  private readonly payloads: Record<string, FixturePayload>;
  private readonly newId: IdFactory;
  private readonly now: () => Date;

  constructor(
    payloads: Record<string, FixturePayload>,
    options: FixtureSourceFetcherOptions = {},
  ) {
    this.payloads = payloads;
    this.newId = options.newId ?? createPrefixedIdFactory("snap");
    this.now = options.now ?? (() => new Date());
  }

  async fetchSource(
    source: CampSource,
    context: FetchSourceContext = {},
  ): Promise<CampSourceSnapshot> {
    const retrievedAt = (context.now ?? this.now()).toISOString();
    const id = context.snapshotId ?? this.newId();
    const previousSnapshotId = context.previousSnapshot?.id ?? null;

    const payload =
      this.payloads[source.id] ??
      this.payloads[source.canonicalUrl] ??
      this.payloads[source.sourceUrl];

    if (!payload) {
      return {
        id,
        sourceId: source.id,
        retrievedAt,
        httpStatus: null,
        contentType: null,
        contentHash: hashSourceContent(`missing-fixture:${source.id}`),
        rawContent: null,
        fetchStatus: "error",
        fetchError: `No fixture payload registered for source ${source.id}`,
        previousSnapshotId,
      };
    }

    const content = payload.content ?? "";
    return {
      id,
      sourceId: source.id,
      retrievedAt,
      httpStatus: payload.httpStatus ?? (payload.fetchStatus === "success" ? 200 : null),
      contentType: payload.contentType ?? "text/html",
      contentHash: hashSourceContent(content),
      rawContent: payload.content ?? null,
      rawMetadata: payload.rawMetadata ?? null,
      fetchStatus: payload.fetchStatus ?? "success",
      fetchError: payload.fetchError ?? null,
      previousSnapshotId,
    };
  }
}
