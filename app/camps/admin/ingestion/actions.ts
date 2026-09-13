"use server";

import { revalidatePath } from "next/cache";
import { getIngestionDevContext, runIngestionDevCycle } from "@/lib/camps/ingestion/devStore";
import {
  parseFieldDecisionsFromFormData,
  persistFieldReview,
} from "@/lib/camps/ingestion/runner/fieldReview";

const ADMIN_PATH = "/camps/admin/ingestion";

/**
 * Local development has no authentication, so decisions are attributed to a
 * fixed operator. A deployed review surface must record the signed-in user
 * instead — the reviewer is the whole point of the audit trail.
 */
const DEV_REVIEWER = "vineeta";

/**
 * Persist one field-level review decision (Prompt 7B).
 *
 * Creates an append-only `camp_review_decisions` row. overallStatus is computed
 * server-side from fieldDecisions — never trusted from the form. Approval does
 * not publish to CampProgram / CampSession.
 */
export async function submitFieldReviewDecision(formData: FormData): Promise<void> {
  const context = getIngestionDevContext();
  if (!context) return;

  const candidateId = String(formData.get("candidateId") ?? "");
  const notes = formData.get("notes");
  const fieldDecisions = parseFieldDecisionsFromFormData(formData);

  await persistFieldReview({
    store: context.store,
    candidateId,
    fieldDecisions,
    reviewedBy: DEV_REVIEWER,
    notes: typeof notes === "string" && notes.trim() !== "" ? notes : null,
  });

  revalidatePath(ADMIN_PATH);
}

/** Run one ingestion cycle over fixture content — no network requests. */
export async function runFixtureIngestionCycle(): Promise<void> {
  await runIngestionDevCycle();
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/sources`);
}
