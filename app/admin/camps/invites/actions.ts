"use server";

import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { listingAdminAllowed } from "@/lib/camps/listingForm/adminGate";
import { buildForm, gapLabels, minutesFor } from "@/lib/camps/listingForm/build";
import { flushQueue, reminderDue, renderInviteEmail } from "@/lib/camps/listingForm/email";
import { CAMPS, DEMO_TOKENS } from "@/lib/camps/listingForm/fixtures";
import { readListingState, writeListingState } from "@/lib/camps/listingForm/store";
import { torontoToday } from "@/lib/camps/campPage";

async function assertAdmin(): Promise<void> {
  const host = (await headers()).get("host");
  if (!listingAdminAllowed({ nodeEnv: process.env.NODE_ENV, hostname: host, reviewFlag: process.env.COMPASS_CAMPS_REVIEW_PREVIEW })) {
    throw new Error("Not available.");
  }
}

function logMail(line: string): void {
  const folder = path.join(process.cwd(), "data/camps/listing-form");
  mkdirSync(folder, { recursive: true });
  appendFileSync(path.join(folder, "outbox.log"), line);
}

export async function saveQuestions(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const questions = [1, 2, 3]
    .map((index) => String(formData.get(`q${index}`) ?? "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const state = readListingState();
  writeListingState({
    ...state,
    invites: state.invites.map((invite) => (invite.id === id ? { ...invite, customQuestions: questions } : invite)),
  });
  revalidatePath("/admin/camps/invites");
}

export async function sendInvites(formData: FormData): Promise<void> {
  await assertAdmin();
  const ids = formData.getAll("invite").map(String);
  const today = torontoToday();
  const address = process.env.COMPASS_MAILING_ADDRESS ?? "";
  const result = flushQueue(readListingState(), { inviteIds: ids, today, mailingAddress: address, kind: "sent" });
  if (!result.error) {
    writeListingState(result.state);
    const origin = `https://${(await headers()).get("host") ?? "compassbyvavy.ca"}`;
    for (const id of result.sent) {
      const invite = result.state.invites.find((item) => item.id === id);
      const camp = invite ? CAMPS[invite.slug] : null;
      if (!invite || !camp) continue;
      const token = invite.slug === "ksg-winter" ? DEMO_TOKENS.ksg : DEMO_TOKENS.example;
      const form = buildForm(camp, invite.customQuestions);
      const mail = renderInviteEmail({
        campName: camp.name,
        minutes: minutesFor(form.fillInCount),
        gaps: gapLabels(camp, form),
        formLink: `${origin}/camps/confirm/${token}`,
        unsubscribeLink: `${origin}/camps/unsubscribe/${token}`,
        mailingAddress: address,
      });
      logMail(`${today} sandbox ${mail.subject}\n${mail.text}\n`);
    }
  }
  revalidatePath("/admin/camps/invites");
}

export async function sendReminders(): Promise<void> {
  await assertAdmin();
  const today = torontoToday();
  const state = readListingState();
  const due = state.invites.filter((invite) => reminderDue(invite, today)).map((invite) => invite.id);
  const result = flushQueue(state, { inviteIds: due, today, mailingAddress: process.env.COMPASS_MAILING_ADDRESS ?? "", kind: "reminder" });
  if (!result.error) {
    writeListingState(result.state);
    logMail(`${today} sandbox reminders ${result.sent.join(",")}\n`);
  }
  revalidatePath("/admin/camps/invites");
}
