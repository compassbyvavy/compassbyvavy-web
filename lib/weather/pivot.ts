/**
 * Rainy-day pivot. Indoor cover is never guessed from a camp name.
 */

import type { CampProgram, CampSession } from "@/data/camps/types";
import { settingFeaturesForIndoorOutdoor } from "@/lib/listings/types";

export function programHasIndoorAlternative(
  program: Pick<CampProgram, "indoorOutdoor">,
): boolean {
  const features = settingFeaturesForIndoorOutdoor(
    program.indoorOutdoor ?? "unknown",
  );
  return features.includes("indoor") || features.includes("indoor-fallback");
}

export function pivotSessions<T extends CampSession>(
  sessions: T[],
  programs: CampProgram[],
  pivotOn: boolean,
): { sessions: T[]; hiddenBecauseUnknown: number; hiddenOutdoor: number } {
  if (!pivotOn) {
    return { sessions, hiddenBecauseUnknown: 0, hiddenOutdoor: 0 };
  }
  const byId = new Map(programs.map((program) => [program.id, program]));
  let hiddenBecauseUnknown = 0;
  let hiddenOutdoor = 0;
  const kept: T[] = [];
  for (const session of sessions) {
    const program = byId.get(session.programId);
    if (!program) {
      hiddenBecauseUnknown += 1;
      continue;
    }
    if (programHasIndoorAlternative(program)) {
      kept.push(session);
      continue;
    }
    const value = program.indoorOutdoor ?? "unknown";
    if (value === "outdoor" || value === "primarily_outdoor") {
      hiddenOutdoor += 1;
    } else {
      hiddenBecauseUnknown += 1;
    }
  }
  return { sessions: kept, hiddenBecauseUnknown, hiddenOutdoor };
}
