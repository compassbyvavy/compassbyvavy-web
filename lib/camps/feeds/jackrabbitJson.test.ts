import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseAdapterParams, readAdapterParams } from "@/lib/camps/feeds/adapterParams";
import {
  filterJackrabbitClasses,
  jackrabbitOpeningsUrl,
  parseJackrabbitOpeningsJson,
} from "@/lib/camps/feeds/jackrabbitJson";

const sample = readFileSync(
  new URL("../../../workers/camp-watcher/fixtures/jackrabbit-openings-sample.json", import.meta.url),
  "utf8",
);

describe("adapter params", () => {
  it("keeps key=value pairs and prose filters", () => {
    const parsed = parseAdapterParams("OrgID=537009; category1=Winter Break Camp; name starts 'PA day'");
    assert.equal(parsed.values.OrgID, "537009");
    assert.equal(parsed.values.category1, "Winter Break Camp");
    assert.deepEqual(parsed.filters, ["name starts 'PA day'"]);
  });

  it("keeps a comma inside one value", () => {
    const parsed = parseAdapterParams("owner=7b98e4f9; appointmentTypeIds=99733065,99732924");
    assert.equal(parsed.values.appointmentTypeIds, "99733065,99732924");
  });

  it("reads the stored jsonb shape", () => {
    const stored = readAdapterParams({ OrgID: "542952", session: "2026 Winter Camp", filters: ["watch for PA day classes"] });
    assert.equal(stored.values.session, "2026 Winter Camp");
    assert.deepEqual(stored.filters, ["watch for PA day classes"]);
  });
});

describe("jackrabbit OpeningsJson", () => {
  it("reads the Nov 15 Gymnastics Mississauga sample row", () => {
    const parsed = parseJackrabbitOpeningsJson(sample);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const holiday = parsed.classes.find((row) => row.id === "22377848");
    assert.ok(holiday);
    assert.equal(holiday.category1, "Winter Break Camp");
    assert.equal(holiday.spots, 47);
    assert.equal(holiday.price, 80);
    assert.equal(holiday.minAge, "P05Y00M");
    assert.equal(holiday.regStartDate, "2026-10-01");
    assert.match(holiday.registerUrl ?? "", /preLoadClassID=22377848/);
  });

  it("filters by category and name, and does not hide rows for a watch-for note", () => {
    const parsed = parseJackrabbitOpeningsJson(sample);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const winter = filterJackrabbitClasses(parsed.classes, parseAdapterParams("OrgID=537009; category1=Winter Break Camp"));
    assert.deepEqual(winter.map((row) => row.id), ["22377848"]);
    const pa = filterJackrabbitClasses(parsed.classes, parseAdapterParams("OrgID=537009; name starts 'PA day'"));
    assert.deepEqual(pa.map((row) => row.id), ["300"]);
    const noted = filterJackrabbitClasses(parsed.classes, parseAdapterParams("OrgID=537009; watch for March Break category"));
    assert.equal(noted.length, 3);
  });

  it("adds Session to the feed url", () => {
    const url = jackrabbitOpeningsUrl(parseAdapterParams("OrgID=542952; session=2026 Winter Camp"));
    assert.equal(
      url,
      "https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsJson?OrgID=542952&Session=2026+Winter+Camp",
    );
  });
});
