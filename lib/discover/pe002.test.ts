import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VenueDetail } from "@/components/discover/VenueDetail";
import {
  DROP_OFF,
  GUIDED,
  PE002_LAST_RESEARCHED,
  PE002_SCHEDULE,
  STAY_PLAY,
  pe002BooglesPlayhouse as pe002,
} from "@/data/discover/venues/pe002BooglesPlayhouse";
import { pe001AmazingFunPark as pe001 } from "@/data/discover/venues/pe001AmazingFunPark";
import { previewAsPublished } from "@/lib/discover/venuesCatalog";
import {
  buildVenueDetailView,
  isVenuePubliclyViewable,
  resolvePublicVenue,
  sessionPrice,
} from "@/lib/discover/venueDetail";
import { venueRecordToRows } from "@/lib/discover/venueRows";
import { buildVenuePublishSql, buildVenueSeedSql } from "@/lib/discover/venueSeedSql";
import { mapVenueRow } from "@/lib/discover/venuesSupabase";

const TODAY = "2026-10-24";
const preview = previewAsPublished(pe002);
const view = () => buildVenueDetailView(preview, { today: TODAY });
const html = () => renderToStaticMarkup(createElement(VenueDetail, { view: view() }));
const model = () => view().sessionPrice!;
const price = (session: string, ages: number[], adults = 1, minutes: number | null = null) =>
  sessionPrice(model(), { session, ages, adults, minutes });

describe("PE-002 Boogles Playhouse record", () => {
  it("is stored as an open draft that only a preview can show", () => {
    assert.equal(pe002.place.id, "PE-002");
    assert.equal(pe002.place.branchName, "Square One");
    assert.equal(pe002.place.publicationState, "draft");
    assert.equal(isVenuePubliclyViewable(pe002), false);
    assert.equal(isVenuePubliclyViewable(preview), true);
    assert.equal(resolvePublicVenue([preview], "play", "boogles-playhouse-square-one")?.place.id, "PE-002");
  });

  it("cites the venue's own pages for every fact", () => {
    const facts = [
      ...pe002.types, ...pe002.ageBands, ...pe002.prices, ...pe002.programs,
      ...pe002.amenities, ...pe002.policies, ...pe002.links,
    ];
    assert.ok(facts.every((f) => /^https:\/\/www\.boogles\.(ca|app)\//.test(f.sourceUrl)));
    assert.ok(facts.every((f) => f.sourceCheckedDate === PE002_LAST_RESEARCHED));
  });

  it("stores no session dates and nothing the venue doesn't publish", () => {
    assert.equal(pe002.place.hoursKind, "varies");
    assert.deepEqual(pe002.hours, []);
    assert.ok(pe002.programs.every((p) => !p.startsOn && !p.endsOn));
    const kinds = pe002.amenities.map((a) => a.amenity);
    for (const missing of ["washrooms", "change_table"] as const) assert.ok(!kinds.includes(missing), missing);
    // No HST claim either way, and the unclear drop-off sibling rate is left out.
    assert.ok(pe002.prices.every((p) => p.plusTax == null));
    assert.ok(!pe002.prices.some((p) => p.sessionName === DROP_OFF && p.siblingOnly));
  });

  it("flags the three places the venue's pages disagree", () => {
    const v = view();
    assert.equal(v.verification.conflicts, 3);
    assert.deepEqual(
      v.conflicts.map((c) => c.fact).sort(),
      ["Price: Birthday, up to 15 children", "Program: Drop-Off Play", "Program: Stay + Play"],
    );
  });
});

describe("PE-002 session prices", () => {
  it("charges $20 for the first child and $16 for each sibling at Stay + Play", () => {
    const r = price(STAY_PLAY, [5, 3]);
    assert.equal(r.total, 36);
    assert.equal(r.withTax, null);
    assert.ok(r.notes.includes("Your adult is included."));
    assert.ok(r.notes.some((n) => /doesn't say whether HST/.test(n)));
  });

  it("lets a baby sibling in free, but a baby on their own pays", () => {
    assert.equal(price(STAY_PLAY, [4, 0]).total, 20);
    assert.equal(price(STAY_PLAY, [0]).total, 20);
  });

  it("counts a second adult at $10 and says why", () => {
    const r = price(STAY_PLAY, [5, 3], 2);
    assert.equal(r.total, 46);
    assert.ok(r.notes.some((n) => /sibling's ticket covers another adult/.test(n)));
  });

  it("prices drop-off by the hour, each child in full", () => {
    assert.equal(price(DROP_OFF, [5], 1, 60).total, 25);
    assert.equal(price(DROP_OFF, [5, 3], 1, 120).total, 90);
    assert.equal(price(DROP_OFF, [5], 1, 180).total, 60);
    assert.ok(price(DROP_OFF, [5, 3], 1, 120).notes.some((n) => /sibling discount for drop-off/.test(n)));
  });

  it("leaves out children too young or too old for drop-off, and flags an 18-month check", () => {
    const r = price(DROP_OFF, [1, 0, 9], 1, 60);
    assert.equal(r.total, 25);
    assert.deepEqual(r.notEligible.map((n) => n.age), [0, 9]);
    assert.deepEqual(r.cautions, ["Age 1: Drop-Off Play is from 18 months, walking on their own."]);
  });

  it("applies the Guided Connection sibling rate", () => {
    assert.equal(price(GUIDED, [3, 2]).total, 54);
  });

  it("offers the 10-hour bundle and the drop-off rule", () => {
    const m = model();
    assert.deepEqual(m.sessions.map((s) => s.name), [STAY_PLAY, DROP_OFF, GUIDED]);
    assert.equal(m.bundle?.perHour, 17.5);
    assert.equal(m.dropOffRule, "You can leave the playhouse, but you must stay inside Square One.");
  });
});

describe("PE-002 page", () => {
  it("leads with session prices and the youngest drop-off age", () => {
    const v = view();
    assert.deepEqual(v.quickFacts, [
      { label: "Best ages", value: "0–8" },
      { label: STAY_PLAY, value: "$20" },
      { label: `${DROP_OFF}, 1–3 hours`, value: "$25–$60" },
      { label: "Drop-off ages", value: "From 18 months" },
    ]);
    assert.equal(v.priceFrom, "$20");
    assert.equal(v.hoursVary, true);
    assert.deepEqual(v.weeklyHours, []);
    assert.equal(v.primaryBooking?.href, PE002_SCHEDULE);
  });

  it("shows sessions with who stays, not an empty attractions list", () => {
    const out = html();
    assert.ok(out.includes(">Sessions and classes<"));
    assert.ok(!out.includes("What&#x27;s there"));
    assert.ok(!out.includes("Activities at this location are not confirmed yet"));
    assert.ok(out.includes('<p class="venue-attend">Parent stays</p>'));
    assert.ok(out.includes('<p class="venue-attend is-drop">Drop-off</p>'));
    assert.ok(out.includes("18 months–8 years"));
    assert.ok(out.includes(">Also on the schedule<"));
  });

  it("explains the schedule instead of a weekly hours table", () => {
    const out = html();
    assert.ok(out.includes("No fixed opening hours"));
    assert.ok(out.includes(">How the schedule works<"));
    assert.ok(!out.includes("Holiday and special hours"));
    assert.ok(out.includes("No fixed hours: times change by session."));
  });

  it("groups prices by session and shows parking once", () => {
    const out = html();
    assert.ok(out.includes(">All session prices<"));
    assert.ok(out.includes("<h4>Drop-Off Play</h4>"));
    assert.equal(out.split("the closest lots are P5 and P6").length - 1, 1);
  });

  it("uses the playroom illustration, not the climbing frame", () => {
    assert.ok(html().includes("Illustration · venue photos coming soon"));
    assert.ok(html().includes('ry="16"'));
  });
});

describe("PE-002 seed", () => {
  it("round-trips sessions through the table rows and the production mapper", () => {
    const { place, children } = venueRecordToRows(preview);
    const row = {
      ...place,
      cities: { city_town: "Mississauga" },
      ...Object.fromEntries(Object.entries(children).map(([t, list]) => [t, list.map((r, i) => ({ ...r, id: `id-${i}` }))])),
    };
    const back = mapVenueRow(row);
    assert.equal(back.prices.find((p) => p.label === `${STAY_PLAY}, each sibling`)?.siblingOnly, true);
    assert.equal(back.prices.find((p) => p.label === `${DROP_OFF}, 2 hours`)?.sessionName, DROP_OFF);
    assert.equal(back.programs.find((p) => p.name === DROP_OFF)?.attendance, "drop_off");
    const fromDb = buildVenueDetailView(back, { today: TODAY });
    assert.deepEqual(fromDb.quickFacts, view().quickFacts);
    assert.deepEqual(fromDb.sessionPrice?.sessions.map((s) => s.name), [STAY_PLAY, DROP_OFF, GUIDED]);
  });

  it("loads a draft with session columns and keeps publishing separate", () => {
    const sql = buildVenueSeedSql(pe002, {
      id: "mississauga", country: "Canada", provinceState: "Ontario", cityTown: "Mississauga", slug: "mississauga", tourismRegion: "5",
    });
    assert.match(sql, /'draft'::public\.publication_state/);
    assert.match(sql, /session_name/);
    assert.match(sql, /'drop_off'/);
    assert.match(buildVenuePublishSql(pe002), /where id = 'PE-002'/);
  });
});

describe("Ticket venues are unchanged by sessions", () => {
  it("keeps Amazing Fun Park on the age-and-day price tool", () => {
    const v = buildVenueDetailView(previewAsPublished(pe001), { today: TODAY });
    assert.equal(v.sessionPrice, null);
    assert.deepEqual(v.sessionPriceGroups, []);
    assert.ok(v.familyPrice);
    assert.equal(v.hoursVary, false);
  });
});
