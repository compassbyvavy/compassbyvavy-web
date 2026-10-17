/**
 * Opt-in sync seam. No auth provider is wired.
 * The route acknowledges a payload; local copies clear only after that ack.
 */

import {
  ackClearsLocalCopy,
  captureGuestState,
  clearSyncedGuestCopies,
  notifyGuestCopiesCleared,
  type GuestStateSnapshot,
} from "@/lib/account/guestState";

export type SyncResult =
  | { ok: true; acceptedAt: string }
  | { ok: false; reason: string };

export async function syncGuestState(input: {
  localStorage: Pick<Storage, "getItem" | "removeItem">;
  sessionStorage: Pick<Storage, "getItem" | "removeItem"> | null;
  now?: Date;
  post?: (snapshot: GuestStateSnapshot) => Promise<Response>;
}): Promise<SyncResult> {
  const snapshot = captureGuestState(
    input.localStorage,
    input.sessionStorage,
    input.now ?? new Date(),
  );
  const post =
    input.post ??
    ((body: GuestStateSnapshot) =>
      fetch("/api/account/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }));
  let response: Response;
  try {
    response = await post(snapshot);
  } catch {
    return { ok: false, reason: "The sync request did not finish." };
  }
  if (!response.ok) {
    return { ok: false, reason: "The server did not accept the guest state." };
  }
  let ack: { ok?: unknown; acceptedAt?: unknown };
  try {
    ack = (await response.json()) as { ok?: unknown; acceptedAt?: unknown };
  } catch {
    return { ok: false, reason: "The server reply was not readable." };
  }
  if (!ackClearsLocalCopy(ack)) {
    return { ok: false, reason: "The server did not confirm the save." };
  }
  clearSyncedGuestCopies(input.localStorage, input.sessionStorage);
  notifyGuestCopiesCleared();
  return { ok: true, acceptedAt: ack.acceptedAt as string };
}
