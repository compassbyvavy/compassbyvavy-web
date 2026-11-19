import { isCampsReviewPreviewEnabled } from "@/lib/camps/reviewPreviewGate";

/** The review screen is for Vineeta. The public site does not serve it. */
export function campReviewAdminAllowed(input: {
  nodeEnv: string | undefined;
  hostname: string | null | undefined;
  reviewFlag: string | null | undefined;
}): boolean {
  if (input.nodeEnv !== "production") return true;
  return isCampsReviewPreviewEnabled({
    reviewFlag: input.reviewFlag,
    hostname: input.hostname,
  });
}
