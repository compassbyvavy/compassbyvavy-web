/**
 * Indoor Play derived-filter tests.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { indoorPlayDevVenues } from "@/data/play/fixtures.dev";
import type {
  IndoorPlayHoursRow,
  IndoorPlayVenue,
  IndoorPlayWeeklyHours,
  IsoWeekday,
} from "@/data/play/types";
import {
  EMPTY_INDOOR_PLAY_FILTERS,
  INDOOR_PLAY_LISTING_PATH,
  bookingOnlyLabel,
  buildIndoorPlayHref,
  buildIndoorPlayResults,
  countActiveFilters,
  deriveAgeGroups,
  deriveAdults,
  deriveGoodForToddlers,
  deriveMixedAges,
  derivePriceBand,
  deriveRainyWeekdayMorning,
  deriveWhen,
  formatHoursCheckedAt,
  formatIndoorPlayCounts,
  formatWeekdayChildPrice,
  formatWeeklyHoursSummary,
  indoorPlayEmptyCopy,
  listActiveFilterChips,
  parseIndoorPlayHrefSearch,
  removeActiveFilterChip,
  venueIsIncluded,
  venueMatchesFilters,
  type IndoorPlayFilters,
} from "@/lib/play/indoorPlayFilter";

const CHECKED = "2026-10-12";
const SRC = "https://example.org/indoor-play/test";

function price(
  amount: number | null,
  isFree = false,
): IndoorPlayVenue["weekdayChildPrice"] {
  return { amount, isFree, checkedAt: CHECKED, sourceUrl: SRC };
}

function hours(
  rows: IndoorPlayHoursRow[],
): IndoorPlayWeeklyHours {
  return { rows, checkedAt: CHECKED, sourceUrl: SRC };
}

function daily(
  opensAt: string,
  closesAt: string,
  weekdays: readonly IsoWeekday[],
  extra?: Pick<IndoorPlayHoursRow, "closesNextDay">,
): IndoorPlayHoursRow[] {
  return weekdays.map((weekday) => ({
    weekday,
    opensAt,
    closesAt,
    ...extra,
  }));
}

function venue(partial: Partial<IndoorPlayVenue> = {}): IndoorPlayVenue {
  return {
    code: "PE-990",
    name: "Test Venue",
    slug: "test-venue",
    address: "1 Example St, Mississauga ON",
    status: "open",
    publish: false,
    checkedAt: CHECKED,
    adminNotes: "test",
    ageMinMonths: null,
    ageMaxYears: null,
    hardMinimumAge: null,
    ageGroupsOverride: null,
    weekdayChildPrice: price(20, false),
    adultPrice: null,
    weeklyHours: null,
    paDayHours: null,
    visitMode: null,
    area: null,
    activities: [],
    hasToddlerZone: null,
    hasToddlerTime: null,
    hasCafe: null,
    outsideFoodAllowed: null,
    gripSocksRequired: null,
    socksSoldOnSite: null,
    hostsParties: null,
    sessionType: null,
    sensoryFriendly: null,
    ...partial,
  };
}

function filters(partial: Partial<IndoorPlayFilters> = {}): IndoorPlayFilters {
  return { ...EMPTY_INDOOR_PLAY_FILTERS, ...partial };
}

const cedarNook = indoorPlayDevVenues.find((v) => v.code === "PE-901")!;
const northQuay = indoorPlayDevVenues.find((v) => v.code === "PE-902")!;
const privateLoft = indoorPlayDevVenues.find((v) => v.code === "PE-903")!;
const heightGate = indoorPlayDevVenues.find((v) => v.code === "PE-904")!;

describe("derivePriceBand", () => {
  it("maps $15, $25, and $35 onto the inclusive lower edges", () => {
    assert.equal(derivePriceBand(venue({ weekdayChildPrice: price(15) })), "15_25");
    assert.equal(derivePriceBand(venue({ weekdayChildPrice: price(25) })), "25_35");
    assert.equal(derivePriceBand(venue({ weekdayChildPrice: price(35) })), "35_plus");
  });

  it("treats verified isFree as Free even when amount is 0", () => {
    assert.equal(
      derivePriceBand(venue({ weekdayChildPrice: price(0, true) })),
      "free",
    );
  });

  it("treats a missing amount as Call for price, not Free", () => {
    assert.equal(
      derivePriceBand(venue({ weekdayChildPrice: price(null, false) })),
      "call_for_price",
    );
  });

  it("places $0 without isFree under $15, and $14.99 under $15", () => {
    assert.equal(derivePriceBand(venue({ weekdayChildPrice: price(0) })), "under_15");
    assert.equal(
      derivePriceBand(venue({ weekdayChildPrice: price(14.99) })),
      "under_15",
    );
  });

  it("uses the PE-901 / PE-902 fixture facts", () => {
    assert.equal(derivePriceBand(cedarNook), "free");
    assert.equal(derivePriceBand(northQuay), "call_for_price");
  });
});

describe("deriveAgeGroups", () => {
  it("overlaps bands at shared edges (3–5 is Toddlers and Preschool)", () => {
    assert.deepEqual(
      deriveAgeGroups(venue({ ageMinMonths: 36, ageMaxYears: 5 })),
      ["toddlers", "preschool", "kids"],
    );
  });

  it("drops Toddlers and Preschool when hardMinimumAge is 6", () => {
    assert.deepEqual(
      deriveAgeGroups(
        venue({
          ageMinMonths: 36,
          ageMaxYears: 12,
          hardMinimumAge: 6,
        }),
      ),
      ["kids", "big_kids", "tweens_teens"],
    );
    assert.deepEqual(deriveAgeGroups(northQuay), [
      "kids",
      "big_kids",
      "tweens_teens",
    ]);
  });

  it("uses ageGroupsOverride for a height-only rule and does not invent a range", () => {
    assert.deepEqual(deriveAgeGroups(heightGate), ["kids", "big_kids"]);
    assert.equal(heightGate.ageMinMonths, null);
    assert.equal(heightGate.ageMaxYears, null);
  });

  it("returns no groups when ages are unknown and there is no override", () => {
    assert.deepEqual(deriveAgeGroups(venue()), []);
  });
});

describe("deriveWhen — weekday mornings", () => {
  it("counts a 10:00 weekday open as a weekday morning", () => {
    const v = venue({
      weeklyHours: hours(daily("10:00", "18:00", [1, 2, 3, 4, 5])),
    });
    assert.ok(deriveWhen(v).includes("weekday_mornings"));
  });

  it("does not count a venue whose earliest weekday opening is exactly 12:00", () => {
    const noonOpen = venue({
      code: "PE-991",
      name: "Noon Gate (test)",
      weeklyHours: hours([
        ...daily("12:00", "18:00", [1, 2, 3, 4, 5]),
        ...daily("09:00", "17:00", [6, 7]),
      ]),
    });
    assert.equal(
      deriveWhen(noonOpen).includes("weekday_mornings"),
      false,
      "12:00 is the morning miss — open before 12:00 is required",
    );
    assert.ok(deriveWhen(noonOpen).includes("weekends"));
    assert.equal(deriveRainyWeekdayMorning(noonOpen), false);
  });

  it("does not treat a weekend-only 09:00 open as a weekday morning", () => {
    const v = venue({
      weeklyHours: hours(daily("09:00", "17:00", [6, 7])),
    });
    assert.equal(deriveWhen(v).includes("weekday_mornings"), false);
  });
});

describe("deriveWhen — after school", () => {
  it("matches a weekday row that overlaps 15:30–17:30 without covering it", () => {
    const overlapOnly = venue({
      weeklyHours: hours(daily("16:00", "17:00", [1])),
    });
    assert.ok(deriveWhen(overlapOnly).includes("after_school"));
  });

  it("does not match a weekday row that only touches a boundary", () => {
    const closesAtWindowStart = venue({
      weeklyHours: hours(daily("10:30", "15:30", [1])),
    });
    const opensAtWindowEnd = venue({
      weeklyHours: hours(daily("17:30", "19:00", [2])),
    });
    assert.equal(deriveWhen(closesAtWindowStart).includes("after_school"), false);
    assert.equal(deriveWhen(opensAtWindowEnd).includes("after_school"), false);
  });

  it("does not use a Saturday overlap as after school", () => {
    const v = venue({
      weeklyHours: hours(daily("15:00", "18:00", [6])),
    });
    assert.equal(deriveWhen(v).includes("after_school"), false);
  });
});

describe("deriveWhen — evenings", () => {
  it("is still open after 19:00, not merely opening at 19:00", () => {
    const closesAtNineteen = venue({
      weeklyHours: hours(daily("10:00", "19:00", [1])),
    });
    const stillOpenAfter = venue({
      weeklyHours: hours(daily("10:00", "19:01", [1])),
    });
    const lateOpen = venue({
      weeklyHours: hours(daily("19:00", "21:00", [5])),
    });
    assert.equal(deriveWhen(closesAtNineteen).includes("evenings"), false);
    assert.ok(deriveWhen(stillOpenAfter).includes("evenings"));
    assert.ok(
      deriveWhen(lateOpen).includes("evenings"),
      "19:00–21:00 is evenings because it stays open after 19:00",
    );
  });

  it("counts a closesNextDay row as Evenings (GlowZone-style 10:00–00:30)", () => {
    const glow = venue({
      weeklyHours: hours([
        {
          weekday: 6,
          opensAt: "10:00",
          closesAt: "00:30",
          closesNextDay: true,
        },
      ]),
    });
    const when = deriveWhen(glow);
    assert.ok(when.includes("evenings"));
    assert.ok(when.includes("weekends"));
    assert.equal(when.includes("weekday_mornings"), false);
    assert.equal(when.includes("after_school"), false);
  });
});

describe("deriveWhen — split weekday rows", () => {
  it("treats the venue as open if either row matches the window", () => {
    const splitFriday = venue({
      weeklyHours: hours([
        { weekday: 5, opensAt: "10:30", closesAt: "14:30" },
        { weekday: 5, opensAt: "15:30", closesAt: "20:00" },
      ]),
    });
    const when = deriveWhen(splitFriday);
    assert.ok(when.includes("weekday_mornings"), "10:30 Friday is a morning");
    assert.ok(when.includes("after_school"), "15:30–20:00 overlaps after school");
    assert.ok(when.includes("evenings"), "closes 20:00, after 19:00");
  });

  it("does not require both split rows to cover the same window", () => {
    const morningOnlyPlusEvening = venue({
      weeklyHours: hours([
        { weekday: 1, opensAt: "10:30", closesAt: "14:30" },
        { weekday: 1, opensAt: "19:30", closesAt: "21:00" },
      ]),
    });
    const when = deriveWhen(morningOnlyPlusEvening);
    assert.ok(when.includes("weekday_mornings"));
    assert.equal(when.includes("after_school"), false);
    assert.ok(when.includes("evenings"));
  });
});

describe("dev fixtures when-windows", () => {
  it("marks daytimeHours (PE-902/903) as evenings via the Friday 20:00 close", () => {
    assert.ok(deriveWhen(northQuay).includes("weekday_mornings"));
    assert.ok(deriveWhen(northQuay).includes("after_school"));
    assert.ok(deriveWhen(northQuay).includes("weekends"));
    assert.ok(deriveWhen(northQuay).includes("evenings"));
    assert.deepEqual(deriveWhen(northQuay), deriveWhen(privateLoft));
  });

  it("marks earlyAndLateHours Saturday 00:30 closesNextDay as evenings", () => {
    assert.ok(deriveWhen(cedarNook).includes("evenings"));
    assert.ok(deriveWhen(heightGate).includes("evenings"));
  });
});

describe("combined shortcuts", () => {
  it("mixed ages needs Toddlers plus a school-age band", () => {
    assert.equal(deriveMixedAges(cedarNook), true);
    assert.equal(deriveMixedAges(northQuay), false);
    assert.equal(deriveMixedAges(heightGate), false);
    assert.equal(
      deriveMixedAges(venue({ ageGroupsOverride: ["toddlers", "preschool"] })),
      false,
    );
    assert.equal(
      deriveMixedAges(venue({ ageGroupsOverride: ["toddlers", "kids"] })),
      true,
    );
  });

  it("rainy weekday morning is mornings plus Free or Under $15", () => {
    assert.equal(deriveRainyWeekdayMorning(cedarNook), true);
    assert.equal(deriveRainyWeekdayMorning(northQuay), false);
    const cheapAfternoon = venue({
      weekdayChildPrice: price(10),
      weeklyHours: hours(daily("13:00", "18:00", [1, 2, 3, 4, 5])),
    });
    assert.equal(deriveRainyWeekdayMorning(cheapAfternoon), false);
    const cheapMorning = venue({
      weekdayChildPrice: price(10),
      weeklyHours: hours(daily("10:00", "16:00", [1])),
    });
    assert.equal(deriveRainyWeekdayMorning(cheapMorning), true);
  });
});

describe("other derivers", () => {
  it("good for toddlers is zone OR time; unknown is not yes", () => {
    assert.equal(deriveGoodForToddlers(cedarNook), true);
    assert.equal(deriveGoodForToddlers(venue()), false);
    assert.equal(
      deriveGoodForToddlers(venue({ hasToddlerZone: false, hasToddlerTime: null })),
      false,
    );
    assert.equal(
      deriveGoodForToddlers(venue({ hasToddlerZone: false, hasToddlerTime: true })),
      true,
    );
  });

  it("adults: included/free vs pays; unknown stays null", () => {
    assert.equal(deriveAdults(venue()), null);
    assert.equal(
      deriveAdults(
        venue({
          adultPrice: {
            amount: 12,
            isFree: false,
            includedWithChild: true,
            checkedAt: CHECKED,
            sourceUrl: SRC,
          },
        }),
      ),
      "adult_free",
    );
    assert.equal(
      deriveAdults(
        venue({
          adultPrice: {
            amount: 8,
            isFree: false,
            includedWithChild: false,
            checkedAt: CHECKED,
            sourceUrl: SRC,
          },
        }),
      ),
      "adult_pays",
    );
    assert.equal(
      deriveAdults(
        venue({
          adultPrice: {
            amount: null,
            isFree: false,
            includedWithChild: false,
            checkedAt: CHECKED,
            sourceUrl: SRC,
          },
        }),
      ),
      null,
    );
  });
});

describe("inclusion", () => {
  it("never lists closed venues", () => {
    const closed = venue({ status: "closed", publish: true });
    assert.equal(venueIsIncluded(closed), false);
    assert.equal(
      buildIndoorPlayResults([closed], EMPTY_INDOOR_PLAY_FILTERS).count,
      0,
    );
  });

  it("lists booking_only with a Booking only label", () => {
    assert.equal(venueIsIncluded(privateLoft), true);
    assert.equal(bookingOnlyLabel(privateLoft.status), "Booking only");
    assert.ok(
      buildIndoorPlayResults(indoorPlayDevVenues, EMPTY_INDOOR_PLAY_FILTERS)
        .matches.some((v) => v.code === "PE-903"),
    );
  });

  it("hides needs_check unless publish is true", () => {
    const hidden = venue({ status: "needs_check", publish: false });
    const shown = venue({ status: "needs_check", publish: true, name: "Shown" });
    assert.equal(venueIsIncluded(hidden), false);
    assert.equal(venueIsIncluded(shown), true);
    assert.deepEqual(
      buildIndoorPlayResults([hidden, shown], EMPTY_INDOOR_PLAY_FILTERS).matches.map(
        (v) => v.name,
      ),
      ["Shown"],
    );
  });

  it("keeps a Call for price venue in the list", () => {
    assert.equal(venueIsIncluded(northQuay), true);
    const priced = buildIndoorPlayResults(indoorPlayDevVenues, filters({
      priceBand: "call_for_price",
    }));
    assert.deepEqual(
      priced.matches.map((v) => v.code),
      ["PE-902"],
    );
  });

  it("lists the four open/booking_only fixtures when no filters apply", () => {
    const results = buildIndoorPlayResults(
      indoorPlayDevVenues,
      EMPTY_INDOOR_PLAY_FILTERS,
    );
    assert.equal(results.count, 4);
    assert.equal(formatIndoorPlayCounts(results), "4 places");
  });
});

describe("venueMatchesFilters", () => {
  it("ORs within a multi-select and ANDs across dimensions", () => {
    const trampolineOrClimb = filters({
      activities: ["trampoline", "climbing"],
    });
    assert.equal(venueMatchesFilters(northQuay, trampolineOrClimb), true);
    assert.equal(venueMatchesFilters(heightGate, trampolineOrClimb), true);
    assert.equal(venueMatchesFilters(cedarNook, trampolineOrClimb), false);

    const climbAndFree = filters({
      activities: ["climbing"],
      priceBand: "free",
    });
    assert.equal(venueMatchesFilters(privateLoft, climbAndFree), false);
    assert.equal(venueMatchesFilters(cedarNook, climbAndFree), false);
  });

  it("does not treat unknown manual flags as yes", () => {
    assert.equal(
      venueMatchesFilters(venue(), filters({ goodForToddlers: true })),
      false,
    );
    assert.equal(
      venueMatchesFilters(venue(), filters({ parties: true })),
      false,
    );
    assert.equal(
      venueMatchesFilters(venue(), filters({ sensoryFriendly: true })),
      false,
    );
    assert.equal(
      venueMatchesFilters(venue(), filters({ food: ["cafe"] })),
      false,
    );
  });
});

describe("chips and URL sync", () => {
  const full: IndoorPlayFilters = {
    ageGroups: ["toddlers", "kids"],
    priceBand: "under_15",
    when: ["weekday_mornings", "evenings"],
    visitMode: "walk_in",
    area: "city_centre",
    activities: ["soft_play", "arcade"],
    goodForToddlers: true,
    adults: "adult_free",
    food: ["cafe"],
    socks: ["grip_required"],
    parties: true,
    sessionType: "timed_session",
    sensoryFriendly: true,
    mixedAges: true,
    rainyWeekdayMorning: true,
  };

  it("counts each active dimension once", () => {
    assert.equal(countActiveFilters(EMPTY_INDOOR_PLAY_FILTERS), 0);
    assert.equal(countActiveFilters(full), 15);
    assert.equal(countActiveFilters(filters({ ageGroups: ["babies", "kids"] })), 1);
  });

  it("round-trips a full filter state through the preview URL", () => {
    const href = buildIndoorPlayHref({ filters: full });
    assert.match(href, new RegExp(`^${INDOOR_PLAY_LISTING_PATH}\\?`));
    assert.doesNotMatch(href, /sourceUrl|adminNotes|example\.org/);
    const parsed = parseIndoorPlayHrefSearch(href.replace(INDOOR_PLAY_LISTING_PATH, ""));
    assert.deepEqual(parsed.filters, full);
  });

  it("ignores unknown query keys and invalid enums", () => {
    const parsed = parseIndoorPlayHrefSearch(
      "age=toddlers,not_an_age&price=cheap&when=evenings&visit=teleport&mixed=1",
    );
    assert.deepEqual(parsed.filters.ageGroups, ["toddlers"]);
    assert.equal(parsed.filters.priceBand, null);
    assert.deepEqual(parsed.filters.when, ["evenings"]);
    assert.equal(parsed.filters.visitMode, null);
    assert.equal(parsed.filters.mixedAges, true);
  });

  it("lists removable chips and removeActiveFilterChip clears one dimension", () => {
    const chips = listActiveFilterChips(full);
    assert.ok(chips.some((c) => c.id === "mixed" && c.label === "Mixed ages"));
    assert.ok(
      chips.some((c) => c.id === "rainy" && c.label === "Rainy weekday morning"),
    );
    const withoutRainy = removeActiveFilterChip(full, "rainy");
    assert.equal(withoutRainy.rainyWeekdayMorning, false);
    assert.equal(withoutRainy.mixedAges, true);
    const withoutAge = removeActiveFilterChip(full, "age:toddlers");
    assert.deepEqual(withoutAge.ageGroups, ["kids"]);
  });

  it("empty filters serialize to the bare preview path", () => {
    assert.equal(
      buildIndoorPlayHref({ filters: EMPTY_INDOOR_PLAY_FILTERS }),
      INDOOR_PLAY_LISTING_PATH,
    );
  });
});

describe("card copy", () => {
  it("summarizes weekly hours, including split days and closesNextDay", () => {
    assert.equal(
      formatWeeklyHoursSummary(northQuay.weeklyHours),
      "Mon–Thu 10–6 · Fri 10:30–2:30, 3:30–8 · Sat–Sun 9–5",
    );
    assert.equal(
      formatWeeklyHoursSummary(cedarNook.weeklyHours),
      "Mon–Fri 9–8 · Sat 10 a.m.–12:30 a.m. · Sun 9–8",
    );
    assert.equal(formatHoursCheckedAt("2026-10-12"), "as of Oct 12, 2026");
    assert.doesNotMatch(formatHoursCheckedAt("2026-10-12"), /Open now/i);
  });

  it("shows the weekday child price, not the filter band", () => {
    assert.equal(formatWeekdayChildPrice(cedarNook.weekdayChildPrice), "Free");
    assert.equal(
      formatWeekdayChildPrice(northQuay.weekdayChildPrice),
      "Call for price",
    );
    assert.equal(
      formatWeekdayChildPrice(heightGate.weekdayChildPrice),
      "$22 per child",
    );
    assert.equal(
      formatWeekdayChildPrice(privateLoft.weekdayChildPrice),
      "$29 per child",
    );
  });

  it("names one filter to loosen in the empty state", () => {
    assert.match(
      indoorPlayEmptyCopy(filters({ priceBand: "free" })),
      /Try clearing Free/,
    );
  });
});
