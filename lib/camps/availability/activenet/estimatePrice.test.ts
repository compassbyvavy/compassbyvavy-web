import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpretEstimatePricePayload } from "@/lib/camps/availability/activenet/estimatePrice";

describe("interpretEstimatePricePayload", () => {
  it("prefers the Resident amount from estimateprice", () => {
    const parsed = interpretEstimatePricePayload({
      headers: { response_code: "0000" },
      body: {
        estimateprice: {
          prices: [
            {
              details: [
                { price: "$87.78", description: "Resident" },
                { price: "$97.78", description: "Non-resident" },
              ],
            },
          ],
        },
      },
    });
    assert.ok(parsed);
    assert.equal(parsed.amount, 87.78);
    assert.equal(parsed.residentAmount, 87.78);
    assert.equal(parsed.nonResidentAmount, 97.78);
    assert.equal(parsed.currency, "CAD");
  });

  it("returns null for a malformed body", () => {
    assert.equal(interpretEstimatePricePayload({ body: {} }), null);
  });
});
