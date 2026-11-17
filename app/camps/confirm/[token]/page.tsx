import type { Metadata } from "next";
import { ConfirmForm } from "@/components/camps/listingForm/ConfirmForm";
import { listingCopy } from "@/lib/camps/listingForm/copy";
import { buildForm } from "@/lib/camps/listingForm/build";
import { CAMPS } from "@/lib/camps/listingForm/fixtures";
import { linkStatus, tokenMatches } from "@/lib/camps/listingForm/submit";
import { readListingState, writeListingState } from "@/lib/camps/listingForm/store";
import { torontoToday } from "@/lib/camps/campPage";
import Script from "next/script";
import "../confirm.css";

export const metadata: Metadata = { title: "Check your listing", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TEST_SITE_KEY = "1x00000000000000000000AA";

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = readListingState();
  const invite = state.invites.find((item) => tokenMatches(token, item.tokenHash));
  const today = torontoToday();
  if (!invite) return <main className="confirm"><h1>{listingCopy.badLink}</h1></main>;
  const status = linkStatus(invite.status, invite.expiresAt, today);
  if (status === "expired") return <main className="confirm"><h1>{listingCopy.badLink}</h1></main>;
  if (status === "opted_out") return <main className="confirm"><h1>{listingCopy.optedOut}</h1></main>;
  if (status === "reviewed") return <main className="confirm"><h1>{listingCopy.reviewed}</h1></main>;
  const camp = CAMPS[invite.slug];
  if (!camp) return <main className="confirm"><h1>{listingCopy.badLink}</h1></main>;
  if (!invite.openedAt) {
    writeListingState({
      ...state,
      invites: state.invites.map((item) => (item.id === invite.id ? { ...item, openedAt: today, status: item.status === "draft" ? "opened" : item.status } : item)),
      events: [...state.events, { inviteId: invite.id, kind: "opened", at: today }],
    });
  }
  const form = buildForm(camp, invite.customQuestions);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? (process.env.NODE_ENV === "production" ? null : TEST_SITE_KEY);
  const testMode = process.env.NODE_ENV !== "production" && !process.env.TURNSTILE_SECRET_KEY;
  return (
    <main className="confirm">
      {camp.example ? <p className="banner">{listingCopy.exampleBanner}</p> : null}
      <h1>{listingCopy.header(camp.name)}</h1>
      <p className="lede">{listingCopy.about}</p>
      {camp.pagePath ? <p><a href={camp.pagePath}>{listingCopy.seeListing}</a></p> : <p className="help">{listingCopy.unpublished}</p>}
      {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer /> : null}
      <ConfirmForm token={token} form={form} turnstileSiteKey={siteKey} testMode={testMode} />
    </main>
  );
}
