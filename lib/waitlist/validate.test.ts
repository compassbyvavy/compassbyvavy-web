import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateWaitlist } from "@/lib/waitlist/validate";

const now = Date.parse("2026-11-17T12:00:00.000Z");

describe("waitlist validation", () => {
  it("requires a real email and an unticked box to be ticked", () => {
    const missing = validateWaitlist({
      email: "parent@example.com",
      consent: false,
      startedAt: now - 5000,
      now,
    });
    assert.equal(missing.ok, false);

    const saved = validateWaitlist({
      email: "Parent@Example.com",
      consent: true,
      sourcePage: "/ontario/camps",
      category: "camps",
      city: "Ontario",
      startedAt: now - 5000,
      now,
    });
    assert.equal(saved.ok, true);
    if (saved.ok && !saved.spam) {
      assert.equal(saved.row.email, "parent@example.com");
      assert.equal(saved.row.category, "camps");
      assert.equal(saved.row.consented_at, "2026-11-17T12:00:00.000Z");
    }
  });

  it("stores a shop product id in subcategory", () => {
    const saved = validateWaitlist({
      email: "parent@example.com",
      consent: true,
      sourcePage: "/shop",
      category: "shop",
      product: "winter-pack",
      startedAt: now - 5000,
      now,
    });
    assert.equal(saved.ok, true);
    if (!saved.ok || saved.spam) return;
    assert.equal(saved.row.subcategory, "winter-pack");
    assert.equal(saved.row.category, "shop");
    assert.equal(saved.row.source_page, "/shop");
    assert.equal("product" in saved.row, false);

    const book = validateWaitlist({
      email: "parent@example.com",
      consent: true,
      sourcePage: "/shop",
      category: "shop",
      product: "quebec-book",
      startedAt: now - 5000,
      now,
    });
    assert.equal(book.ok && !book.spam && book.row.subcategory, "quebec-book");
  });

  it("drops a filled honeypot without saving, and rejects an instant submit", () => {
    const spam = validateWaitlist({
      email: "parent@example.com",
      consent: true,
      company: "acme",
      startedAt: now - 5000,
      now,
    });
    assert.deepEqual(spam, { ok: true, spam: true });

    const fast = validateWaitlist({
      email: "parent@example.com",
      consent: true,
      startedAt: now,
      now,
    });
    assert.equal(fast.ok, false);
  });
});
