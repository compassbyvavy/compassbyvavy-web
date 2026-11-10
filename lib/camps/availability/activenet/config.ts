import type { ActiveNetAvailabilityConfig } from "@/lib/camps/availability/activenet/types";

export const DEFAULT_ACTIVENET_REFRESH_MS = 60_000;
export const DEFAULT_ACTIVENET_TIMEOUT_MS = 8_000;
export const DEFAULT_ACTIVENET_MIN_ORIGIN_INTERVAL_MS = 5_000;

export const COMPASS_ACTIVENET_USER_AGENT =
  "CompassByVavyCampsBot/1.0 (+https://compassbyvavy.com; ActiveNet availability; contact: hello@compassbyvavy.com)";

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function readActiveNetAvailabilityConfig(
  env: NodeJS.ProcessEnv = process.env,
): ActiveNetAvailabilityConfig {
  return {
    refreshIntervalMs: parsePositiveInt(
      env.COMPASS_ACTIVENET_REFRESH_MS,
      DEFAULT_ACTIVENET_REFRESH_MS,
    ),
    timeoutMs: parsePositiveInt(
      env.COMPASS_ACTIVENET_TIMEOUT_MS,
      DEFAULT_ACTIVENET_TIMEOUT_MS,
    ),
    minOriginIntervalMs: parsePositiveInt(
      env.COMPASS_ACTIVENET_MIN_ORIGIN_INTERVAL_MS,
      DEFAULT_ACTIVENET_MIN_ORIGIN_INTERVAL_MS,
    ),
  };
}
