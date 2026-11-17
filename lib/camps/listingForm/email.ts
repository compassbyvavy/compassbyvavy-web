/**
 * Invite emails. Nothing here sends mail. The sender refuses while the
 * mailing address is empty, and this branch only writes to the outbox.
 */
import { inviteMail } from "@/lib/camps/listingForm/copy";
import type { Invite, ListingState } from "@/lib/camps/listingForm/types";

export type RenderedEmail = {
  subject: string;
  text: string;
  canSend: boolean;
};

export function renderInviteEmail(input: {
  campName: string;
  minutes: 2 | 5;
  gaps: string[];
  formLink: string;
  unsubscribeLink: string;
  mailingAddress: string;
}): RenderedEmail {
  const address = input.mailingAddress.trim();
  const gaps = input.gaps.length
    ? `A few things parents ask about are missing: ${input.gaps.join(", ")}.`
    : "We already have the answers parents ask about.";
  const text = [
    `Hi ${input.campName} team,`,
    "",
    "I'm Vineeta, a Mississauga mom and the founder of Compass by Vavy (compassbyvavy.ca), a free guide that helps local parents find camps and things to do over winter break, PA days and March Break.",
    "",
    `${input.campName} is in the guide. We built your listing from your website, and we already have most of it. ${gaps}`,
    "",
    `Could you take about ${input.minutes} minutes to check it?`,
    "",
    `Check my listing: ${input.formLink}`,
    "",
    'The listing is free: no fees, no commission, and parents register directly with you. Listings you confirm show "Confirmed by the camp".',
    "",
    "Please share only photos you have the right to use, with permission for any children shown.",
    "",
    "Thank you,",
    "Vineeta Agarwal, Founder, Compass by Vavy",
    `hello@compassbyvavy.ca · ${address || "(mailing address not set)"}`,
    "",
    `Prefer not to hear from us? ${input.unsubscribeLink}`,
  ].join("\n");
  return { subject: inviteMail.subject(input.campName), text, canSend: Boolean(address) };
}

const DAILY_CAP = 20;

export function reminderDue(invite: Invite, today: string): boolean {
  if (invite.status === "opted_out" || invite.status === "submitted" || invite.status === "reviewed") return false;
  if (!invite.sentAt || invite.openedAt || invite.submittedAt) return false;
  if (invite.sendCount !== 1) return false;
  const sent = new Date(`${invite.sentAt.slice(0, 10)}T00:00:00Z`);
  const now = new Date(`${today}T00:00:00Z`);
  return (now.getTime() - sent.getTime()) / 86_400_000 >= 7;
}

export function flushQueue(
  state: ListingState,
  input: { inviteIds: string[]; today: string; mailingAddress: string; kind: "sent" | "reminder" },
): { state: ListingState; sent: string[]; waiting: string[]; error: string | null } {
  if (!input.mailingAddress.trim()) {
    return { state, sent: [], waiting: input.inviteIds, error: "Add the mailing address before sending." };
  }
  const already = state.sendDates.filter((date) => date === input.today).length;
  let room = Math.max(0, DAILY_CAP - already);
  const sent: string[] = [];
  const waiting: string[] = [];
  const invites = state.invites.map((invite) => ({ ...invite }));
  const events = [...state.events];
  const sendDates = [...state.sendDates];
  for (const id of input.inviteIds) {
    const invite = invites.find((item) => item.id === id);
    if (!invite || invite.status === "opted_out" || !invite.contactEmail) {
      continue;
    }
    if (invite.sendCount >= 2) continue;
    if (room <= 0) {
      waiting.push(id);
      continue;
    }
    room -= 1;
    invite.sendCount += 1;
    invite.sentAt = input.today;
    if (invite.status === "draft") invite.status = "sent";
    sendDates.push(input.today);
    events.push({ inviteId: id, kind: input.kind, at: input.today });
    sent.push(id);
  }
  return { state: { ...state, invites, events, sendDates }, sent, waiting, error: null };
}
