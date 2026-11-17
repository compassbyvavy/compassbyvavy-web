import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BATCH_1, BATCH_1_TOKEN_RECORD, listingBySlug } from "@/lib/camps/pages/batch1";
import { campReviewAdminAllowed } from "@/lib/camps/pages/adminGate";
import { flagsForCamp } from "@/lib/camps/pages/flags";
import { renderReviewPack } from "@/lib/camps/pages/pack";
import { previewAccess, tokenExpiresOn } from "@/lib/camps/pages/preview";
import { decideCamp, emptyReviewState, isCampLive, publishBatch } from "@/lib/camps/pages/review";
import type { CampListing } from "@/lib/camps/pages/types";
import { ASK_THE_CAMP } from "@/lib/camps/pages/types";
import { buildCampListingPage } from "@/lib/camps/pages/view";

const today = "2026-11-16";
const ksg = listingBySlug("ksg-winter")!;
const longos = listingBySlug("longos-loft-applewood-winter")!;
const ckp = listingBySlug("creative-kids-place-march-break")!;

function withPrice(price: number): CampListing {
  return { ...ksg, slug: `price-${price}`, comparePrice: price, locationFields: [], carePhrases: [] };
}

describe("camp page template", () => {
  it("shows Ask the camp when a fact is missing", () => {
    const page = buildCampListingPage(ksg, { today });
    const lunch = page.facts.find((fact) => fact.label === "Lunch");
    assert.equal(lunch?.value, ASK_THE_CAMP);
    assert.equal(lunch?.missing, true);
    assert.equal(page.facts.length, 6);
  });

  it("hides the summary box when the camp has not written one", () => {
    const page = buildCampListingPage(listingBySlug("cooksmart-winter")!, { today });
    assert.equal(page.summary, null);
  });

  it("drops a deal the day after it ends, including the cost note", () => {
    const during = buildCampListingPage(ksg, { today: "2026-11-30" });
    const after = buildCampListingPage(ksg, { today: "2026-12-01" });
    assert.match(during.deal ?? "", /Nov 30/);
    assert.equal(after.deal, null);
    assert.equal(after.costRows?.find((row) => row.label === "Full day")?.note, null);
    assert.equal(after.costNote, null);
  });

  it("tags a fact checked before Sep 1, 2026", () => {
    const stale: CampListing = { ...ksg, ages: { ...ksg.ages, checkedOn: "2026-08-15" } };
    const page = buildCampListingPage(stale, { today });
    assert.equal(page.facts[0].stale, true);
    assert.equal(page.facts[0].value, "4–12");
  });

  it("uses the shared section name and says when the price was checked", () => {
    const page = buildCampListingPage(ksg, { today });
    assert.equal(page.sessionsTitle, "Pick your camp");
    assert.match(page.facts.find((fact) => fact.label === "Price")?.detail ?? "", /checked Nov 15, 2026/);
    assert.equal(page.priceFrom.startsWith("From $"), false);
    assert.match(buildCampListingPage(ckp, { today }).catchLine ?? "", /misses the trip/);
  });

  it("shows an edited provider line and hides it when the edit is blank", () => {
    const edited = buildCampListingPage(ksg, { today, summary: "Book one day at a time." });
    const hidden = buildCampListingPage(ksg, { today, summary: "  " });
    assert.equal(edited.summary, "Book one day at a time.");
    assert.equal(hidden.summary, null);
  });

  it("keeps the three drafted camps' pickers", () => {
    assert.equal(ksg.picker.kind, "day-options");
    assert.equal(longos.picker.kind, "theme-days");
    assert.equal(longos.picker.kind === "theme-days" ? longos.picker.days.length : 0, 8);
    assert.equal(ckp.picker.kind, "location");
    assert.equal(ckp.picker.kind === "location" ? ckp.picker.locations.length : 0, 3);
  });
});

describe("review flags", () => {
  it("flags a missing key field and a missing register link", () => {
    const camp: CampListing = { ...ksg, price: { value: null, sourceUrl: null, checkedOn: null }, registerUrl: null };
    const flags = flagsForCamp(camp, { today, breakPrices: [68] });
    assert.ok(flags.some((flag) => flag === "Missing price."));
    assert.ok(flags.some((flag) => flag === "Missing register link."));
  });

  it("flags a fact checked before Sep 1, 2026", () => {
    const camp: CampListing = { ...ksg, hours: { ...ksg.hours, checkedOn: "2026-05-01" } };
    const flags = flagsForCamp(camp, { today, breakPrices: [68] });
    assert.ok(flags.some((flag) => /before 2026-09-01/.test(flag)));
  });

  it("flags a field that differs between locations", () => {
    const flags = flagsForCamp(ckp, { today, breakPrices: [350] });
    assert.ok(flags.some((flag) => /differs between locations/.test(flag)));
  });

  it("flags a price more than double or less than half the median", () => {
    const high = flagsForCamp(withPrice(200), { today, breakPrices: [40, 50, 200] });
    const low = flagsForCamp(withPrice(10), { today, breakPrices: [40, 50, 10] });
    assert.ok(high.some((flag) => /median/.test(flag)));
    assert.ok(low.some((flag) => /median/.test(flag)));
    const close = flagsForCamp(withPrice(45), { today, breakPrices: [40, 50, 45] });
    assert.equal(close.some((flag) => /median/.test(flag)), false);
  });

  it("flags care priced per day in one place and per week in another", () => {
    const flags = flagsForCamp(ckp, { today, breakPrices: [350] });
    assert.ok(flags.some((flag) => /per day/.test(flag) && /per week/.test(flag)));
  });

  it("flags a pending Camp Watcher change", () => {
    const flags = flagsForCamp(ksg, { today, breakPrices: [68], watcher: { pendingChange: true, unreachableNights: 0 } });
    assert.ok(flags.some((flag) => /still pending/.test(flag)));
  });

  it("flags a source that was unreachable two nights running", () => {
    const once = flagsForCamp(ksg, { today, breakPrices: [68], watcher: { pendingChange: false, unreachableNights: 1 } });
    const twice = flagsForCamp(ksg, { today, breakPrices: [68], watcher: { pendingChange: false, unreachableNights: 2 } });
    assert.equal(once.some((flag) => /unreachable/.test(flag)), false);
    assert.ok(twice.some((flag) => /unreachable 2 nights/.test(flag)));
  });

  it("flags a register link that does not return HTTP 200", () => {
    const bad = flagsForCamp(ksg, { today, breakPrices: [68], link: { httpStatus: 404 } });
    const down = flagsForCamp(ksg, { today, breakPrices: [68], link: { httpStatus: null } });
    const ok = flagsForCamp(ksg, { today, breakPrices: [68], link: { httpStatus: 200 } });
    assert.ok(bad.some((flag) => /HTTP 404/.test(flag)));
    assert.ok(down.some((flag) => /no response/.test(flag)));
    assert.equal(ok.some((flag) => /HTTP/.test(flag)), false);
  });
});

describe("preview token", () => {
  it("opens with the batch token and refuses a wrong, short, expired, or published token", () => {
    const batch = BATCH_1_TOKEN_RECORD;
    assert.equal(previewAccess({ batch, supplied: batch.token, today, publishedOn: null }), "ok");
    assert.equal(previewAccess({ batch, supplied: "not-the-token-not-the-token-xxxx", today, publishedOn: null }), "wrong");
    assert.equal(previewAccess({ batch, supplied: "short", today, publishedOn: null }), "wrong");
    assert.equal(previewAccess({ batch, supplied: batch.token, today: tokenExpiresOn(batch.createdOn), publishedOn: null }), "expired");
    assert.equal(previewAccess({ batch, supplied: batch.token, today, publishedOn: today }), "expired");
  });
});

describe("admin decisions", () => {
  it("requires a note to fix and a reason to decline, then publishes only approved camps", () => {
    const slugs = ["ksg-winter", "longos-loft-applewood-winter"];
    assert.equal(decideCamp(emptyReviewState(), { slug: slugs[0], status: "fix", today }).ok, false);
    assert.equal(decideCamp(emptyReviewState(), { slug: slugs[1], status: "declined", today }).ok, false);
    const fixed = decideCamp(emptyReviewState(), { slug: slugs[0], status: "fix", note: "Hours are wrong", today });
    assert.equal(fixed.ok, true);
    if (!fixed.ok) return;
    const approved = decideCamp(fixed.state, { slug: slugs[1], status: "approved", today });
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    const published = publishBatch(approved.state, { slugs, today });
    assert.equal(published.ok, true);
    if (!published.ok) return;
    assert.deepEqual(published.published, [slugs[1]]);
    assert.equal(isCampLive(published.state, slugs[1]), true);
    assert.equal(isCampLive(published.state, slugs[0]), false);
  });

  it("stays off the public site", () => {
    assert.equal(campReviewAdminAllowed({ nodeEnv: "development", hostname: "compassbyvavy.ca", reviewFlag: "true" }), true);
    assert.equal(
      campReviewAdminAllowed({ nodeEnv: "production", hostname: "compassbyvavy.ca", reviewFlag: "true" }),
      false,
    );
  });
});

describe("batch 1", () => {
  it("names the ten camps, with Futures split by break", () => {
    const providers = new Set(BATCH_1.map((camp) => camp.provider));
    for (const name of [
      "KSG Gymnastics (Kids Supergym)",
      "Longo's Loft",
      "Creative Kids Place",
      "Gymnastics Mississauga",
      "Futures Gymnastics",
      "COOKSMART",
      "Visual Arts Mississauga",
      "City of Mississauga",
      "Exploring Minds",
      "Newton's Grove School",
    ]) {
      assert.equal(providers.has(name), true, name);
    }
    assert.equal(BATCH_1.length, 11);
  });

  it("writes a preview link and a flag list into the pack", () => {
    const pack = renderReviewPack({ batch: BATCH_1_TOKEN_RECORD, listings: BATCH_1, today });
    assert.match(pack, /\/camps\/preview\/ksg-winter\?t=/);
    assert.match(pack, /Care pricing says per day/);
    assert.match(pack, /## Summary/);
  });
});
