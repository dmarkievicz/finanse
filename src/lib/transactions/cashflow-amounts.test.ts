import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { accumulateFlows } from "./cashflow-amounts.ts";

describe("accumulateFlows", () => {
  it("dzień z wydatkami i zwrotami (29.06.2025)", () => {
    const items = [
      { type: "expense", amountPln: -1_246_000 },
      { type: "expense", amountPln: -40_000 },
      { type: "expense", amountPln: -29_251 },
      { type: "expense", amountPln: 1_325_000 },
      { type: "expense", amountPln: 600_000 },
      { type: "expense", amountPln: -38_500 },
    ];
    const { income, expense, net } = accumulateFlows(items);
    assert.equal(expense, 1_353_751);
    assert.equal(income, 1_925_000);
    assert.equal(net, 571_249);
  });

  it("ujemny przychód", () => {
    const { income, expense, net } = accumulateFlows([
      { type: "income", amountPln: -450 },
    ]);
    assert.equal(income, -450);
    assert.equal(expense, 0);
    assert.equal(net, -450);
  });
});
