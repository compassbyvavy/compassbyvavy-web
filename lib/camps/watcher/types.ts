import type { AdapterParams } from "../feeds/adapterParams";

export type WatchSource = {
  id: string;
  sourceKey: string;
  camp: string;
  break: string;
  adapter: string;
  watchUrl: string | null;
  adapterParams: AdapterParams;
  checkEvery: string;
  active: boolean;
  lastCheckedAt: string | null;
  lastStatus: string | null;
};

export type WatchSession = {
  id: string;
  name: string;
  dates: string;
  hours: string;
  ages: string;
  price: string | null;
  spots: number | null;
  registration: string | null;
  registerUrl: string | null;
};

export type WatchFacts = {
  sessions?: WatchSession[];
  pageText?: string;
  reminder?: string;
};

export type ProposedChange = {
  sessionRef: string | null;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  kind: "review";
  note: string | null;
};

export type Reading =
  | { status: "ok"; httpStatus: number | null; facts: WatchFacts; contentHash: string }
  | { status: "unreachable" | "blocked" | "error"; httpStatus: number | null; error: string };

export type SnapshotWrite = {
  source_id: string;
  checked_at: string;
  http_status: number | null;
  content_hash: string | null;
  facts: WatchFacts;
};

export type ChangeWrite = {
  source_id: string;
  detected_at: string;
  session_ref: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  kind: "review";
  status: "pending";
  note: string | null;
};

export type SourceUpdate = {
  id: string;
  last_checked_at: string;
  last_status: "ok" | "changed" | "unreachable" | "blocked" | "error";
};

export type WatchCycle = {
  snapshots: SnapshotWrite[];
  changes: ChangeWrite[];
  updates: SourceUpdate[];
  logs: string[];
};
