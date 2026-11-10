import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fetchActiveNetActivityDetail,
  interpretActiveNetDetailPayload,
  type FetchLike,
} from "@/lib/camps/availability/activenet/fetchDetail";
import { getActiveNetMappingByCandidateId } from "@/lib/camps/availability/activenet/registry";

const mapping = getActiveNetMappingByCandidateId("MSC-0007");
assert.ok(mapping);

function detailPayload(overrides: {
  activity_id?: unknown;
  activity_number?: unknown;
  space_status?: unknown;
  omitSpaceStatus?: boolean;
  response_code?: string;
  omitDetail?: boolean;
} = {}): unknown {
  const detail: Record<string, unknown> = {
    activity_id: overrides.activity_id ?? 145871,
    activity_number: overrides.activity_number ?? "147884",
    activity_name: "Camp: Winter Fun",
  };
  if (!overrides.omitSpaceStatus) {
    detail.space_status = overrides.space_status ?? "33 openings remaining";
  }
  return {
    headers: {
      response_code: overrides.response_code ?? "0000",
      response_message: "Successful",
    },
    body: overrides.omitDetail ? {} : { detail },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("interpretActiveNetDetailPayload", () => {
  it("reads available openings from space_status", () => {
    const result = interpretActiveNetDetailPayload(detailPayload(), mapping);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.parsed.kind, "available");
      assert.equal(result.parsed.openingsRemaining, 33);
      assert.equal(result.activityId, 145871);
      assert.equal(result.activityNumber, "147884");
    }
  });

  it("reads Closed", () => {
    const result = interpretActiveNetDetailPayload(
      detailPayload({ space_status: "Closed" }),
      mapping,
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.parsed.kind, "closed");
  });

  it("reads Waitlist", () => {
    const result = interpretActiveNetDetailPayload(
      detailPayload({ space_status: "Waitlist" }),
      mapping,
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.parsed.kind, "waitlist");
  });

  it("flags an activity_id mismatch", () => {
    const result = interpretActiveNetDetailPayload(
      detailPayload({ activity_id: 147884 }),
      mapping,
    );
    assert.deepEqual(result, { ok: false, error: "id_mismatch" });
  });

  it("flags an activity_number mismatch", () => {
    const result = interpretActiveNetDetailPayload(
      detailPayload({ activity_number: "149897" }),
      mapping,
    );
    assert.deepEqual(result, { ok: false, error: "id_mismatch" });
  });

  it("flags malformed payloads", () => {
    assert.equal(
      interpretActiveNetDetailPayload("not-json", mapping).ok,
      false,
    );
    assert.equal(
      interpretActiveNetDetailPayload(detailPayload({ omitDetail: true }), mapping)
        .ok,
      false,
    );
    assert.equal(
      interpretActiveNetDetailPayload(
        detailPayload({ omitSpaceStatus: true }),
        mapping,
      ).ok,
      false,
    );
    assert.equal(
      interpretActiveNetDetailPayload(
        detailPayload({ space_status: 33 }),
        mapping,
      ).ok,
      false,
    );
  });

  it("flags a non-success provider response_code", () => {
    const result = interpretActiveNetDetailPayload(
      detailPayload({ response_code: "0002" }),
      mapping,
    );
    assert.deepEqual(result, { ok: false, error: "provider_failure" });
  });
});

describe("fetchActiveNetActivityDetail", () => {
  it("GETs the internal activity_id path", async () => {
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      return jsonResponse(detailPayload());
    };
    const result = await fetchActiveNetActivityDetail({
      mapping,
      fetchImpl,
      timeoutMs: 1000,
    });
    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/rest\/activity\/detail\/145871$/);
    assert.doesNotMatch(calls[0], /147884/);
  });

  it("maps HTTP failures and invalid JSON", async () => {
    const fail = await fetchActiveNetActivityDetail({
      mapping,
      fetchImpl: async () => jsonResponse({}, 500),
      timeoutMs: 1000,
    });
    assert.deepEqual(fail, { ok: false, error: "provider_failure" });

    const malformed = await fetchActiveNetActivityDetail({
      mapping,
      fetchImpl: async () =>
        new Response("<html>nope</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      timeoutMs: 1000,
    });
    assert.deepEqual(malformed, { ok: false, error: "malformed_response" });
  });

  it("maps abort to timeout", async () => {
    const result = await fetchActiveNetActivityDetail({
      mapping,
      fetchImpl: async (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
      timeoutMs: 10,
    });
    assert.deepEqual(result, { ok: false, error: "timeout" });
  });
});
