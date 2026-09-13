import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  CampCandidate,
  CampFieldChange,
  CampIngestionRunSummary,
  CampReviewDecision,
  FieldDecision,
} from "@/data/camps/ingestion/types";
import { confidenceBand } from "@/lib/camps/ingestion/confidence";
import { getIngestionDevContext } from "@/lib/camps/ingestion/devStore";
import {
  listReviewQueue,
  listReviewedCandidates,
} from "@/lib/camps/ingestion/runner/reviewActions";
import { runFixtureIngestionCycle, submitFieldReviewDecision } from "./actions";
import styles from "./ingestion-admin.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Camps ingestion review (dev only)",
  robots: { index: false, follow: false },
};

const FIELD_OPTIONS: ReadonlyArray<{ value: FieldDecision; label: string }> = [
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
  { value: "needs_followup", label: "Needs follow-up" },
];

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FieldReviewTable({ changes }: { changes: CampFieldChange[] }) {
  if (changes.length === 0) {
    return <p className={styles.empty}>No field changes in this candidate.</p>;
  }
  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Current</th>
            <th>Proposed</th>
            <th>Confidence</th>
            <th>Source</th>
            <th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={`${change.field}-${change.changeType}`}>
              <td>
                <code>{change.field}</code>
                <div style={{ color: "#6e7568", fontSize: "0.72rem" }}>
                  {change.changeType}
                </div>
              </td>
              <td>{formatValue(change.oldValue)}</td>
              <td>{formatValue(change.newValue)}</td>
              <td>
                {change.confidence.toFixed(2)}{" "}
                <span className={styles.band}>{confidenceBand(change.confidence)}</span>
              </td>
              <td>
                {change.sourceSnapshotId ? <code>{change.sourceSnapshotId}</code> : "—"}
              </td>
              <td>
                <fieldset className={styles.fieldDecision}>
                  <legend className={styles.srOnly}>Decision for {change.field}</legend>
                  {FIELD_OPTIONS.map((option) => (
                    <label key={option.value} className={styles.fieldDecisionOption}>
                      <input
                        type="radio"
                        name={`fieldDecision:${change.field}`}
                        value={option.value}
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandidateMeta({ candidate }: { candidate: CampCandidate }) {
  return (
    <>
      <div className={styles.meta}>
        <span>
          Match: <code>{candidate.matchedCatalogId ?? "null"}</code>
        </span>
        <span>
          Confidence:{" "}
          {candidate.matchConfidence == null ? "—" : candidate.matchConfidence.toFixed(2)}
        </span>
        <span>
          Outcome: <code>{candidate.pipelineOutcome ?? "—"}</code>
        </span>
        <span>
          Source records: <code>{candidate.sourceRecordIds.join(", ") || "—"}</code>
        </span>
      </div>
      {candidate.reviewReason ? <p className={styles.reason}>{candidate.reviewReason}</p> : null}
      {candidate.qualityFlags.length > 0 ? (
        <p className={styles.flags}>Quality flags: {candidate.qualityFlags.join(", ")}</p>
      ) : null}
    </>
  );
}

function ReviewHistory({ decisions }: { decisions: CampReviewDecision[] }) {
  if (decisions.length === 0) return null;
  return (
    <div className={styles.history}>
      <h3 className={styles.historyTitle}>Review history</h3>
      <ul className={styles.historyList}>
        {decisions.map((decision) => (
          <li key={decision.id}>
            <span>{formatReviewDate(decision.reviewedAt)}</span>
            <span>{decision.reviewedBy}</span>
            <code>{decision.overallStatus}</code>
            <span>
              Snapshot <code>{decision.sourceSnapshotId ?? "—"}</code>
            </span>
            {decision.notes ? <span className={styles.historyNotes}>{decision.notes}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RunSummary({ summary }: { summary: CampIngestionRunSummary | null }) {
  if (!summary) {
    return (
      <p className={styles.empty}>
        No ingestion cycle has run in this process yet. Run one over fixture
        content to see the pipeline produce candidates.
      </p>
    );
  }
  return (
    <div className={styles.runSummary}>
      <div className={styles.meta}>
        <span>
          Run: <code>{summary.id}</code>
        </span>
        <span>Started: {summary.startedAt}</span>
        <span>Completed: {summary.completedAt ?? "—"}</span>
      </div>
      <div className={styles.meta}>
        <span>Attempted: {summary.sourcesAttempted}</span>
        <span>Succeeded: {summary.sourcesSucceeded}</span>
        <span>Unchanged (extraction skipped): {summary.sourcesUnchanged}</span>
        <span>Changed: {summary.sourcesChanged}</span>
        <span>Extractions: {summary.extractionsSucceeded}</span>
        <span>Candidates: {summary.candidatesCreated}</span>
      </div>
      {summary.errors.length > 0 ? (
        <ul className={styles.errorList}>
          {summary.errors.map((error, index) => (
            <li key={`${error.sourceId ?? "run"}-${index}`}>
              <code>{error.sourceId ?? "run"}</code>: {error.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Development-only ingestion review queue.
 *
 * Field-level decisions persist as append-only CampReviewDecision rows.
 * Approving records reviewed truth — it never writes the parent-facing catalog.
 */
export default async function CampsIngestionReviewPage() {
  const context = getIngestionDevContext();
  if (!context) {
    notFound();
  }

  const [queue, decided, latestRun] = await Promise.all([
    listReviewQueue(context.store),
    listReviewedCandidates(context.store),
    context.store.runs.latestRunSummary(),
  ]);

  const historyByCandidate = new Map<string, CampReviewDecision[]>();
  for (const candidate of [...queue, ...decided]) {
    historyByCandidate.set(
      candidate.id,
      await context.store.reviewDecisions.listDecisionsForCandidate(candidate.id),
    );
  }

  return (
    <div className={styles.page}>
      <p className={styles.banner}>
        DEV ONLY — ingestion review queue. Fixture data, stored in memory for
        this server process and reset on restart. Blocked in production via the
        ingestion fixture gate. Field-level decisions append to{" "}
        <code>camp_review_decisions</code>. Nothing here publishes to the
        approved catalog.
      </p>

      <nav className={styles.nav} aria-label="Ingestion admin">
        <Link href="/camps/admin/ingestion">Review queue</Link>
        <Link href="/camps/admin/ingestion/sources">Source registry</Link>
        <Link href="/camps">Public camps listing</Link>
      </nav>

      <h1>Ingestion review queue</h1>
      <p className={styles.lede}>
        Compare proposed source facts against current catalog values. Automation
        gathers and proposes facts; human review establishes Compass-approved
        truth. Decide per field, then submit.{" "}
        <strong>Approve is not publish</strong> — it records a review decision
        only.
      </p>

      <section className={styles.section}>
        <h2>Latest run</h2>
        <RunSummary summary={latestRun} />
        <form action={runFixtureIngestionCycle} className={styles.runForm}>
          <button type="submit">Run cycle over fixture content</button>
          <span className={styles.hint}>
            Replays saved snapshot HTML through the real runner. No network
            requests.
          </span>
        </form>
      </section>

      <section className={styles.section}>
        <h2>Awaiting review ({queue.length})</h2>
        {queue.length === 0 ? (
          <p className={styles.empty}>Nothing awaiting review.</p>
        ) : (
          queue.map((candidate) => (
            <article key={candidate.id} className={styles.candidate}>
              <div>
                <strong>{candidate.id}</strong>{" "}
                <span className={styles.status}>{candidate.status}</span> ·{" "}
                {candidate.candidateType}
              </div>
              <CandidateMeta candidate={candidate} />
              <form action={submitFieldReviewDecision} className={styles.decisionForm}>
                <input type="hidden" name="candidateId" value={candidate.id} />
                <FieldReviewTable changes={candidate.changeSet} />
                <label className={styles.noteLabel}>
                  Review notes (optional)
                  <input
                    type="text"
                    name="notes"
                    className={styles.note}
                    placeholder="What did you check?"
                  />
                </label>
                <div className={styles.actions}>
                  <button type="submit">Submit field review</button>
                </div>
              </form>
              <ReviewHistory decisions={historyByCandidate.get(candidate.id) ?? []} />
              <p className={styles.hint}>
                Submitting appends one <code>CampReviewDecision</code>.
                overallStatus is calculated server-side. Publishing remains a
                separate step.
              </p>
            </article>
          ))
        )}
      </section>

      <section className={styles.section}>
        <h2>Reviewed ({decided.length})</h2>
        {decided.length === 0 ? (
          <p className={styles.empty}>No decisions recorded in this process yet.</p>
        ) : (
          decided.map((candidate) => (
            <article key={candidate.id} className={`${styles.candidate} ${styles.decided}`}>
              <div>
                <strong>{candidate.id}</strong>{" "}
                <span className={styles.status}>{candidate.status}</span> ·{" "}
                {candidate.candidateType}
              </div>
              <div className={styles.meta}>
                <span>
                  Reviewed by: <code>{candidate.reviewedBy ?? "—"}</code>
                </span>
                <span>Reviewed at: {candidate.reviewedAt ?? "—"}</span>
                <span>
                  Matched: <code>{candidate.matchedCatalogId ?? "null"}</code>
                </span>
              </div>
              {candidate.reviewReason ? (
                <p className={styles.reason}>{candidate.reviewReason}</p>
              ) : null}
              <ReviewHistory decisions={historyByCandidate.get(candidate.id) ?? []} />
              <p className={styles.hint}>
                {candidate.status === "approved"
                  ? "Approved as reviewed truth. Not published to the public catalog."
                  : "Recorded decision. No catalog rows were touched."}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
