import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { BATCH_1, BATCH_1_TOKEN_RECORD } from "@/lib/camps/pages/batch1";
import { campReviewAdminAllowed } from "@/lib/camps/pages/adminGate";
import { breakPrices, flagsForCamp } from "@/lib/camps/pages/flags";
import { previewPath } from "@/lib/camps/pages/preview";
import { decisionFor, editedSummary } from "@/lib/camps/pages/review";
import { readReviewState } from "@/lib/camps/pages/store";
import { torontoToday } from "@/lib/camps/campPage";
import { decideCampAction, publishBatchAction, saveSummaryAction } from "./actions";
import styles from "./review.module.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Camp page review",
  robots: { index: false, follow: false },
};

const STATUS_LABEL = {
  pending: "Not decided",
  approved: "Approved",
  fix: "Fix — stays unpublished",
  declined: "Declined — stays unpublished",
} as const;

export default async function CampPageReviewScreen() {
  const host = (await headers()).get("host");
  const allowed = campReviewAdminAllowed({
    nodeEnv: process.env.NODE_ENV,
    hostname: host,
    reviewFlag: process.env.COMPASS_CAMPS_REVIEW_PREVIEW,
  });
  if (!allowed) notFound();

  const state = readReviewState();
  const today = torontoToday();

  return (
    <div className={styles.page}>
      <h1>Camp pages</h1>
      <p className={styles.lede}>
        Approve, fix, or decline each camp. Publish batch puts the approved camps live together. Fix and decline stay
        unpublished and carry over.
      </p>
      <p className={styles.batch}>Batch 1</p>
      {BATCH_1.map((camp) => {
        const decision = decisionFor(state, camp.slug);
        const flags = flagsForCamp(camp, { today, breakPrices: breakPrices(BATCH_1, camp.breakId) });
        return (
          <section className={styles.card} key={camp.slug}>
            <h2>
              {camp.provider} — {camp.name}
            </h2>
            <p className={styles.meta}>
              <a href={previewPath(camp, BATCH_1_TOKEN_RECORD.token)}>Preview</a>
              {" · "}
              <span className={styles.status}>{STATUS_LABEL[decision.status]}</span>
              {decision.note ? ` · ${decision.note}` : null}
            </p>
            {flags.length ? (
              <ul className={styles.flags}>
                {flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.meta}>No flags. Register links are checked in the review pack.</p>
            )}
            <form className={styles.row} action={saveSummaryAction}>
              <input type="hidden" name="slug" value={camp.slug} />
              <textarea
                className={styles.note}
                name="summary"
                rows={2}
                defaultValue={editedSummary(state, camp.slug) ?? camp.summary ?? ""}
                placeholder="The camp's own line. Leave blank to hide it."
              />
              <button className={`${styles.btn} ${styles.fix}`} type="submit">
                Save summary
              </button>
            </form>
            <div className={styles.row}>
              <form action={decideCampAction}>
                <input type="hidden" name="slug" value={camp.slug} />
                <input type="hidden" name="status" value="approved" />
                <button className={`${styles.btn} ${styles.ok}`} type="submit">
                  Approve
                </button>
              </form>
              <form className={styles.row} action={decideCampAction}>
                <input type="hidden" name="slug" value={camp.slug} />
                <input className={styles.note} name="note" required placeholder="Note for Fix, or a reason for Decline" />
                <button className={`${styles.btn} ${styles.fix}`} name="status" value="fix" type="submit">
                  Fix
                </button>
                <button className={`${styles.btn} ${styles.no}`} name="status" value="declined" type="submit">
                  Decline
                </button>
              </form>
            </div>
          </section>
        );
      })}
      <form action={publishBatchAction}>
        <button className={`${styles.btn} ${styles.ok} ${styles.publish}`} type="submit" disabled={Boolean(state.publishedOn)}>
          {state.publishedOn ? `Published ${state.publishedOn}` : "Publish batch"}
        </button>
      </form>
    </div>
  );
}
