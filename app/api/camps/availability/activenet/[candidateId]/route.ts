import { NextResponse } from "next/server";
import { getActiveNetMappingByCandidateId } from "@/lib/camps/availability/activenet/registry";
import { getActiveNetAvailability } from "@/lib/camps/availability/activenet/service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ candidateId: string }>;
};

/**
 * Server-side ActiveNet availability. Browser clients must call this route
 * (ActiveNet itself does not allow CORS from Compass).
 */
export async function GET(request: Request, context: RouteContext) {
  const { candidateId } = await context.params;
  const mapping = getActiveNetMappingByCandidateId(candidateId);
  if (!mapping) {
    return NextResponse.json(
      { error: "unknown_candidate" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const snapshot = await getActiveNetAvailability(mapping.candidateId, { force });
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
