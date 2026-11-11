import { assertSafeHttpUrl } from "@/lib/camps/ingestion/security/ssrf";
import { COMPASS_ACTIVENET_USER_AGENT } from "@/lib/camps/availability/activenet/config";
import type { FetchLike } from "@/lib/camps/availability/activenet/fetchDetail";
import { ACTIVENET_HOST } from "@/lib/camps/availability/activenet/types";
import { activeNetEstimatePriceUrl } from "@/lib/camps/availability/activenet/urls";

export type ActiveNetEstimatePrice = {
  amount: number | null;
  currency: "CAD";
  residentAmount: number | null;
  nonResidentAmount: number | null;
  rawDetails: Array<{ price: string; description: string }>;
};

export { activeNetEstimatePriceUrl };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function parseDollar(raw: string): number | null {
  const match = raw.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

export function interpretEstimatePricePayload(payload: unknown): ActiveNetEstimatePrice | null {
  if (!isRecord(payload)) return null;
  const body = isRecord(payload.body) ? payload.body : null;
  const estimate = body && isRecord(body.estimateprice) ? body.estimateprice : null;
  if (!estimate) return null;
  const prices = Array.isArray(estimate.prices) ? estimate.prices : [];
  const details: Array<{ price: string; description: string }> = [];
  for (const group of prices) {
    if (!isRecord(group) || !Array.isArray(group.details)) continue;
    for (const row of group.details) {
      if (!isRecord(row)) continue;
      const price = typeof row.price === "string" ? row.price.trim() : "";
      const description = typeof row.description === "string" ? row.description.trim() : "";
      if (price) details.push({ price, description });
    }
  }
  const resident = details.find((d) => /resident/i.test(d.description) && !/non/i.test(d.description));
  const nonResident = details.find((d) => /non[- ]?resident/i.test(d.description));
  const residentAmount = resident ? parseDollar(resident.price) : null;
  const nonResidentAmount = nonResident ? parseDollar(nonResident.price) : null;
  const fallback = details[0] ? parseDollar(details[0].price) : null;
  return {
    amount: residentAmount ?? fallback,
    currency: "CAD",
    residentAmount,
    nonResidentAmount,
    rawDetails: details,
  };
}

export async function fetchActiveNetEstimatePrice(options: {
  activityId: number;
  fetchImpl?: FetchLike;
  timeoutMs: number;
}): Promise<ActiveNetEstimatePrice | null> {
  const url = activeNetEstimatePriceUrl(options.activityId);
  const parsedUrl = assertSafeHttpUrl(url);
  if (parsedUrl.hostname !== ACTIVENET_HOST) return null;
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
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
    if (!response.ok) return null;
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return null;
    }
    return interpretEstimatePricePayload(payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
