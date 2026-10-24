import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VenueDetail } from "@/components/discover/VenueDetail";
import {
  PE001_LAST_RESEARCHED,
  PE001_TICKETS,
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
  it("leads with four quick facts, all from verified prices", () => {
    const v = view();
    assert.deepEqual(v.quickFacts, [
      { label: "Best ages", value: "4–12" },
      { label: "Babies", value: "Under 2 free" },
      { label: "Visit length", value: "2 hours" },
      { label: "Ages 4–14", value: "$34.95–$39.95" },
    ]);
    assert.equal(v.quickNote, "One adult included per paid child.");
    assert.equal(v.priceFrom, "$34.95–$39.95");
  });

  it("shows admission as a weekday / weekend table", () => {
    const rows = view().admissionRows!;
    assert.deepEqual(rows.map((r) => r.label), ["Babies 23 months and under", "Ages 2–3", "Ages 4–14", "Teens 15–17", "Extra adult"]);
    const four = rows.find((r) => r.label === "Ages 4–14")!;
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

  it("shows the AFP Unlimited price the founder confirmed", () => {
    const unlimited = view().otherPrices.flatMap((s) => s.lines).find((l) => l.id === "pe001-unlimited")!;
    assert.equal(unlimited.amount, "$99.99");
    assert.equal(unlimited.meta.conflict, null);
  });

  it("names everyday details still to check with the venue", () => {
    assert.deepEqual(view().checkWithVenue, ["Parking", "Washrooms", "Baby changing"]);
  });

  it("builds a tick-off list from verified rules, including cashless payment and a baby carrier", () => {
    const list = view().beforeYouGo;
    assert.ok(list.some((i) => /waiver/i.test(i)));
    assert.ok(list.some((i) => /grip socks/i.test(i)));
    assert.ok(list.some((i) => /Cashless/.test(i)));
    assert.ok(list.includes("Strollers are not allowed in the play area. Bring a baby carrier if required."));
  });

  it("links the header button to the booking page and renders without empty labels", () => {
    assert.equal(view().primaryBooking?.href, PE001_TICKETS);
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
    assert.equal(ticketForAge(m, 13, "weekend_holiday")?.label, "Ages 4–14");
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
    const wke4 = back.prices.find((p) => p.label === "Ages 4–14" && p.dayType === "weekend_holiday");
    assert.equal(wke4?.amount, 39.95);
    assert.equal(wke4?.adultsIncluded, 1);
    assert.equal(back.policies.filter((p) => p.kind === "party").length, 7);
    const fromDb = buildVenueDetailView(back, { today: TODAY });
    assert.deepEqual(fromDb.quickFacts, view().quickFacts);
    assert.equal(fromDb.overview.compassTake, view().overview.compassTake);
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

describe("PE-001 review fixes", () => {
  it("recommends the Family Bundle only when it covers the group for less", () => {
    const m = view().familyPrice!;
    const three = familyPrice(m, { ages: [6, 8, 10], adults: 2, day: "weekend_holiday" });
    assert.equal(three.total, 119.85);
    assert.deepEqual(three.better, { label: "Family Bundle", amount: "$99.95", total: 99.95, saving: 19.9, includes: "3 children and 2 adults" });
    assert.equal(familyPrice(m, { ages: [6, 8], adults: 2, day: "weekend_holiday" }).better, null);
    assert.equal(familyPrice(m, { ages: [6, 8, 10], adults: 2, day: "weekday" }).better, null);
  });

  it("adds grip socks for each child with a paid ticket when asked", () => {
    const r = familyPrice(view().familyPrice!, { ages: [5, 1], adults: 1, day: "weekday", socks: 1 });
    assert.equal(r.total, 39.45);
  });

  it("tells parents how each child will find it", () => {
    const r = familyPrice(view().familyPrice!, { ages: [7, 1], adults: 2, day: "weekday" });
    assert.deepEqual(r.fit.map((f) => f.fitLabel), ["Good fit", "Some things to do"]);
  });

  it("shows the check date once and keeps sources for the verification section", () => {
    const v = view();
    assert.equal(v.admissionRows![1].weekday?.meta.routine, true);
    assert.equal(v.verification.conflicts, 0);
    const page = html();
    assert.equal((page.match(/Checked Oct 24, 2026/g) ?? []).length, 0);
    assert.match(page, /Official details checked Oct 24, 2026/);
  });

  it("drops the unrated adults row, says Closed on closed days and adds the Compass take", () => {
    const v = view();
    assert.ok(!v.snapshot.ageBands.some((b) => b.band === "adults"));
    const page = html();
    assert.match(page, /<th scope="row">Monday<\/th><td>Closed<\/td>/);
    assert.match(page, /Compass take/);
    assert.match(page, /Compass hasn&#x27;t visited yet/);
    assert.match(page, /Compare all party packages/);
    assert.doesNotMatch(page, /Available whenever the venue is open|Stroller access/);
  });

  it("splits the checklist into home and venue", () => {
    const g = view().beforeYouGoGroups;
    assert.ok(g.home.some((i) => /waiver/i.test(i)));
    assert.ok(g.home.some((i) => /^Book online/.test(i)));
    assert.ok(g.home.includes("Pack grip socks for each child, or buy them there ($4.50 a pair)."));
    assert.equal(g.home.length, 3, "only tasks a parent can finish get tick boxes");
    assert.ok(g.atVenue.some((i) => /Cashless/.test(i)));
    assert.ok(g.atVenue.some((i) => /adults need regular socks/.test(i)));
    assert.ok(g.atVenue.includes("Strollers are not allowed in the play area. Bring a baby carrier if required."));
  });
});

describe("PE-001 round 2", () => {
  it("makes the cheapest option the headline, with socks and HST", () => {
    const r = familyPrice(view().familyPrice!, { ages: [6, 8, 10], adults: 2, day: "weekend_holiday", socks: 3 });
    assert.equal(r.better?.label, "Family Bundle");
    assert.equal(r.better?.includes, "3 children and 2 adults");
    assert.equal(r.socksSubtotal, 13.5);
    assert.equal(r.bestTotal, 113.45);
    assert.equal(r.bestWithTax, 128.2);
    const two = familyPrice(view().familyPrice!, { ages: [6, 2], adults: 2, day: "weekday" });
    assert.equal(two.better, null);
    assert.equal(two.bestTotal, 59.9);
    assert.equal(view().familyPrice!.adultsNote, "One adult is included with each paid child ticket. Adults with only a free baby pay $9.95.");
  });

  it("says once that every attraction is included", () => {
    assert.equal(view().activitiesAllIncluded, true);
    const page = html();
    assert.match(page, /Everything here is included in your ticket\./);
    assert.doesNotMatch(page, /<li>Included in admission<\/li>/);
  });

  it("renders the new header, the glow drawing, the verdict list and the booking card", () => {
    const page = html();
    assert.match(page, /<p class="venue-crumb"><span>Mississauga<\/span>/);
    assert.match(page, />Directions</);
    assert.match(page, /<a class="button button-secondary venue-call-inline" href="tel:9052127444">Call<\/a>/);
    assert.match(page, /Call 905-212-7444/);
    assert.match(page, /venue-hero is-glow/);
    assert.match(page, /<dt>Best for<\/dt>/);
    assert.match(page, /Based on official venue information\. Compass hasn&#x27;t visited yet\./);
    assert.match(page, /class="venue-book-card"/);
    assert.match(page, /class="venue-sticky-book" inert=""/, "the phone bar starts hidden and unfocusable");
    assert.doesNotMatch(page, /Know before you go/);
    assert.match(page, /<ul class="venue-rule-list">/);
    assert.doesNotMatch(page, /Also known as|Share this page<\/button>/);
    // The price tool comes before the ticket table.
    assert.ok(page.indexOf("Your family: fit and price") < page.indexOf("All ticket prices"));
  });

  it("reads venue videos from YouTube links or video files only", async () => {
    const { buildVenueDetailView: build } = await import("@/lib/discover/venueDetail");
    const withVideo = structuredClone(preview);
    withVideo.links.push({ ...withVideo.links[0], kind: "video", value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", label: "Inside the park" });
    assert.deepEqual(build(withVideo, { today: TODAY }).video, { kind: "youtube", id: "dQw4w9WgXcQ", title: "Inside the park" });
    withVideo.links[withVideo.links.length - 1].value = "https://example.com/not-a-video";
    assert.equal(build(withVideo, { today: TODAY }).video, null);
    assert.equal(view().video, null);
  });
});

describe("PE-001 price tool: the reviewer's test families", () => {
  const m = () => view().familyPrice!;
  const total = (ages: number[], adults: number, day: "weekday" | "weekend_holiday") =>
    familyPrice(m(), { ages, adults, day }).bestTotal;

  it("one baby and one adult pays only the adult", () => {
    assert.equal(total([1], 1, "weekday"), 9.95);
  });
  it("age 7 and one adult", () => {
    assert.equal(total([7], 1, "weekday"), 34.95);
    assert.equal(total([7], 1, "weekend_holiday"), 39.95);
  });
  it("age 7, a baby and two adults: the second adult pays", () => {
    assert.equal(total([7, 1], 2, "weekday"), 44.9);
    assert.equal(total([7, 1], 2, "weekend_holiday"), 49.9);
  });
  it("two paid children and three adults: two tickets and one extra adult", () => {
    const r = familyPrice(m(), { ages: [6, 9], adults: 3, day: "weekday" });
    assert.equal(r.extraAdults, 1);
    assert.equal(r.bestTotal, 79.85);
  });
  it("three paid children and two adults on a weekend: the Family Bundle", () => {
    const r = familyPrice(m(), { ages: [6, 8, 10], adults: 2, day: "weekend_holiday" });
    assert.equal(r.better?.label, "Family Bundle");
    assert.equal(r.bestTotal, 99.95);
    assert.equal(r.total, 119.85);
    assert.equal(r.better?.saving, 19.9);
  });
  it("age 15 uses the teen ticket and age 14 the 4–14 ticket", () => {
    assert.equal(total([15], 1, "weekday"), 24.95);
    assert.equal(total([14], 1, "weekday"), 34.95);
  });
  it("buys only the sock pairs asked for", () => {
    assert.equal(familyPrice(m(), { ages: [6, 8], adults: 2, day: "weekday", socks: 1 }).bestTotal, 74.4);
  });
});

describe("PE-001 wording", () => {
  it("says Age guidance when no height or weight limits are published", () => {
    assert.equal(view().snapshot.restrictionsHeading, "Age guidance");
    assert.doesNotMatch(html(), /Age, height and weight limits/);
  });
});

describe("PE-001 result card", () => {
  it("breaks the best deal into bundle and socks", () => {
    const r = familyPrice(view().familyPrice!, { ages: [6, 8, 10], adults: 2, day: "weekend_holiday", socks: 2 });
    assert.equal(r.better?.total, 99.95);
    assert.equal(r.socksPairs, 2);
    assert.equal(r.socksSubtotal, 9);
    assert.equal(r.bestTotal, 108.95);
    assert.equal(r.bestWithTax, 123.11);
  });
});

describe("PE-001 full-page review fixes", () => {
  it("formats large prices with a thousands separator", () => {
    const thirty = view().parties.rows!.find((r) => r.label === "30 kids + 30 adults")!;
    assert.equal(thirty.weekday?.amount, "$1,299");
    assert.equal(thirty.weekend?.amount, "$1,399");
  });

  it("names each source page, not just the site", () => {
    const hosts = view().sources.map((s) => s.host);
    assert.ok(hosts.includes("amazingfunpark.ca/bookings"));
    assert.ok(hosts.includes("amazingfunpark.ca/parties"));
  });

  it("says each rule once on the page", () => {
    const page = html().replace(/<[^>]+>/g, " ");
    for (const rule of [
      "Sign the waiver online ahead or on arrival",
      "The 2-hour session starts when you check in.",
      "No outside food or drinks; birthday cake only with a booked party.",
      "Book online to guarantee your time",
    ]) {
      assert.equal(page.split(rule).length - 1, 1, rule);
    }
  });

  it("doesn't list stroller access or the check-with-venue items as unknown twice", () => {
    const page = html();
    const notConfirmed = /Not confirmed yet: ([^<]+)\./.exec(page)?.[1] ?? "";
    const items = notConfirmed.split(", ");
    for (const gone of ["stroller access", "parking", "washrooms", "baby changing"]) assert.ok(!items.includes(gone), gone);
    assert.ok(items.includes("accessible parking"));
  });

  it("shows the breadcrumb type in sentence case without a mismatched link", () => {
    assert.match(html(), /<p class="venue-crumb"><span>Mississauga<\/span><span aria-hidden="true"> › <\/span>Indoor playgrounds<\/p>/);
  });
});

describe("PE-001 booking card follows the price tool", () => {
  const model = () => view().familyPrice!;
  it("names the paid ticket for a 2-year-old instead of the free-entry note", () => {
    const r = familyPrice(model(), { ages: [7, 2], adults: 2, day: "weekend_holiday", socks: 2 });
    const two = r.fit.find((f) => f.age === 2);
    assert.equal(two?.note, "Uses the Ages 2–3 ticket");
    assert.equal(r.bestTotal, 78.9);
    // A baby still gets the band note about free entry.
    const baby = familyPrice(model(), { ages: [1], adults: 1, day: "weekday" }).fit[0];
    assert.match(baby.note ?? "", /Free for 23 months/);
  });

  it("renders the ticket range on the card until a family estimate exists", () => {
    const out = html();
    assert.ok(out.includes('<p class="venue-book-price">$34.95–$39.95<span>Ages 4–14</span></p>'));
    assert.ok(!out.includes("is-family"));
  });
});
