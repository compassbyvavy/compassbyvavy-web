import { NextResponse } from "next/server";
import { getActiveNetMappingBySessionId } from "@/lib/camps/availability/activenet/registry";
import { getActiveNetAvailability } from "@/lib/camps/availability/activenet/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Session-specific lookup; unknown IDs never fall back to another camp. */
export async function GET(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const mapping = getActiveNetMappingBySessionId(sessionId);
  if (!mapping) {
    return NextResponse.json(
      { error: "unknown_session" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const snapshot = await getActiveNetAvailability(mapping.candidateId, { force });
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
