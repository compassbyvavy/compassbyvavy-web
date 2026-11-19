import type { ProposedChange, WatchFacts } from "./types";

const TRACKED = ["dates", "hours", "ages", "price", "registration"] as const;

export function changedCharCount(before: string, after: string): number {
  let start = 0;
  const maxStart = Math.min(before.length, after.length);
  while (start < maxStart && before.charCodeAt(start) === after.charCodeAt(start)) start += 1;
  let endBefore = before.length;
  let endAfter = after.length;
  while (
    endBefore > start &&
    endAfter > start &&
    before.charCodeAt(endBefore - 1) === after.charCodeAt(endAfter - 1)
  ) {
    endBefore -= 1;
    endAfter -= 1;
  }
  return endBefore - start + (endAfter - start);
}

function crossedOpenFull(before: number | null, after: number | null): boolean {
  if (before == null || after == null) return false;
  return before > 0 !== after > 0;
}

function textValue(value: string | null): string {
  return value ?? "";
}

/**
 * Compare tonight with the previous snapshot. The first successful read is a
 * baseline: no session_new rows. A spot count that stays open, or stays full,
 * is not a change. Open to full and full to open are review items marked urgent.
 * A registration date that is posted, or that changes, is review and urgent.
 * A page edit shorter than 20 characters is logged and not raised.
 */
export function diffFacts(
  previous: WatchFacts | null,
  next: WatchFacts,
): { changes: ProposedChange[]; notes: string[] } {
  if (!previous) return { changes: [], notes: [] };
  const changes: ProposedChange[] = [];
  const notes: string[] = [];

  if (next.pageText != null || previous.pageText != null) {
    const before = previous.pageText ?? "";
    const after = next.pageText ?? "";
    if (before !== after) {
      const size = changedCharCount(before, after);
      if (size < 20) {
        notes.push("page change under 20 characters was logged and not raised");
      } else {
        changes.push({
          sessionRef: null,
          field: "page_text",
          oldValue: before,
          newValue: after,
          kind: "review",
          note: null,
        });
      }
    }
  }

  const previousSessions = new Map((previous.sessions ?? []).map((session) => [session.id, session]));
  const nextSessions = new Map((next.sessions ?? []).map((session) => [session.id, session]));

  for (const [id, session] of nextSessions) {
    const old = previousSessions.get(id);
    if (!old) {
      changes.push({
        sessionRef: id,
        field: "session_new",
        oldValue: null,
        newValue: session.name,
        kind: "review",
        note: null,
      });
      continue;
    }
    for (const field of TRACKED) {
      const before = textValue(old[field]);
      const after = textValue(session[field]);
      if (before === after) continue;
      changes.push({
        sessionRef: id,
        field,
        oldValue: before === "" ? null : before,
        newValue: after === "" ? null : after,
        kind: "review",
        // A posted opening date, or registration flipping to open, is urgent.
        note: field === "registration" && after !== "" ? "urgent" : null,
      });
    }
    if (crossedOpenFull(old.spots, session.spots)) {
      changes.push({
        sessionRef: id,
        field: "spots",
        oldValue: old.spots == null ? null : String(old.spots),
        newValue: session.spots == null ? null : String(session.spots),
        kind: "review",
        note: "urgent",
      });
    }
  }

  for (const [id, old] of previousSessions) {
    if (nextSessions.has(id)) continue;
    changes.push({
      sessionRef: id,
      field: "session_gone",
      oldValue: old.name,
      newValue: null,
      kind: "review",
      note: null,
    });
  }

  return { changes, notes };
}
