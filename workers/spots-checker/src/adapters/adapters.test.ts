import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { DueRef } from "../types";
import { activenet } from "./activenet";
import { iclasspro } from "./iclasspro";
import { jackrabbit } from "./jackrabbit";
import { squarespace } from "./squarespace";

function fixture(name: string): string {
  return readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), "utf8");
}

function ref(extra: Partial<DueRef>): DueRef {
  return {
    sessionId: "s",
    bookingSystem: "example",
    externalRef: {},
    enabled: true,
    published: true,
    endDate: "2026-12-23",
    ...extra,
  };
}

describe("iclasspro adapter", () => {
  const body = fixture("iclasspro-futures-2026-11-13.json");
  const listing = "https://app.iclasspro.com/api/open/v1/futures/camps?locationId=2&typeId=135&sortBy=time";

  it("reads the count a parent saw on 13 Nov 2026", () => {
    const dec21 = iclasspro.parse(
      ref({
        bookingSystem: "iclasspro",
        externalRef: { orgCode: "futures", locationId: 2, typeId: 135, campId: 4278, url: "https://portal.iclasspro.com/futures/camps/135?sortBy=time" },
      }),
      body,
    );
    assert.deepEqual(dec21, {
      spots_left: 11,
      state: "available",
      source_url: "https://portal.iclasspro.com/futures/camps/135?sortBy=time",
    });
    const dec28 = iclasspro.parse(
      ref({
        bookingSystem: "iclasspro",
        externalRef: { orgCode: "futures", locationId: 2, typeId: 135, campId: 4279, url: "https://portal.iclasspro.com/futures/camps/135?sortBy=time" },
      }),
      body,
    );
    assert.deepEqual(dec28, {
      spots_left: 13,
      state: "available",
      source_url: "https://portal.iclasspro.com/futures/camps/135?sortBy=time",
    });
  });

  it("does not publish a hidden aftercare integer", () => {
    const aftercare = iclasspro.parse(
      ref({ bookingSystem: "iclasspro", externalRef: { campId: 4280, url: "https://portal.iclasspro.com/futures/camps/135?sortBy=time" } }),
      body,
    );
    assert.deepEqual(aftercare, {
      spots_left: null,
      state: "available",
      source_url: "https://portal.iclasspro.com/futures/camps/135?sortBy=time",
    });
  });

  it("uses one listing URL for every Futures session", () => {
    const page = iclasspro.pageUrl(
      ref({ externalRef: { orgCode: "futures", locationId: 2, typeId: 135, campId: 4278 } }),
    );
    assert.equal(page, listing);
  });
});

describe("jackrabbit adapter", () => {
  const body = fixture("jackrabbit-537009-2026-11-13.html");
  const openings = "https://app.jackrabbitclass.com/webregopeningsv2.asp?oid=537009";

  it("hides the count when holiday-camp days disagree", () => {
    const reading = jackrabbit.parse(ref({ bookingSystem: "jackrabbit", externalRef: { openingsUrl: openings } }), body);
    assert.deepEqual(reading, { spots_left: null, state: "available", source_url: openings });
  });

  it("shows one count when every day matches", () => {
    const same = `<tr data-openings="8" onclick="@@lp=1"><u>Holiday Camp, Monday Dec 21</u><td data-title="Cat3">Dec</td></tr>
<tr data-openings="8"><u>Holiday Camp, Tuesday Dec 22</u><td data-title="Cat3">Dec</td></tr>
<tr data-openings="1"><u>Holiday Camp - After Care, Monday Dec 21</u><td data-title="Cat3">AC</td></tr>`;
    const reading = jackrabbit.parse(ref({ externalRef: { openingsUrl: openings } }), same);
    assert.deepEqual(reading, { spots_left: 8, state: "available", source_url: openings });
  });

  it("errors when no holiday camp rows are present", () => {
    const reading = jackrabbit.parse(ref({ externalRef: { openingsUrl: openings } }), "<tr data-openings=\"3\"><u>Recreational</u></tr>");
    assert.deepEqual(reading, { error: "no holiday camp rows" });
  });
});

describe("activenet adapter", () => {
  it("parses the 44 openings a parent saw on activity 115093", () => {
    const body = fixture("activenet-115093-2026-11-13.json");
    const due = ref({
      bookingSystem: "activenet",
      externalRef: { activityId: 115093 },
    });
    assert.equal(
      activenet.pageUrl(due),
      "https://anc.ca.apm.activecommunities.com/ymcagta/rest/activity/detail/115093",
    );
    assert.deepEqual(activenet.parse(due, body), {
      spots_left: 44,
      state: "available",
      source_url: "https://anc.ca.apm.activecommunities.com/ymcagta/rest/activity/detail/115093",
    });
  });

  it("does not guess when space_status is not a count", () => {
    const due = ref({ externalRef: { activityId: 1 } });
    const reading = activenet.parse(due, JSON.stringify({ body: { detail: { space_status: "Call the centre" } } }));
    assert.deepEqual(reading, { error: "space_status Call the centre was not a count, full, or waitlist" });
  });
});

describe("squarespace adapter", () => {
  it("reads in stock and does not treat untracked qty 0 as full", () => {
    const body = fixture("squarespace-holiday-camp-2026-11-13.html");
    const due = ref({
      bookingSystem: "squarespace",
      externalRef: { url: "https://www.magnitudewell.ca/holiday/p/holiday-camp", productId: "639c9bbd8cade3085c5df7f0" },
    });
    assert.match(body, /product:availability" content="instock"/);
    assert.equal(squarespace.pageUrl(due).includes("format=json"), false);
    assert.deepEqual(squarespace.parse(due, body), {
      spots_left: null,
      state: "available",
      source_url: "https://www.magnitudewell.ca/holiday/p/holiday-camp",
    });
  });

  it("refuses a format=json url", () => {
    assert.equal(
      squarespace.pageUrl(ref({ externalRef: { url: "https://www.magnitudewell.ca/holiday/p/holiday-camp?format=json" } })),
      "",
    );
  });
});
