import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { listingAdminAllowed } from "@/lib/camps/listingForm/adminGate";
import { buildForm } from "@/lib/camps/listingForm/build";
import { KSG } from "@/lib/camps/listingForm/fixtures";
import { readListingState } from "@/lib/camps/listingForm/store";
import type { Submission } from "@/lib/camps/listingForm/types";
import { reviewSubmission } from "./actions";
import "../../../camps/confirm/confirm.css";

export const metadata: Metadata = { title: "Listing submissions", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function exampleSubmission(): Submission {
  const form = buildForm(KSG);
  const answers: Submission["answers"] = {};
  for (const field of form.blocks[0].fields) {
    const edited = field.fieldKey === "price";
    answers[field.key] = {
      prefilled: field.prefilled,
      confirmed: !edited,
      value: edited ? "$60 a day" : field.prefilled ?? "",
      mode: field.mode,
    };
  }
  answers.food = { prefilled: null, confirmed: false, value: "Kids bring a packed lunch.", mode: "fill" };
  return {
    id: 0,
    inviteId: "example",
    submittedAt: "2026-11-16",
    contact: { name: "Example", role: "Owner", email: "example@example.invalid", phone: "", publicPhone: "", publicEmail: "" },
    answers,
    photos: [{ path: "camp-submissions/example/logo.png", caption: "Logo", credit: "The camp", kind: "logo", use: false }],
    photoRights: true,
    childPermission: true,
    accuracyConfirmed: true,
    typedName: "Example",
    reviewStatus: "pending",
    reviewedAt: null,
    note: "Example review. Not a real submission.",
  };
}

function SubmissionCard({ submission, live }: { submission: Submission; live: boolean }) {
  const corrections = Object.entries(submission.answers).filter(([, answer]) => answer.mode === "confirm" && answer.value !== (answer.prefilled ?? ""));
  const fresh = Object.entries(submission.answers).filter(([, answer]) => answer.mode === "fill" && answer.value);
  return (
    <section>
      {submission.note ? <p className="banner">{submission.note}</p> : null}
      <h2>{submission.contact.name} · {submission.reviewStatus}</h2>
      <h2>What changed</h2>
      {corrections.length === 0 ? <p className="help">No corrections.</p> : null}
      {corrections.map(([key, answer]) => (
        <div className="field" key={key}>
          <div className="lbl">{key}</div>
          <div className="value">Was: {answer.prefilled}</div>
          <div className="value">Now: {answer.value}</div>
          {live ? <label className="check"><input type="checkbox" name="answer" value={key} defaultChecked /><span>Use this answer</span></label> : null}
        </div>
      ))}
      <h2>New answers</h2>
      {fresh.map(([key, answer]) => (
        <div className="field" key={key}>
          <div className="lbl">{key}</div>
          <div className="value">{answer.value}</div>
          {live ? <label className="check"><input type="checkbox" name="answer" value={key} defaultChecked /><span>Use this answer</span></label> : null}
        </div>
      ))}
      <h2>Photos</h2>
      {submission.photos.map((photo) => (
        <div className="field" key={photo.path}>
          <div className="value">{photo.kind}: {photo.path}{photo.caption ? ` · ${photo.caption}` : ""}</div>
          {live ? <label className="check"><input type="checkbox" name="photo" value={photo.path} /><span>Use</span></label> : <p className="help">Use / don't use</p>}
        </div>
      ))}
      {live ? (
        <>
          <input type="hidden" name="id" value={submission.id} />
          <div className="row">
            <button className="pri" name="status" value="approved" type="submit">Approve all</button>
            <button name="status" value="partly_approved" type="submit">Approve some</button>
            <button name="status" value="rejected" type="submit">Reject</button>
          </div>
        </>
      ) : (
        <div className="row">
          <button className="pri" type="button" disabled>Approve all</button>
          <button type="button" disabled>Approve some</button>
          <button type="button" disabled>Reject</button>
        </div>
      )}
    </section>
  );
}

export default async function SubmissionsPage() {
  const host = (await headers()).get("host");
  if (!listingAdminAllowed({ nodeEnv: process.env.NODE_ENV, hostname: host, reviewFlag: process.env.COMPASS_CAMPS_REVIEW_PREVIEW })) {
    notFound();
  }
  const state = readListingState();
  const example = exampleSubmission();
  return (
    <main className="confirm">
      <h1>Listing submissions</h1>
      <p className="lede">Nothing is public until you approve it. Approval sets "Confirmed by the camp" and copies the photos you use.</p>
      <SubmissionCard submission={example} live={false} />
      {state.submissions.map((submission) => (
        <form key={submission.id} action={reviewSubmission}>
          <SubmissionCard submission={submission} live={submission.reviewStatus === "pending"} />
        </form>
      ))}
    </main>
  );
}
