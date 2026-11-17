import type { Metadata } from "next";
import { tokenMatches } from "@/lib/camps/listingForm/submit";
import { readListingState, writeListingState } from "@/lib/camps/listingForm/store";
import { torontoToday } from "@/lib/camps/campPage";
import "../../confirm/confirm.css";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = readListingState();
  const invite = state.invites.find((item) => tokenMatches(token, item.tokenHash));
  if (!invite) {
    return <main className="confirm"><h1>This unsubscribe link isn't one of ours.</h1></main>;
  }
  if (invite.status !== "opted_out") {
    const today = torontoToday();
    writeListingState({
      ...state,
      invites: state.invites.map((item) => (item.id === invite.id ? { ...item, status: "opted_out" } : item)),
      events: [...state.events, { inviteId: invite.id, kind: "unsubscribed", at: today }],
    });
  }
  return (
    <main className="confirm">
      <h1>You're unsubscribed</h1>
      <p>{invite.camp} won't get more listing emails from Compass, and any photos from this invite won't be used.</p>
    </main>
  );
}
