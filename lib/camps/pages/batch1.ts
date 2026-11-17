/**
 * Batch 1. The three drafted camps use the facts in
 * docs/camps/pages/reference/. The other camps are named from the Camp Watcher
 * seed. Their prices, dates, hours and ages are null until a source states them.
 *
 * Futures is two pages (winter and March Break). The spec names 10 camps and
 * lists Futures for both breaks, so this batch has 11 pages.
 */
import type { CampListing, PickerDay, Sourced } from "@/lib/camps/pages/types";

export const BATCH_1_TOKEN = "QqC_uGjDCRjS48QRoU0uwqtJH-_chsd0";
export const BATCH_1_CREATED_ON = "2026-11-16";

const KSG = "https://kids-supergym.com/winter-camp-2026";
const KSG_DAY = "2026-11-15";
const LONGOS = "https://www.longos.com/cooking-classes/cooking-camp/";
const LONGOS_DAY = "2026-11-15";
const CKP_DAY = "2026-11-16";
const SQ1 = "https://www.creativekidsplace.ca/pages/camps/march-break-camp-square-one";
const STV = "https://www.creativekidsplace.ca/pages/camps/march-break-camp-streetsville-mississauga-on";
const MW = "https://www.creativekidsplace.ca/pages/camps/march-break-camps-mississauga-west";

function blank(url: string | null = null): Sourced {
  return { value: null, sourceUrl: url, checkedOn: null };
}

function sourced(value: string, url: string, checked: string, detail?: string): Sourced {
  return { value, detail: detail ?? null, sourceUrl: url, checkedOn: checked };
}

function ksgDay(dow: string, date: string): PickerDay {
  const title = `${dow}, ${date}`;
  const id = `${dow}-${date}`.replace(/\s/g, "");
  return {
    id,
    title,
    options: [
      { id: `${id}-full`, name: "Full day", time: "9:00 am–4:00 pm", price: 68, spots: "16 spots · checked Nov 15", exclusiveKey: "full" },
      { id: `${id}-am`, name: "Half day, morning", time: "9:00 am–12:00 pm", price: 42, spots: "8 spots · checked Nov 15", exclusiveKey: "half" },
      { id: `${id}-pm`, name: "Half day, afternoon", time: "1:00–4:00 pm", price: 42, spots: "8 spots · checked Nov 15", exclusiveKey: "half" },
    ],
  };
}

function unfilled(input: {
  slug: string;
  name: string;
  provider: string;
  breakId: CampListing["breakId"];
  place?: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  registerUrl: string | null;
}): CampListing {
  return {
    slug: input.slug,
    batch: 1,
    name: input.name,
    provider: input.provider,
    place: input.place ?? "Mississauga",
    breakId: input.breakId,
    summary: null,
    ages: blank(input.sourceUrl),
    dates: blank(input.sourceUrl),
    price: blank(input.sourceUrl),
    hours: blank(input.sourceUrl),
    care: blank(input.sourceUrl),
    lunch: blank(input.sourceUrl),
    comparePrice: null,
    carePhrases: [],
    locationFields: [],
    deal: null,
    registration: "unknown",
    statusHeadline: "Ask the camp",
    statusDetail: "Dates, price, hours and spots are not in the sources on file.",
    statusChecked: null,
    catchLine: null,
    picker: { kind: "none", intro: "Ask the camp. The sources on file don't list the days." },
    week: null,
    weekNote: null,
    activities: null,
    costRows: null,
    costNote: null,
    beforeYouGo: [],
    refunds: [],
    sources: input.sourceUrl && input.sourceLabel ? [{ label: input.sourceLabel, url: input.sourceUrl, checkedOn: null }] : [],
    registerUrl: input.registerUrl,
    confirmedOn: null,
    priceFrom: "Ask the camp",
  };
}

const ksg: CampListing = {
  slug: "ksg-winter",
  batch: 1,
  name: "Winter Camp 2026",
  provider: "KSG Gymnastics (Kids Supergym)",
  place: "3620A Laird Rd, Mississauga",
  breakId: "winter",
  summary: "A gymnastics day camp you can book one day at a time: full days or half days, across six dates of the winter break.",
  ages: sourced("4–12", KSG, KSG_DAY),
  dates: sourced("Dec 21–23 & 28–30", KSG, KSG_DAY, "Mon–Wed both weeks"),
  price: sourced("$68 full day", KSG, KSG_DAY, "$42 half day"),
  hours: sourced("9:00 am–4:00 pm", KSG, KSG_DAY, "Half days 9:00 am–12:00 pm or 1:00–4:00 pm"),
  care: sourced("8:00–9:00 am · 4:00–5:30 pm", KSG, KSG_DAY, "$9 a day each, $18 a day for both"),
  lunch: blank(KSG),
  comparePrice: 68,
  carePhrases: ["$9 a day"],
  locationFields: [],
  deal: { text: "Book by Nov 30, 2026 for $60 full days and $38 half days.", endsOn: "2026-11-30" },
  registration: "opens",
  statusHeadline: "Opens Nov 17, 1:00 pm",
  statusDetail: null,
  statusChecked: "checked Nov 15, 2026 on KSG's camp page",
  catchLine: "No camp on Dec 24 or Dec 31.",
  picker: {
    kind: "day-options",
    intro: "Pick the days and the option you need. Spots are the openings KSG lists for each option, checked Nov 15, 2026 (before registration opened).",
    footnote: "No camp on Dec 24 or Dec 31.",
    weeks: [
      { label: "Week 1", days: [ksgDay("Mon", "Dec 21"), ksgDay("Tue", "Dec 22"), ksgDay("Wed", "Dec 23")] },
      { label: "Week 2", days: [ksgDay("Mon", "Dec 28"), ksgDay("Tue", "Dec 29"), ksgDay("Wed", "Dec 30")] },
    ],
  },
  week: null,
  weekNote: null,
  activities: {
    quote: "Gymnastics, new skills and winter-break fun for ages 4–12.",
    cite: "KSG Gymnastics",
    bullets: [
      "Gymnastics skills and tricks on vault, bars, beam and floor",
      "Themed activities that change through the camp",
    ],
  },
  costRows: [
    { label: "Full day", text: "$68 a day", note: "$60 if booked by Nov 30, 2026", noteEndsOn: "2026-11-30" },
    { label: "Half day", text: "$42 a half day (morning or afternoon)", note: "$38 if booked by Nov 30, 2026", noteEndsOn: "2026-11-30" },
    { label: "Before care", text: "$9 a day (8:00–9:00 am)", note: null },
    { label: "After care", text: "$9 a day (4:00–5:30 pm)", note: null },
    { label: "Both", text: "$18 a day", note: null },
    { label: "Registration fee", text: "$54 for 2026/27, if not already paid", note: null },
  ],
  costNote: "The Nov 30 rate applies to camp days only. Care and the registration fee stay at their regular prices.",
  costNoteEndsOn: "2026-11-30",
  beforeYouGo: [
    { label: "How to register", text: "Through KSG's Jackrabbit parent portal, from Nov 17 at 1:00 pm. Members and new families open at the same time. New to KSG? Contact the office for help." },
    { label: "Care", text: "Booked as an add-on. KSG says care booking is “coming soon”." },
    { label: "Where", text: "3620A Laird Road, Mississauga" },
    { label: "Contact", text: "kidssupergym.miss@gmail.com · 905-607-5437" },
  ],
  refunds: [],
  sources: [{ label: "KSG Winter Camp 2026 page", url: KSG, checkedOn: KSG_DAY }],
  registerUrl: KSG,
  confirmedOn: null,
  priceFrom: "$42 a half day",
};

const longosDays: Array<[string, string, string, string, number, string]> = [
  ["313", "Mon", "Dec 21", "Holiday Movie Marathon", 19, "Treats inspired by holiday movies: Buddy's maple popcorn, Grinch grilled cheese, Polar Express hot chocolate."],
  ["314", "Tue", "Dec 22", "Winter Around the World", 20, "Foods from winter celebrations: sugar cookie trees, Mexican hot chocolate (Las Posadas), latkes (Hanukkah), jollof rice (Kwanzaa)."],
  ["315", "Wed", "Dec 23", "Ski, Sled, Skate... Snack!", 20, "Mini grilled cheese and tomato soup, cinnamon sugar snowflakes, grab-and-go trail mix."],
  ["316", "Thu", "Dec 24", "Cookies for Santa", 19, "Decorated sugar cookies, candy cane chocolate chip cookies, reindeer food, hot chocolate stir sticks. Lunch is Longo's cheese pizza."],
  ["317", "Mon", "Dec 28", "Pie in the Sky", 18, "Dough from around the world: Neapolitan pizza, Turkish pie, French flammekueche, apple pie dip, cherry pie cookie cups."],
  ["318", "Tue", "Dec 29", "Battle for the Multiverse", 18, "Superhero-themed superfoods: smoothies, wraps, carrot hummus, banana parfaits."],
  ["319", "Wed", "Dec 30", "Let It Snow!", 17, "Snowman pizza bianco, snowball potato puffs, melted snowman fudge, frosty cupcakes."],
  ["320", "Thu", "Dec 31", "Happy Noon Year!", 20, "New Year's party food: pizza pockets, mac & cheese cups, countdown snack mix, confetti cupcakes, and a noon countdown toast."],
];

const longos: CampListing = {
  slug: "longos-loft-applewood-winter",
  batch: 1,
  name: "Winter Cooking Camps",
  provider: "Longo's Loft",
  place: "Longo's Applewood, 1125 North Service Rd, Mississauga",
  breakId: "winter",
  summary: "Eight different 3-hour morning cooking camps, one a day. Kids cook and eat their own lunch, and you can book just the days you want.",
  ages: sourced("6–12", LONGOS, LONGOS_DAY, "Grades 1–6 (as of Sept 2026)"),
  dates: sourced("Dec 21–24 & 28–31", LONGOS, LONGOS_DAY, "Mon–Thu both weeks"),
  price: sourced("$45 a day", LONGOS, LONGOS_DAY, "per child"),
  hours: sourced("10:00 am–1:00 pm", LONGOS, LONGOS_DAY, "Morning only"),
  care: sourced("None", LONGOS, LONGOS_DAY, "Drop-off program"),
  lunch: sourced("Included", LONGOS, LONGOS_DAY, "Kids make it at camp"),
  comparePrice: 45,
  carePhrases: [],
  locationFields: [],
  deal: null,
  registration: "open",
  statusHeadline: "Open",
  statusDetail: "17–20 spots left on each date.",
  statusChecked: "checked Nov 15, 2026 on Longo's booking page",
  catchLine: "Nuts are left out of the kids' classes, but the kitchen is not nut-free.",
  picker: {
    kind: "theme-days",
    intro: "Each day is a different theme. Spots at Longo's Applewood, checked Nov 15, 2026.",
    days: longosDays.map(([id, dow, dateLabel, title, spots, description]) => ({
      id,
      dow,
      dateLabel,
      title,
      description,
      spots: `${spots} spots · checked Nov 15`,
      hours: "10:00 am–1:00 pm",
      price: 45,
      registerUrl: `https://www.longos.com/class-detail/${id}/${encodeURIComponent(`Winter Camp: ${title}`)}`,
    })),
  },
  week: null,
  weekNote: null,
  activities: null,
  costRows: null,
  costNote: null,
  beforeYouGo: [
    { label: "Drop-off", text: "A parent signs the child in at The Loft (the cooking room in the store) and signs a release and waiver. You can print and fill the waiver in advance." },
    { label: "Food", text: "Kids make and eat their own snacks and lunch. No outside food or drinks. Bring a refillable water bottle. Baked treats can come home." },
    { label: "Allergies", text: "Nuts are left out of kids' classes, but The Loft is not allergy- or nut-free. Contact the Loft Coordinator before camp about any allergy." },
    { label: "Age check", text: "Children must be 6–12. A child below the age can be refused at drop-off." },
    { label: "Where", text: "Longo's Applewood, 1125 North Service Rd, Mississauga. Store: 905-566-1125 · Guest Care: 1-800-956-6467" },
  ],
  refunds: [
    { label: "Cancel", text: "Online in My Account → My Orders, up to 48 hours before camp starts." },
    { label: "Change date or child", text: "Through Longo's Guest Care, up to 48 hours before." },
    { label: "Missed camps", text: "Not refunded." },
  ],
  sources: [
    { label: "Longo's cooking camp page", url: LONGOS, checkedOn: LONGOS_DAY },
    { label: "Each camp's booking page on longos.com (Applewood)", url: "https://www.longos.com/class-detail/313/", checkedOn: LONGOS_DAY },
  ],
  registerUrl: LONGOS,
  confirmedOn: null,
  priceFrom: "$45 a day",
};

const ckp: CampListing = {
  slug: "creative-kids-place-march-break",
  batch: 1,
  name: "March Break Camp",
  provider: "Creative Kids Place",
  place: "3 Mississauga locations: Square One, Streetsville, Mississauga West",
  breakId: "march_break",
  summary:
    "A full-day crafts, Lego and STEM camp where kids pick one theme for the week. Every day has outdoor play, plus a maple syrup festival trip on Wednesday, an animal show on Thursday and a carnival with pizza lunch on Friday.",
  ages: sourced("4–12", SQ1, CKP_DAY, "Up to 13 for Lego at Streetsville"),
  dates: sourced("Mar 15–19, 2027", SQ1, CKP_DAY, "Mon–Fri, March Break week"),
  price: sourced("$350–$370 a week", SQ1, CKP_DAY, "plus tax; 2- and 3-day options"),
  hours: sourced("9:00 am–4:00 pm", SQ1, CKP_DAY, "Full day"),
  care: sourced("7:30–9:00 am · 4:00–6:00 pm", SQ1, CKP_DAY, "$40 a week each, or $8 a day"),
  lunch: sourced("Pack your own", SQ1, CKP_DAY, "Lunch + 2 snacks; Fri pizza included"),
  comparePrice: 350,
  carePhrases: ["Square One $40 a week", "Mississauga West $40 a week", "Streetsville $40 per day"],
  locationFields: [
    { location: "Square One", field: "Week price", value: "$370" },
    { location: "Streetsville", field: "Week price", value: "$350" },
    { location: "Mississauga West", field: "Week price", value: "$350" },
    { location: "Square One", field: "Care price on the camp page", value: "$40 a week" },
    { location: "Mississauga West", field: "Care price on the camp page", value: "$40 a week" },
    { location: "Streetsville", field: "Care price on the camp page", value: "$40 per day" },
  ],
  deal: null,
  registration: "open",
  statusHeadline: "Open",
  statusDetail: "Opened Nov 5, 2026. Spots are in their booking system. We haven't checked them yet.",
  statusChecked: "checked Nov 16, 2026 on creativekidsplace.ca",
  catchLine: "You can book 2 or 3 days, but 2 days (Tue, Thu) misses the trip and the carnival.",
  picker: {
    kind: "location",
    intro: "Same week and same activities at all three. Choose a location, how many days, and any care.",
    footnote: "Siblings: $20 off the 2nd and 3rd child when booked for the full week. All prices plus tax.",
    locations: [
      { id: "sq1", name: "Square One", address: "Sheridan College, 4180 Duke of York Blvd", prices: { week: 370, three: 225, two: 150 }, registerUrl: SQ1 },
      { id: "stv", name: "Streetsville", address: "Streetsville United Church, 274 Queen St S", prices: { week: 350, three: 210, two: 140 }, registerUrl: STV },
      { id: "mw", name: "Mississauga West", address: "3195 The Collegeway", prices: { week: 350, three: 210, two: 140 }, registerUrl: MW },
    ],
    lengths: [
      { id: "week", name: "Full week", sub: "Mon–Fri", days: 5 },
      { id: "three", name: "3 days", sub: "Mon, Wed, Fri", days: 3 },
      { id: "two", name: "2 days", sub: "Tue, Thu", days: 2 },
    ],
    care: [
      { id: "am", name: "Morning care", hours: "7:30–9:00 am", weekPrice: 40, dayPrice: 8 },
      { id: "pm", name: "After care", hours: "4:00–6:00 pm", weekPrice: 40, dayPrice: 8 },
    ],
    themes: [
      { name: "Animal World / Stuff a Bear", ages: "Ages 4–7", blurb: "Crafts, and kids stuff their own teddy to take home" },
      { name: "Lego Robotics", ages: "Ages 5–8, and 9–13 at Streetsville", blurb: "Build Lego models with motors and sensors, and program them to move" },
      { name: "Crafts / Cake Decorating", ages: "Ages 6–7 and 8–12", blurb: "Craft projects plus cake decorating" },
      { name: "STEM", ages: "Ages 8–12", blurb: "STEM projects" },
    ],
  },
  week: [
    { label: "Mon", text: "Theme day + outdoor play" },
    { label: "Tue", text: "Theme day + outdoor play" },
    { label: "Wed", text: "Trip to the Maple Syrup Festival at Bronte Creek: maple tour, farm animals, wagon ride, pancake lunch" },
    { label: "Thu", text: "Hands on Exotics animal show: reptiles, birds and other exotic animals" },
    { label: "Fri", text: "Carnival with games and prizes; pizza and juice lunch included" },
  ],
  weekNote: "Booking 2 days (Tue and Thu) means missing the trip and the carnival. Booking 3 days (Mon, Wed, Fri) means missing the animal show.",
  activities: null,
  costRows: null,
  costNote: null,
  beforeYouGo: [
    { label: "Food", text: "Pack a lunch and 2 snacks every day except Friday, when pizza and juice are included. Wednesday's lunch is pancakes at the festival." },
    { label: "Outside", text: "Kids play outside every day, weather permitting, so dress them for March weather." },
    { label: "Square One", text: "Sheridan College Hazel McCallion Campus, 4180 Duke of York Blvd (across from Square One mall)" },
    { label: "Streetsville", text: "Streetsville United Church, 274 Queen St S. Parking at the back of the church." },
    { label: "Mississauga West", text: "3195 The Collegeway, in the Mississauga Southwest Baseball Association building" },
    { label: "Contact", text: "(905) 465-5165, Mon–Sat 10 am–6 pm" },
  ],
  refunds: [
    { label: "Cancel", text: "By email, at least 2 weeks before the first day of camp." },
    { label: "Admin fee", text: "$40 per child per cancelled week, or $8 per child per cancelled day." },
    { label: "If camp can't run", text: "Full refund." },
    { label: "Tax receipts", text: "In your account on their booking site." },
  ],
  sources: [
    { label: "Square One camp page", url: SQ1, checkedOn: CKP_DAY },
    { label: "Streetsville camp page", url: STV, checkedOn: CKP_DAY },
    { label: "Mississauga West camp page", url: MW, checkedOn: CKP_DAY },
  ],
  registerUrl: SQ1,
  confirmedOn: null,
  priceFrom: "$350 a week + tax",
};

export const BATCH_1: CampListing[] = [
  ksg,
  longos,
  ckp,
  unfilled({
    slug: "gymnastics-mississauga-winter",
    name: "Winter camp",
    provider: "Gymnastics Mississauga",
    breakId: "winter",
    sourceUrl: "https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsJson?OrgID=537009",
    sourceLabel: "Jackrabbit openings feed (OrgID 537009, category Winter Break Camp)",
    registerUrl: null,
  }),
  unfilled({
    slug: "futures-gymnastics-winter",
    name: "Winter camp",
    provider: "Futures Gymnastics",
    breakId: "winter",
    sourceUrl: "https://portal.iclasspro.com/futures/camps/135?sortBy=time",
    sourceLabel: "Futures iClassPro winter camps",
    registerUrl: "https://portal.iclasspro.com/futures/camps/135?sortBy=time",
  }),
  unfilled({
    slug: "futures-gymnastics-march-break",
    name: "March Break camp",
    provider: "Futures Gymnastics",
    breakId: "march_break",
    sourceUrl: "https://portal.iclasspro.com/futures/events/121?sortBy=time",
    sourceLabel: "Futures iClassPro March Break",
    registerUrl: "https://portal.iclasspro.com/futures/events/121?sortBy=time",
  }),
  unfilled({
    slug: "cooksmart-winter",
    name: "Winter camp",
    provider: "COOKSMART",
    breakId: "winter",
    sourceUrl: "https://cooksmartscheduling.as.me/schedule/7b98e4f9/?appointmentTypeIds[]=99733065",
    sourceLabel: "COOKSMART scheduling page",
    registerUrl: "https://cooksmartscheduling.as.me/schedule/7b98e4f9/?appointmentTypeIds[]=99733065",
  }),
  unfilled({
    slug: "visual-arts-mississauga-winter",
    name: "Winter camp",
    provider: "Visual Arts Mississauga",
    breakId: "winter",
    sourceUrl: null,
    sourceLabel: null,
    registerUrl: null,
  }),
  unfilled({
    slug: "city-of-mississauga-winter",
    name: "Winter camp",
    provider: "City of Mississauga",
    breakId: "winter",
    sourceUrl: "https://anc.ca.apm.activecommunities.com/activemississauga/activity/search?onlineSiteId=0&activity_select_param=2&activity_category_ids=49&viewMode=list",
    sourceLabel: "ActiveMississauga camp search",
    registerUrl: "https://anc.ca.apm.activecommunities.com/activemississauga/activity/search?onlineSiteId=0&activity_select_param=2&activity_category_ids=49&viewMode=list",
  }),
  unfilled({
    slug: "exploring-minds-winter",
    name: "Winter camp",
    provider: "Exploring Minds",
    breakId: "winter",
    sourceUrl: "https://exploringminds.ca/services/march-break-summer-camp/",
    sourceLabel: "Exploring Minds camp page (the winter watcher row points here)",
    registerUrl: "https://exploringminds.ca/services/march-break-summer-camp/",
  }),
  unfilled({
    slug: "newtons-grove-march-break",
    name: "March Break camp",
    provider: "Newton's Grove School",
    breakId: "march_break",
    sourceUrl: "https://www.newtonsgroveschool.com/school-programs/extended-programming",
    sourceLabel: "Newton's Grove extended programming page",
    registerUrl: "https://www.newtonsgroveschool.com/school-programs/extended-programming",
  }),
];

export function listingBySlug(slug: string): CampListing | null {
  return BATCH_1.find((item) => item.slug === slug) ?? null;
}

export const BATCH_1_TOKEN_RECORD = {
  batch: 1,
  token: BATCH_1_TOKEN,
  createdOn: BATCH_1_CREATED_ON,
};
