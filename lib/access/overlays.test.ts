import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampProgram, Venue } from "@/data/camps/types";
import {
  accessRows,
  rowPassesToggles,
  stopsWithCoordinates,
  transitStops,
} from "@/lib/access/overlays";

describe("accessibility overlays", () => {
  it("badges only an explicit yes and does not plot a stop without coordinates", () => {
    const programs: CampProgram[] = [
      {
        id: "p",
        slug: "stem",
        providerId: "prov",
        name: "STEM (dev)",
        accessibilityFacts: {
          sensoryRoom: "yes",
          elevatorAccess: "unknown",
          lowStepAccess: "no",
        },
      },
    ];
    const rows = accessRows({
      programs,
      providers: [{ id: "prov", name: "Oakridge (dev)" }],
      sessions: [
        {
          id: "s",
          programId: "p",
          registrationStatus: "registration_open",
          sourceCheckedDate: "2026-08-01",
        },
      ],
    });
    assert.equal(rows[0].sensoryRoom, "yes");
    assert.equal(rows[0].elevatorAccess, "unknown");
    assert.equal(rowPassesToggles(rows[0], ["sensoryRoom"]), true);
    assert.equal(rowPassesToggles(rows[0], ["elevatorAccess"]), false);
    const venues: Venue[] = [
      { id: "v", name: "Example hall", transitAccess: "Example only — not a real stop." },
    ];
    const stops = transitStops(venues);
    assert.equal(stops.length, 1);
    assert.equal(stopsWithCoordinates(stops).length, 0);
  });
});
