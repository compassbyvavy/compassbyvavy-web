/**
 * Provider-neutral yearless month/day window parser.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  monthDayWindowIdentity,
  parseMonthDayWindows,
} from "@/lib/camps/ingestion/normalize/monthDayWindow";

describe("parseMonthDayWindows", () => {
  it("splits a discontinuous week without inventing a year or bridging the gap", () => {
    const windows = parseMonthDayWindows("June 29 – 30, July 2 – 3");
    assert.deepEqual(
      windows.map((window) => ({
        weekIdentity: window.weekIdentity,
        startDate: window.startDate,
        endDate: window.endDate,
      })),
      [
        { weekIdentity: "06-29_06-30", startDate: null, endDate: null },
        { weekIdentity: "07-02_07-03", startDate: null, endDate: null },
      ],
    );
  });

  it("reads ordinal month/day ranges without assigning a year", () => {
    const windows = parseMonthDayWindows("July 6th - 10th & July 13th - 17th");
    assert.deepEqual(
      windows.map((window) => window.weekIdentity),
      ["07-06_07-10", "07-13_07-17"],
    );
    assert.ok(windows.every((window) => window.startDate === null && window.endDate === null));
  });

  it("builds a stable month/day identity slug", () => {
    assert.equal(monthDayWindowIdentity(7, 6, 7, 10), "07-06_07-10");
  });
});
