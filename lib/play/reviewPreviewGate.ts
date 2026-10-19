/**
 * Dual gate for Indoor Play fixtures on Cloudflare Workers preview URLs.
 *
 * Same host identity as Camps: never trust X-Forwarded-Host. Callers pass
 * the incoming Host header. Production workers.dev and custom domains stay
 * closed even when the env flag is true.
 */

import { isCloudflareWorkersPreviewHostname } from "@/lib/camps/reviewPreviewGate";

export const PLAY_REVIEW_PREVIEW_FLAG = "COMPASS_PLAY_REVIEW_PREVIEW";

export function isPlayReviewPreviewFlagOn(
  reviewFlag: string | undefined | null,
): boolean {
  return reviewFlag === "true";
}

export function isPlayReviewPreviewEnabled(input: {
  reviewFlag: string | undefined | null;
  hostname: string | undefined | null;
}): boolean {
  return (
    isPlayReviewPreviewFlagOn(input.reviewFlag) &&
    isCloudflareWorkersPreviewHostname(input.hostname)
  );
}
