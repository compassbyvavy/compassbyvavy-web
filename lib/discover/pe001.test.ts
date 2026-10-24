import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VenueDetail } from "@/components/discover/VenueDetail";
import {
  PE001_BOOKINGS,
  PE001_LAST_RESEARCHED,
  pe001AmazingFunPark as pe001,
} from "@/data/discover/venues/pe001AmazingFunPark";
import { previewAsPublished } from "@/lib/discover/venuesCatalog";
import {
  buildVenueDetailView,
  dayPriceRows,
  familyPrice,
  isVenuePubliclyViewable,
  resolvePublicVenue,
  ticketForAge,
} from "@/lib/discover/venueDetail";
import { venueRecordToRows } from "@/lib/discover/venueRows";
import { buildVenuePublishSql, buildVenueSeedSql } from "@/lib/discover/venueSeedSql";
import { mapVenueRow } from "@/lib/discover/venuesSupabase";

const TODAY = "2026-10-24";
const preview = previewAsPublished(pe001);
const view = () => buildVenueDetailView(preview, { today: TODAY });
const html = () => renderToStaticMarkup(createElement(VenueDetail, { view: view() }));

describe("PE-001 Amazing Fun Park record", () => {
  it("is stored as an open draft that only a preview can show", () => {
    assert.equal(pe001.place.id, "PE-001");
    assert.equal(pe001.place.publicationState, "draft");
    assert.equal(pe001.place.publishedAt, null);
    assert.equal(isVenuePubliclyViewable(pe001), false);
    assert.equal(isVenuePubliclyViewable(preview), true);
    assert.equal(resolvePublicVenue([preview], "play", "amazing-fun-park")?.place.id, "PE-001");
    assert.equal(pe001.place.sourceCheckedDate, PE001_LAST_RESEARCHED);
  });

  it("cites the venue's own pages for every fact", () => {
    const facts = [
      ...pe001.types, ...pe001.ageBands, ...pe001.activities, ...pe001.prices,
      ...pe001.amenities, ...pe001.policies, ...pe001.links,
    ];
    assert.ok(facts.every((f) => f.sourceUrl.startsWith("https://amazingfunpark.ca/")));
    assert.ok(facts.every((f) => f.sourceCheckedDate === PE001_LAST_RESEARCHED));
    assert.ok(pe001.hours.every((h) => h.sourceUrl?.startsWith("https://amazingfunpark.ca/")));
  });

  it("records nothing the venue doesn't publish", () => {
    const kinds = pe001.amenities.map((a) => a.amenity);
    for (const missing of ["parking", "washrooms", "change_table"] as const) {
      assert.ok(!kinds.includes(missing), missing);
    }
    assert.deepEqual(pe001.reviewSources, []);
    assert.deepEqual(pe001.experienceThemes, []);
  });
});

describe("PE-001 page", () => {
  it("leads with the good-to-know strip, all from verified prices", () => {
    assert.deepEqual(view().goodToKnow, [
      "Best for ages 4–12",
      "Babies 23 months and under free",
      "2 hours · every attraction and 1 adult included",
      "Save $5 per child on weekdays",
    ]);
  });

  it("shows admission as a weekday / weekend table", () => {
    const rows = view().admissionRows!;
    assert.deepEqual(rows.map((r) => r.label), ["Babies 23 months and under", "Ages 2–3", "Ages 4 and up", "Teens 15–17", "Extra adult"]);
    const four = rows.find((r) => r.label === "Ages 4 and up")!;
    assert.equal(four.weekday?.amount, "$34.95");
    assert.equal(four.weekend?.amount, "$39.95");
    assert.equal(rows.find((r) => r.label === "Extra adult")!.anyDay?.amount, "$9.95");
  });

  it("keeps parties in their own section, with day-specific notes", () => {
    const v = view();
    assert.ok(!v.otherPrices.some((s) => s.kind === "party"));
    const ten = v.parties.rows!.find((r) => r.label === "10 kids + 10 adults")!;
    assert.equal(ten.weekday?.amount, "$499");
    assert.equal(ten.weekend?.amount, "$599");
    assert.ok(ten.details.includes("2 large pizzas"));
    assert.ok(ten.details.includes("Weekdays: extra child with an adult $49.95"));
    assert.ok(ten.details.includes("Weekends: extra child with an adult $59.95"));
    assert.ok(v.parties.rules.some((r) => /dedicated party host/.test(r.text)));
  });

  it("flags the membership price the venue's pages disagree on", () => {
    const unlimited = view().otherPrices.flatMap((s) => s.lines).find((l) => l.id === "pe001-unlimited")!;
    assert.equal(unlimited.amount, "$99.99");
    assert.match(unlimited.meta.conflict ?? "", /\$99\.95/);
  });

  it("names everyday details still to check with the venue", () => {
    assert.deepEqual(view().checkWithVenue, ["Parking", "Washrooms", "Baby changing"]);
  });

  it("builds a tick-off list from verified rules, including cashless payment and strollers", () => {
    const list = view().beforeYouGo;
    assert.ok(list.some((i) => /waiver/i.test(i)));
    assert.ok(list.some((i) => /grip socks/i.test(i)));
    assert.ok(list.some((i) => /Cashless/.test(i)));
    assert.ok(list.some((i) => /^Strollers: Not allowed in the play area/.test(i)));
  });

  it("links the header button to the booking page and renders without empty labels", () => {
    assert.equal(view().primaryBooking?.href, PE001_BOOKINGS);
    const page = html();
    assert.match(page, /Will it suit my kids\?/);
    assert.match(page, /Illustration · venue photos coming soon/);
    assert.match(page, /Check with the venue:/);
    assert.match(page, /Birthday parties/);
    assert.doesNotMatch(page, /<dd><\/dd>|<li><\/li>|<p><\/p>|undefined|NaN/);
  });
});

describe("PE-001 family price preview", () => {
  const model = () => view().familyPrice!;

  it("picks the narrowest ticket that fits each age, by day", () => {
    const m = model();
    assert.equal(ticketForAge(m, 1, "weekday")?.label, "Babies 23 months and under");
    assert.equal(ticketForAge(m, 3, "weekday")?.amount, "$24.95");
    assert.equal(ticketForAge(m, 13, "weekend_holiday")?.label, "Ages 4 and up");
    assert.equal(ticketForAge(m, 16, "weekend_holiday")?.label, "Teens 15–17");
  });

  it("prices a family with the adults their tickets include", () => {
    const r = familyPrice(model(), { ages: [5, 2], adults: 2, day: "weekday" });
    assert.equal(r.total, 59.9);
    assert.equal(r.adultsIncluded, 2);
    assert.equal(r.extraAdults, 0);
    assert.equal(r.withTax, 67.69);
  });

  it("lets babies in free and charges adults the tickets don't cover", () => {
    const r = familyPrice(model(), { ages: [1], adults: 1, day: "weekend_holiday" });
    assert.equal(r.total, 9.95);
    assert.equal(r.extraAdults, 1);
    const three = familyPrice(model(), { ages: [6, 8, 0], adults: 3, day: "weekend_holiday" });
    assert.equal(three.total, 89.85);
    assert.deepEqual(three.packages.map((p) => p.label), ["Family Bundle"]);
  });

  it("offers the weekend Family Bundle only on weekends", () => {
    assert.deepEqual(familyPrice(model(), { ages: [6, 8, 10], adults: 2, day: "weekday" }).packages, []);
  });
});

describe("PE-001 seed", () => {
  it("round-trips through the table rows and the production mapper", () => {
    const { place, children } = venueRecordToRows(preview);
    const row = {
      ...place,
      cities: { city_town: "Mississauga" },
      ...Object.fromEntries(Object.entries(children).map(([t, list]) => [t, list.map((r, i) => ({ ...r, id: `id-${i}` }))])),
    };
    const back = mapVenueRow(row);
    const wke4 = back.prices.find((p) => p.label === "Ages 4 and up" && p.dayType === "weekend_holiday");
    assert.equal(wke4?.amount, 39.95);
    assert.equal(wke4?.adultsIncluded, 1);
    assert.equal(back.policies.filter((p) => p.kind === "party").length, 7);
    const fromDb = buildVenueDetailView(back, { today: TODAY });
    assert.deepEqual(fromDb.goodToKnow, view().goodToKnow);
  });

  it("loads a draft with day types and keeps publishing separate", () => {
    const sql = buildVenueSeedSql(pe001, {
      id: "mississauga", country: "Canada", provinceState: "Ontario", cityTown: "Mississauga", slug: "mississauga", tourismRegion: "5",
    });
    assert.match(sql, /'draft'::public\.publication_state/);
    assert.doesNotMatch(sql, /'published'/);
    assert.match(sql, /'weekend_holiday'/);
    assert.match(buildVenuePublishSql(pe001), /where id = 'PE-001'/);
  });
});

describe("PE-001 day rows helper", () => {
  it("returns null when no price is tied to a day", () => {
    assert.equal(dayPriceRows(view().otherPrices.find((s) => s.kind === "membership")!.lines), null);
  });
});

describe("Cloudflare preview URLs", () => {
  const base = { venueSlug: "amazing-fun-park", nodeEnv: "production", supabase: null } as const;

  it("show the bannered draft preview only with the flag and a preview hostname", async () => {
    const { loadVenueCatalog } = await import("@/lib/discover/venuesCatalog");
    const preview = await loadVenueCatalog({
      ...base,
      reviewFlag: "true",
      hostname: "discover-afp-pe001-page-compassbyvavy-web.compassbyvavy.workers.dev",
    });
    assert.equal(preview?.sourceLabel, "dev_preview");
    assert.ok(preview?.records.some((r) => r.place.id === "PE-001"));
  });

  it("stay closed on the production site, without the flag, or without a host", async () => {
    const { loadVenueCatalog } = await import("@/lib/discover/venuesCatalog");
    assert.equal(await loadVenueCatalog({ ...base, reviewFlag: "true", hostname: "compassbyvavy.ca" }), null);
    assert.equal(await loadVenueCatalog({ ...base, reviewFlag: "true", hostname: "compassbyvavy-web.compassbyvavy.workers.dev" }), null);
    assert.equal(await loadVenueCatalog({ ...base, reviewFlag: "false", hostname: "x-compassbyvavy-web.compassbyvavy.workers.dev" }), null);
    assert.equal(await loadVenueCatalog({ ...base, reviewFlag: "true" }), null);
  });
});
