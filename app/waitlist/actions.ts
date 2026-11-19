"use server";

import { insertWaitlist } from "@/lib/waitlist/insert";
import { validateWaitlist, type WaitlistInput } from "@/lib/waitlist/validate";

export async function joinWaitlist(input: WaitlistInput) {
  const validated = validateWaitlist(input);
  if (!validated.ok) return validated;
  if (validated.spam) return { ok: true as const };
  return insertWaitlist(validated.row);
}
