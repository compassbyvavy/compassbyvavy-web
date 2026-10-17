"use client";

import { useMemo, useState } from "react";
import {
  CampsListingClient,
  type CampsListingClientProps,
} from "@/components/camps/CampsListingClient";
import { RainyDayPivot } from "@/components/discover/RainyDayPivot";
import { pivotSessions } from "@/lib/weather/pivot";

export function CampsWithRainyDay(props: CampsListingClientProps) {
  const [pivot, setPivot] = useState(false);
  const pivoted = useMemo(
    () => pivotSessions(props.sessions, props.programs, pivot),
    [props.sessions, props.programs, pivot],
  );
  const keptProgramIds = new Set(pivoted.sessions.map((session) => session.programId));
  const programs = pivot
    ? props.programs.filter((program) => keptProgramIds.has(program.id))
    : props.programs;

  return (
    <>
      <RainyDayPivot
        pivot={pivot}
        onToggle={setPivot}
        hiddenOutdoor={pivoted.hiddenOutdoor}
        hiddenBecauseUnknown={pivoted.hiddenBecauseUnknown}
      />
      <CampsListingClient
        {...props}
        programs={programs}
        sessions={pivoted.sessions}
      />
    </>
  );
}
