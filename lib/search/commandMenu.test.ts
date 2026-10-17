import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCommandItems,
  filterCommandItems,
} from "@/lib/search/commandMenu";

describe("command menu", () => {
  it("groups categories, places, guides, and camps", () => {
    const items = buildCommandItems({
      camps: [{ id: "1", slug: "stem", name: "STEM Explorers", providerName: "Oakridge" }],
    });
    assert.ok(items.some((item) => item.group === "categories" && item.label === "Camps"));
    assert.ok(items.some((item) => item.group === "places" && item.label === "Mississauga"));
    assert.ok(items.some((item) => item.group === "guides" && item.href === "/about"));
    const hits = filterCommandItems(items, "stem");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].href, "/camps/stem");
    assert.match(
      items.find((item) => item.label === "Toronto")?.hint ?? "",
      /not a claim/i,
    );
  });
});
