/**
 * Parent-first camp page view model (docs/camps/winter-camp-cards-brief.md and
 * the "Compass camp pages: the parent-first spec").
 *
 * Pure: takes one published program with its provider, sessions and venues and
 * returns everything the page shows, in parent words. Nothing is invented: a
 * fact the camp doesn't publish becomes an entry in `askTheCamp`, never a guess.
 */
import type { CampProgram, CampSession, Provider, Venue } from "@/data/camps/types";

/** Ontario HST. */
export const HST_RATE = 0.13;

export type CampOptionUnit = {
  /** Stable id: session id, or session id + date for per-day pricing. */
  id: string;
  label: string;
  /** ISO date when the unit is one day. */
  date: string | null;
};

export type CampOptionView = {
  key: string;
  /** "Full day", "Half day", or the session's own label when there's one option. */
  label: string;
  hours: string | null;
  minutes: number | null;
  price: number | null;
  /** "a day", "a session", "for the session", … */
  priceUnitText: string;
  plusTax: boolean;
  /** "$98 + HST a day". Null when the camp doesn't publish a usable price. */
  priceText: string | null;
  /** "$110.74 with tax" when the price is plus HST. */
  withTaxText: string | null;
  /** True when each day is booked separately (price per day over a date range). */
  perDay: boolean;
  dates: Array<{ text: string; spots: SpotsView; bookUrl: string | null }>;
  /** Everything parents book: one per day for per-day pricing, else one per session. */
  units: CampOptionUnit[];
  feeNotes: string[];
  bookUrl: string | null;
  care: { before: string | null; after: string | null };
};

export type SpotsView = { text: string; tone: "open" | "full" | "unknown" };

export type CampPageView = {
  title: string;
  providerName: string;
  providerUrl: string | null;
  crumb: string[];
  address: string | null;
  area: string | null;
  lede: string | null;
  themes: string[];
  checked: string | null;
  status: SpotsView;
  answers: Array<{ label: string; value: string }>;
  options: CampOptionView[];
  priceFrom: string | null;
  priceFromNote: string | null;
  experience: string | null;
  policies: string | null;
  notes: string[];
  askTheCamp: string[];
  sources: Array<{ label: string; url: string; checked: string | null }>;
  bookLinks: Array<{ label: string; url: string }>;
  datesPosted: boolean;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseIso(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

/** "Nov 11, 2026" */
export function formatLongDate(iso: string): string {
  const d = parseIso(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Nov 11" */
function shortDate(iso: string): string {
  const d = parseIso(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Dec 21–23", "Dec 29–Jan 2", "Dec 21" */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string | null {
  if (!start) return null;
  const s = parseIso(start);
  if (!end || end === start) return shortDate(start);
  const e = parseIso(end);
  if (s.getUTCMonth() === e.getUTCMonth()) return `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  return `${shortDate(start)}–${shortDate(end)}`;
}

/** Each calendar day from start to end, inclusive. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const e = parseIso(end).getTime();
  for (let t = parseIso(start).getTime(); t <= e && out.length < 62; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** "Mon, Dec 21" */
export function dayLabel(iso: string): string {
  const d = parseIso(iso);
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "09:00" → "9:00"; "16:30" → "4:30" with am/pm left to the range. */
function clock(t: string): { text: string; minutes: number } {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { text: `${h12}:${String(m).padStart(2, "0")}`, minutes: h * 60 + m };
}

/** "9:00–4:00" (am/pm only when the range crosses a period ambiguously is not needed for camp days). */
export function formatHours(start?: string | null, end?: string | null): { text: string | null; minutes: number | null } {
  if (!start) return { text: null, minutes: null };
  const s = clock(start);
  if (!end) return { text: `From ${s.text}`, minutes: null };
  const e = clock(end);
  return { text: `${s.text}–${e.text}`, minutes: e.minutes - s.minutes };
}

export function money(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

/** The camp's fee notes say the price is plus tax. */
export function isPlusTax(feeNotes: string | null | undefined): boolean {
  return /\+\s*HST|plus\s+HST|\+\s*tax|plus\s+tax/i.test(feeNotes ?? "");
}

function unitText(unit: CampSession["priceUnit"]): string {
  switch (unit) {
    case "per_day":
      return "a day";
    case "per_week":
      return "a week";
    case "per_session":
      return "a session";
    case "full_program":
      return "for the program";
    default:
      return "";
  }
}

function spotsFor(s: CampSession): SpotsView {
  const when = s.sourceCheckedDate ? ` · checked ${shortDate(s.sourceCheckedDate)}` : "";
  if (s.seatAvailability === "confirmed_full" || s.registrationStatus === "waitlist") {
    return { text: `Full${s.waitlistUrl ? ", waitlist" : ""}${when}`, tone: "full" };
  }
  if (s.registrationStatus === "registration_closed") return { text: `Registration closed${when}`, tone: "full" };
  if (s.registrationStatus === "not_yet_open") {
    return {
      text: s.registrationOpensOn ? `Registration opens ${shortDate(s.registrationOpensOn)}` : "Registration not open yet",
      tone: "unknown",
    };
  }
  if (s.seatAvailability === "confirmed_available") return { text: `Spots available${when}`, tone: "open" };
  if (s.registrationStatus === "registration_open") return { text: `Registration open${when}`, tone: "open" };
  return { text: "Check spots with the camp", tone: "unknown" };
}

function careText(c: CampSession["beforeCare"], kind: "Before" | "After"): string | null {
  if (!c || c.offered === "unknown") return null;
  if (c.offered === "no") return `No ${kind.toLowerCase()} care`;
  const times = c.startTime && c.endTime ? ` ${formatHours(c.startTime, c.endTime).text}` : "";
  const extra = c.separateBookingRequired === "yes" ? " (extra fee)" : c.separateBookingRequired === "no" ? " (included)" : "";
  return `${kind} care${times}${extra}`;
}

function optionLabel(minutes: number | null, all: Array<number | null>, fallback: string): string {
  const known = all.filter((m): m is number => m != null);
  if (minutes == null || new Set(known).size < 2) return fallback;
  return minutes >= 360 ? "Full day" : "Half day";
}

function sentences(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildCampPageView(args: {
  program: CampProgram;
  provider: Provider;
  sessions: CampSession[];
  venuesById: Record<string, Venue>;
}): CampPageView {
  const { program, provider, venuesById } = args;
  const sessions = [...args.sessions].sort(
    (a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999") || a.id.localeCompare(b.id),
  );
  const venues = [...new Set(sessions.map((s) => s.venueId).filter((v): v is string => Boolean(v)))]
    .map((id) => venuesById[id])
    .filter(Boolean);
  const venue = venues.length === 1 ? venues[0] : null;
  const address = venue
    ? [venue.addressLine, venue.city, [venue.province === "Ontario" ? "ON" : venue.province, venue.postalCode].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ")
    : venues.length > 1
      ? `${venues.length} locations`
      : null;
  const area = venue ? [venue.neighbourhood, venue.city].filter(Boolean).join(", ") || null : null;

  // One option per distinct hours + price + booking link (e.g. full day and half day).
  const groups = new Map<string, CampSession[]>();
  for (const s of sessions) {
    const key = [s.coreHoursStart, s.coreHoursEnd, s.priceAmount, s.priceUnit, s.registrationUrl].join("|");
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const groupMinutes = [...groups.values()].map((g) => formatHours(g[0].coreHoursStart, g[0].coreHoursEnd).minutes);
  const options: CampOptionView[] = [...groups.entries()].map(([key, g], i) => {
    const first = g[0];
    const hours = formatHours(first.coreHoursStart, first.coreHoursEnd);
    const plusTax = g.some((s) => isPlusTax(s.feeNotes));
    const price = first.priceAmount ?? null;
    const perDay = first.priceUnit === "per_day" && g.every((s) => s.startDate && s.endDate);
    const units: CampOptionUnit[] = perDay
      ? g.flatMap((s) => daysBetween(s.startDate!, s.endDate!).map((d) => ({ id: `${s.id}:${d}`, label: dayLabel(d), date: d })))
      : g.filter((s) => s.startDate).map((s) => ({ id: s.id, label: formatDateRange(s.startDate, s.endDate)!, date: null }));
    const fallback = groups.size > 1 ? (first.timingLabel?.split(",")[0] ?? `Option ${i + 1}`) : "Camp";
    return {
      key,
      label: optionLabel(hours.minutes, groupMinutes, fallback),
      hours: hours.text,
      minutes: hours.minutes,
      price,
      priceUnitText: unitText(first.priceUnit),
      plusTax,
      priceText: price != null ? `${money(price)}${plusTax ? " + HST" : ""} ${unitText(first.priceUnit)}`.trim() : null,
      withTaxText: price != null && plusTax ? `${money(Math.round(price * (1 + HST_RATE) * 100) / 100)} with tax` : null,
      perDay,
      dates: g.map((s) => ({
        text: formatDateRange(s.startDate, s.endDate) ?? "Dates not posted yet",
        spots: spotsFor(s),
        bookUrl: s.registrationUrl ?? null,
      })),
      units,
      // A sentence that only restates the price ("$98 + HST per day …") is already in the header.
      feeNotes: [...new Set(g.flatMap((s) => sentences(s.feeNotes)))].filter((n) => !/^\$\d[\d.,]*\s*(\+\s*HST\s*)?per\b/i.test(n)),
      bookUrl: first.registrationUrl ?? provider.registrationInfoUrl ?? null,
      care: { before: careText(first.beforeCare, "Before"), after: careText(first.afterCare, "After") },
    };
  });

  const dated = sessions.filter((s) => s.startDate);
  const datesText = dated.length
    ? [...new Set(dated.map((s) => formatDateRange(s.startDate, s.endDate)))].join(" and ")
    : "Not posted yet";
  const ages = sessions.find((s) => s.ageMin != null || s.ageMax != null);
  const ageText =
    ages && ages.ageMin != null && ages.ageMax != null
      ? `${ages.ageMin}–${ages.ageMax}`
      : ages && ages.ageMin != null
        ? `${ages.ageMin}+`
        : program.typicalAgeMin != null && program.typicalAgeMax != null
          ? `${program.typicalAgeMin}–${program.typicalAgeMax}`
          : null;
  const priced = options.filter((o) => o.price != null);
  const cheapest = priced.sort((a, b) => a.price! - b.price!)[0] ?? null;
  const priceFrom = cheapest ? `${priced.length > 1 || options.length > 1 ? "From " : ""}${money(cheapest.price!)}${cheapest.plusTax ? " + HST" : ""}` : null;
  const priceFromNote = cheapest ? cheapest.priceUnitText || null : null;
  const withHours = options.filter((o) => o.hours);
  const hoursText = withHours.length
    ? withHours[0].hours! +
      (withHours.length > 1
        ? ` (${withHours.slice(1).map((o) => `${o.label.toLowerCase()} ${o.hours}`).join(", ")})`
        : "")
    : "";

  const answers = [
    { label: "Ages", value: ageText ?? "Not stated" },
    { label: "Dates", value: datesText },
    { label: "Hours", value: hoursText || "Not stated" },
    { label: "Price", value: priceFrom ? `${priceFrom}${priceFromNote ? ` ${priceFromNote}` : ""}` : "Check with the camp" },
  ];

  const statusSource = sessions.map(spotsFor);
  const status: SpotsView = statusSource.every((s) => s.tone === "full")
    ? { text: "Full on every date", tone: "full" }
    : statusSource.find((s) => s.tone === "open") ?? statusSource[0] ?? { text: "Check spots with the camp", tone: "unknown" };

  const askTheCamp: string[] = [];
  if (!ageText) askTheCamp.push("Ages");
  if (!dated.length) askTheCamp.push("Dates");
  if (options.some((o) => !o.hours)) askTheCamp.push("Daily hours");
  if (options.some((o) => o.minutes == null && o.hours)) askTheCamp.push("Pick-up time");
  if (!priced.length) askTheCamp.push("Price");
  if (options.every((o) => !o.care.before && !o.care.after)) askTheCamp.push("Before and after care");
  if (!program.packingItems?.length) askTheCamp.push("What to bring");
  if (!program.policiesSummary) askTheCamp.push("Cancellation and refunds");

  const checkedDates = sessions.map((s) => s.sourceCheckedDate).filter((d): d is string => Boolean(d)).sort();
  const sources = new Map<string, { label: string; url: string; checked: string | null }>();
  if (provider.registrationInfoUrl) {
    sources.set(provider.registrationInfoUrl, {
      label: `${provider.name}: camp page`,
      url: provider.registrationInfoUrl,
      checked: checkedDates.length ? formatLongDate(checkedDates.at(-1)!) : null,
    });
  }
  for (const s of sessions) {
    if (s.sourceUrl && !sources.has(s.sourceUrl)) {
      sources.set(s.sourceUrl, {
        label: `${provider.name}: booking page${options.length > 1 ? ` (${options.find((o) => o.key.endsWith(`|${s.registrationUrl}`))?.label.toLowerCase() ?? "session"})` : ""}`,
        url: s.sourceUrl,
        checked: s.sourceCheckedDate ? formatLongDate(s.sourceCheckedDate) : null,
      });
    }
  }

  const bookLinks = options
    .filter((o) => o.bookUrl)
    .map((o) => ({ label: options.length > 1 ? `Book ${o.label.toLowerCase()}` : `Book with ${provider.name}`, url: o.bookUrl! }));

  const notes = [...new Set(sessions.flatMap((s) => sentences(s.notes)))].filter(
    (n) => !/^Every date had spots/i.test(n),
  );

  return {
    title: program.name,
    providerName: provider.name,
    providerUrl: provider.websiteUrl ?? null,
    crumb: ["Mississauga", "Camps", ...(dated.some((s) => s.startDate!.slice(5, 7) === "12" || s.startDate!.slice(5, 7) === "01") ? ["Winter break"] : [])],
    address,
    area,
    lede: program.description ?? null,
    themes: (program.secondaryThemes?.length ? program.secondaryThemes : [program.primaryCategory]).filter(
      (t, i, a): t is string => Boolean(t) && a.indexOf(t) === i,
    ),
    checked: checkedDates.length ? formatLongDate(checkedDates.at(-1)!) : null,
    status,
    answers,
    options,
    priceFrom,
    priceFromNote,
    experience: program.experienceSummary ?? null,
    policies: program.policiesSummary ?? null,
    notes,
    askTheCamp,
    sources: [...sources.values()],
    bookLinks,
    datesPosted: dated.length > 0,
  };
}

/** Cost for a family: price × chosen days or sessions × children, plus HST when the camp says so. */
export function campCost(option: Pick<CampOptionView, "price" | "plusTax">, units: number, children: number) {
  if (option.price == null || units <= 0 || children <= 0) return null;
  const subtotal = Math.round(option.price * units * children * 100) / 100;
  const tax = option.plusTax ? Math.round(subtotal * HST_RATE * 100) / 100 : 0;
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}
