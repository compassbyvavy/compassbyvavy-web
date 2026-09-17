/**
 * Enforceable gates for ingestion development surfaces and live fetching.
 *
 * Two separate switches, because they answer different questions:
 * - `areIngestionDevFixturesAllowed()` — may this process read DEV-ONLY
 *   ingestion fixtures? False in production.
 * - `isLiveSourceFetchEnabled()` — may this process reach out to the public
 *   internet? Off unless explicitly opted in, in any environment.
 *
 * Comments in a fixture file are not a safeguard. Callers must come through
 * here.
 */

export const LIVE_FETCH_ENV_VAR = "COMPASS_CAMPS_LIVE_FETCH";

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function areIngestionDevFixturesAllowed(): boolean {
  return !isProductionRuntime();
}

/** Hard gate for dev-only ingestion features (admin pages, fixture loaders). */
export function assertIngestionDevOnly(feature: string): void {
  if (isProductionRuntime()) {
    throw new Error(
      `${feature} is development-only and is not available when NODE_ENV is production.`,
    );
  }
}

/**
 * Live network fetching is opt-in per process. Absent the env var, ingestion
 * runs entirely on fixtures and saved benchmark HTML.
 */
export function isLiveSourceFetchEnabled(): boolean {
  const raw = process.env[LIVE_FETCH_ENV_VAR];
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "enabled";
}

/** Hard gate for anything that opens a socket to a provider website. */
export function assertLiveSourceFetchEnabled(): void {
  if (!isLiveSourceFetchEnabled()) {
    throw new Error(
      `Live camp source fetching is disabled. Set ${LIVE_FETCH_ENV_VAR}=1 to enable it for this process.`,
    );
  }
}
