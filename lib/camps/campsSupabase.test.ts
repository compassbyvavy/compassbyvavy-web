/**
 * Published camps catalog read. Mocked fetch only — no database.
 * Run: npm test
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CampsCatalogUnavailable } from "@/components/camps/CampsCatalogUnavailable";
import {
  formatCampsCatalogBanner,
  loadCampsCatalog,
  loadCampsCatalogForLayout,
} from "@/lib/camps/catalog";
import {
  fetchPublishedCampsCatalog,
  publishedCampsQueryUrl,
  readPublicCampsSupabaseConfig,
  type CampsFetchInit,
} from "@/lib/camps/campsSupabase";
import { getRegistrationAction } from "@/lib/camps/registrationAction";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PREVIEW_HOST = "fdc8c975-compassbyvavy-web.compassbyvavy.workers.dev";
const PUBLISHED_AT = "2026-01-15T12:00:00Z";

function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

function jsonResponse(
  body: unknown,
  contentRange: string | null,
  status = 200,
): Response {
  const headers = new Headers({ "content-type": "application/json" });
  if (contentRange !== null) headers.set("content-range", contentRange);
  return new Response(JSON.stringify(body), { status, headers });
}

function provider(overrides: Record<string, unknown> = {}) {
  return {
    id: "prov-harbour",
    name: "Harbour Arts",
    website_url: "https://example.invalid/harbour",
    registration_info_url: null,
    notes: "Public provider note",
    contact_email: "secret@example.invalid",
    contact_phone: "555-0100",
    facebook_url: "https://facebook.example/harbour",
    instagram_url: "https://instagram.example/harbour",
    research_notes: "private research note",
    publication_state: "published",
    published_at: PUBLISHED_AT,
    ...overrides,
  };
}

function venue(overrides: Record<string, unknown> = {}) {
  return {
    id: "venue-port",
    name: "Port Credit Hall",
    neighbourhood: "Port Credit",
    address_line: "1 Lake St",
    postal_code: "L5H 1A1",
    latitude: 43.55,
    longitude: -79.58,
    notes: null,
    wheelchair_accessible: null,
    publication_state: "published",
    published_at: PUBLISHED_AT,
    cities: {
      city_town: "Mississauga",
      province_state: "Ontario",
      research_notes: "city research",
    },
    ...overrides,
  };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess-live",
    program_id: "prog-live",
    venue_id: "venue-port",
    start_date: "2026-07-06",
    end_date: "2026-07-10",
    timing_label: "Summer",
    schedule_format: "not-a-real-format",
    stay_type: null,
    delivery_mode: "in_person",
    core_hours_start: "09:00:00",
    core_hours_end: "16:00:00",
    before_care_offered: "yes",
    before_care_start_time: "07:30:00",
    before_care_end_time: "09:00:00",
    before_care_separate_booking: "unknown",
    after_care_offered: "no",
    after_care_start_time: null,
    after_care_end_time: null,
    after_care_separate_booking: null,
    price_amount: "399.00",
    price_unit: "per_week",
    currency: "CAD",
    fee_notes: null,
    registration_status: "availability_unknown",
    registration_opens_on: null,
    waitlist_url: null,
    registration_url: "https://example.invalid/register",
    source_url: "https://example.invalid/source",
    source_checked_date: "2026-08-01",
    provider_confirmed: false,
    seat_availability: null,
    age_min: null,
    age_max: null,
    age_min_inclusive: null,
    age_max_inclusive: null,
    age_assessed_at_date: null,
    age_assessment_rule: null,
    notes: null,
    publication_state: "published",
    published_at: PUBLISHED_AT,
    venues: venue(),
    ...overrides,
  };
}

function publishedProgram() {
  return {
    id: "prog-live",
    slug: "harbour-arts-week",
    provider_id: "prov-harbour",
    name: "Harbour Arts Week",
    description: "Painting by the lake.",
    primary_category: "Arts",
    secondary_themes: ["Visual arts"],
    typical_age_min: 8,
    typical_age_max: 12,
    typical_age_min_inclusive: true,
    typical_age_max_inclusive: true,
    typical_age_assessed_at_date: "2026-07-01",
    audience: "child_only",
    accessibility_support_tags: [],
    experience_summary: null,
    prerequisites: null,
    support_info: null,
    policies_summary: null,
    preparation_notes: null,
    notes: "Program note",
    image_src: "https://example.invalid/secret-photo.jpg",
    image_alt: "do not map this alt",
    publication_state: "published",
    published_at: PUBLISHED_AT,
    providers: provider(),
    camp_sessions: [
      session({ id: "sess-draft", publication_state: "draft", published_at: null }),
      session(),
      session({
        id: "sess-no-venue",
        venue_id: "venue-missing",
        venues: null,
        age_min: 6,
        age_max: 9,
        price_amount: "399.50",
      }),
      session({
        id: "sess-draft-venue",
        venues: venue({
          id: "venue-draft",
          name: "Draft Hall",
          publication_state: "draft",
          published_at: null,
        }),
      }),
    ],
    camp_packing_items: [
      { body: "Sun hat", kind: "suggested", sort_order: 2 },
      { body: "Water bottle", kind: "required", sort_order: 1 },
      { body: "Mystery item", kind: "optional", sort_order: 0 },
    ],
  };
}

function mixedRows() {
  return [
    {
      id: "prog-draft",
      slug: "draft-camp",
      name: "Draft Camp",
      provider_id: "prov-harbour",
      publication_state: "draft",
      published_at: null,
      typical_age_min: 4,
      providers: provider(),
      camp_sessions: [session({ id: "sess-on-draft-program" })],
    },
    {
      id: "prog-hidden",
      slug: "hidden-provider",
      name: "Hidden Provider Camp",
      provider_id: "prov-draft",
      publication_state: "published",
      published_at: PUBLISHED_AT,
      providers: provider({
        id: "prov-draft",
        name: "Draft Org",
        publication_state: "draft",
        published_at: null,
      }),
      camp_sessions: [session({ id: "sess-hidden", program_id: "prog-hidden" })],
    },
    publishedProgram(),
  ];
}

describe("published camps supabase read", { concurrency: 1 }, () => {
  it("sends the anon key, published filters, and a five-minute revalidate", async () => {
    let seenUrl = "";
    let seenInit: CampsFetchInit | undefined;
    const result = await fetchPublishedCampsCatalog({
      url: "https://proj.supabase.co/",
      anonKey: "anon-key",
      fetchImpl: async (url, init) => {
        seenUrl = url;
        seenInit = init;
        return jsonResponse([], "*/0");
      },
    });
    assert.equal(result.status, "empty");
    const url = new URL(seenUrl);
    assert.equal(url.origin + url.pathname, "https://proj.supabase.co/rest/v1/camp_programs");
    assert.equal(url.searchParams.get("publication_state"), "eq.published");
    assert.equal(url.searchParams.get("published_at"), "not.is.null");
    const select = url.searchParams.get("select") ?? "";
    assert.match(select, /providers\(/);
    assert.match(select, /camp_sessions\(/);
    assert.match(select, /venues\(/);
    assert.match(select, /cities\(city_town,province_state\)/);
    assert.match(select, /camp_packing_items\(body,kind,sort_order\)/);
    for (const forbidden of [
      "image_src",
      "image_alt",
      "contact_email",
      "contact_phone",
      "research_notes",
      "facebook_url",
      "instagram_url",
      "*",
    ]) {
      assert.equal(select.includes(forbidden), false, forbidden);
    }
    const headers = seenInit?.headers as Record<string, string>;
    assert.equal(headers.apikey, "anon-key");
    assert.equal(headers.Authorization, "Bearer anon-key");
    assert.equal(headers.Accept, "application/json");
    assert.equal(headers.Prefer, "count=exact");
    assert.equal(JSON.stringify(headers).includes("service-role"), false);
    assert.equal(seenInit?.next?.revalidate, 300);
    assert.equal(seenInit?.cache, undefined);
    assert.notEqual(seenInit?.cache, "no-store");
    assert.equal(
      publishedCampsQueryUrl("https://proj.supabase.co"),
      seenUrl,
    );
  });

  it("never reads the service role key", async () => {
    const source = readFileSync(path.join(repoRoot, "lib/camps/campsSupabase.ts"), "utf8");
    assert.equal(source.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.doesNotMatch(source, /venuesSupabase|lib\/discover/);
    assert.equal(
      readPublicCampsSupabaseConfig({
        SUPABASE_URL: "https://proj.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
      }),
      null,
    );
    assert.deepEqual(
      readPublicCampsSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co/",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-from-public",
      }),
      { url: "https://proj.supabase.co", anonKey: "anon-from-public" },
    );

    const previous = process.env.NODE_ENV;
    const keys = [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ] as const;
    const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    let calls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      calls += 1;
      throw new Error("service role must not fetch");
    }) as typeof fetch;
    setNodeEnv("production");
    try {
      for (const key of keys) delete process.env[key];
      process.env.SUPABASE_URL = "https://proj.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
      const result = await loadCampsCatalog();
      assert.equal(result.status, "failed");
      assert.equal(calls, 0);
    } finally {
      globalThis.fetch = originalFetch;
      setNodeEnv(previous);
      for (const key of keys) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  });

  it("drops drafts and keeps a published session when the venue is missing", async () => {
    const rows = mixedRows();
    const result = await fetchPublishedCampsCatalog({
      url: "https://proj.supabase.co",
      anonKey: "anon-key",
      fetchImpl: async () => jsonResponse(rows, `0-${rows.length - 1}/${rows.length}`),
    });
    assert.equal(result.status, "ready");
    if (result.status !== "ready") return;
    const { catalog } = result;
    assert.equal(catalog.sourceLabel, "published");
    assert.equal(catalog.includesFictionalFixtures, false);
    assert.equal(formatCampsCatalogBanner(catalog), null);
    assert.deepEqual(
      catalog.programs.map((program) => program.slug),
      ["harbour-arts-week"],
    );
    assert.deepEqual(
      catalog.sessions.map((item) => item.id).sort(),
      ["sess-draft-venue", "sess-live", "sess-no-venue"],
    );

    const program = catalog.programs[0];
    assert.equal(program.typicalAgeMin, 8);
    assert.equal(program.typicalAgeMax, 12);
    assert.equal(program.notes, "Program note");
    assert.equal("imageSrc" in program, false);
    assert.equal("imageAlt" in program, false);
    assert.equal(JSON.stringify(program).includes("secret-photo"), false);
    assert.equal(JSON.stringify(program).includes("do not map this alt"), false);
    assert.deepEqual(program.packingItems, [
      { text: "Water bottle", kind: "required" },
      { text: "Sun hat", kind: "suggested" },
    ]);

    const live = catalog.sessions.find((item) => item.id === "sess-live");
    assert.ok(live);
    assert.equal(live.ageMin, null);
    assert.equal(live.ageMax, null);
    assert.equal(live.priceAmount, 399);
    assert.equal(live.startDate, "2026-07-06");
    assert.equal(live.endDate, "2026-07-10");
    assert.equal(live.coreHoursStart, "09:00");
    assert.equal(live.coreHoursEnd, "16:00");
    assert.equal(live.beforeCare?.startTime, "07:30");
    assert.equal(live.scheduleFormat, "unknown");
    assert.equal(live.stayType, null);
    assert.equal(live.seatAvailability, null);
    assert.equal(live.venueId, "venue-port");

    const missingVenue = catalog.sessions.find((item) => item.id === "sess-no-venue");
    assert.ok(missingVenue);
    assert.equal(missingVenue.venueId, null);
    assert.equal(missingVenue.ageMin, 6);
    assert.equal(missingVenue.priceAmount, 399.5);
    const draftVenue = catalog.sessions.find((item) => item.id === "sess-draft-venue");
    assert.ok(draftVenue);
    assert.equal(draftVenue.venueId, null);

    assert.equal(catalog.venues.length, 1);
    assert.equal(catalog.venues[0].city, "Mississauga");
    assert.equal(catalog.venues[0].province, "Ontario");
    assert.equal(catalog.venues[0].wheelchairAccessible, null);
    assert.equal(JSON.stringify(catalog.venues).includes("city research"), false);
    assert.equal(JSON.stringify(catalog.venues).includes("Draft Hall"), false);

    assert.equal(catalog.providers.length, 1);
    assert.equal(catalog.providers[0].notes, "Public provider note");
    const providerJson = JSON.stringify(catalog.providers);
    assert.equal(providerJson.includes("secret@example.invalid"), false);
    assert.equal(providerJson.includes("555-0100"), false);
    assert.equal(providerJson.includes("facebook.example"), false);
    assert.equal(providerJson.includes("instagram.example"), false);
    assert.equal(providerJson.includes("private research note"), false);
  });

  it("treats transport failures as failed and an exact empty count as empty", async () => {
    const config = {
      url: "https://proj.supabase.co",
      anonKey: "anon-key",
    };
    assert.equal(
      (await fetchPublishedCampsCatalog({
        ...config,
        fetchImpl: async () => jsonResponse([], "*/0", 500),
      })).status,
      "failed",
    );
    assert.equal(
      (await fetchPublishedCampsCatalog({
        ...config,
        fetchImpl: async () => {
          throw new Error("offline");
        },
      })).status,
      "failed",
    );
    assert.equal(
      (await fetchPublishedCampsCatalog({
        ...config,
        fetchImpl: async () => jsonResponse({ message: "nope" }, "*/0"),
      })).status,
      "failed",
    );
    assert.equal(
      (await fetchPublishedCampsCatalog({
        ...config,
        fetchImpl: async () => jsonResponse([], null),
      })).status,
      "failed",
    );
    assert.equal(
      (await fetchPublishedCampsCatalog({
        ...config,
        fetchImpl: async () => jsonResponse([], "0-0/*"),
      })).status,
      "failed",
    );
    assert.equal(
      (await fetchPublishedCampsCatalog({
        ...config,
        fetchImpl: async () => jsonResponse([], "*/0"),
      })).status,
      "empty",
    );
  });

  it("fails closed when the exact count is greater than the rows returned", async () => {
    const row = publishedProgram();
    const truncated = await fetchPublishedCampsCatalog({
      url: "https://proj.supabase.co",
      anonKey: "anon-key",
      fetchImpl: async () => jsonResponse([row], "0-0/2"),
    });
    assert.equal(truncated.status, "failed");

    const complete = await fetchPublishedCampsCatalog({
      url: "https://proj.supabase.co",
      anonKey: "anon-key",
      fetchImpl: async () => jsonResponse([row], "0-0/1"),
    });
    assert.equal(complete.status, "ready");
    if (complete.status === "ready") {
      assert.equal(complete.catalog.programs.length, 1);
    }
  });

  it("does not fetch in non-production or on a review preview", async () => {
    const previous = process.env.NODE_ENV;
    const savedUrl = process.env.SUPABASE_URL;
    const savedKey = process.env.SUPABASE_ANON_KEY;
    const savedService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let calls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      calls += 1;
      throw new Error("dev and review preview must not fetch");
    }) as typeof fetch;
    try {
      setNodeEnv("development");
      process.env.SUPABASE_URL = "https://proj.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
      const dev = await loadCampsCatalog({ nodeEnv: "development" });
      assert.equal(calls, 0);
      assert.equal(dev.status, "ready");
      if (dev.status === "ready") assert.equal(dev.catalog.sourceLabel, "mixed_dev");

      setNodeEnv("production");
      const preview = await loadCampsCatalog({
        nodeEnv: "production",
        hostname: PREVIEW_HOST,
        reviewFlag: "true",
      });
      assert.equal(calls, 0);
      assert.equal(preview.status, "ready");
      if (preview.status === "ready") {
        assert.equal(preview.catalog.sourceLabel, "dev_fixtures");
        assert.equal(
          preview.catalog.programs.some((program) => program.slug === "nutty-summer-science-camp"),
          false,
        );
      }
    } finally {
      globalThis.fetch = originalFetch;
      setNodeEnv(previous);
      if (savedUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = savedUrl;
      if (savedKey === undefined) delete process.env.SUPABASE_ANON_KEY;
      else process.env.SUPABASE_ANON_KEY = savedKey;
      if (savedService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = savedService;
    }
  });

  it("does not let the site layout fetch in production", () => {
    const previous = process.env.NODE_ENV;
    const savedUrl = process.env.SUPABASE_URL;
    const savedKey = process.env.SUPABASE_ANON_KEY;
    let calls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      calls += 1;
      throw new Error("layout must not fetch");
    }) as typeof fetch;
    setNodeEnv("production");
    process.env.SUPABASE_URL = "https://proj.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    try {
      assert.equal(loadCampsCatalogForLayout(), null);
      assert.equal(calls, 0);
    } finally {
      globalThis.fetch = originalFetch;
      setNodeEnv(previous);
      if (savedUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = savedUrl;
      if (savedKey === undefined) delete process.env.SUPABASE_ANON_KEY;
      else process.env.SUPABASE_ANON_KEY = savedKey;
    }

    const layout = readFileSync(path.join(repoRoot, "app/layout.tsx"), "utf8");
    assert.match(layout, /loadCampsCatalogForLayout\(/);
    assert.doesNotMatch(layout, /loadCampsCatalogForRequest/);
    assert.doesNotMatch(layout, /campsSupabase/);
    assert.doesNotMatch(layout, /fetch\(/);
  });

  it("keeps public camp reads behind published_at and publication_state", () => {
    const sql = readFileSync(
      path.join(repoRoot, "supabase/migrations/20260910180000_compass_website_schema_v1.sql"),
      "utf8",
    );
    for (const name of [
      "providers_public_read",
      "venues_public_read",
      "camp_programs_public_read",
      "camp_sessions_public_read",
    ]) {
      const marker = `create policy ${name}`;
      const start = sql.indexOf(marker);
      assert.ok(start >= 0, name);
      const next = sql.indexOf("create policy", start + marker.length);
      const body = sql.slice(start, next === -1 ? sql.length : next);
      assert.match(body, /publication_state = 'published'/);
      assert.match(body, /published_at is not null/);
    }
  });

  it("shows the load-failed sentence instead of the gathering copy", () => {
    const label = getRegistrationAction({ kind: "load_failed" }).label;
    assert.equal(label, "Sessions couldn't be loaded");
    const failed = renderToStaticMarkup(
      createElement(CampsCatalogUnavailable, { reason: "failed" }),
    ).replaceAll("&#x27;", "'");
    const empty = renderToStaticMarkup(
      createElement(CampsCatalogUnavailable, { reason: "empty" }),
    );
    assert.ok(failed.includes(label));
    assert.equal(failed.includes("still gathering"), false);
    assert.equal(failed.includes("No matching camps"), false);
    assert.match(empty, /still gathering verified Mississauga camp sessions/);
    assert.equal(empty.includes(label), false);

    const detail = readFileSync(path.join(repoRoot, "app/camps/[slug]/page.tsx"), "utf8");
    assert.match(detail, /status === "failed"/);
    assert.match(detail, /CampsCatalogUnavailable/);
    assert.match(detail, /notFound\(\)/);
  });

  it("refuses the read when a browser window is present", async () => {
    let calls = 0;
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    try {
      const result = await fetchPublishedCampsCatalog({
        url: "https://proj.supabase.co",
        anonKey: "anon-key",
        fetchImpl: async () => {
          calls += 1;
          return jsonResponse([], "*/0");
        },
      });
      assert.equal(result.status, "failed");
      assert.equal(calls, 0);
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });
});
