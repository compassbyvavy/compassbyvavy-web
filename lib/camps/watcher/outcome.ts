import type { JackrabbitClass } from "../feeds/jackrabbitJson";
import { hashSourceContent } from "../ingestion/hash";
import { diffFacts } from "./changes";
import type {
  ChangeWrite,
  Reading,
  SnapshotWrite,
  SourceUpdate,
  WatchFacts,
  WatchSession,
  WatchSource,
} from "./types";

const FAILURE = new Set(["unreachable", "blocked"]);

export function sessionFromClass(row: JackrabbitClass): WatchSession {
  return {
    id: row.id,
    name: row.name,
    dates: [row.startDate, row.endDate].filter((part): part is string => part != null).join("/"),
    hours: [row.startTime, row.endTime].filter((part): part is string => part != null).join("-"),
    ages: [row.minAge, row.maxAge].filter((part): part is string => part != null).join("-"),
    price: row.price == null ? null : String(row.price),
    spots: row.spots,
    registration: row.regStartDate,
    registerUrl: row.registerUrl,
  };
}

export function factsHash(facts: WatchFacts): string {
  return hashSourceContent(JSON.stringify(facts));
}

export type SourceOutcome = {
  snapshot: SnapshotWrite | null;
  changes: ChangeWrite[];
  update: SourceUpdate;
  logs: string[];
};

/**
 * Turn one adapter result into a snapshot and review rows.
 * A failed read stores no facts. The first good read is a baseline.
 * Unreachable or blocked becomes a review row only on the second night in a row.
 */
export function outcomeForReading(input: {
  source: WatchSource;
  now: Date;
  previousFacts: WatchFacts | null;
  reading: Reading;
}): SourceOutcome {
  const checkedAt = input.now.toISOString();
  const logs: string[] = [];
  if (input.reading.status !== "ok") {
    logs.push(`${input.source.sourceKey}: ${input.reading.status} ${input.reading.error}`);
    const changes: ChangeWrite[] = [];
    const previousStatus = input.source.lastStatus;
    if (previousStatus && FAILURE.has(previousStatus) && FAILURE.has(input.reading.status)) {
      changes.push({
        source_id: input.source.id,
        detected_at: checkedAt,
        session_ref: null,
        field: "unreachable",
        old_value: previousStatus,
        new_value: input.reading.status,
        kind: "review",
        status: "pending",
        note: null,
      });
    }
    return {
      snapshot: null,
      changes,
      update: {
        id: input.source.id,
        last_checked_at: checkedAt,
        last_status: input.reading.status,
      },
      logs,
    };
  }

  const diff = diffFacts(input.previousFacts, input.reading.facts);
  logs.push(...diff.notes.map((note) => `${input.source.sourceKey}: ${note}`));
  const changes: ChangeWrite[] = diff.changes.map((change) => ({
    source_id: input.source.id,
    detected_at: checkedAt,
    session_ref: change.sessionRef,
    field: change.field,
    old_value: change.oldValue,
    new_value: change.newValue,
    kind: "review",
    status: "pending",
    note: change.note,
  }));
  if (input.source.adapter === "manual") {
    changes.push({
      source_id: input.source.id,
      detected_at: checkedAt,
      session_ref: null,
      field: "needs_call",
      old_value: null,
      new_value: "Call or email",
      kind: "review",
      status: "pending",
      note: null,
    });
  }
  return {
    snapshot: {
      source_id: input.source.id,
      checked_at: checkedAt,
      http_status: input.reading.httpStatus,
      content_hash: input.reading.contentHash,
      facts: input.reading.facts,
    },
    changes,
    update: {
      id: input.source.id,
      last_checked_at: checkedAt,
      last_status: changes.length > 0 ? "changed" : "ok",
    },
    logs,
  };
}
