/**
 * Form fields and the column each approved answer maps to.
 * Section 3 questions we already have an answer for move into section 2.
 */

export const STALE_BEFORE = "2026-09-01";

export type FieldDef = {
  key: string;
  label: string;
  column: string;
  help?: string;
  maxLength?: number;
};

export const CHECK_FIELDS: FieldDef[] = [
  { key: "program_name", label: "Program name", column: "camp_programs.name" },
  { key: "what_kids_do", label: "What kids do", column: "camp_programs.description", help: "Two or three sentences." },
  { key: "category", label: "Category", column: "camp_programs.primary_category" },
  { key: "ages", label: "Ages or grades", column: "camp_sessions.age_min" },
  { key: "venue", label: "Venue name and address", column: "venues" },
  { key: "dates", label: "Dates", column: "camp_sessions.start_date" },
  { key: "single_days", label: "Single days available?", column: "camp_sessions.schedule_format", help: "Yes or no, and the daily price." },
  { key: "hours", label: "Hours", column: "camp_sessions.core_hours_start" },
  { key: "before_care", label: "Before care", column: "camp_sessions.before_care_start_time", help: "Time and price." },
  { key: "after_care", label: "After care", column: "camp_sessions.after_care_start_time", help: "Time and price." },
  { key: "price", label: "Price", column: "camp_sessions.price_amount" },
  { key: "fee_notes", label: "Fee notes", column: "camp_sessions.fee_notes", help: "Sibling discounts, deals and their end dates, membership fees." },
  { key: "registration_opens", label: "When registration opens", column: "camp_sessions.registration_opens_on", help: "Date and time." },
  { key: "register_link", label: "Register link", column: "camp_sessions.registration_url" },
];

export const ASK_FIELDS: FieldDef[] = [
  { key: "what_to_bring", label: "What to bring", column: "camp_packing_items.body", help: "A packing list." },
  { key: "food", label: "Food and allergies", column: "camp_programs.preparation_notes", help: "Is lunch or a snack provided? Nut-free or nut-aware? Can you handle allergies?" },
  { key: "medical", label: "Medical and allergy policy", column: "camp_programs.support_info", help: "EpiPens and medication." },
  { key: "refunds", label: "Refunds and cancellations", column: "camp_programs.policies_summary" },
  { key: "staff", label: "Staff", column: "camp_programs.notes", help: "Ratio, training, first aid, police checks." },
  { key: "inclusion", label: "Inclusion", column: "camp_programs.accessibility_support_tags", help: "Support for kids with disabilities or additional needs." },
  { key: "trips", label: "Trips off-site?", column: "camp_sessions.notes", help: "Where to, and how kids get there (bus or walk)." },
  { key: "parking", label: "Parking and drop-off", column: "venues.notes" },
  { key: "typical_day", label: "A typical day", column: "camp_programs.experience_summary", help: "A short schedule." },
  { key: "different", label: "What makes your camp different", column: "camp_programs.experience_summary", maxLength: 300 },
];

export const GAP_ORDER = ["what_kids_do", "food", "refunds", "staff", "hours", "care", "photos"] as const;

export const GAP_LABEL: Record<(typeof GAP_ORDER)[number], string> = {
  what_kids_do: "what kids do",
  food: "food and allergies",
  refunds: "refunds",
  staff: "staff",
  hours: "hours",
  care: "care",
  photos: "photos",
};
