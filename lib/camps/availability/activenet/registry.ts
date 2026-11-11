import {
  MSC_0007_ACTIVITY_ID,
  MSC_0007_ACTIVITY_NUMBER,
  MSC_0007_CANDIDATE_ID,
  MSC_0007_PROGRAM_ID,
  MSC_0007_SESSION_ID,
} from "@/data/camps/real/msc0007.ids";
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

const BY_CANDIDATE = new Map<string, ActiveNetActivityMapping>([
  [MSC_0007_MAPPING.candidateId, MSC_0007_MAPPING],
]);

const BY_SESSION = new Map<string, ActiveNetActivityMapping>([
  [MSC_0007_MAPPING.sessionId, MSC_0007_MAPPING],
]);

export function listActiveNetMappings(): readonly ActiveNetActivityMapping[] {
  return [...BY_CANDIDATE.values()];
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
    if (mapping && !found.some((item) => item.candidateId === mapping.candidateId)) {
      found.push(mapping);
    }
  }
  return found.length === 1 ? found[0] : null;
}
