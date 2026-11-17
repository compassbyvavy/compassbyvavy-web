/**
 * Approve all, approve some, or reject. Public camp data changes only here.
 */
import type { ListingState, Submission } from "@/lib/camps/listingForm/types";

export type ReviewDecision = {
  status: "approved" | "partly_approved" | "rejected";
  answerKeys?: string[];
  photoPaths?: string[];
  note?: string | null;
  today: string;
};

export function applyReview(state: ListingState, submissionId: number, decision: ReviewDecision): { state: ListingState; error: string | null } {
  const submission = state.submissions.find((item) => item.id === submissionId);
  if (!submission) return { state, error: "No submission with that id." };
  if (submission.reviewStatus !== "pending") return { state, error: "This submission is already reviewed." };
  const useAnswers = decision.status === "approved"
    ? Object.keys(submission.answers)
    : decision.status === "partly_approved"
      ? decision.answerKeys ?? []
      : [];
  const usePhotos = decision.status === "approved"
    ? submission.photos.map((photo) => photo.path)
    : decision.status === "partly_approved"
      ? decision.photoPaths ?? []
      : [];
  const confirmedOn = decision.status === "rejected" ? null : decision.today;
  const submissions = state.submissions.map((item) => {
    if (item.id !== submissionId) return item;
    return {
      ...item,
      reviewStatus: decision.status,
      reviewedAt: decision.today,
      note: decision.note ?? item.note,
      photos: item.photos.map((photo) => ({ ...photo, use: usePhotos.includes(photo.path) })),
    };
  });
  const invites = state.invites.map((invite) =>
    invite.id === submission.inviteId ? { ...invite, status: "reviewed" as const } : invite,
  );
  const publicAnswers = state.publicAnswers.filter((row) => row.inviteId !== submission.inviteId);
  if (confirmedOn) {
    for (const key of useAnswers) {
      const answer = submission.answers[key];
      if (!answer?.value) continue;
      publicAnswers.push({ inviteId: submission.inviteId, key, value: answer.value, confirmedOn });
    }
    for (const path of usePhotos) {
      publicAnswers.push({ inviteId: submission.inviteId, key: `photo:${path}`, value: path, confirmedOn });
    }
  }
  return { state: { ...state, submissions, invites, publicAnswers }, error: null };
}

export function isPublic(state: ListingState, inviteId: string): boolean {
  return state.publicAnswers.some((row) => row.inviteId === inviteId);
}

export function confirmedLine(state: ListingState, inviteId: string): string | null {
  const row = state.publicAnswers.find((item) => item.inviteId === inviteId);
  return row ? `Confirmed by the camp, ${row.confirmedOn}` : null;
}

export function pendingSubmission(state: ListingState, inviteId: string): Submission | null {
  return [...state.submissions].reverse().find((item) => item.inviteId === inviteId && item.reviewStatus === "pending") ?? null;
}
