/**
 * Dual gate for populated Camps visual review on Cloudflare Workers preview
 * URLs only.
 *
 * Identity is the documented Workers Preview URL hostname:
 * `<version-prefix-or-alias>-<WORKER_NAME>.<account>.workers.dev`
 *
 * Observed on PR #11 and required by Cloudflare’s Preview URLs docs.
 * The production workers.dev name (no prefix) and custom domains never match.
 *
 * Do not trust X-Forwarded-Host. Callers must pass the incoming Host header.
 */

export const CAMPS_REVIEW_PREVIEW_FLAG = "COMPASS_CAMPS_REVIEW_PREVIEW";

/** `name` in wrangler.jsonc */
export const CAMPS_WORKER_NAME = "compassbyvavy-web";

/** Account workers.dev subdomain from the live PR #11 preview hosts. */
export const CAMPS_WORKERS_DEV_ACCOUNT = "compassbyvavy";

export function isCampsReviewPreviewFlagOn(
  reviewFlag: string | undefined | null,
): boolean {
  return reviewFlag === "true";
}

/**
 * True only for this Worker’s Cloudflare Preview URL hosts, never for the
 * production workers.dev name or a custom domain.
 */
export function isCloudflareWorkersPreviewHostname(
  hostname: string | undefined | null,
): boolean {
  if (!hostname) return false;
  const host = hostname.split(":")[0]?.trim().toLowerCase();
  if (!host) return false;
  const productionWorkersDev = `${CAMPS_WORKER_NAME}.${CAMPS_WORKERS_DEV_ACCOUNT}.workers.dev`;
  if (host === productionWorkersDev) return false;
  const previewSuffix = `-${CAMPS_WORKER_NAME}.${CAMPS_WORKERS_DEV_ACCOUNT}.workers.dev`;
  return host.endsWith(previewSuffix) && host.length > previewSuffix.length;
}

/**
 * Samples may load only when BOTH are true:
 * 1. explicit COMPASS_CAMPS_REVIEW_PREVIEW=true
 * 2. verified Cloudflare Workers preview hostname for this Worker
 */
export function isCampsReviewPreviewEnabled(input: {
  reviewFlag: string | undefined | null;
  hostname: string | undefined | null;
}): boolean {
  return (
    isCampsReviewPreviewFlagOn(input.reviewFlag) &&
    isCloudflareWorkersPreviewHostname(input.hostname)
  );
}
