import {
  MSC_0007_ACTIVITY_ID,
  MSC_0007_ACTIVITY_NUMBER,
  MSC_0007_CANDIDATE_ID,
  MSC_0007_PROGRAM_ID,
  MSC_0007_SESSION_ID,
} from "@/data/camps/real/msc0007.ids";
import { MISSISSAUGA_WINTER_2026_LISTED } from "@/data/camps/real/mississaugaWinter2026EligibleList";
import { WINTER_2026_INTERNAL_IDS } from "@/data/camps/real/winter2026.ids";
import {
  ACTIVENET_ORIGIN,
  ACTIVENET_TENANT,
  type ActiveNetActivityMapping,
} from "@/lib/camps/availability/activenet/types";

const MSC_0007_MAPPING: ActiveNetActivityMapping = {
  candidateId: MSC_0007_CANDIDATE_ID,
  sessionId: MSC_0007_SESSION_ID,
  programId: MSC_0007_PROGRAM_ID,
  activityId: MSC_0007_ACTIVITY_ID,
  activityNumber: MSC_0007_ACTIVITY_NUMBER,
  tenantSlug: ACTIVENET_TENANT,
  origin: ACTIVENET_ORIGIN,
};

/** One mapping per distinct City session. Candidate ID is provenance, not a cache key. */
export const WINTER_2026_MAPPINGS: readonly ActiveNetActivityMapping[] =
  MISSISSAUGA_WINTER_2026_LISTED.map((row) => {
    const activityId = WINTER_2026_INTERNAL_IDS[row.publicActivityNumber];
    if (!activityId) throw new Error(`Unmatched Winter 2026 public activity number ${row.publicActivityNumber}`);
    const sessionId = row.publicActivityNumber === MSC_0007_ACTIVITY_NUMBER
      ? MSC_0007_SESSION_ID
      : `sess-city-winter-2026-${row.publicActivityNumber}`;
    return {
      candidateId: row.publicActivityNumber === MSC_0007_ACTIVITY_NUMBER ? MSC_0007_CANDIDATE_ID : `CITY-WINTER-${row.publicActivityNumber}`,
      sessionId,
      programId: row.program === "Winter Fun" ? MSC_0007_PROGRAM_ID : "prog-city-mississauga-winter-fun-jr",
      activityId,
      activityNumber: row.publicActivityNumber,
      tenantSlug: ACTIVENET_TENANT,
      origin: ACTIVENET_ORIGIN,
    };
  });

const BY_SESSION = new Map(WINTER_2026_MAPPINGS.map((mapping) => [mapping.sessionId, mapping]));
const BY_CANDIDATE = new Map(WINTER_2026_MAPPINGS.map((mapping) => [mapping.candidateId, mapping]));

export function listActiveNetMappings(): readonly ActiveNetActivityMapping[] {
  return WINTER_2026_MAPPINGS;
}

export function getActiveNetMappingByCandidateId(
  candidateId: string,
): ActiveNetActivityMapping | null {
  return BY_CANDIDATE.get(candidateId.trim()) ?? null;
}

export function getActiveNetMappingBySessionId(
  sessionId: string,
): ActiveNetActivityMapping | null {
  return BY_SESSION.get(sessionId) ?? null;
}

export function mappingForMatchingSessions(
  sessionIds: readonly string[],
): ActiveNetActivityMapping | null {
  const found: ActiveNetActivityMapping[] = [];
  for (const id of sessionIds) {
    const mapping = getActiveNetMappingBySessionId(id);
    if (mapping && !found.some((item) => item.sessionId === mapping.sessionId)) {
      found.push(mapping);
    }
  }
  return found.length === 1 ? found[0] : null;
}
