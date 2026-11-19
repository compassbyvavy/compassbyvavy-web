import { isCampsReviewPreviewEnabled } from "@/lib/camps/reviewPreviewGate";

/** Invite and submission screens stay off the public site. */
export function listingAdminAllowed(input: {
  nodeEnv: string | undefined;
  hostname: string | null | undefined;
  reviewFlag: string | null | undefined;
}): boolean {
  if (input.nodeEnv !== "production") return true;
  return isCampsReviewPreviewEnabled({ reviewFlag: input.reviewFlag, hostname: input.hostname });
}
