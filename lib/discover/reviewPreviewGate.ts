/**
 * Dual gate for Discover example listings on Cloudflare Workers preview URLs.
 *
 * Same host identity as Camps and Indoor Play: never trust X-Forwarded-Host.
 * Production workers.dev and custom domains stay closed even when the flag
 * is true. Public category cards stay coming_soon either way.
 */

import { isCloudflareWorkersPreviewHostname } from "@/lib/camps/reviewPreviewGate";

export const DISCOVER_REVIEW_PREVIEW_FLAG = "COMPASS_DISCOVER_REVIEW_PREVIEW";

export function isDiscoverReviewPreviewFlagOn(
  reviewFlag: string | undefined | null,
): boolean {
  return reviewFlag === "true";
}

export function isDiscoverReviewPreviewEnabled(input: {
  reviewFlag: string | undefined | null;
  hostname: string | undefined | null;
}): boolean {
  return (
    isDiscoverReviewPreviewFlagOn(input.reviewFlag) &&
    isCloudflareWorkersPreviewHostname(input.hostname)
  );
}
