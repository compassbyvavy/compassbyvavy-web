/**
 * City of Mississauga ActiveNet availability connector types.
 *
 * Public `activity_number` and internal `activity_id` stay distinct:
 * URLs and the REST path use activity_id only.
 */

export const ACTIVENET_ORIGIN =
  "https://anc.ca.apm.activecommunities.com" as const;
export const ACTIVENET_TENANT = "activemississauga" as const;
export const ACTIVENET_HOST = "anc.ca.apm.activecommunities.com" as const;

export type ActiveNetSpaceStatusKind =
  | "available"
  | "closed"
  | "waitlist"
  | "unknown";

export type ActiveNetFreshness = "fresh" | "cached" | "stale" | "unavailable";

export type ActiveNetAvailabilityError =
  | "malformed_response"
  | "id_mismatch"
  | "provider_failure"
  | "timeout"
  | "unknown_candidate";

export type ActiveNetActivityMapping = {
  candidateId: string;
  sessionId: string;
  programId: string;
  /** Internal ActiveNet activity_id — REST path and booking URLs. */
  activityId: number;
  /** Public activity_number — stored and checked, never used in URLs. */
  activityNumber: string;
  tenantSlug: typeof ACTIVENET_TENANT;
  origin: typeof ACTIVENET_ORIGIN;
};

export type ParsedSpaceStatus = {
  kind: ActiveNetSpaceStatusKind;
  openingsRemaining: number | null;
  raw: string | null;
};

export type ActiveNetAvailabilitySnapshot = {
  candidateId: string;
  activityId: number;
  activityNumber: string;
  retrievedAt: string | null;
  freshness: ActiveNetFreshness;
  status: ActiveNetSpaceStatusKind;
  openingsRemaining: number | null;
  spaceStatusRaw: string | null;
  bookingUrl: string;
  sourceUrl: string;
  refreshIntervalMs: number;
  error: ActiveNetAvailabilityError | null;
};

export type ActiveNetAvailabilityConfig = {
  refreshIntervalMs: number;
  timeoutMs: number;
  minOriginIntervalMs: number;
};
