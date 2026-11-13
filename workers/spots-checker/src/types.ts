export type SpotState = "available" | "full" | "waitlist";

export type SpotReading = {
  spots_left: number | null;
  state: SpotState;
  source_url: string;
};

export type DueRef = {
  sessionId: string;
  bookingSystem: string;
  externalRef: Record<string, unknown>;
  enabled: boolean;
  published: boolean;
  endDate: string | null;
};

export type SpotAdapter = {
  pageUrl(ref: DueRef): string;
  parse(ref: DueRef, body: string): SpotReading | { error: string };
};

export type PageFetch =
  | { ok: true; status: number; url: string; body: string }
  | { ok: false; status: number; url: string; error: string };

export type SpotWrite = {
  session_id: string;
  spots_left: number | null;
  state: SpotState;
  checked_at: string;
  source_url: string;
  booking_system: string;
};

export type RunLog = {
  booking_system: string;
  sessions_checked: number;
  errors: string | null;
};

export type RunOutcome = {
  writes: SpotWrite[];
  runs: RunLog[];
};
