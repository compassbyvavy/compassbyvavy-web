/**
 * Two local camps so the form and the emails can be reviewed on this branch.
 * KSG uses the facts from its camp page. The example camp is not a real listing.
 * Production reads the same shape from camp_sessions. This file does not.
 */
import { hashToken } from "@/lib/camps/listingForm/submit";
import type { CampRecord, Invite, ListingState } from "@/lib/camps/listingForm/types";

const checked = "2026-11-15";

export const DEMO_TOKENS = {
  ksg: "ksg-confirm-demo-7f3a9c2e1b8d4f6a0c5e9b",
  example: "example-confirm-demo-7f3a9c2e1b8d4f6a0c",
} as const;

export const KSG: CampRecord = {
  name: "KSG Gymnastics (Kids Supergym)",
  slug: "ksg-winter",
  contactEmail: "kidssupergym.miss@gmail.com",
  intakeRows: [1],
  pagePath: "/camps/ksg-winter",
  programs: [
    {
      id: "winter",
      location: "3620A Laird Rd, Mississauga",
      breakLabel: "Winter break",
      facts: [
        { key: "program_name", value: "Winter Camp 2026", checkedOn: checked },
        { key: "what_kids_do", value: "Gymnastics, new skills and winter-break activities for ages 4–12.", checkedOn: checked },
        { key: "category", value: "Gymnastics", checkedOn: checked },
        { key: "ages", value: "4–12", checkedOn: checked },
        { key: "venue", value: "KSG Gymnastics, 3620A Laird Rd, Mississauga", checkedOn: checked },
        { key: "dates", value: "Dec 21–23 and Dec 28–30", checkedOn: checked },
        { key: "single_days", value: "Yes. $68 a full day, $42 a half day.", checkedOn: checked },
        { key: "hours", value: "9:00 am–4:00 pm", checkedOn: checked },
        { key: "before_care", value: "8:00–9:00 am, $9 a day", checkedOn: checked },
        { key: "after_care", value: "4:00–5:30 pm, $9 a day", checkedOn: checked },
        { key: "price", value: "$68 a day", checkedOn: checked },
        { key: "fee_notes", value: "$60 full day and $38 half day if booked by Nov 30, 2026. Registration fee $54 for 2026/27 if not already paid.", checkedOn: checked },
        { key: "registration_opens", value: "Nov 17, 2026, 1:00 pm", checkedOn: checked },
        { key: "register_link", value: "https://kids-supergym.com/winter-camp-2026", checkedOn: checked },
      ],
    },
  ],
  parentFacts: [],
  sources: [{ adapter: "jackrabbit" }],
  pendingChanges: [],
  hasPhotos: false,
};

/** Not a real camp. Used only to show the email when nothing is missing. */
export const EXAMPLE_COMPLETE: CampRecord = {
  name: "Example camp",
  slug: "example-complete",
  contactEmail: "example@example.invalid",
  intakeRows: [],
  pagePath: null,
  programs: [
    {
      id: "winter",
      location: "Example location",
      breakLabel: "Winter break",
      facts: [
        ["program_name", "Example program"],
        ["what_kids_do", "Example description"],
        ["category", "Example"],
        ["ages", "6–10"],
        ["venue", "Example hall"],
        ["dates", "Dec 21–23"],
        ["single_days", "Yes. $40 a day."],
        ["hours", "9:00 am–4:00 pm"],
        ["before_care", "8:00–9:00 am, $8 a day"],
        ["after_care", "4:00–5:00 pm, $8 a day"],
        ["price", "$200 a week"],
        ["fee_notes", "None"],
        ["registration_opens", "Open"],
        ["register_link", "https://example.invalid/register"],
      ].map(([key, value]) => ({ key, value, checkedOn: checked })),
    },
  ],
  parentFacts: [
    "what_to_bring",
    "food",
    "medical",
    "refunds",
    "staff",
    "inclusion",
    "trips",
    "parking",
    "typical_day",
    "different",
  ].map((key) => ({ key, value: "On file", checkedOn: checked })),
  sources: [{ adapter: "jackrabbit" }],
  pendingChanges: [],
  hasPhotos: true,
  example: true,
};

export const CAMPS: Record<string, CampRecord> = {
  [KSG.slug]: KSG,
  [EXAMPLE_COMPLETE.slug]: EXAMPLE_COMPLETE,
};

function invite(id: string, camp: CampRecord, token: string): Invite {
  return {
    id,
    camp: camp.name,
    slug: camp.slug,
    intakeRows: camp.intakeRows,
    contactEmail: camp.contactEmail,
    tokenHash: hashToken(token),
    sentAt: null,
    expiresAt: "2027-01-15",
    openedAt: null,
    submittedAt: null,
    customQuestions: [],
    status: "draft",
    sendCount: 0,
    example: camp.example,
  };
}

export function initialState(): ListingState {
  return {
    invites: [
      invite("invite-ksg", KSG, DEMO_TOKENS.ksg),
      invite("invite-example", EXAMPLE_COMPLETE, DEMO_TOKENS.example),
    ],
    submissions: [],
    events: [],
    sendDates: [],
    publicAnswers: [],
  };
}
