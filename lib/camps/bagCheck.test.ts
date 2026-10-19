import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bagProgress, toggleBagItem } from "@/lib/camps/bagCheck";

describe("kid bag check", () => {
  it("toggles in memory and reports progress without storage", () => {
    const once = toggleBagItem([], "Water bottle");
    assert.deepEqual(once, ["Water bottle"]);
    assert.deepEqual(toggleBagItem(once, "Water bottle"), []);
    assert.equal(bagProgress(2, 0), "0 of 2 in the bag");
    assert.equal(bagProgress(2, 2), "Bag is ready");
    assert.equal(bagProgress(0, 0), "Nothing to check");
  });
});
