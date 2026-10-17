import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampProgram, CampSession } from "@/data/camps/types";
import {
  isInclementWeatherCode,
  parseOpenMeteoPayload,
  weatherPhrase,
} from "@/lib/weather/openMeteo";
import { pivotSessions, programHasIndoorAlternative } from "@/lib/weather/pivot";

function program(partial: Partial<CampProgram> & Pick<CampProgram, "id">): CampProgram {
  return {
    slug: partial.id,
    providerId: "p",
    name: partial.name ?? "Camp named Indoor Adventures",
    ...partial,
  };
}

function session(id: string, programId: string): CampSession {
  return {
    id,
    programId,
    registrationStatus: "registration_open",
  };
}

describe("rainy-day pivot", () => {
  it("keeps indoor and indoor-fallback only, never a name", () => {
    const programs = [
      program({ id: "in", indoorOutdoor: "indoor" }),
      program({ id: "both", indoorOutdoor: "both" }),
      program({ id: "out", indoorOutdoor: "outdoor", name: "Indoor-sounding day camp" }),
      program({ id: "mystery", name: "Definitely indoors from the title" }),
    ];
    assert.equal(programHasIndoorAlternative(programs[0]), true);
    assert.equal(programHasIndoorAlternative(programs[2]), false);
    assert.equal(programHasIndoorAlternative(programs[3]), false);
    const result = pivotSessions(
      [
        session("a", "in"),
        session("b", "both"),
        session("c", "out"),
        session("d", "mystery"),
      ],
      programs,
      true,
    );
    assert.deepEqual(
      result.sessions.map((s) => s.id),
      ["a", "b"],
    );
    assert.equal(result.hiddenOutdoor, 1);
    assert.equal(result.hiddenBecauseUnknown, 1);
  });

  it("reads Open-Meteo codes without treating them as a listing badge", () => {
    assert.equal(isInclementWeatherCode(61), true);
    assert.equal(isInclementWeatherCode(0), false);
    assert.equal(weatherPhrase(63), "wet or stormy");
    const parsed = parseOpenMeteoPayload("Mississauga", {
      current: { time: "2026-10-17T12:00", weather_code: 61, temperature_2m: 8 },
    });
    assert.equal(parsed?.inclement, true);
    assert.equal(parsed?.observedAt, "2026-10-17T12:00");
    assert.equal(parseOpenMeteoPayload("Mississauga", {}), null);
  });
});
