import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { coordinatesSql, locateQuery, pickLocation, venuesFromSeedSql } from "@/lib/camps/locateVenues";

const futures = {
  id: "venue-futures-gymnastics-millcreek",
  name: "Futures Gymnastics",
  addressLine: "6991 Millcreek Dr, Unit 8",
  postalCode: "L5N 6B9",
};

describe("locateVenues", () => {
  it("reads every venue from the committed camp seeds", () => {
    const dir = join(process.cwd(), "supabase/seeds/camps");
    const ids = readdirSync(dir)
      .filter((f) => f.endsWith(".sql") && !f.endsWith(".publish.sql"))
      .flatMap((f) => venuesFromSeedSql(readFileSync(join(dir, f), "utf8")).map((v) => v.id));
    for (const id of ["venue-cooksmart-clarkson", "venue-futures-gymnastics-millcreek", "venue-mississauga-ymca"]) {
      assert.ok(ids.includes(id), `${id} not read`);
    }
  });

  it("drops unit numbers from the lookup", () => {
    assert.equal(locateQuery(futures), "6991 Millcreek Dr, Mississauga, ON");
    assert.equal(
      locateQuery({ ...futures, addressLine: "6820 Kitimat Rd, Units 5 & 6" }),
      "6820 Kitimat Rd, Mississauga, ON",
    );
  });

  it("only accepts an answer with the same street number, inside Mississauga", () => {
    const wrongNumber = { title: "6900 Millcreek Dr, Mississauga, Ontario", geometry: { coordinates: [-79.75, 43.59] } };
    const wrongCity = { title: "6991 Millcreek Dr, Ottawa, Ontario", geometry: { coordinates: [-75.7, 45.4] } };
    const right = {
      title: "6991 Millcreek Dr, Mississauga, Ontario",
      qualifier: "INTERPOLATED_POSITION",
      geometry: { coordinates: [-79.7512345678, 43.5934567891] },
    };
    assert.equal(pickLocation(futures, [wrongNumber, wrongCity]), null);
    assert.equal(pickLocation(futures, { error: "x" }), null);
    const hit = pickLocation(futures, [wrongNumber, right]);
    assert.ok(hit);
    assert.equal(hit.lat, 43.593457);
    assert.equal(hit.lng, -79.751235);
  });

  it("writes an update that only touches coordinates", () => {
    const sql = coordinatesSql(
      [{ ...futures, lat: 43.59, lng: -79.75, matchedTitle: "6991 Millcreek Dr, Mississauga, Ontario", qualifier: null }],
      "2026-11-13",
    );
    assert.match(sql, /Open Government Licence/);
    assert.match(sql, /update public\.venues set latitude = 43\.59, longitude = -79\.75, updated_at = .* where id = 'venue-futures-gymnastics-millcreek';/);
    assert.doesNotMatch(sql, /publication_state/);
  });
});
