"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { listingAdminAllowed } from "@/lib/camps/listingForm/adminGate";
import { applyReview, type ReviewDecision } from "@/lib/camps/listingForm/review";
import { readListingState, writeListingState } from "@/lib/camps/listingForm/store";
import { torontoToday } from "@/lib/camps/campPage";

async function assertAdmin(): Promise<void> {
  const host = (await headers()).get("host");
  if (!listingAdminAllowed({ nodeEnv: process.env.NODE_ENV, hostname: host, reviewFlag: process.env.COMPASS_CAMPS_REVIEW_PREVIEW })) {
    throw new Error("Not available.");
  }
}

export async function reviewSubmission(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as ReviewDecision["status"];
  if (status !== "approved" && status !== "partly_approved" && status !== "rejected") return;
  const decision: ReviewDecision = {
    status,
    today: torontoToday(),
    note: String(formData.get("note") ?? "") || null,
    answerKeys: formData.getAll("answer").map(String),
    photoPaths: formData.getAll("photo").map(String),
  };
  const result = applyReview(readListingState(), id, decision);
  if (!result.error) writeListingState(result.state);
  revalidatePath("/admin/camps/submissions");
}
