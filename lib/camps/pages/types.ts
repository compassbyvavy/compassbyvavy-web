/**
 * One camp page, as facts with sources. The template never fills a blank.
 * A missing value is null and the page shows "Ask the camp".
 */

import { parentCopy } from "@/lib/voice/copy";

export const ASK_THE_CAMP = parentCopy.askTheCamp;
export const SEASON_TAG = parentCopy.seasonTag;
/** A fact checked before this date is last season until someone re-confirms it. */
export const STALE_BEFORE = "2026-09-01";

export type BreakId = "winter" | "march_break" | "pa_day" | "summer";

export type Sourced = {
  value: string | null;
  detail?: string | null;
  sourceUrl: string | null;
  checkedOn: string | null;
};

export type DayOption = {
  id: string;
  name: string;
  time: string;
  price: number;
  spots: string;
  /**
   * Options on the same day with different keys cannot be selected together.
   * Full day and a half day share a day but use different keys.
   */
  exclusiveKey: string;
};

export type PickerDay = {
  id: string;
  title: string;
  options: DayOption[];
};

export type PickerWeek = { label: string; days: PickerDay[] };

export type ThemeDay = {
  id: string;
  dow: string;
  dateLabel: string;
  title: string;
  description: string;
  spots: string;
  hours: string;
  price: number;
  registerUrl: string;
};

export type LocationChoice = {
  id: string;
  name: string;
  address: string;
  prices: { week: number; three: number; two: number };
  registerUrl: string;
};

export type LengthChoice = {
  id: "week" | "three" | "two";
  name: string;
  sub: string;
  days: number;
};

export type CareChoice = {
  id: string;
  name: string;
  hours: string;
  weekPrice: number;
  dayPrice: number;
};

export type ThemeChoice = { name: string; ages: string; blurb: string };

export type Picker =
  | { kind: "day-options"; intro: string; weeks: PickerWeek[]; footnote: string | null }
  | { kind: "theme-days"; intro: string; days: ThemeDay[] }
  | {
      kind: "location";
      intro: string;
      locations: LocationChoice[];
      lengths: LengthChoice[];
      care: CareChoice[];
      themes: ThemeChoice[];
      footnote: string | null;
    }
  | { kind: "none"; intro: string };

export type InfoRow = { label: string; text: string };
export type CostRow = { label: string; text: string; note: string | null; noteEndsOn?: string | null };
export type SourceLink = { label: string; url: string; checkedOn: string | null };

/** A field that is not the same at every location of one camp. */
export type LocationField = { location: string; field: string; value: string };

export type CampListing = {
  slug: string;
  batch: number;
  name: string;
  provider: string;
  place: string;
  breakId: BreakId;
  /** The camp's own "what makes you different" line, after Vineeta edits it. Null hides the box. */
  summary: string | null;
  ages: Sourced;
  dates: Sourced;
  price: Sourced;
  hours: Sourced;
  care: Sourced;
  lunch: Sourced;
  /** Price used for the break-wide median. Null when the camp has not published one. */
  comparePrice: number | null;
  /** Wording used only to catch "per day" and "per week" in the same camp. */
  carePhrases: string[];
  locationFields: LocationField[];
  deal: { text: string; endsOn: string } | null;
  registration: "opens" | "open" | "full" | "closed" | "unknown";
  statusHeadline: string;
  statusDetail: string | null;
  statusChecked: string | null;
  /** The downside, in one sentence, under the status. Null when there isn't one. */
  catchLine: string | null;
  picker: Picker;
  week: { label: string; text: string }[] | null;
  weekNote: string | null;
  activities: { quote: string | null; cite: string | null; bullets: string[] } | null;
  costRows: CostRow[] | null;
  costNote: string | null;
  /** When set, the cost note is hidden after this date, the same way a deal ends. */
  costNoteEndsOn?: string | null;
  beforeYouGo: InfoRow[];
  refunds: InfoRow[];
  sources: SourceLink[];
  registerUrl: string | null;
  /** Set only when an approved listing-form submission exists. */
  confirmedOn: string | null;
  priceFrom: string;
};

export type WatcherSignal = {
  pendingChange: boolean;
  unreachableNights: number;
};
