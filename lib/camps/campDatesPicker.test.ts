import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitChecked } from "@/components/camps/CampDatesPicker";

describe("splitChecked", () => {
  it("separates the check date so a shared one is said once", () => {
    assert.deepEqual(splitChecked("Spots available · checked Nov 11"), { main: "Spots available", checked: "checked Nov 11" });
    assert.deepEqual(splitChecked("4 spots left · checked 11:58 am"), { main: "4 spots left", checked: "checked 11:58 am" });
  });

  it("keeps what follows the check date", () => {
    assert.deepEqual(splitChecked("Spots available · checked Nov 11 · registration closes Dec 14"), {
      main: "Spots available · registration closes Dec 14",
      checked: "checked Nov 11",
    });
  });

  it("leaves lines without a check date alone", () => {
    assert.deepEqual(splitChecked("Registration opens Dec 1"), { main: "Registration opens Dec 1", checked: null });
  });
});
