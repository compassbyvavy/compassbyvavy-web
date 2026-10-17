import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buddyLink,
  openBuddyPlan,
  overlappingDates,
  readBuddyHash,
  sanitizeBuddyPlan,
  sealBuddyPlan,
  type BuddyPlan,
} from "@/lib/share/campBuddies";

describe("camp buddies links", () => {
  it("round-trips titles and dates and drops anything else", async () => {
    const dirty = {
      v: 1 as const,
      items: [
        {
          id: "ses-1",
          title: "STEM week",
          startDate: "2026-07-06",
          endDate: "2026-07-10",
          address: "123 Secret St",
          childName: "Ava",
        },
      ],
    } as unknown as BuddyPlan;
    const clean = sanitizeBuddyPlan(dirty);
    assert.equal(JSON.stringify(clean).includes("Secret"), false);
    assert.equal(JSON.stringify(clean).includes("Ava"), false);
    const sealed = await sealBuddyPlan(clean);
    const opened = await openBuddyPlan(sealed.data, sealed.key);
    assert.equal(opened.items[0].title, "STEM week");
    assert.deepEqual(overlappingDates([
      { id: "a", title: "A", startDate: "2026-07-06", endDate: "2026-07-08" },
      { id: "b", title: "B", startDate: "2026-07-08", endDate: "2026-07-10" },
    ]), ["2026-07-08"]);
    const link = buddyLink("https://compassbyvavy.ca", sealed);
    assert.match(link, /^https:\/\/compassbyvavy\.ca\/share\/plan#d=/);
    assert.ok(readBuddyHash(new URL(link).hash));
  });
});
