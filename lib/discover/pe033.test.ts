import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VenueDetail } from "@/components/discover/VenueDetail";
import {
  PE033_LAST_RESEARCHED,
  PE033_OFFICIAL_SITE,
  pe033SkyZoneMississauga as pe033,
} from "@/data/discover/venues/pe033SkyZoneMississauga";
import { ageCheck, buildVenueDetailView, estimateFamilyCost, resolvePublicVenue } from "@/lib/discover/venueDetail";
import { loadVenueCatalog, previewAsPublished, venueIndexable } from "@/lib/discover/venuesCatalog";
import { venueRecordToRows } from "@/lib/discover/venueRows";
import { buildVenuePublishSql, buildVenueSeedSql } from "@/lib/discover/venueSeedSql";
import {
  fetchPublishedVenue,
  mapVenueRow,
  publishedVenueQueryUrl,
  readPublicSupabaseConfig,
} from "@/lib/discover/venuesSupabase";

const TODAY = "2026-10-16";
const preview = previewAsPublished(pe033);
const view = () => buildVenueDetailView(preview, { today: TODAY });
const html = () => renderToStaticMarkup(createElement(VenueDetail, { view: view() }));
/** The rows anon can read for PE-033, captured from the migrated schema after running the seed. */
const anonResponse = JSON.parse(
  readFileSync(join(process.cwd(), "lib/discover/__fixtures__/pe033-anon-response.json"), "utf8"),
) as Record<string, unknown>[];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Strip ids (UUIDs in the database, readable keys in the TS record) before comparing views. */
function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutIds);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([k]) => k !== "id").map(([k, v]) => [k, withoutIds(v)]),
    );
  }
  return value;
}

describe("PE-033 Sky Zone Mississauga record", () => {
  it("is stored as a draft and is only public once published", () => {
    assert.equal(pe033.place.publicationState, "draft");
    assert.equal(resolvePublicVenue([pe033], "play", "sky-zone-mississauga"), null);
    assert.equal(resolvePublicVenue([preview], "play", "sky-zone-mississauga")?.place.id, "PE-033");
  });

  it("keeps the supplied identity, address, location note and setting", () => {
    const v = view();
    assert.equal(v.overview.name, "Sky Zone");
    assert.equal(v.overview.branchName, "Mississauga");
    assert.match(v.overview.address ?? "", /^3636 Hawkestone Rd, Mississauga ON L5C 2V2$/);
    assert.equal(v.overview.setting, "Indoor");
    assert.match(html(), /Hub Climbing \(Unit 1\), a separate business/);
  });

  it("maps to the supplied Play & Entertainment types, primary first", () => {
    assert.deepEqual(view().overview.types.map((t) => t.label), [
      "Trampoline Parks",
      "Ninja Warrior Gyms",
      "Adventure Courses",
      "Family Entertainment Centres",
    ]);
    assert.deepEqual(pe033.types.filter((t) => t.isPrimary).map((t) => t.placeType), ["Trampoline Parks"]);
  });

  it("shows all ten confirmed activities", () => {
    assert.equal(view().activities.length, 10);
    assert.ok(view().activities.some((a) => a.name === "Warped Wall"));
  });

  it("uses the last-researched date for every fact", () => {
    const sources = view().sources;
    assert.ok(sources.length > 0);
    assert.ok(sources.every((s) => s.lastChecked === "Sep 24, 2026"));
    assert.equal(PE033_LAST_RESEARCHED, "2026-09-24");
  });

  it("shows the verified prices and hides the undated offer and also-seen tiers", () => {
    const v = view();
    assert.deepEqual(v.prices.map((s) => s.heading), ["Admission", "Memberships"]);
    const labels = v.prices.flatMap((s) => s.lines.map((l) => l.label));
    assert.deepEqual(labels, [
      "120-minute single ticket",
      "Basic Play membership",
      "Extra Play Monthly",
      "Extra Play Annual",
      "Parent add-on for Extra Play members",
    ]);
    const page = html();
    assert.doesNotMatch(page, /Buy 2 Get 2|Elite|2026 Annual Pass|65\.98|194\.99/);
  });

  it("invents no hours, booking link or unconfirmed amenities", () => {
    const v = view();
    assert.equal(v.visit.hours.kind, "unknown");
    assert.deepEqual(v.visit.bookingLinks, []);
    assert.equal(v.visit.website?.href, PE033_OFFICIAL_SITE);
    const confirmed = v.amenities.filter((a) => a.status === "confirmed").map((a) => a.kind).sort();
    assert.deepEqual(confirmed, ["food_onsite", "grip_socks", "party_rooms"]);
    assert.ok(v.amenities.filter((a) => a.status !== "confirmed").every((a) => a.status === "not_confirmed"));
    const page = html();
    assert.match(page, /Hours not confirmed yet/);
    assert.doesNotMatch(page, /[Kk]osher|Wi-?Fi available|[Bb]ook now/);
  });

  it("shows the first-hand note without a source link and keeps uncited reviewer themes out", () => {
    const e = view().experience;
    assert.equal(e.status, "limited");
    assert.equal(e.firstHand.length, 1);
    assert.match(e.firstHand[0].summary, /10-minute drop-off visit confirms the venue is operating/);
    assert.equal(e.firstHand[0].meta.sourceUrl, null);
    assert.deepEqual([...e.liked, ...e.concerns, ...e.otherReported], []);
    const page = html();
    assert.match(page, /Limited information/);
    assert.doesNotMatch(page, /birthday-party hosts|overheating|air-freshener/);
    assert.match(view().reviews.coverage, /No permitted review or editorial sources/);
    // The themes are kept, awaiting sources.
    assert.equal(pe033.experienceThemes.filter((t) => t.basis === "reviewer_reported").length, 8);
    assert.ok(pe033.experienceThemes.filter((t) => t.basis === "reviewer_reported").every((t) => t.verificationStatus === "needs_follow_up" && !t.reviewSourceId));
  });

  it("keeps official eligibility and the best-fit range apart", () => {
    assert.match(html(), /Open to all ages\./);
    assert.equal(ageCheck(view().ageTool, 7).band?.fitLabel, "Good fit");
    assert.equal(ageCheck(view().ageTool, 1).band?.fitLabel, "Limited");
  });

  it("estimates admission without guessing the SkySocks price or a watcher price", () => {
    const model = view().costEstimator!;
    assert.deepEqual(model.childOptions.map((l) => l.label), ["120-minute single ticket"]);
    assert.deepEqual(model.participatingAdultOptions.map((l) => l.label), ["120-minute single ticket"]);
    assert.deepEqual(model.watchingAdultOptions, []);
    assert.ok(model.assumptions.some((a) => /SkySocks are required/.test(a)));
    assert.ok(model.assumptions.some((a) => /doesn't say whether some prices include tax/.test(a)));
    const est = estimateFamilyCost(model, {
      children: 2,
      childLineId: "pe033-ticket-120",
      participatingAdults: 1,
      participatingAdultLineId: "pe033-ticket-120",
      watchingAdults: 1,
      watchingAdultLineId: null,
    })!;
    assert.equal(est.total, Math.round(3 * 32.99 * 100) / 100);
    assert.ok(est.excluded.some((e) => /1 adult watching: no verified price/.test(e)));
    assert.ok(est.excluded.some((e) => /SkySocks/.test(e)));
    assert.ok(!est.lines.some((l) => /membership|add-on/i.test(l.label)), "optional memberships never added");
  });
});

describe("production venue catalog (Supabase)", () => {
  const config = { url: "https://proj.supabase.co", anonKey: "anon-key" };

  it("reads only published, open places by slug, with public child facts", () => {
    const url = new URL(publishedVenueQueryUrl(config.url, "sky-zone-mississauga"));
    assert.equal(url.pathname, "/rest/v1/places");
    assert.equal(url.searchParams.get("slug"), "eq.sky-zone-mississauga");
    assert.equal(url.searchParams.get("publication_state"), "eq.published");
    assert.equal(url.searchParams.get("published_at"), "not.is.null");
    assert.equal(url.searchParams.get("operating_status"), "eq.open");
    assert.match(url.searchParams.get("select") ?? "", /place_prices\(\*\)/);
  });

  it("uses the anon key only, never the service role", () => {
    assert.equal(readPublicSupabaseConfig({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "secret" }), null);
    assert.deepEqual(readPublicSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co/", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a" }), {
      url: "https://x.supabase.co",
      anonKey: "a",
    });
  });

  it("maps the anon response to the same page as the reviewed record", async () => {
    let seen: { url: string; headers: Record<string, string> } | null = null;
    const record = await fetchPublishedVenue(
      {
        ...config,
        fetchImpl: async (url, init) => {
          seen = { url, headers: init?.headers as Record<string, string> };
          return jsonResponse(anonResponse);
        },
      },
      "sky-zone-mississauga",
    );
    assert.ok(record);
    assert.equal(seen!.headers.apikey, "anon-key");
    assert.equal(seen!.headers.Authorization, "Bearer anon-key");
    assert.equal(resolvePublicVenue([record], "play", "sky-zone-mississauga")?.place.id, "PE-033");
    const fromDb = buildVenueDetailView(record, { today: TODAY });
    assert.deepEqual(withoutIds(fromDb), withoutIds(view()));
  });

  it("drops facts awaiting follow-up even if a row slips through", () => {
    const { place, children } = venueRecordToRows(preview);
    const row = { ...place, cities: { city_town: "Mississauga" }, ...children };
    const record = mapVenueRow(row);
    assert.equal(record.prices.length, 5);
    assert.equal(record.experienceThemes.length, 1);
    assert.ok(record.prices.every((p) => p.verificationStatus === "verified"));
  });

  it("returns nothing for bad slugs, errors, empty results and network failures", async () => {
    let calls = 0;
    const count = async () => {
      calls += 1;
      return jsonResponse([]);
    };
    assert.equal(await fetchPublishedVenue({ ...config, fetchImpl: count }, "../places?select=*"), null);
    assert.equal(calls, 0, "invalid slug never reaches the network");
    assert.equal(await fetchPublishedVenue({ ...config, fetchImpl: count }, "sky-zone-brampton"), null);
    assert.equal(await fetchPublishedVenue({ ...config, fetchImpl: async () => jsonResponse({ message: "x" }, 500) }, "sky-zone-mississauga"), null);
    assert.equal(await fetchPublishedVenue({ ...config, fetchImpl: async () => { throw new Error("offline"); } }, "sky-zone-mississauga"), null);
  });

  it("loads production records from Supabase and marks them indexable", async () => {
    const catalog = await loadVenueCatalog({
      venueSlug: "sky-zone-mississauga",
      nodeEnv: "production",
      supabase: { ...config, fetchImpl: async () => jsonResponse(anonResponse) },
    });
    assert.equal(catalog?.sourceLabel, "published");
    assert.equal(catalog?.records.length, 1);
    assert.equal(venueIndexable("published"), true);
    assert.equal(venueIndexable("dev_preview"), false);
  });
});

describe("venue page metadata", () => {
  const env = process.env as Record<string, string | undefined>;
  const saved = { NODE_ENV: env.NODE_ENV, SUPABASE_URL: env.SUPABASE_URL, SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY };
  const realFetch = globalThis.fetch;
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete env[k];
      else env[k] = v;
    }
    globalThis.fetch = realFetch;
  });
  const meta = async (slug: string, venue: string) => {
    const page = await import("@/app/discover/[slug]/[venue]/page");
    return page.generateMetadata({ params: Promise.resolve({ slug, venue }) });
  };

  it("never indexes development fixtures or previews", async () => {
    env.NODE_ENV = "development";
    assert.deepEqual((await meta("play", "maple-leap-play-centre-heartland")).robots, { index: false, follow: false });
    assert.deepEqual((await meta("play", "sky-zone-mississauga")).robots, { index: false, follow: false });
  });

  it("indexes a published production venue page", async () => {
    env.NODE_ENV = "production";
    env.SUPABASE_URL = "https://proj.supabase.co";
    env.SUPABASE_ANON_KEY = "anon-key";
    globalThis.fetch = (async () => jsonResponse(anonResponse)) as typeof fetch;
    const m = await meta("play", "sky-zone-mississauga");
    assert.deepEqual(m.robots, { index: true, follow: true });
    assert.equal(m.title, "Sky Zone — Mississauga");
  });

  // When no venue resolves, the page falls back to the gated example listings
  // (which read request headers, so they can't run here) and then to a noindex
  // not-found. These check that drafts and wrong categories never resolve.
  it("never resolves drafts or a venue under the wrong category", async () => {
    const config = { url: "https://proj.supabase.co", anonKey: "anon-key" };
    // A draft never comes back from the published query (RLS + filters).
    const none = await loadVenueCatalog({
      venueSlug: "sky-zone-mississauga",
      nodeEnv: "production",
      supabase: { ...config, fetchImpl: async () => jsonResponse([]) },
    });
    assert.equal(none, null);
    const published = await loadVenueCatalog({
      venueSlug: "sky-zone-mississauga",
      nodeEnv: "production",
      supabase: { ...config, fetchImpl: async () => jsonResponse(anonResponse) },
    });
    assert.equal(resolvePublicVenue(published!.records, "parks", "sky-zone-mississauga"), null);
    assert.equal(resolvePublicVenue([pe033], "play", "sky-zone-mississauga"), null, "draft record");
  });
});

describe("PE-033 seed", () => {
  const sql = buildVenueSeedSql(pe033, {
    id: "mississauga",
    country: "Canada",
    provinceState: "Ontario",
    cityTown: "Mississauga",
    slug: "mississauga",
    tourismRegion: "5",
  });

  it("matches the committed seed file", () => {
    const committed = readFileSync(join(process.cwd(), "supabase/seeds/discover/pe-033-sky-zone-mississauga.sql"), "utf8");
    assert.equal(sql, committed, "regenerate with: npx tsx scripts/discover/build-venue-seed.ts");
  });

  it("loads the venue as a draft and never changes publication on re-run", () => {
    assert.match(sql, /Loads the venue as a DRAFT/);
    assert.match(sql, /'draft'::public\.publication_state/);
    const statements = sql.split("\n").filter((l) => !l.startsWith("--")).join("\n");
    assert.doesNotMatch(statements, /'published'|published_at/);
    assert.match(sql, /apply pe-033-sky-zone-mississauga\.publish\.sql separately/);
    assert.doesNotMatch(sql, /publication_state = excluded/);
  });

  it("keeps follow-up facts stored but hidden, and dates every fact Sep 24", () => {
    assert.equal((sql.match(/'needs_follow_up'/g) ?? []).length, 11, "3 prices + 8 reviewer themes");
    assert.doesNotMatch(sql, /2026-09-23/);
    assert.doesNotMatch(sql, /place_hours \(|place_programs \(|place_review_sources \(/);
  });

  it("refuses to seed a record that is already marked published", () => {
    assert.throws(() => buildVenueSeedSql(previewAsPublished(pe033), { id: "x", country: "Canada", provinceState: "Ontario", cityTown: "X", slug: "x", tourismRegion: null }));
  });

  it("publishes only through the separate, guarded publish file", () => {
    const publish = buildVenuePublishSql(pe033);
    const committed = readFileSync(join(process.cwd(), "supabase/seeds/discover/pe-033-sky-zone-mississauga.publish.sql"), "utf8");
    assert.equal(publish, committed);
    assert.match(publish, /operating_status = 'open'/);
    assert.match(publish, /raise exception 'Not published/);
    assert.match(publish, /published_at = coalesce\(published_at,/);
  });
});
