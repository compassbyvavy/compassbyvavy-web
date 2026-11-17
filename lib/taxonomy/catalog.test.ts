import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicCategories, subcategoriesFor, taxonomyCounts } from "@/lib/taxonomy/catalog";

describe("discover taxonomy", () => {
  it("matches the workbook counts", () => {
    const counts = taxonomyCounts();
    assert.equal(counts.publicCategories, 9);
    assert.equal(counts.categories, 11);
    assert.equal(counts.subcategories, 99);
    assert.equal(counts.placeTypes, 445);
    assert.equal(counts.livePlaceTypes, 355);
    assert.equal(publicCategories().some((category) => category.slug === "shopping"), false);
  });

  it("keeps camps and play first, with 12 subcategories each", () => {
    const categories = publicCategories();
    assert.deepEqual(
      categories.slice(0, 2).map((category) => category.slug),
      ["camps", "play-fun"],
    );
    assert.equal(subcategoriesFor("CAT-006").length, 12);
    assert.equal(subcategoriesFor("CAT-002").length, 12);
  });
});
