/**
 * Guest workspace snapshot for a future account `saved_items` import.
 * Local-first: never clears localStorage until a server ack exists.
 * This module does not call auth — it only shapes the payload.
 */

import { serializeShortlist } from "@/lib/shortlist/storage";
import type { ShortlistState } from "@/lib/shortlist/types";

export const GUEST_WORKSPACE_VERSION = 1 as const;

export type GuestWorkspaceSnapshot = {
  version: typeof GUEST_WORKSPACE_VERSION;
  shortlistJson: string;
  capturedAt: string;
};

export function buildGuestWorkspaceSnapshot(
  shortlist: ShortlistState,
  now: Date,
): GuestWorkspaceSnapshot {
  return {
    version: GUEST_WORKSPACE_VERSION,
    shortlistJson: serializeShortlist(shortlist),
    capturedAt: now.toISOString(),
  };
}
