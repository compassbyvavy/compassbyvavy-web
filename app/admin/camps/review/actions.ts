"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { BATCH_1 } from "@/lib/camps/pages/batch1";
import { campReviewAdminAllowed } from "@/lib/camps/pages/adminGate";
import { decideCamp, publishBatch, saveSummary } from "@/lib/camps/pages/review";
import { readReviewState, writeReviewState } from "@/lib/camps/pages/store";
import { torontoToday } from "@/lib/camps/campPage";

async function assertAdmin(): Promise<void> {
  const host = (await headers()).get("host");
  const allowed = campReviewAdminAllowed({
    nodeEnv: process.env.NODE_ENV,
    hostname: host,
    reviewFlag: process.env.COMPASS_CAMPS_REVIEW_PREVIEW,
  });
  if (!allowed) throw new Error("Camp review is not available here.");
}

export async function decideCampAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const slug = String(formData.get("slug") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!BATCH_1.some((camp) => camp.slug === slug)) return;
  if (status !== "approved" && status !== "fix" && status !== "declined") return;
  const result = decideCamp(readReviewState(), { slug, status, note, today: torontoToday() });
  if (!result.ok) return;
  writeReviewState(result.state);
  revalidatePath("/admin/camps/review");
  revalidatePath(`/camps/preview/${slug}`);
}

export async function publishBatchAction(): Promise<void> {
  await assertAdmin();
  const result = publishBatch(readReviewState(), {
    slugs: BATCH_1.map((camp) => camp.slug),
    today: torontoToday(),
  });
  if (!result.ok) return;
  writeReviewState(result.state);
  revalidatePath("/admin/camps/review");
  for (const slug of result.published) revalidatePath(`/camps/${slug}`);
}

export async function saveSummaryAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const slug = String(formData.get("slug") ?? "");
  if (!BATCH_1.some((camp) => camp.slug === slug)) return;
  writeReviewState(saveSummary(readReviewState(), { slug, summary: String(formData.get("summary") ?? "") }));
  revalidatePath("/admin/camps/review");
  revalidatePath(`/camps/preview/${slug}`);
  revalidatePath(`/camps/${slug}`);
}
