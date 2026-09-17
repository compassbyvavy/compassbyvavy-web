import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampCandidate, CampSource } from "@/data/camps/ingestion/types";
import {
  createSupabaseIngestionStore,
  readSupabaseConfigFromEnv,
  resolveIngestionStore,
} from "@/lib/camps/ingestion/repositories/supabaseStore";

/** Published tables ingestion must never touch. */
const CATALOG_TABLES = ["Provider", "CampProgram", "CampSession", "Venue", "camp_programs"];

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

function mockClient(responder: (call: Call) => unknown = () => []) {
  const calls: Call[] = [];
  const fetchImpl = async (input: string, init?: RequestInit): Promise<Response> => {
    const call: Call = {
      url: input,
      method: init?.method ?? "GET",
      headers: (init?.headers as Record<string, string>) ?? {},
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
    };
    calls.push(call);
    return new Response(JSON.stringify(responder(call)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const store = createSupabaseIngestionStore({
    url: "https://project.supabase.co/",
    serviceRoleKey: "service-role-key",
    fetchImpl,
  });
  return { store, calls };
}

function source(overrides: Partial<CampSource> = {}): CampSource {
  return {
    id: "src-1",
    providerId: "prov-1",
    sourceType: "provider_website",
    sourceUrl: "https://example-camps.test/summer-camp",
    canonicalUrl: "https://example-camps.test/summer-camp",
    registrationPlatform: null,
    isActive: true,
    crawlStrategy: "html",
    crawlFrequency: "daily",
    checkIntervalHours: 24,
    extractorKey: "generic_html",
    nextCheckAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function candidate(): CampCandidate {
  return {
    id: "cand-1",
    candidateType: "session",
    sourceRecordIds: ["rec-1"],
    matchedCatalogId: "sess-1",
    matchConfidence: 0.96,
    candidateData: { priceAmount: 429 },
    changeSet: [
      {
        field: "priceAmount",
        changeType: "changed",
        oldValue: 399,
        newValue: 429,
        confidence: 0.9,
        sourceSnapshotId: "snap-1",
      },
    ],
    status: "needs_review",
    qualityFlags: [],
    createdAt: "2026-09-12T12:00:00.000Z",
    updatedAt: "2026-09-12T12:00:00.000Z",
  };
}

describe("readSupabaseConfigFromEnv", () => {
  it("needs both a URL and a service role key", () => {
    assert.equal(readSupabaseConfigFromEnv({ SUPABASE_URL: "https://p.supabase.co" }), null);
    assert.equal(readSupabaseConfigFromEnv({ SUPABASE_SERVICE_ROLE_KEY: "key" }), null);
    assert.deepEqual(
      readSupabaseConfigFromEnv({
        SUPABASE_URL: "https://p.supabase.co/",
        SUPABASE_SERVICE_ROLE_KEY: "key",
      }),
      { url: "https://p.supabase.co", serviceRoleKey: "key" },
    );
  });
});

describe("resolveIngestionStore", () => {
  it("falls back to memory when credentials are absent", () => {
    const store = resolveIngestionStore({ env: {}, memorySeed: { sources: [source()] } });
    assert.equal(store.kind, "memory");
  });

  it("uses Supabase when both credentials are present", () => {
    const store = resolveIngestionStore({
      env: {
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      },
    });
    assert.equal(store.kind, "supabase");
  });
});

describe("Supabase ingestion store", () => {
  it("authenticates every request with the service role key", async () => {
    const { store, calls } = mockClient();
    await store.sources.listSources();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].headers.apikey, "service-role-key");
    assert.equal(calls[0].headers.authorization, "Bearer service-role-key");
    assert.match(calls[0].url, /^https:\/\/project\.supabase\.co\/rest\/v1\/camp_sources\?/);
  });

  it("asks PostgREST for sources that are active and due", async () => {
    const { store, calls } = mockClient();
    await store.sources.listDueSources(new Date("2026-09-12T12:00:00.000Z"), 5);

    const url = new URL(calls[0].url);
    assert.equal(url.searchParams.get("is_active"), "eq.true");
    assert.equal(
      url.searchParams.get("or"),
      "(next_check_at.is.null,next_check_at.lte.2026-09-12T12:00:00.000Z)",
    );
    assert.equal(url.searchParams.get("limit"), "5");
  });

  it("upserts a source as snake_case columns", async () => {
    const { store, calls } = mockClient();
    await store.sources.upsertSource(source());

    assert.equal(calls[0].method, "POST");
    assert.match(calls[0].headers.prefer, /resolution=merge-duplicates/);
    assert.deepEqual((calls[0].body as Record<string, unknown>[])[0].provider_id, "prov-1");
    assert.deepEqual(
      (calls[0].body as Record<string, unknown>[])[0].check_interval_hours,
      24,
    );
    assert.deepEqual((calls[0].body as Record<string, unknown>[])[0].extractor_key, "generic_html");
  });

  it("leaves the content hash alone when a check reports none", async () => {
    const { store, calls } = mockClient();
    await store.sources.markSourceChecked({
      sourceId: "src-1",
      checkedAt: "2026-09-12T12:00:00.000Z",
      changed: true,
      successful: false,
      nextCheckAt: "2026-09-13T12:00:00.000Z",
      error: "extraction_failed",
    });

    const patch = calls[0].body as Record<string, unknown>;
    assert.equal(calls[0].method, "PATCH");
    assert.ok(!("last_content_hash" in patch), "a failed check must not record a hash");
    assert.equal(patch.last_error, "extraction_failed");
    assert.equal(patch.last_error_at, "2026-09-12T12:00:00.000Z");
    assert.ok(!("last_successful_at" in patch));
  });

  it("clears a stale error once a check succeeds", async () => {
    const { store, calls } = mockClient();
    await store.sources.markSourceChecked({
      sourceId: "src-1",
      checkedAt: "2026-09-12T12:00:00.000Z",
      contentHash: "sha256:abc",
      changed: false,
      successful: true,
      nextCheckAt: "2026-09-13T12:00:00.000Z",
    });

    const patch = calls[0].body as Record<string, unknown>;
    assert.equal(patch.last_content_hash, "sha256:abc");
    assert.equal(patch.last_successful_at, "2026-09-12T12:00:00.000Z");
    assert.equal(patch.last_error, null);
  });

  it("replaces a candidate's change rows instead of appending", async () => {
    const { store, calls } = mockClient(() => [
      {
        id: "cand-1",
        candidate_type: "session",
        source_record_ids: ["rec-1"],
        matched_catalog_id: "sess-1",
        match_confidence: 0.96,
        candidate_data: {},
        status: "needs_review",
        review_reason: null,
        quality_flags: [],
        pipeline_outcome: null,
        source_id: null,
        snapshot_id: null,
        created_at: "2026-09-12T12:00:00.000Z",
        updated_at: "2026-09-12T12:00:00.000Z",
        reviewed_at: null,
        reviewed_by: null,
      },
    ]);

    await store.candidates.saveCandidate(candidate());

    assert.deepEqual(
      calls.map((call) => `${call.method} ${new URL(call.url).pathname.split("/").pop()}`),
      ["POST camp_candidates", "DELETE camp_candidate_changes", "POST camp_candidate_changes"],
    );
    const changeRows = calls[2].body as Record<string, unknown>[];
    assert.equal(changeRows[0].field, "priceAmount");
    assert.equal(changeRows[0].change_type, "changed");
    assert.equal(changeRows[0].candidate_id, "cand-1");
  });

  it("records a review decision without requesting any catalog table", async () => {
    const { store, calls } = mockClient((call) =>
      call.method === "PATCH"
        ? [
            {
              id: "cand-1",
              candidate_type: "session",
              source_record_ids: ["rec-1"],
              matched_catalog_id: "sess-1",
              match_confidence: 0.96,
              candidate_data: {},
              status: "approved",
              review_reason: "approved by dev-admin",
              quality_flags: [],
              pipeline_outcome: null,
              source_id: null,
              snapshot_id: null,
              created_at: "2026-09-12T12:00:00.000Z",
              updated_at: "2026-09-12T18:00:00.000Z",
              reviewed_at: "2026-09-12T18:00:00.000Z",
              reviewed_by: "dev-admin",
            },
          ]
        : [],
    );

    const updated = await store.candidates.recordReviewDecision({
      candidateId: "cand-1",
      decision: "approved",
      reviewedBy: "dev-admin",
      reviewedAt: "2026-09-12T18:00:00.000Z",
      note: "approved by dev-admin",
    });

    assert.equal(updated?.status, "approved");
    const patch = calls[0].body as Record<string, unknown>;
    assert.equal(patch.status, "approved");
    assert.equal(patch.reviewed_by, "dev-admin");
    assert.equal(patch.review_reason, "approved by dev-admin");

    for (const call of calls) {
      for (const table of CATALOG_TABLES) {
        assert.ok(
          !call.url.includes(table),
          `review touched a catalog table (${table}) via ${call.url}`,
        );
      }
      assert.match(call.url, /\/rest\/v1\/camp_(candidates|candidate_changes)\?/);
    }
  });

  it("surfaces a PostgREST failure instead of returning empty data", async () => {
    const store = createSupabaseIngestionStore({
      url: "https://project.supabase.co",
      serviceRoleKey: "service-role-key",
      fetchImpl: async () =>
        new Response('{"message":"permission denied"}', {
          status: 401,
          statusText: "Unauthorized",
        }),
    });

    await assert.rejects(
      () => store.sources.listSources(),
      /Supabase ingestion request failed \(401 GET camp_sources/,
    );
  });
});
