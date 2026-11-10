import {
  ACTIVENET_HOST,
  ACTIVENET_ORIGIN,
  ACTIVENET_TENANT,
  type ActiveNetActivityMapping,
} from "@/lib/camps/availability/activenet/types";

const TENANT_PREFIX = `/${ACTIVENET_TENANT}`;

/**
 * Deepest public enrollment destination ActiveNet exposes without a session.
 * The CUI then redirects anonymous users to login; Compass does not skip that
 * wall or invent a cart/checkout URL.
 */
export function activeNetEnrollUrl(activityId: number): string {
  return `${ACTIVENET_ORIGIN}${TENANT_PREFIX}/activity/search/enroll/${activityId}?locale=en-US`;
}

export function activeNetActivityPageUrl(activityId: number): string {
  return `${ACTIVENET_ORIGIN}${TENANT_PREFIX}/activity/search/detail/${activityId}`;
}

export function activeNetDetailApiUrl(activityId: number): string {
  return `${ACTIVENET_ORIGIN}${TENANT_PREFIX}/rest/activity/detail/${activityId}`;
}

export function urlsForMapping(mapping: ActiveNetActivityMapping): {
  apiUrl: string;
  bookingUrl: string;
  sourceUrl: string;
} {
  return {
    apiUrl: activeNetDetailApiUrl(mapping.activityId),
    bookingUrl: activeNetEnrollUrl(mapping.activityId),
    sourceUrl: activeNetActivityPageUrl(mapping.activityId),
  };
}

/** True when a URL path uses the internal activity_id, not the public number. */
export function urlUsesInternalActivityId(
  url: string,
  mapping: ActiveNetActivityMapping,
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.hostname !== ACTIVENET_HOST) return false;
  const id = String(mapping.activityId);
  const publicNumber = mapping.activityNumber;
  const path = parsed.pathname;
  return path.includes(id) && !path.includes(`/${publicNumber}`);
}
