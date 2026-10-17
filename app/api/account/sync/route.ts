import { GUEST_STATE_VERSION } from "@/lib/account/guestState";

/**
 * Stub sync endpoint. Validates the guest payload and acknowledges it.
 * It does not write to Supabase and does not create a user.
 * Replace this handler when a real auth provider exists.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false }, { status: 400 });
  }
  const rec = body as Record<string, unknown>;
  if (rec.version !== GUEST_STATE_VERSION || typeof rec.capturedAt !== "string") {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!rec.shortlist || typeof rec.shortlist !== "object") {
    return Response.json({ ok: false }, { status: 400 });
  }
  return Response.json({
    ok: true,
    acceptedAt: new Date().toISOString(),
  });
}
