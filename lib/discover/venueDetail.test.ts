import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { VenueRecord, VenueReviewSource } from "@/data/discover/venueTypes";
import { venuesDevRecords } from "@/data/discover/venues.dev";
import { VenueDetail } from "@/components/discover/VenueDetail";
import {
  AMENITY_CHECKLIST,
  ageCheck,
  buildVenueDetailView,
  costEstimatorModel,
  estimateFamilyCost,
  formatCheckedDate,
  isPublicFact,
  isVenuePubliclyViewable,
  resolvePublicVenue,
  reviewSourceDisplayable,
  venueHref,
} from "@/lib/discover/venueDetail";
import { loadVenueCatalog } from "@/lib/discover/venuesCatalog";

const TODAY = "2026-10-16";
const [heartland, brampton, draft, closed] = venuesDevRecords;
const view = () => buildVenueDetailView(heartland, { today: TODAY });
const sparse = () => buildVenueDetailView(brampton, { today: TODAY });
const html = (record: VenueRecord) =>
  renderToStaticMarkup(
    createElement(VenueDetail, { view: buildVenueDetailView(record, { today: TODAY }) }),
  );

function clone(record: VenueRecord): VenueRecord {
  return structuredClone(record);
}

describe("venue routing and publication gate", () => {
  it("resolves a published, open, verified venue at /discover/play/<slug>", () => {
    const found = resolvePublicVenue(venuesDevRecords, "play", "maple-leap-play-centre-heartland");
    assert.equal(found?.place.id, "DEV-PE-001");
    assert.equal(venueHref(heartland), "/discover/play/maple-leap-play-centre-heartland");
  });

  it("gives each branch of a chain its own page", () => {
    assert.equal(resolvePublicVenue(venuesDevRecords, "play", "maple-leap-play-centre-brampton")?.place.id, "DEV-PE-002");
    assert.notEqual(venueHref(heartland), venueHref(brampton));
  });

  it("returns null (→ not-found page) for draft, closed and unknown venues", () => {
    assert.equal(resolvePublicVenue(venuesDevRecords, "play", draft.place.slug), null);
    assert.equal(resolvePublicVenue(venuesDevRecords, "play", closed.place.slug), null);
    assert.equal(resolvePublicVenue(venuesDevRecords, "play", "no-such-venue"), null);
  });

  it("does not serve a venue under the wrong category or an unknown one", () => {
    assert.equal(resolvePublicVenue(venuesDevRecords, "parks", heartland.place.slug), null);
    assert.equal(resolvePublicVenue(venuesDevRecords, "services", heartland.place.slug), null);
    assert.equal(resolvePublicVenue(venuesDevRecords, "nope", heartland.place.slug), null);
  });

  it("keeps unverified or temporarily closed venues off public pages", () => {
    const noSource = clone(heartland);
    noSource.place.sourceCheckedDate = null;
    assert.equal(isVenuePubliclyViewable(noSource), false);
    const temp = clone(heartland);
    temp.place.operatingStatus = "temporarily_closed";
    assert.equal(isVenuePubliclyViewable(temp), false);
    const unknown = clone(heartland);
    unknown.place.operatingStatus = "unknown";
    assert.equal(isVenuePubliclyViewable(unknown), false);
    assert.throws(() => buildVenueDetailView(draft, { today: TODAY }));
  });

  it("serves no venue records in production", async () => {
    assert.equal(await loadVenueCatalog({ nodeEnv: "production" }), null);
    assert.ok((await loadVenueCatalog({ nodeEnv: "development" }))?.records.length);
  });
});

describe("published venue page", () => {
  it("shows name, branch, city, address and every evidenced type, primary first", () => {
    const v = view();
    assert.equal(v.overview.name, "Maple Leap Play Centre");
    assert.equal(v.overview.branchName, "Heartland");
    assert.equal(v.overview.address, "100 Example Drive, Unit 4, Mississauga ON L5V 0A0");
    assert.deepEqual(v.overview.types.map((t) => t.label), [
      "Indoor Playground",
      "Trampoline Park",
      "Toddler Play Area",
    ]);
    assert.equal(v.overview.setting, "Indoor");
    assert.equal(v.snapshot.officialAgeRange, "Ages 1–12");
    assert.equal(v.snapshot.bestFitAges, "Ages 0–9");
    assert.match(v.snapshot.bestFitExplanation ?? "", /not the operator's admission rule/i);
  });

  it("renders all sections with source links and checked dates", () => {
    const page = html(heartland);
    for (const heading of ["At a glance", "Plan your visit", "Prices", "Activities", "Amenities and access", "What to expect", "Sources and freshness"]) {
      assert.match(page, new RegExp(`>${heading}<`), heading);
    }
    assert.match(page, /Official ages/);
    assert.match(page, /Compass best fit/);
    assert.match(page, /Checked Oct 10, 2026/);
    assert.match(page, /href="https:\/\/example\.org\/maple-leap\/heartland\/book"/);
    assert.match(page, /<h1>Maple Leap Play Centre<span class="venue-branch"> — Heartland<\/span><\/h1>/);
  });

  it("lists weekly hours by day and seasonal hours separately", () => {
    const hours = view().visit.hours;
    assert.equal(hours.kind, "weekly");
    if (hours.kind !== "weekly") return;
    assert.deepEqual(hours.rows[0], { day: "Monday", ranges: ["10 am – 7 pm"] });
    assert.deepEqual(hours.rows[5], { day: "Saturday", ranges: ["9 am – 8 pm"] });
    assert.equal(hours.seasonal.length, 1);
    assert.match(hours.seasonal[0], /Dec 21, 2026 to Jan 3, 2027/);
  });

  it("breaks prices down by kind and hides expired offers", () => {
    const v = view();
    assert.deepEqual(v.prices.map((s) => s.heading), ["Admission", "Extras", "Memberships", "Birthday parties", "Current offers"]);
    const offers = v.prices.find((s) => s.kind === "promotion")!.lines.map((l) => l.label);
    assert.deepEqual(offers, ["Weekday morning toddler rate"], "the expired summer pass is hidden");
    const child = v.prices[0].lines.find((l) => l.label === "Child admission")!;
    assert.equal(child.amount, "$21.99");
    assert.ok(child.details.includes("Ages 3–12"));
    assert.ok(child.details.includes("2 hours"));
    assert.ok(child.details.includes("Plus tax"));
  });

  it("estimates a family cost from verified prices with required extras", () => {
    const model = costEstimatorModel(view().prices)!;
    assert.ok(model);
    const total = estimateFamilyCost(model, {
      childLineId: "p1",
      children: 2,
      adultLineId: "p4",
      adults: 1,
    });
    assert.equal(total, 2 * (21.99 + 3.5));
    assert.ok(model.assumptions.some((a) => /before tax/.test(a)));
    assert.equal(
      estimateFamilyCost(model, { childLineId: null, children: 1, adultLineId: null, adults: 0 }),
      null,
    );
  });
});

describe("multiple activity types and per-branch activities", () => {
  it("lists available activities with their limits and cost", () => {
    const v = view();
    assert.deepEqual(v.activities.map((a) => a.name), [
      "Multi-level climbing structure",
      "Toddler zone",
      "Trampoline courts",
    ]);
    const tramp = v.activities[2];
    assert.ok(tramp.limits.includes("Ages 5+"));
    assert.ok(tramp.limits.includes("Up to 100 kg"));
    assert.equal(tramp.cost, "Costs extra — $6 per 30-minute session");
    assert.match(tramp.schedule ?? "", /Scheduled/);
  });

  it("shows verified-unavailable activities separately", () => {
    assert.deepEqual(view().notOffered.map((a) => a.name), ["Laser tag"]);
  });

  it("does not show a chain-wide activity that is not confirmed for this branch", () => {
    assert.deepEqual(sparse().activities, []);
    assert.doesNotMatch(html(brampton), /Laser tag/);
  });

  it("checks a child's age against published activity limits", () => {
    const tool = view().ageTool;
    const two = ageCheck(tool, 2);
    assert.equal(two.band?.fitLabel, "Good fit");
    assert.ok(two.fits.includes("Toddler zone"));
    assert.ok(two.tooYoung.includes("Trampoline courts"));
    const fifteen = ageCheck(tool, 15);
    assert.equal(fifteen.band?.fitLabel, "Not suitable");
    assert.ok(fifteen.tooOld.includes("Toddler zone"));
  });
});

describe("missing and unknown facts", () => {
  it("says what is not confirmed instead of guessing", () => {
    const v = sparse();
    assert.equal(v.overview.address, null);
    assert.equal(v.overview.setting, null);
    assert.equal(v.visit.hours.kind, "unknown");
    assert.deepEqual(v.prices, []);
    assert.equal(v.costEstimator, null);
    assert.equal(v.snapshot.visitLength, null);
    assert.equal(v.snapshot.rainyDay, null);
    assert.ok(v.snapshot.ageBands.every((b) => b.fitLabel === "Not confirmed"));
    assert.ok(v.amenities.every((a) => a.status === "not_confirmed"));
  });

  it("renders empty states without empty labels or sample facts", () => {
    const page = html(brampton);
    assert.match(page, /Hours not confirmed yet/);
    assert.match(page, /Prices not confirmed yet/);
    assert.match(page, /Activities at this location are not confirmed yet/);
    assert.match(page, /No amenities confirmed yet/);
    assert.match(page, /Address<\/dt><dd>Not confirmed<\/dd>/);
    assert.doesNotMatch(page, /<dd><\/dd>|<li><\/li>|<p><\/p>|undefined|null|NaN/);
    assert.doesNotMatch(page, /Family cost estimate|Will this work for my kids/);
  });

  it("separates verified-unavailable amenities from unconfirmed ones", () => {
    const amenities = view().amenities;
    assert.equal(amenities.find((a) => a.kind === "outside_food")?.status, "unavailable");
    assert.equal(amenities.find((a) => a.kind === "washrooms")?.status, "confirmed");
    assert.equal(amenities.find((a) => a.kind === "stroller_storage")?.status, "not_confirmed");
    assert.ok(AMENITY_CHECKLIST.every((k) => amenities.some((a) => a.kind === k)));
  });

  it("never shows facts awaiting follow-up and flags conflicting ones", () => {
    const base = { sourceUrl: "https://example.org/x", sourceCheckedDate: "2026-10-01" };
    assert.equal(isPublicFact({ ...base, verificationStatus: "needs_follow_up" }), false);
    assert.equal(isPublicFact({ ...base, verificationStatus: "conflicting" }), false, "conflict needs a note");
    assert.equal(isPublicFact({ ...base, verificationStatus: "conflicting", conflictNote: "x" }), true);
    assert.equal(isPublicFact({ ...base, sourceUrl: "http://example.org", verificationStatus: "verified" }), false);
    const sensory = view().amenities.find((a) => a.kind === "sensory_supports");
    assert.match(sensory?.meta?.conflict ?? "", /ear defenders/);
    assert.equal(view().conflicts.length, 1);
  });

  it("rejects malformed dates rather than showing them", () => {
    assert.equal(formatCheckedDate("2026-02-30"), null);
    assert.equal(formatCheckedDate("Oct 1"), null);
    assert.equal(formatCheckedDate("2026-10-01"), "Oct 1, 2026");
  });
});

describe("parent experience and partial review coverage", () => {
  it("keeps venue facts, reviewer themes and sentiment groups apart", () => {
    const e = view().experience;
    assert.deepEqual(e.venuePublished.map((t) => t.theme), ["parent_seating"]);
    assert.deepEqual(e.liked.map((t) => t.theme), ["age_fit"]);
    assert.deepEqual(e.concerns.map((t) => t.theme), ["busy_times"]);
    assert.equal(e.firstHand.length, 0);
    assert.match(html(heartland), /not facts\s+confirmed by Compass or the venue/);
  });

  it("calls review coverage partial and never 'all reviews'", () => {
    const r = view().reviews;
    assert.match(r.coverage, /^Partial coverage: 1 customer-review source and 1 editorial source/);
    assert.equal(r.automatedRetrieval, false);
    const google = r.customer[0];
    assert.match(google.sample ?? "", /at most 5\) — not all Google reviews/);
    assert.match(google.statedRating ?? "", /4\.4 out of 5 as shown by Google on Oct 10, 2026, from 612 ratings/);
    assert.equal(google.attributions.length, 2);
    assert.match(html(heartland), /Reviews by <span><a href="https:\/\/maps\.example\.com\/contrib\/a"/);
  });

  it("withholds a Google summary that lacks Google's disclosure and attributions", () => {
    const r = view().reviews;
    assert.equal(r.withheldCount, 1);
    assert.ok(!r.customer.some((s) => s.name === "Google review summary"));
  });

  it("enforces Google's five-review limit and keeps ratings off editorial sources", () => {
    const google = heartland.reviewSources[0];
    const six: VenueReviewSource = { ...google, itemsReviewed: 6 };
    assert.equal(reviewSourceDisplayable(six), false);
    const blog = heartland.reviewSources[1];
    assert.equal(reviewSourceDisplayable({ ...blog, statedRating: 4, ratingScale: 5 }), false);
    assert.equal(reviewSourceDisplayable({ ...google, providerAttributions: [] }), false);
  });

  it("labels the summary as limited when evidence is thin or conflicting", () => {
    assert.equal(sparse().experience.status, "limited");
    assert.match(html(brampton), /Limited information/);
    assert.match(sparse().reviews.coverage, /No permitted review or editorial sources/);
    const mixed = clone(heartland);
    mixed.experienceThemes[3].agreement = "mixed";
    const v = buildVenueDetailView(mixed, { today: TODAY });
    assert.equal(v.experience.status, "limited");
    assert.equal(v.experience.hasDisagreement, true);
  });

  it("does not use a reviewer theme whose source is withheld", () => {
    const withheld = clone(heartland);
    withheld.reviewSources[0].providerAttributions = [];
    const v = buildVenueDetailView(withheld, { today: TODAY });
    assert.equal(v.experience.liked.length, 0);
    assert.equal(v.experience.concerns.length, 0);
  });
});

describe("sources and freshness", () => {
  it("lists every source with what it supports and when it was checked", () => {
    const sources = view().sources;
    const main = sources.find((s) => s.url === "https://example.org/maple-leap/heartland");
    assert.ok(main);
    assert.ok(main.supports.includes("Venue details"));
    assert.equal(main.lastChecked, "Oct 10, 2026");
    assert.ok(sources.some((s) => s.host === "blog.example.com"));
  });

  it("builds a before-you-go list only from verified rules and required extras", () => {
    const list = view().beforeYouGo;
    assert.ok(list.some((i) => /waiver/.test(i)));
    assert.ok(list.some((i) => /grip socks \(\$3\.50\) — required for each child/.test(i)));
    assert.deepEqual(sparse().beforeYouGo, []);
  });
});
