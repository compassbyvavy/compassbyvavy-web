import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseActiveNetTimeRange } from "@/lib/camps/availability/activenet/parseTimeRange";

describe("parseActiveNetTimeRange", () => {
  it("parses the City list time_range for Winter Fun", () => {
    assert.deepEqual(parseActiveNetTimeRange("9:00 AM - 4:00 PM"), {
      start: "09:00",
      end: "16:00",
    });
  });

  it("handles noon and midnight", () => {
    assert.deepEqual(parseActiveNetTimeRange("12:00 PM - 12:00 AM"), {
      start: "12:00",
      end: "00:00",
    });
  });

  it("returns nulls when the string is missing or not a range", () => {
    assert.deepEqual(parseActiveNetTimeRange(null), { start: null, end: null });
    assert.deepEqual(parseActiveNetTimeRange("All day"), { start: null, end: null });
  });
});
