import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { founderNoteVisibility } from "@/lib/shell/founderNote";

describe("founder note visibility", () => {
  it("shows a placeholder on local and Cloudflare preview hosts", () => {
    assert.equal(founderNoteVisibility("localhost:3000"), "placeholder");
    assert.equal(founderNoteVisibility("127.0.0.1"), "placeholder");
    assert.equal(
      founderNoteVisibility("cursor-launch-shell-3cd1-compassbyvavy-web.compassbyvavy.workers.dev"),
      "placeholder",
    );
  });

  it("hides the section on the live site", () => {
    assert.equal(founderNoteVisibility("compassbyvavy.ca"), "hidden");
    assert.equal(founderNoteVisibility("www.compassbyvavy.ca"), "hidden");
    assert.equal(founderNoteVisibility("compassbyvavy-web.compassbyvavy.workers.dev"), "hidden");
    assert.equal(founderNoteVisibility(null), "hidden");
  });
});
