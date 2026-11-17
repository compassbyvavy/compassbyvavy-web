import { NextResponse } from "next/server";
import { joinWaitlist } from "@/app/waitlist/actions";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  const result = await joinWaitlist((body ?? {}) as Parameters<typeof joinWaitlist>[0]);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
