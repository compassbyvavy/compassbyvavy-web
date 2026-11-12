import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampProgram, CampSession, Provider, Venue } from "@/data/camps/types";
import { buildCampPageView, campCost, daysBetween, formatDateRange, isPlusTax } from "@/lib/camps/campPage";

const provider: Provider = {
  id: "prov-cooksmart",
  name: "COOKSMART",
  websiteUrl: "https://www.cooksmart.ca/",
  registrationInfoUrl: "https://www.cooksmart.ca/programs/camps-hub/winter-camp",
};
const venue: Venue = {
  id: "v1",
  name: "COOKSMART Clarkson",
  neighbourhood: "Clarkson",
  addressLine: "1700 Mazo Crescent",
  city: "Mississauga",
  province: "Ontario",
  postalCode: "L5J 1Y8",
};
const program: CampProgram = {
  id: "MSC-0381",
  slug: "cooksmart-winter-holiday-cooking-camp",
  providerId: "prov-cooksmart",
  name: "Winter Holiday Cooking Camp",
  description: "“Holidays are for fun and learning essential life skills!” — COOKSMART",
  primaryCategory: "Culinary",
  secondaryThemes: ["Cooking"],
  policiesSummary: "Cancel in writing.",
};
const FULL = "https://example.com/full";
const HALF = "https://example.com/half";
function s(id: string, start: string, end: string, hours: [string, string], price: number, url: string, extra: Partial<CampSession> = {}): CampSession {
  return {
    id,
    programId: "MSC-0381",
    venueId: "v1",
    startDate: start,
    endDate: end,
    coreHoursStart: hours[0],
    coreHoursEnd: hours[1],
    priceAmount: price,
    priceUnit: "per_day",
    currency: "CAD",
    feeNotes: `$${price} + HST per day (with tax). Snacks and lunch included. Pick only the days you want.`,
    registrationStatus: "registration_open",
    registrationUrl: url,
    sourceUrl: url,
    sourceCheckedDate: "2026-11-11",
    seatAvailability: "confirmed_available",
    ageMin: 5,
    ageMax: 12,
    ...extra,
  };
}
const sessions = [
  s("f1", "2026-12-21", "2026-12-23", ["09:00", "16:00"], 98, FULL),
  s("f2", "2026-12-28", "2026-12-30", ["09:00", "16:00"], 98, FULL),
  s("h1", "2026-12-21", "2026-12-23", ["09:00", "13:30"], 67, HALF),
  s("h2", "2026-12-28", "2026-12-30", ["09:00", "13:30"], 67, HALF),
];
const view = () => buildCampPageView({ program, provider, sessions, venuesById: { v1: venue } });

describe("camp page view", () => {
  it("answers ages, dates, hours and price up front", () => {
    assert.deepEqual(view().answers, [
      { label: "Ages", value: "5–12" },
      { label: "Dates", value: "Dec 21–23 and Dec 28–30" },
      { label: "Hours", value: "9:00–4:00 (half day 9:00–1:30)" },
      { label: "Price", value: "From $67 + HST a day" },
    ]);
  });

  it("splits full and half days, each bookable day by day, with tax shown", () => {
    const [full, half] = view().options;
    assert.equal(full.label, "Full day");
    assert.equal(half.label, "Half day");
    assert.equal(full.priceText, "$98 + HST a day");
    assert.equal(full.withTaxText, "$110.74 with tax");
    assert.equal(full.units.length, 6);
    assert.equal(full.units[0].label, "Mon, Dec 21");
    assert.equal(full.bookUrl, FULL);
    // The price sentence is already in the header, so it isn't repeated in the notes.
    assert.ok(!full.feeNotes.some((n) => n.startsWith("$98")));
    assert.ok(full.feeNotes.includes("Pick only the days you want."));
  });

  it("shows spots with their check date, never as live", () => {
    const v = view();
    assert.deepEqual(v.status, { text: "Spots available · checked Nov 11", tone: "open" });
    assert.equal(v.checked, "Nov 11, 2026");
    const full = buildCampPageView({
      program,
      provider,
      sessions: sessions.map((x) => ({ ...x, seatAvailability: "confirmed_full" as const })),
      venuesById: { v1: venue },
    });
    assert.equal(full.status.text, "Full on every date");
  });

  it("lists what the camp's website doesn't say, instead of guessing", () => {
    assert.deepEqual(view().askTheCamp, ["Before and after care", "What to bring"]);
  });

  it("uses the camp's own themes, and the address in one line", () => {
    const v = view();
    assert.deepEqual(v.themes, ["Cooking"]);
    assert.equal(v.address, "1700 Mazo Crescent, Mississauga, ON L5J 1Y8");
    assert.deepEqual(v.crumb, ["Mississauga", "Camps", "Winter break"]);
  });

  it("handles a camp with no dates posted yet", () => {
    const v = buildCampPageView({
      program: { ...program, policiesSummary: null },
      provider,
      sessions: [s("u", "", "", ["09:00", "16:30"], 80, FULL, { startDate: null, endDate: null, seatAvailability: "unknown", registrationStatus: "availability_unknown" })],
      venuesById: { v1: venue },
    });
    assert.equal(v.datesPosted, false);
    assert.equal(v.answers[1].value, "Not posted yet");
    assert.deepEqual(v.options[0].dates, [
      { text: "Dates not posted yet", spots: { text: "Check spots with the camp", tone: "unknown" }, bookUrl: FULL },
    ]);
    assert.ok(v.askTheCamp.includes("Dates"));
    assert.ok(v.askTheCamp.includes("Cancellation and refunds"));
  });
});

describe("camp cost", () => {
  it("multiplies days by children and adds 13% HST when the price is plus tax", () => {
    assert.deepEqual(campCost({ price: 98, plusTax: true }, 3, 2), { subtotal: 588, tax: 76.44, total: 664.44 });
    assert.deepEqual(campCost({ price: 225, plusTax: false }, 1, 1), { subtotal: 225, tax: 0, total: 225 });
    assert.equal(campCost({ price: 98, plusTax: true }, 0, 1), null);
    assert.equal(campCost({ price: null, plusTax: false }, 2, 1), null);
  });

  it("reads dates and plus-tax wording", () => {
    assert.deepEqual(daysBetween("2026-12-28", "2026-12-30"), ["2026-12-28", "2026-12-29", "2026-12-30"]);
    assert.equal(formatDateRange("2026-12-29", "2027-01-02"), "Dec 29–Jan 2");
    assert.ok(isPlusTax("$225 plus HST per session"));
    assert.ok(!isPlusTax("$375 for the 4-day session. Extended hours included."));
  });
});
