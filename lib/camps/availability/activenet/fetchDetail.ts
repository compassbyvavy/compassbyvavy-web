import { assertSafeHttpUrl } from "@/lib/camps/ingestion/security/ssrf";
import { COMPASS_ACTIVENET_USER_AGENT } from "@/lib/camps/availability/activenet/config";
import { parseActiveNetSpaceStatus } from "@/lib/camps/availability/activenet/parseSpaceStatus";
import {
  ACTIVENET_HOST,
  type ActiveNetActivityMapping,
  type ActiveNetAvailabilityError,
  type ParsedSpaceStatus,
} from "@/lib/camps/availability/activenet/types";
import { activeNetDetailApiUrl } from "@/lib/camps/availability/activenet/urls";

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type ActiveNetOriginResult =
  | {
      ok: true;
      parsed: ParsedSpaceStatus;
      activityId: number;
      activityNumber: string;
    }
  | {
      ok: false;
      error: Exclude<ActiveNetAvailabilityError, "unknown_candidate">;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function readActivityId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function readActivityNumber(value: unknown): string | null {
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return null;
}

export function interpretActiveNetDetailPayload(
  payload: unknown,
  mapping: ActiveNetActivityMapping,
): ActiveNetOriginResult {
  if (!isRecord(payload)) {
    return { ok: false, error: "malformed_response" };
  }
  const headers = isRecord(payload.headers) ? payload.headers : null;
  const responseCode =
    typeof headers?.response_code === "string" ? headers.response_code : null;
  if (responseCode && responseCode !== "0000") {
    return { ok: false, error: "provider_failure" };
  }
  const body = isRecord(payload.body) ? payload.body : null;
  const detail = body && isRecord(body.detail) ? body.detail : null;
  if (!detail) {
    return { ok: false, error: "malformed_response" };
  }
  if (!("space_status" in detail) || typeof detail.space_status !== "string") {
    return { ok: false, error: "malformed_response" };
  }

  const activityId = readActivityId(detail.activity_id);
  const activityNumber = readActivityNumber(detail.activity_number);
  if (activityId == null || activityNumber == null) {
    return { ok: false, error: "malformed_response" };
  }
  if (
    activityId !== mapping.activityId ||
    activityNumber !== mapping.activityNumber
  ) {
    return { ok: false, error: "id_mismatch" };
  }

  return {
    ok: true,
    parsed: parseActiveNetSpaceStatus(detail.space_status),
    activityId,
    activityNumber,
  };
}

export async function fetchActiveNetActivityDetail(options: {
  mapping: ActiveNetActivityMapping;
  fetchImpl?: FetchLike;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<ActiveNetOriginResult> {
  const url = activeNetDetailApiUrl(options.mapping.activityId);
  const parsedUrl = assertSafeHttpUrl(url);
  if (parsedUrl.hostname !== ACTIVENET_HOST) {
    return { ok: false, error: "provider_failure" };
  }

  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const onOuterAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onOuterAbort);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": COMPASS_ACTIVENET_USER_AGENT,
      },
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) {
      return { ok: false, error: "provider_failure" };
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: "malformed_response" };
    }
    return interpretActiveNetDetailPayload(payload, options.mapping);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: "provider_failure" };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onOuterAbort);
  }
}
