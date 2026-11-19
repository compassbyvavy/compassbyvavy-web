export type Fact = {
  key: string;
  value: string | null;
  checkedOn: string | null;
};

export type ProgramBlock = {
  id: string;
  location: string;
  breakLabel: string;
  facts: Fact[];
};

export type PendingChange = {
  field: string;
  from: string;
  to: string;
};

export type CampRecord = {
  name: string;
  slug: string;
  contactEmail: string | null;
  intakeRows: number[];
  /** Public camp page. Null when it is not published. */
  pagePath: string | null;
  programs: ProgramBlock[];
  parentFacts: Fact[];
  sources: Array<{ adapter: string }>;
  pendingChanges: PendingChange[];
  hasPhotos: boolean;
  example?: boolean;
};

export type FormField = {
  key: string;
  fieldKey: string;
  label: string;
  column: string;
  help?: string;
  mode: "confirm" | "fill";
  prefilled: string | null;
  lastYear: boolean;
  maxLength?: number;
};

export type ExtraQuestion = {
  id: string;
  kind: "custom" | "watcher" | "spots" | "locations";
  fieldKey: string;
  prompt: string;
};

export type BuiltForm = {
  blocks: Array<{ id: string; title: string; fields: FormField[] }>;
  ask: FormField[];
  questions: ExtraQuestion[];
  fillInCount: number;
};

export type InviteStatus = "draft" | "sent" | "opened" | "submitted" | "reviewed" | "opted_out";

export type Invite = {
  id: string;
  camp: string;
  slug: string;
  intakeRows: number[];
  contactEmail: string | null;
  tokenHash: string;
  sentAt: string | null;
  expiresAt: string;
  openedAt: string | null;
  submittedAt: string | null;
  customQuestions: string[];
  status: InviteStatus;
  sendCount: number;
  example?: boolean;
};

export type Answer = {
  prefilled: string | null;
  confirmed: boolean;
  value: string;
  mode: "confirm" | "fill";
};

export type PhotoMeta = {
  path: string;
  caption: string;
  credit: string;
  kind: "photo" | "logo";
  use: boolean;
};

export type Submission = {
  id: number;
  inviteId: string;
  submittedAt: string;
  contact: { name: string; role: string; email: string; phone: string; publicPhone: string; publicEmail: string };
  answers: Record<string, Answer>;
  photos: PhotoMeta[];
  photoRights: boolean;
  childPermission: boolean;
  accuracyConfirmed: boolean;
  typedName: string;
  reviewStatus: "pending" | "approved" | "partly_approved" | "rejected";
  reviewedAt: string | null;
  note: string | null;
};

export type InviteEvent = {
  inviteId: string;
  kind: "sent" | "reminder" | "opened" | "unsubscribed" | "submitted";
  at: string;
};

export type ListingState = {
  invites: Invite[];
  submissions: Submission[];
  events: InviteEvent[];
  /** Dates (YYYY-MM-DD) a send was flushed, one entry per email. */
  sendDates: string[];
  /** Approved answers. Empty until Vineeta approves. */
  publicAnswers: Array<{ inviteId: string; key: string; value: string; confirmedOn: string }>;
};
