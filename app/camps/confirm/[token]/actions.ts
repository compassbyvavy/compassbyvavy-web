"use server";

import { mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildForm } from "@/lib/camps/listingForm/build";
import { CAMPS } from "@/lib/camps/listingForm/fixtures";
import { checkSubmission, linkStatus, notificationLine, submitsOnDay, tokenMatches } from "@/lib/camps/listingForm/submit";
import { readListingState, writeListingState } from "@/lib/camps/listingForm/store";
import { torontoToday } from "@/lib/camps/campPage";
import type { PhotoMeta } from "@/lib/camps/listingForm/types";

const TEST_SECRET = "1x0000000000000000000000000000000AA";

async function turnstilePasses(token: string): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" && token === "local-preview") return true;
  const secret = process.env.TURNSTILE_SECRET_KEY ?? (process.env.NODE_ENV === "production" ? "" : TEST_SECRET);
  if (!secret || !token) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const json = (await response.json()) as { success?: boolean };
  return Boolean(json.success);
}

export async function submitListing(formData: FormData): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const token = String(formData.get("token") ?? "");
  const state = readListingState();
  const invite = state.invites.find((item) => tokenMatches(token, item.tokenHash));
  if (!invite) return { ok: false, error: "This link has expired, or it isn't one of ours." };
  const today = torontoToday();
  const status = linkStatus(invite.status, invite.expiresAt, today);
  if (status !== "ok") return { ok: false, error: "This link has expired, or it isn't one of ours." };
  const camp = CAMPS[invite.slug];
  if (!camp) return { ok: false, error: "This link has expired, or it isn't one of ours." };
  const widget = String(formData.get("cf-turnstile-response") ?? formData.get("turnstile") ?? "");
  if (!(await turnstilePasses(widget))) return { ok: false, error: "The spam check didn't pass. Try again." };

  const form = buildForm(camp, invite.customQuestions);
  const answers: Record<string, { value: string; confirmed: boolean }> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || !key.startsWith("answer__")) continue;
    const field = key.slice("answer__".length);
    answers[field] = { value, confirmed: formData.get(`confirmed__${field}`) === "yes" };
  }
  const files: Array<{ name: string; type: string; size: number; kind: "photo" | "logo"; bytes: Buffer }> = [];
  for (const file of formData.getAll("photos")) {
    if (!(file instanceof File) || file.size === 0) continue;
    files.push({ name: file.name, type: file.type, size: file.size, kind: "photo", bytes: Buffer.from(await file.arrayBuffer()) });
  }
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    files.push({ name: logo.name, type: logo.type, size: logo.size, kind: "logo", bytes: Buffer.from(await logo.arrayBuffer()) });
  }
  const checked = checkSubmission(form, {
    contact: {
      name: String(formData.get("contact_name") ?? ""),
      role: String(formData.get("contact_role") ?? ""),
      email: String(formData.get("contact_email") ?? ""),
      phone: String(formData.get("contact_phone") ?? ""),
      publicPhone: String(formData.get("public_phone") ?? ""),
      publicEmail: String(formData.get("public_email") ?? ""),
    },
    answers,
    photos: files.map(({ name, type, size, kind }) => ({ name, type, size, kind })),
    photoRights: formData.get("photo_rights") === "yes",
    childPermission: formData.get("child_permission") === "yes",
    accuracyConfirmed: formData.get("accuracy") === "yes",
    typedName: String(formData.get("typed_name") ?? ""),
    today,
    submitsToday: submitsOnDay(state.submissions, invite.id, today),
    inviteStatus: invite.status,
  });
  if (!checked.ok) return checked;

  const other = answers.other_camps?.value?.trim();
  if (other) checked.answers.other_camps = { prefilled: null, confirmed: false, value: other, mode: "fill" };

  const folder = path.join(process.cwd(), "data/camps/listing-form/files", invite.id);
  mkdirSync(folder, { recursive: true });
  const photos: PhotoMeta[] = files.map((file, index) => {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "photo";
    const stored = `${index}-${safe}`;
    writeFileSync(path.join(folder, stored), file.bytes);
    return {
      path: `camp-submissions/${invite.id}/${stored}`,
      caption: String(formData.get("photo_caption") ?? ""),
      credit: String(formData.get("photo_credit") ?? ""),
      kind: file.kind,
      use: false,
    };
  });

  const nextId = state.submissions.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const pending = state.submissions.find((item) => item.inviteId === invite.id && item.reviewStatus === "pending");
  const submission = {
    id: pending?.id ?? nextId,
    inviteId: invite.id,
    submittedAt: today,
    contact: {
      name: String(formData.get("contact_name") ?? "").trim(),
      role: String(formData.get("contact_role") ?? "").trim(),
      email: String(formData.get("contact_email") ?? "").trim(),
      phone: String(formData.get("contact_phone") ?? "").trim(),
      publicPhone: String(formData.get("public_phone") ?? "").trim(),
      publicEmail: String(formData.get("public_email") ?? "").trim(),
    },
    answers: checked.answers,
    photos,
    photoRights: true,
    childPermission: true,
    accuracyConfirmed: true,
    typedName: String(formData.get("typed_name") ?? "").trim(),
    reviewStatus: "pending" as const,
    reviewedAt: null,
    note: null,
  };
  const submissions = pending
    ? state.submissions.map((item) => (item.id === pending.id ? submission : item))
    : [...state.submissions, submission];
  const invites = state.invites.map((item) =>
    item.id === invite.id ? { ...item, status: "submitted" as const, submittedAt: today } : item,
  );
  writeListingState({
    ...state,
    invites,
    submissions,
    events: [...state.events, { inviteId: invite.id, kind: "submitted", at: today }],
  });
  const line = notificationLine(camp.name, checked.corrections, checked.newAnswers + (other ? 1 : 0), photos.length);
  mkdirSync(path.dirname(folder), { recursive: true });
  appendFileSync(path.join(process.cwd(), "data/camps/listing-form/outbox.log"), `${today} notify hello@compassbyvavy.ca ${line}\n`);
  return { ok: true, message: `Thanks. ${line}. Nothing goes live until it's reviewed.` };
}
