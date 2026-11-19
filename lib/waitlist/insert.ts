import type { WaitlistRow } from "@/lib/waitlist/validate";

export async function insertWaitlist(row: WaitlistRow): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  if (!url || !key) {
    return { ok: false, error: "We couldn't save that just now. Please try again in a minute." };
  }

  try {
    const response = await fetch(`${url}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      return { ok: false, error: "We couldn't save that just now. Please try again in a minute." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "We couldn't save that just now. Please try again in a minute." };
  }
}
