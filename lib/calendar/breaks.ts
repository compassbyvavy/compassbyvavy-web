/**
 * Match a selected day to a board break, then to single-day camp sessions.
 * This module does not write the Plan saved list.
 */

import type { CampProgram, CampSession, Provider } from "@/data/camps/types";
import {
  sessionFitsAllSiblings,
  statementsFromAges,
} from "@/lib/camps/siblingOverlap";
import {
  type BoardDay,
  type SchoolBoardCalendar,
  type SchoolPanel,
} from "@/config/boardDates";

export function breaksOn(
  board: SchoolBoardCalendar,
  isoDate: string,
  panel: SchoolPanel,
): BoardDay[] {
  return board.days.filter(
    (day) => day.date === isoDate && day.panels.includes(panel),
  );
}

export function isInstructionalBreak(
  board: SchoolBoardCalendar,
  isoDate: string,
  panel: SchoolPanel,
): boolean {
  return breaksOn(board, isoDate, panel).length > 0;
}

export function upcomingBreaks(
  board: SchoolBoardCalendar,
  fromIso: string,
  panel: SchoolPanel,
  limit = 8,
): BoardDay[] {
  const seen = new Set<string>();
  const out: BoardDay[] = [];
  for (const day of board.days) {
    if (day.date < fromIso) continue;
    if (!day.panels.includes(panel)) continue;
    const key = `${day.date}:${day.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(day);
    if (out.length >= limit) break;
  }
  return out;
}

export function isSingleDaySession(session: CampSession): boolean {
  if (session.scheduleFormat === "single_day") return true;
  return Boolean(
    session.startDate &&
      session.endDate &&
      session.startDate === session.endDate &&
      session.scheduleFormat !== "unknown",
  );
}

export type SingleDayMatch = {
  session: CampSession;
  program: CampProgram;
  provider: Provider;
};

export function singleDayCampsOnBreak(input: {
  board: SchoolBoardCalendar;
  isoDate: string;
  panel: SchoolPanel;
  sessions: CampSession[];
  programs: CampProgram[];
  providers: Provider[];
  ages: number[];
  asOfDate: string | null;
}): { matches: SingleDayMatch[]; skippedForAge: number } {
  if (!isInstructionalBreak(input.board, input.isoDate, input.panel)) {
    return { matches: [], skippedForAge: 0 };
  }
  const programs = new Map(input.programs.map((program) => [program.id, program]));
  const providers = new Map(input.providers.map((provider) => [provider.id, provider]));
  const matches: SingleDayMatch[] = [];
  let skippedForAge = 0;
  for (const session of input.sessions) {
    if (!isSingleDaySession(session)) continue;
    if (session.startDate !== input.isoDate) continue;
    const program = programs.get(session.programId);
    const provider = program ? providers.get(program.providerId) : undefined;
    if (!program || !provider) continue;
    if (input.ages.length > 0) {
      if (!input.asOfDate) {
        skippedForAge += 1;
        continue;
      }
      const children = statementsFromAges(input.ages, input.asOfDate);
      if (!sessionFitsAllSiblings(session, children)) {
        skippedForAge += 1;
        continue;
      }
    }
    matches.push({ session, program, provider });
  }
  return { matches, skippedForAge };
}
