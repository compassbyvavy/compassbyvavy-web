/**
 * COOKSMART winter camp (Format C). Words and facts match
 * docs/camps/pages/reference/cooksmart-winter.html (Nov 21, 2026).
 * Used only by CookSmartWinterPage for slug cooksmart-winter.
 */

export const COOKSMART_WINTER_SLUG = "cooksmart-winter";

export const COOKSMART_CHECKED_ON = "2026-11-21";

/** City slugs that may show the COOKSMART card on winter-break. */
export const COOKSMART_CHECKED_SO_FAR_CITIES = ["ontario", "mississauga"] as const;

export function cooksmartCheckedSoFarEligible(input: {
  city: string;
  categorySlug: string;
  subcategorySlug: string;
}): boolean {
  return (
    input.categorySlug === "camps" &&
    input.subcategorySlug === "winter-break" &&
    (COOKSMART_CHECKED_SO_FAR_CITIES as readonly string[]).includes(input.city)
  );
}

/** Address used for Google Directions (not COOKSMART's Pengilley pin). */
export const COOKSMART_DIRECTIONS_ADDRESS = "1700 Mazo Crescent, Mississauga, ON L5J 1Y8";

export function cooksmartDirectionsUrl(address = COOKSMART_DIRECTIONS_ADDRESS): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

const CAMP = "https://www.cooksmart.ca/programs/camps-hub/winter-camp";
const FULL_BOOK = "https://cooksmartscheduling.as.me/?appointmentType=99733065";
const HALF_BOOK = "https://cooksmartscheduling.as.me/?appointmentType=99732924";
const PARENT = "https://www.cooksmart.ca/parent-info";
const CANCEL = "https://www.cooksmart.ca/cancellation-policy";
const FAQ = "https://www.cooksmart.ca/faqs";
const CAMPS = "https://www.cooksmart.ca/camps";
const ABOUT = "https://www.cooksmart.ca/about-us";
const MEMBER = "https://www.cooksmart.ca/membership";
const CONTACT = "https://www.cooksmart.ca/contact";
const AWARD = "https://www.ccaward.com/award-winners/peel-region/";

export type CooksmartOptionKind = "full" | "half";

export type CooksmartDay = {
  id: string;
  title: string;
  iso: string;
  fullSpots: number;
  halfSpots: number;
};

export const COOKSMART_DAYS: readonly CooksmartDay[] = [
  { id: "dec-21", title: "Mon, Dec 21", iso: "2026-12-21", fullSpots: 16, halfSpots: 6 },
  { id: "dec-22", title: "Tue, Dec 22", iso: "2026-12-22", fullSpots: 16, halfSpots: 5 },
  { id: "dec-23", title: "Wed, Dec 23", iso: "2026-12-23", fullSpots: 20, halfSpots: 6 },
  { id: "dec-28", title: "Mon, Dec 28", iso: "2026-12-28", fullSpots: 20, halfSpots: 5 },
  { id: "dec-29", title: "Tue, Dec 29", iso: "2026-12-29", fullSpots: 20, halfSpots: 5 },
  { id: "dec-30", title: "Wed, Dec 30", iso: "2026-12-30", fullSpots: 20, halfSpots: 6 },
];

export const COOKSMART_PRICE = { full: 98, half: 67 } as const;
export const COOKSMART_TAX_RATE = 0.13;
export const COOKSMART_OPTION_NAME = { full: "Full day", half: "Half day" } as const;

export type CooksmartPick = {
  dayId: string;
  kind: CooksmartOptionKind;
};

export function cooksmartOptionId(dayId: string, kind: CooksmartOptionKind): string {
  return `${dayId}-${kind}`;
}

export function withCooksmartExclusivePick(current: CooksmartPick[], next: CooksmartPick): CooksmartPick[] {
  const exists = current.some((item) => item.dayId === next.dayId && item.kind === next.kind);
  if (exists) return current.filter((item) => !(item.dayId === next.dayId && item.kind === next.kind));
  return [...current.filter((item) => item.dayId !== next.dayId), next];
}

/** Booking list and multi-day bar use date order, not click order. */
export function sortedCooksmartPicks(selected: readonly CooksmartPick[]): CooksmartPick[] {
  const order = new Map(COOKSMART_DAYS.map((day, index) => [day.id, index]));
  return [...selected].sort((a, b) => (order.get(a.dayId) ?? 0) - (order.get(b.dayId) ?? 0));
}

export function cooksmartTaxTotal(price: number): string {
  return (price * (1 + COOKSMART_TAX_RATE)).toFixed(2);
}

export type CooksmartBar = {
  title: string;
  detail: string;
  buttonLabel: string;
  href: string;
  openInNewTab: boolean;
  showBookingList: boolean;
};

export function summarizeCooksmartBar(selected: readonly CooksmartPick[]): CooksmartBar {
  if (!selected.length) {
    return {
      title: "Pick a day",
      detail: "$98 full · $67 half, plus HST",
      buttonLabel: "Pick a day",
      href: "#sessions",
      openInNewTab: false,
      showBookingList: false,
    };
  }
  const items = selected.map((pick) => {
    const day = COOKSMART_DAYS.find((row) => row.id === pick.dayId)!;
    const price = COOKSMART_PRICE[pick.kind];
    return {
      day,
      kind: pick.kind,
      price,
      url: cooksmartBookingUrl(pick.kind, day.iso),
      name: COOKSMART_OPTION_NAME[pick.kind],
    };
  });
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const title = `${items.length} picked · $${total} + HST = $${cooksmartTaxTotal(total)}`;
  if (items.length === 1) {
    const item = items[0];
    const dateLabel = item.day.title.split(", ")[1];
    return {
      title,
      detail: "Opens COOKSMART's form for this day",
      buttonLabel: `Book ${dateLabel} ${item.name.toLowerCase()} ↗`,
      href: item.url,
      openInNewTab: true,
      showBookingList: false,
    };
  }
  return {
    title,
    detail: "COOKSMART books one day at a time",
    buttonLabel: `Book your ${items.length} days`,
    href: "#booklist",
    openInNewTab: false,
    showBookingList: true,
  };
}

/** Written out in full — tests assert these exact strings. */
export const COOKSMART_BOOKING_URLS = [
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99733065/calendar/2518109/datetime/2026-12-21T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99733065",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99732924/calendar/2518109/datetime/2026-12-21T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99732924",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99733065/calendar/2518109/datetime/2026-12-22T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99733065",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99732924/calendar/2518109/datetime/2026-12-22T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99732924",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99733065/calendar/2518109/datetime/2026-12-23T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99733065",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99732924/calendar/2518109/datetime/2026-12-23T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99732924",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99733065/calendar/2518109/datetime/2026-12-28T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99733065",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99732924/calendar/2518109/datetime/2026-12-28T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99732924",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99733065/calendar/2518109/datetime/2026-12-29T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99733065",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99732924/calendar/2518109/datetime/2026-12-29T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99732924",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99733065/calendar/2518109/datetime/2026-12-30T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99733065",
  "https://cooksmartscheduling.as.me/schedule/7b98e4f9/appointment/99732924/calendar/2518109/datetime/2026-12-30T09%3A00%3A00-05%3A00?appointmentTypeIds%5B%5D=99732924",
] as const;

export function cooksmartBookingUrl(kind: CooksmartOptionKind, isoDate: string): string {
  const dayIndex = COOKSMART_DAYS.findIndex((day) => day.iso === isoDate);
  if (dayIndex < 0) {
    throw new Error(`Unknown COOKSMART date ${isoDate}`);
  }
  const urlIndex = dayIndex * 2 + (kind === "full" ? 0 : 1);
  return COOKSMART_BOOKING_URLS[urlIndex];
}

export type CooksmartParentQuestion = {
  question: string;
  shortAnswer: string | null;
  answer: string;
  askTheCamp: boolean;
  sourceLine: string | null;
};

export type CooksmartWinterContent = {
  title: string;
  providerLine: string;
  badge: string;
  summaryHtml: string;
  facts: Array<{
    label: string;
    values: string[];
    detail: string | null;
    missing?: boolean;
  }>;
  statusHeadline: string;
  statusDetail: string;
  statusChecked: string;
  catchLines: Array<{ html: string }>;
  pills: Array<{ href: string; label: string }>;
  optionKeys: Array<{ title: string; meta: string; blurb: string }>;
  sessionsIntroHtml: string;
  siblingsNote: string;
  timelineIntro: string;
  timeline: Array<{ time: string; html: string }>;
  timelineNote: string;
  learnTitle: string;
  learn: Array<{ label: string; text: string }>;
  learnNote: string;
  questionsIntro: string;
  questions: CooksmartParentQuestion[];
  where: Array<{ label: string; html: string }>;
  parentsSayHeadlineHtml: string;
  parentsSayThemes: string[];
  parentsSayNote: string;
  sourcesHtml: string[];
  footerLinks: Array<{ href: string; label: string }>;
  bookingListNote: string;
};

export const cooksmartWinter: CooksmartWinterContent = {
  title: "Winter Holiday Cooking Camp",
  providerLine: "COOKSMART · COOKSMART Clarkson, 1700 Mazo Crescent, Mississauga",
  badge: "Verified Nov 21, 2026",
  summaryHtml: "<b>Screen-free cooking camp:</b> kids cook lunch, bake and learn life skills. Book single days.",
  facts: [
    { label: "Ages", values: ["5–12"], detail: "SK to Grade 7, grouped by age" },
    { label: "Dates", values: ["Dec 21–23 & 28–30"], detail: "Mon–Wed both weeks; book any day" },
    { label: "Price", values: ["Full day $98", "Half day $67"], detail: "Plus HST: $110.74 and $75.71" },
    { label: "Hours", values: ["Full day 9:00–4:00", "Half day 9:00–1:30"], detail: null },
    { label: "Before & after care", values: ["Ask the camp"], detail: "Not on their site", missing: true },
    { label: "Lunch", values: ["Included"], detail: "With snacks · nut-free kitchen" },
  ],
  statusHeadline: "Registration open",
  statusDetail: "16–20 full-day and 5–6 half-day spots left on each date.",
  statusChecked: "Checked Nov 21, 2026 on COOKSMART's camp and booking pages",
  catchLines: [
    { html: "Camp runs 9:00 to 4:00, and no before or after care is listed. Ask the camp if you need it." },
    { html: "Half day ends at 1:30, right after lunch." },
    {
      html: `Use the address 1700 Mazo Crescent, or our <a href="${cooksmartDirectionsUrl()}" target="_blank" rel="noopener">Directions</a> link. COOKSMART's own Google map pin is about 1 km away.`,
    },
    { html: "Cancelling within 2 weeks costs half the fee; within 72 hours, no refund." },
  ],
  pills: [
    { href: "#sessions", label: "Pick your days" },
    { href: "#about", label: "What kids do" },
    { href: "#questions", label: "Parent questions" },
    { href: "#where", label: "Where" },
    { href: "#say", label: "What parents say" },
    { href: "#checked", label: "How we checked" },
  ],
  optionKeys: [
    {
      title: "Full day",
      meta: "9:00–4:00 · $98 + HST",
      blurb: "Hot lunch they cook, snacks, baking and afternoon activities",
    },
    {
      title: "Half day",
      meta: "9:00–1:30 · $67 + HST",
      blurb: "Fruit snack, baking and lunch they cook",
    },
  ],
  sessionsIntroHtml: `Pick full or half for each date you want. Spots are from COOKSMART's booking pages on Nov 21, 2026 and change as families book. Check current spots: <a href="${FULL_BOOK}" target="_blank" rel="noopener">full day ↗</a> · <a href="${HALF_BOOK}" target="_blank" rel="noopener">half day ↗</a>`,
  siblingsNote:
    "Siblings: set quantity to 2 on each day you book and use code CSFAMILY2. COOKSMART's winter booking page doesn't say how much it saves.",
  timelineIntro: "A typical day, from COOKSMART's camp page (checked Nov 21, 2026).",
  timeline: [
    {
      time: "9:00",
      html: "Arrive, wash hands, put on aprons, set up stations, and a food-identification challenge.",
    },
    {
      time: "10:00",
      html: "Cook the day's hot lunch: safe chopping (claw and bridge grips), measuring, and heat safety.",
    },
    {
      time: "12:00",
      html: "Eat the lunch they cooked, then indoor games and social time. <b>Half day goes home at 1:30.</b>",
    },
    {
      time: "1:30–4:00",
      html: "<b>Full day only:</b> holiday baking, afternoon snacks, food science experiments, sewing, mindfulness and holiday crafts.",
    },
  ],
  timelineNote:
    "Half-day campers also learn life skills, make a fruit snack and do some baking (COOKSMART's half-day booking page). The camp page doesn't say at what time.",
  learnTitle: "What they learn",
  learn: [
    { label: "Baking", text: "Measuring spices, rolling dough, cookie cutters and icing. Treats come home to share." },
    { label: "Crafts", text: "Seasonal crafts, including cinnamon salt-dough ornaments." },
    { label: "Life skills", text: "Beginner sewing, money basics, table manners, and cleaning up their station." },
    {
      label: "Food science",
      text: "Experiments with yeast and baking soda, taste tests, and how food fuels a growing body.",
    },
  ],
  learnNote:
    "From COOKSMART's camp page, checked Nov 21, 2026. The page doesn't say which of these half-day campers do; sewing, crafts and food science are listed for full-day afternoons.",
  questionsIntro: 'Tap a question for the answer. "Ask the camp" means COOKSMART\'s pages don\'t say.',
  questions: [
    {
      question: "Is there before or after care?",
      shortAnswer: null,
      askTheCamp: true,
      answer:
        "No before or after care is listed for winter camp. (COOKSMART's summer camp page offers an extra afternoon session to 6:00, but the winter page doesn't.) Ask the camp before booking.",
      sourceLine: null,
    },
    {
      question: "What about lunch and special diets?",
      shortAnswer: "Lunch and snacks included",
      askTheCamp: false,
      answer:
        "Both half and full day include lunch and healthy snacks that the kids make themselves. Half day includes a fruit snack and baking; full day adds afternoon snacks. COOKSMART says recipes are vegetarian and halal-friendly; gluten-free and dairy needs can be handled with advance notice.",
      sourceLine: "Verified Nov 21, 2026 · camp website and booking pages",
    },
    {
      question: "Allergy and nut policy?",
      shortAnswer: "Nut-free",
      askTheCamp: false,
      answer:
        "COOKSMART says the facility and all ingredients are 100% peanut- and tree-nut-free. Families give full allergy and diet details at registration. For a life-threatening allergy, your child must carry their own unexpired EpiPen (a waist pouch is suggested) and you fill in a Medical Confirmation form. Staff are trained to use an EpiPen.",
      sourceLine: "Verified Nov 21, 2026 · camp website, camps page and parent info",
    },
    {
      question: "Can my child take medication at camp?",
      shortAnswer: "Yes, with a form",
      askTheCamp: false,
      answer:
        "You fill in a Medical Confirmation form. Medicine comes in its original pharmacy-labelled container, one day's dose at a time, with any measuring spoon labelled. Kids take it themselves under staff supervision; if they can't, you need to arrange someone else to give it.",
      sourceLine: "Verified Nov 21, 2026 · COOKSMART parent info for camps",
    },
    {
      question: "What if my child gets sick?",
      shortAnswer: "You'll be called",
      askTheCamp: false,
      answer: "Keep sick children at home. If a child gets sick at camp, COOKSMART calls you to pick them up.",
      sourceLine: "Verified Nov 21, 2026 · COOKSMART parent info for camps",
    },
    {
      question: "What's the staff ratio?",
      shortAnswer: null,
      askTheCamp: true,
      answer: 'No number is given. COOKSMART says class sizes are "strictly limited" with small-group coaching.',
      sourceLine: "Verified Nov 21, 2026 · camp website",
    },
    {
      question: "Are staff checked and trained?",
      shortAnswer: "Yes",
      askTheCamp: false,
      answer:
        "Instructors are police-checked (vulnerable sector), certified food handlers, and trained in first aid and CPR. Camp staff are also certified in allergy awareness, and most have HIGH FIVE or university child-development training.",
      sourceLine: "Verified Nov 21, 2026 · camp website and parent info",
    },
    {
      question: "Do kids use real knives and ovens?",
      shortAnswer: "Child-safe knives",
      askTheCamp: false,
      answer:
        "Kids use child-safe nylon and serrated knives on non-slip prep mats, with small-group coaching. Only instructors handle hot ovens.",
      sourceLine: "Verified Nov 21, 2026 · camp website",
    },
    {
      question: "How big are the groups?",
      shortAnswer: null,
      askTheCamp: true,
      answer:
        'Kids are grouped into age-appropriate teams: older kids do more advanced chopping and kitchen math, younger ones build the basics. Class sizes are "strictly limited"; numbers not given.',
      sourceLine: "Verified Nov 21, 2026 · camp website",
    },
    {
      question: "Can siblings or friends be together?",
      shortAnswer: "Where possible",
      askTheCamp: false,
      answer: "COOKSMART says it groups siblings or friends together where possible. Tell them when you register.",
      sourceLine: "Verified Nov 21, 2026 · COOKSMART FAQ",
    },
    {
      question: "Are there discounts?",
      shortAnswer: "Sibling code, membership",
      askTheCamp: false,
      answer:
        "<b>Siblings:</b> book quantity 2 with code CSFAMILY2; the winter page doesn't say how much it saves (on COOKSMART's teen page the same code takes $25 off each extra teen). <b>COOKSMART Club:</b> a yearly family membership gives 20% off all camps, winter included. Its page says $149 a year, but the checkout box on the same page says CA$169: ask which is right. <b>Gift certificates</b> of $25 and $50 can be used toward any program.",
      sourceLine: "Verified Nov 21, 2026 · booking pages, membership page",
    },
    {
      question: "Phones, toys and devices?",
      shortAnswer: "Leave them home",
      askTheCamp: false,
      answer:
        "COOKSMART asks campers to leave toys and personal items at home. Any device brought to camp stays in a bag, not a pocket.",
      sourceLine: "Verified Nov 21, 2026 · COOKSMART parent info for camps",
    },
    {
      question: "Does my child need to be toilet trained?",
      shortAnswer: null,
      askTheCamp: true,
      answer: "COOKSMART's pages don't say. Ask before booking, especially for 5-year-olds.",
      sourceLine: null,
    },
    {
      question: "Special needs support?",
      shortAnswer: null,
      askTheCamp: true,
      answer:
        "COOKSMART runs autism-friendly, sensory-conscious programs for schools and lists Autism Ontario and Shining Stars as partners, but its camp pages don't describe support at camp. Ask before booking.",
      sourceLine: "Verified Nov 21, 2026 · inclusive programs page",
    },
    {
      question: "Do they go outside in winter?",
      shortAnswer: null,
      askTheCamp: true,
      answer:
        "COOKSMART's general parent info says campers go outside every day and should dress for the weather. The winter camp page only mentions indoor games. Ask which applies, and pack warm clothes to be safe.",
      sourceLine: "Verified Nov 21, 2026 · COOKSMART parent info for camps",
    },
    {
      question: "Swimming or field trips?",
      shortAnswer: "None listed",
      askTheCamp: false,
      answer: "Neither appears in the winter camp's activities.",
      sourceLine: "Verified Nov 21, 2026 · camp website",
    },
    {
      question: "What should we pack?",
      shortAnswer: "Water, shoes, apron",
      askTheCamp: false,
      answer:
        "A reusable water bottle, indoor shoes and an apron (camp aprons are available too). Hair tied back, sleeves that roll up. Label everything. Equipment and ingredients are provided.",
      sourceLine: "Verified Nov 21, 2026 · camp website and parent info",
    },
    {
      question: "Cancellation and refunds?",
      shortAnswer: "Tiered",
      askTheCamp: false,
      answer:
        "In writing, separately for each child. More than a month before: refund minus $60. 2–4 weeks: minus $100. 2 weeks or less: minus 50%. Within 72 hours, or once camp starts: no refund. COOKSMART's FAQ adds that credits toward future programs may be possible. How these tiers apply to single days isn't stated: ask the camp.",
      sourceLine: "Verified Nov 21, 2026 · cancellation policy and FAQ",
    },
    {
      question: "Subsidy or tax receipt?",
      shortAnswer: null,
      askTheCamp: true,
      answer:
        "No subsidy or tax receipt information is listed. COOKSMART's FAQ says it occasionally offers promotions; contact them directly.",
      sourceLine: null,
    },
    {
      question: "Licensed or accredited?",
      shortAnswer: "Insured, no accreditation listed",
      askTheCamp: false,
      answer: "COOKSMART says it is insured and covered by WSIB. No camp accreditation is listed.",
      sourceLine: "Verified Nov 21, 2026 · about page",
    },
  ],
  where: [
    {
      label: "Address",
      html: `<b>1700 Mazo Crescent, Mississauga L5J 1Y8</b>, near Southdown Road and Truscott Drive (Clarkson). Google lists Christ First United Church in the same building.<br><a class="cooksmart-dirbtn" href="${cooksmartDirectionsUrl()}" target="_blank" rel="noopener">Directions to 1700 Mazo Crescent ↗</a>`,
    },
    {
      label: "Maps warning",
      html: 'Use our Directions button or type the address. COOKSMART\'s "Open in Google Maps" link goes to its business pin at 1713 Pengilley Place, about 1 km away.',
    },
    { label: "Parking", html: "Free on site" },
    { label: "Transit", html: "4 minutes from Clarkson GO" },
    {
      label: "Drop-off",
      html: "A parent or guardian signs your child in and out at the camp entrance, by the COOKSMART sign. Anyone else picking up must be on your list and show photo ID. Arrive 5 minutes early.",
    },
    { label: "Contact", html: "647-894-2086 · info@cooksmart.ca" },
  ],
  parentsSayHeadlineHtml:
    "<b>5.0 on Google from 50 reviews</b> (Nov 21, 2026). We read all 50: 48 five-star, 2 four-star, no complaints. About 13 have no written comment.",
  parentsSayThemes: [
    "Kids come home excited, describe what they made, and start cooking at home.",
    "Staff are described as warm, patient and organized, with parents greeted at the door and signed in and out each day.",
    "Parents like not packing lunches or snacks.",
    "Groups can mix ages. One parent noted a large group with a wide age range that still stayed engaged; another said an older child who usually avoids camps for younger kids enjoyed it.",
    "Staff respected families' dietary preferences.",
  ],
  parentsSayNote:
    "Most reviews are about summer camps, classes, online classes and parties. None we found are specifically about winter camp. COOKSMART is also on the 2026 Consumer Choice Award list for Peel Region (Cooking Classes).",
  sourcesHtml: [
    `<a href="${CAMP}">Winter camp page</a>, read in full. Checked Nov 21, 2026`,
    `Booking pages, <a href="${FULL_BOOK}">full day</a> and <a href="${HALF_BOOK}">half day</a>: prices with HST, spots for all six dates, sibling code, and each date's own booking link. Checked Nov 21, 2026`,
    `<a href="${PARENT}">Parent info for camps</a>: drop-off, medication, allergies, illness, staff training. Checked Nov 21, 2026`,
    `<a href="${CANCEL}">Cancellation policy</a>, <a href="${FAQ}">FAQ</a>, <a href="${CAMPS}">camps page</a>, <a href="${ABOUT}">about page</a>, <a href="${MEMBER}">membership page</a>, <a href="${CONTACT}">contact page</a>. Checked Nov 21, 2026`,
    "Google Maps: all 50 COOKSMART reviews, both map pins, and our Directions link (opens on the 1700 Mazo Crescent building). Checked Nov 21, 2026",
    `<a href="${AWARD}">Consumer Choice Award Peel Region list</a>. Checked Nov 21, 2026`,
  ],
  footerLinks: [
    { href: "#", label: "Report a change" },
    { href: "#", label: "Are you the camp? Update your listing" },
  ],
  bookingListNote:
    "COOKSMART books one day per checkout. Each button opens that day's form with the date already picked, so book them one after another. Siblings: set quantity to 2 and use code CSFAMILY2 each time.",
};

/** Winter-break subcategory card — built from the listing above, not retyped. */
export const COOKSMART_CHECKED_SO_FAR = {
  href: `/camps/${COOKSMART_WINTER_SLUG}`,
  title: cooksmartWinter.title,
  placeLine: "COOKSMART · Clarkson, Mississauga",
  agesDates: `Ages ${cooksmartWinter.facts[0].values[0]} · ${cooksmartWinter.facts[1].values[0]}`,
  priceLine: `Full day $${COOKSMART_PRICE.full} · Half day $${COOKSMART_PRICE.half}, plus HST`,
  verified: cooksmartWinter.badge,
} as const;
