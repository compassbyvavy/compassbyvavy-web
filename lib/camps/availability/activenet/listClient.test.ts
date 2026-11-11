import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { refreshActiveNetBatch } from "@/lib/camps/availability/activenet/batch";
import type { FetchLike } from "@/lib/camps/availability/activenet/fetchDetail";
import {
  activeNetListApiUrl,
  availabilityFromListItem,
  buildListSearchBody,
  cookieHeaderFromSetCookie,
  extractCsrfToken,
  fetchActiveNetActivityList,
  parseActiveNetListItem,
  type ActiveNetListItem,
} from "@/lib/camps/availability/activenet/listClient";
import { matchActivityNumbers } from "@/lib/camps/availability/activenet/matchIds";
import {
  getActiveNetAvailability,
  resetActiveNetAvailabilityCacheForTests,
} from "@/lib/camps/availability/activenet/service";
import { createMemorySnapshotStore } from "@/lib/camps/availability/activenet/sharedStore";
import { listActiveNetMappings } from "@/lib/camps/availability/activenet/registry";
import {
  MSC_0007_ACTIVITY_ID,
  MSC_0007_ACTIVITY_NUMBER,
  MSC_0007_CANDIDATE_ID,
} from "@/data/camps/real/msc0007.ids";

const CONFIG = { refreshIntervalMs: 60_000, timeoutMs: 8_000, minOriginIntervalMs: 5_000 };
const CSRF = "0f8c2a6e-1b2c-4d5e-8f90-a1b2c3d4e5f6";
const T0 = new Date("2026-11-10T11:00:00.000Z");

/** Winter Fun at Malton as the City's list returns it (observed: 36 places, 3 enrolled). */
const MALTON_ROW = {
  id: MSC_0007_ACTIVITY_ID,
  number: MSC_0007_ACTIVITY_NUMBER,
  name: "Camp: Winter Fun",
  date_range_start: "2026-12-21",
  date_range_end: "2026-12-23",
  time_range: "9:00 AM - 4:00 PM",
  location: { label: "Malton Community Centre" },
  total_open: 36,
  already_enrolled: 3,
  urgent_message: { status_description: "" },
};

function item(overrides: Partial<ActiveNetListItem> = {}): ActiveNetListItem {
  return {
    activityId: 1,
    activityNumber: "100",
    name: "Camp: Winter Fun",
    dateRangeStart: "2026-12-21",
    dateRangeEnd: "2026-12-23",
    locationLabel: null,
    totalOpen: 20,
    alreadyEnrolled: 5,
    statusDescription: "",
    dailyStart: "09:00",
    dailyEnd: "16:00",
    timeRangeRaw: "9:00 AM - 4:00 PM",
    ...overrides,
  };
}

function listServer(pages: unknown[][], opts: { csrf?: string | null } = {}) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    if (!init?.method || init.method === "GET") {
      const csrf = opts.csrf === undefined ? CSRF : opts.csrf;
      const html = csrf ? `<script>window.__config = { csrfToken: "${csrf}" };</script>` : "<html></html>";
      return new Response(html, {
        status: 200,
        headers: [["Set-Cookie", "JSESSIONID=abc123; Path=/; HttpOnly"], ["Set-Cookie", "AWSALB=xyz; Path=/"]],
      });
    }
    const pageInfo = JSON.parse(String((init.headers as Record<string, string>).page_info));
    const n = pageInfo.page_number as number;
    return new Response(
      JSON.stringify({
        headers: { response_code: "0000", page_info: { total_page: pages.length, page_number: n } },
        body: { activity_items: pages[n - 1] ?? [] },
      }),
      { status: 200 },
    );
  };
  return { fetchImpl, calls };
}

describe("ActiveNet list helpers", () => {
  it("extracts the csrfToken from the search page", () => {
    assert.equal(extractCsrfToken(`var x = 1; window.__csrf = { csrfToken: "${CSRF}" }`), CSRF);
    assert.equal(extractCsrfToken(`csrfToken = "${CSRF}"`), CSRF);
    assert.equal(extractCsrfToken("<html>no token</html>"), null);
  });

  it("builds a Cookie header from Set-Cookie values", () => {
    assert.equal(
      cookieHeaderFromSetCookie(["JSESSIONID=abc; Path=/; HttpOnly", "AWSALB=xyz; Path=/"]),
      "JSESSIONID=abc; AWSALB=xyz",
    );
    assert.equal(
      cookieHeaderFromSetCookie("JSESSIONID=abc; Path=/, AWSALB=xyz; Expires=Wed, 11 Nov 2026 10:00:00 GMT"),
      "JSESSIONID=abc; AWSALB=xyz",
    );
    assert.equal(cookieHeaderFromSetCookie(null), "");
  });

  it("puts the keyword in the search body", () => {
    const body = buildListSearchBody({ keyword: "winter fun" }) as {
      activity_search_pattern: { activity_keyword: string; season_ids: number[] };
    };
    assert.equal(body.activity_search_pattern.activity_keyword, "winter fun");
    assert.deepEqual(body.activity_search_pattern.season_ids, []);
  });

  it("parses a list row, keeping internal id and public number apart", () => {
    const parsed = parseActiveNetListItem(MALTON_ROW);
    assert.ok(parsed);
    assert.equal(parsed.activityId, 145871);
    assert.equal(parsed.activityNumber, "147884");
    assert.equal(parsed.totalOpen, 36);
    assert.equal(parsed.alreadyEnrolled, 3);
    assert.equal(parsed.locationLabel, "Malton Community Centre");
    assert.equal(parsed.dailyStart, "09:00");
    assert.equal(parsed.dailyEnd, "16:00");
    assert.equal(parsed.dateRangeEnd, "2026-12-23");
  });

  it("skips rows missing ids or counts instead of guessing", () => {
    assert.equal(parseActiveNetListItem({ ...MALTON_ROW, id: null }), null);
    assert.equal(parseActiveNetListItem({ ...MALTON_ROW, number: "" }), null);
    assert.equal(parseActiveNetListItem({ ...MALTON_ROW, total_open: "lots" }), null);
    assert.equal(parseActiveNetListItem({ ...MALTON_ROW, already_enrolled: -2 }), null);
    assert.equal(parseActiveNetListItem("nope"), null);
  });
});

describe("availabilityFromListItem", () => {
  it("computes openings as capacity minus enrolled (36 − 3 = 33)", () => {
    const parsed = availabilityFromListItem(parseActiveNetListItem(MALTON_ROW)!);
    assert.deepEqual(parsed, { kind: "available", openingsRemaining: 33, raw: "33 openings remaining" });
  });

  it("uses the singular for one opening", () => {
    assert.equal(availabilityFromListItem(item({ totalOpen: 10, alreadyEnrolled: 9 })).raw, "1 opening remaining");
  });

  it("keeps Waitlist and Closed as statuses, not zero openings", () => {
    const w = availabilityFromListItem(item({ statusDescription: "Waiting List", totalOpen: 20, alreadyEnrolled: 20 }));
    assert.equal(w.kind, "waitlist");
    assert.equal(w.openingsRemaining, null);
    const c = availabilityFromListItem(item({ statusDescription: "Closed", totalOpen: 20, alreadyEnrolled: 4 }));
    assert.equal(c.kind, "closed");
    assert.equal(c.openingsRemaining, null);
  });

  it("treats total_open -1 as uncapped, not as a count", () => {
    const parsed = availabilityFromListItem(item({ totalOpen: -1, alreadyEnrolled: 50 }));
    assert.equal(parsed.kind, "available");
    assert.equal(parsed.openingsRemaining, null);
  });

  it("maps Full to kind full, not unknown or zero openings", () => {
    const parsed = availabilityFromListItem(item({ totalOpen: 20, alreadyEnrolled: 20, statusDescription: "Full" }));
    assert.equal(parsed.kind, "full");
    assert.equal(parsed.raw, "Full");
    assert.equal(parsed.openingsRemaining, null);
    const silent = availabilityFromListItem(item({ totalOpen: 20, alreadyEnrolled: 20, statusDescription: "" }));
    assert.equal(silent.kind, "full");
    assert.equal(silent.raw, "Full");
  });
});

describe("fetchActiveNetActivityList", () => {
  it("bootstraps once, sends the token and cookie, and follows pages", async () => {
    const { fetchImpl, calls } = listServer([[MALTON_ROW], [{ ...MALTON_ROW, id: 2, number: "200" }]]);
    const result = await fetchActiveNetActivityList({ search: { keyword: "winter fun" }, fetchImpl, timeoutMs: 1000 });
    assert.ok(result.ok);
    assert.equal(result.items.length, 2);
    assert.equal(result.pages, 2);
    assert.equal(calls.length, 3);
    assert.equal(calls[0].init?.method, "GET");
    const post = calls[1].init!;
    const headers = post.headers as Record<string, string>;
    assert.equal(calls[1].url, activeNetListApiUrl());
    assert.equal(post.method, "POST");
    assert.equal(headers["X-CSRF-Token"], CSRF);
    assert.equal(headers.Cookie, "JSESSIONID=abc123; AWSALB=xyz");
    assert.match(headers["User-Agent"], /compassbyvavy\.ca/);
  });

  it("stops at maxPages", async () => {
    const { fetchImpl, calls } = listServer([[MALTON_ROW], [MALTON_ROW], [MALTON_ROW]]);
    const result = await fetchActiveNetActivityList({ search: { keyword: "x" }, fetchImpl, timeoutMs: 1000, maxPages: 2 });
    assert.ok(result.ok);
    assert.equal(result.pages, 2);
    assert.equal(calls.length, 3);
  });

  it("reports a missing csrfToken instead of posting without it", async () => {
    const { fetchImpl, calls } = listServer([[MALTON_ROW]], { csrf: null });
    const result = await fetchActiveNetActivityList({ search: { keyword: "x" }, fetchImpl, timeoutMs: 1000 });
    assert.deepEqual(result, { ok: false, error: "no_csrf_token" });
    assert.equal(calls.length, 1);
  });

  it("reports provider errors and malformed bodies", async () => {
    const bad: FetchLike = async (_url, init) =>
      !init?.method || init.method === "GET"
        ? new Response(`csrfToken = "${CSRF}"`)
        : new Response(JSON.stringify({ headers: { response_code: "9999" } }));
    assert.deepEqual(
      await fetchActiveNetActivityList({ search: { keyword: "x" }, fetchImpl: bad, timeoutMs: 1000 }),
      { ok: false, error: "provider_failure" },
    );
    const junk: FetchLike = async (_url, init) =>
      !init?.method || init.method === "GET" ? new Response(`csrfToken = "${CSRF}"`) : new Response("<html>");
    assert.deepEqual(
      await fetchActiveNetActivityList({ search: { keyword: "x" }, fetchImpl: junk, timeoutMs: 1000 }),
      { ok: false, error: "malformed_response" },
    );
  });
});

describe("matchActivityNumbers", () => {
  const items = [
    item({ activityId: 145871, activityNumber: "147884", name: "Camp: Winter Fun", locationLabel: "Malton CC" }),
    item({ activityId: 145872, activityNumber: "147885", name: "Camp: Winter Fun Jr", locationLabel: "Malton CC" }),
    item({ activityId: 147884, activityNumber: "149897", name: "H3O Swim For Life 2" }),
  ];

  it("matches by public number, never by internal id", () => {
    const report = matchActivityNumbers(items, [{ activityNumber: "147884", nameIncludes: "Winter Fun" }]);
    assert.equal(report.matched.length, 1);
    assert.equal(report.matched[0].activityId, 145871);
    assert.notEqual(report.matched[0].activityId, 147884);
  });

  it("lists numbers that aren't in the results", () => {
    const report = matchActivityNumbers(items, [{ activityNumber: "160780" }]);
    assert.deepEqual(report.missing, ["160780"]);
  });

  it("warns when a number lands on the wrong program", () => {
    const report = matchActivityNumbers(items, [
      { activityNumber: "147885", nameIncludes: "Winter Fun", nameExcludes: "Jr" },
    ]);
    assert.equal(report.nameWarnings.length, 1);
    assert.equal(report.nameWarnings[0].actual, "Camp: Winter Fun Jr");
  });

  it("flags a public number shared by two internal ids", () => {
    const report = matchActivityNumbers(
      [...items, item({ activityId: 999, activityNumber: "147884" })],
      [{ activityNumber: "147884" }],
    );
    assert.deepEqual(report.ambiguous, [{ activityNumber: "147884", activityIds: [145871, 999] }]);
    assert.equal(report.matched.length, 0);
  });

  it("prints list rows that are not in the expected set", () => {
    const extras = [
      item({
        activityId: 164666,
        activityNumber: "166679",
        name: "Camp: Winter Fun",
        locationLabel: "Carmen Corbasson Community Centre",
        dateRangeStart: "2026-12-29",
      }),
      item({
        activityId: 164668,
        activityNumber: "166681",
        name: "Camp: Winter Fun Jr",
        locationLabel: "Carmen Corbasson Community Centre",
        dateRangeStart: "2026-12-29",
      }),
      item({
        activityId: 164823,
        activityNumber: "166836",
        name: "Camp: Winter Fun",
        locationLabel: "River Grove Community Centre",
        dateRangeStart: "2026-12-29",
      }),
      item({
        activityId: 164824,
        activityNumber: "166837",
        name: "Camp: Winter Fun Jr",
        locationLabel: "River Grove Community Centre",
        dateRangeStart: "2026-12-29",
      }),
    ];
    const report = matchActivityNumbers(
      [items[0], ...extras],
      [{ activityNumber: "147884" }],
    );
    assert.equal(report.matched.length, 1);
    assert.equal(report.unmatchedListRows.length, 4);
    const carmenFun = report.unmatchedListRows.find((row) => row.activityNumber === "166679");
    assert.ok(carmenFun);
    assert.equal(carmenFun.name, "Camp: Winter Fun");
    assert.equal(carmenFun.locationLabel, "Carmen Corbasson Community Centre");
    assert.equal(carmenFun.dateRangeStart, "2026-12-29");
    assert.ok(report.unmatchedListRows.some((row) => row.activityNumber === "166836"));
    assert.ok(report.unmatchedListRows.some((row) => row.activityNumber === "166681"));
    assert.ok(report.unmatchedListRows.some((row) => row.activityNumber === "166837"));
    assert.equal(
      report.unmatchedListRows.some((row) => /churchill/i.test(row.locationLabel ?? "")),
      false,
    );
  });
});

describe("refreshActiveNetBatch", () => {
  it("writes list readings to the shared store, which the detail route then reuses", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const store = createMemorySnapshotStore();
    const { fetchImpl } = listServer([[MALTON_ROW]]);
    const summary = await refreshActiveNetBatch({
      search: { keyword: "winter fun" },
      mappings: listActiveNetMappings(),
      store,
      fetchImpl,
      config: CONFIG,
      now: () => T0,
    });
    assert.ok(summary.ok);
    assert.deepEqual(summary.updated, [MSC_0007_CANDIDATE_ID]);

    let detailCalls = 0;
    const detailFetch: FetchLike = async () => {
      detailCalls += 1;
      return new Response("{}", { status: 500 });
    };
    const snap = await getActiveNetAvailability(MSC_0007_CANDIDATE_ID, {
      fetchImpl: detailFetch, store, config: CONFIG, now: () => new Date(T0.getTime() + 20_000),
    });
    assert.equal(detailCalls, 0);
    assert.equal(snap.freshness, "cached");
    assert.equal(snap.openingsRemaining, 33);
    assert.equal(snap.activityNumber, MSC_0007_ACTIVITY_NUMBER);
  });

  it("refuses a row whose public number doesn't match the mapping", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const store = createMemorySnapshotStore();
    const { fetchImpl } = listServer([[{ ...MALTON_ROW, number: "149897" }]]);
    const summary = await refreshActiveNetBatch({
      search: { keyword: "winter fun" }, mappings: listActiveNetMappings(), store, fetchImpl, config: CONFIG, now: () => T0,
    });
    assert.ok(summary.ok);
    assert.deepEqual(summary.updated, []);
    assert.equal(summary.idMismatch.length, 1);
    assert.equal(await store.get(MSC_0007_ACTIVITY_ID), null);
  });

  it("leaves activities missing from the list to the detail endpoint", async () => {
    resetActiveNetAvailabilityCacheForTests();
    const store = createMemorySnapshotStore();
    const { fetchImpl } = listServer([[]]);
    const summary = await refreshActiveNetBatch({
      search: { keyword: "winter fun" }, mappings: listActiveNetMappings(), store, fetchImpl, config: CONFIG, now: () => T0,
    });
    assert.ok(summary.ok);
    assert.deepEqual(summary.notInList, [MSC_0007_CANDIDATE_ID]);
    assert.equal(await store.get(MSC_0007_ACTIVITY_ID), null);
  });
});
