/**
 * Checks a submission before it is stored. Approval is a separate step:
 * this function never writes public camp data.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type { Answer, BuiltForm, FormField, Submission } from "@/lib/camps/listingForm/types";

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, hash: string): boolean {
  const left = Buffer.from(hashToken(token));
  const right = Buffer.from(hash);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type PhotoFile = { name: string; type: string; size: number; kind: "photo" | "logo" };

export type SubmitInput = {
  contact: { name: string; role: string; email: string; phone: string; publicPhone: string; publicEmail: string };
  answers: Record<string, { value: string; confirmed: boolean }>;
  photos: PhotoFile[];
  photoRights: boolean;
  childPermission: boolean;
  accuracyConfirmed: boolean;
  typedName: string;
  today: string;
  submitsToday: number;
  inviteStatus: string;
};

export function checkSubmission(form: BuiltForm, input: SubmitInput): { ok: true; answers: Record<string, Answer>; corrections: number; newAnswers: number } | { ok: false; error: string } {
  if (input.inviteStatus === "opted_out") return { ok: false, error: "This camp opted out." };
  if (input.inviteStatus === "reviewed") return { ok: false, error: "This listing has already been reviewed." };
  if (input.submitsToday >= 5) return { ok: false, error: "This link has already been submitted 5 times today." };
  if (!input.contact.name.trim() || !input.contact.role.trim() || !input.contact.email.trim()) {
    return { ok: false, error: "Name, role and email are required." };
  }
  if (!input.contact.email.includes("@")) return { ok: false, error: "Email needs an @." };
  if (!input.typedName.trim()) return { ok: false, error: "Type your name to confirm." };
  if (!input.accuracyConfirmed) return { ok: false, error: "Tick that the details are correct as of today." };
  if (!input.photoRights || !input.childPermission) {
    return { ok: false, error: "Tick both photo boxes." };
  }
  const photos = input.photos.filter((file) => file.kind === "photo");
  const logos = input.photos.filter((file) => file.kind === "logo");
  if (photos.length > 8) return { ok: false, error: "8 photos is the maximum." };
  if (logos.length > 1) return { ok: false, error: "1 logo is the maximum." };
  for (const file of input.photos) {
    if (!PHOTO_TYPES.has(file.type)) return { ok: false, error: `${file.name} needs to be a JPG, PNG, HEIC or WEBP.` };
    if (file.size > MAX_BYTES) return { ok: false, error: `${file.name} is over 10 MB.` };
  }
  const fields: FormField[] = [...form.blocks.flatMap((block) => block.fields), ...form.ask];
  const answers: Record<string, Answer> = {};
  let corrections = 0;
  let newAnswers = 0;
  for (const field of fields) {
    const raw = input.answers[field.key];
    const value = raw?.value?.trim() ?? "";
    if (field.maxLength && value.length > field.maxLength) {
      return { ok: false, error: `${field.label} is limited to ${field.maxLength} characters.` };
    }
    const changed = field.mode === "confirm" && value !== (field.prefilled ?? "");
    if (changed) corrections += 1;
    if (field.mode === "fill" && value) newAnswers += 1;
    answers[field.key] = {
      prefilled: field.prefilled,
      confirmed: field.mode === "confirm" && !changed && Boolean(raw?.confirmed || value === field.prefilled),
      value: value || field.prefilled || "",
      mode: field.mode,
    };
  }
  for (const question of form.questions) {
    const value = input.answers[question.fieldKey]?.value?.trim() ?? "";
    if (value) newAnswers += 1;
    answers[question.fieldKey] = { prefilled: null, confirmed: false, value, mode: "fill" };
  }
  return { ok: true, answers, corrections, newAnswers };
}

export function notificationLine(camp: string, corrections: number, newAnswers: number, photos: number): string {
  return `${camp} submitted their listing: ${corrections} corrections, ${newAnswers} new answers, ${photos} photos`;
}

export function linkStatus(status: string, expiresAt: string, today: string): "ok" | "expired" | "opted_out" | "reviewed" {
  if (status === "opted_out") return "opted_out";
  if (status === "reviewed") return "reviewed";
  if (today > expiresAt.slice(0, 10)) return "expired";
  return "ok";
}

export function submitsOnDay(submissions: Submission[], inviteId: string, today: string): number {
  return submissions.filter((item) => item.inviteId === inviteId && item.submittedAt.slice(0, 10) === today).length;
}
