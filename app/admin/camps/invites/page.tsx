import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { listingAdminAllowed } from "@/lib/camps/listingForm/adminGate";
import { buildForm, gapLabels, minutesFor } from "@/lib/camps/listingForm/build";
import { inviteMail } from "@/lib/camps/listingForm/copy";
import { renderInviteEmail } from "@/lib/camps/listingForm/email";
import { CAMPS, DEMO_TOKENS } from "@/lib/camps/listingForm/fixtures";
import { readListingState } from "@/lib/camps/listingForm/store";
import { saveQuestions, sendInvites, sendReminders } from "./actions";
import "../../../camps/confirm/confirm.css";

export const metadata: Metadata = { title: "Listing invites", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const host = (await headers()).get("host");
  if (!listingAdminAllowed({ nodeEnv: process.env.NODE_ENV, hostname: host, reviewFlag: process.env.COMPASS_CAMPS_REVIEW_PREVIEW })) {
    notFound();
  }
  const state = readListingState();
  const address = process.env.COMPASS_MAILING_ADDRESS ?? "";
  const origin = `https://${host ?? "compassbyvavy.ca"}`;
  return (
    <main className="confirm">
      <h1>Listing invites</h1>
      <p className="lede">Nothing sends on its own. At most 20 a day, and only into the sandbox outbox on this branch.</p>
      {!address ? <p className="banner">{inviteMail.cannotSend}</p> : null}
      <form action={sendInvites}>
        {state.invites.map((invite) => {
          const camp = CAMPS[invite.slug];
          if (!camp) return null;
          const token = invite.slug === "ksg-winter" ? DEMO_TOKENS.ksg : DEMO_TOKENS.example;
          const form = buildForm(camp, invite.customQuestions);
          const mail = renderInviteEmail({
            campName: camp.name,
            minutes: minutesFor(form.fillInCount),
            gaps: gapLabels(camp, form),
            formLink: `${origin}/camps/confirm/${token}`,
            unsubscribeLink: `${origin}/camps/unsubscribe/${token}`,
            mailingAddress: address || "123 Example Ave, Mississauga, ON",
          });
          return (
            <section key={invite.id}>
              <label className="check">
                <input type="checkbox" name="invite" value={invite.id} />
                <span>{invite.camp}{invite.example ? " (example, not a real camp)" : ""}</span>
              </label>
              <p className="help">{invite.contactEmail} · {invite.status} · {invite.sendCount} sent</p>
              <h2>{mail.subject}</h2>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{mail.text}</pre>
            </section>
          );
        })}
        <button className="pri" type="submit">Send</button>
      </form>
      {state.invites.map((invite) => (
        <form key={invite.id} action={saveQuestions}>
          <h2>Questions for {invite.camp}</h2>
          <input type="hidden" name="id" value={invite.id} />
          {[0, 1, 2].map((index) => (
            <label key={index}>
              <div className="lbl">Question {index + 1}</div>
              <input type="text" name={`q${index + 1}`} defaultValue={invite.customQuestions[index] ?? ""} />
            </label>
          ))}
          <button type="submit">Save questions</button>
        </form>
      ))}
      <form action={sendReminders}>
        <button type="submit">Approve reminders</button>
      </form>
    </main>
  );
}
