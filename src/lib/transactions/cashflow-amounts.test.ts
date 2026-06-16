import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { accumulateFlows } from "./cashflow-amounts.ts";

describe("accumulateFlows", () => {
  it("dzień z wydatkami i zwrotami — zwroty obniżają wydatki (jak Excel)", () => {
    const items = [
      { type: "expense", amountPln: -1_246_000 },
      { type: "expense", amountPln: -40_000 },
      { type: "expense", amountPln: -29_251 },
      { type: "expense", amountPln: 1_325_000 },
      { type: "expense", amountPln: 600_000 },
      { type: "expense", amountPln: -38_500 },
    ];
    const { income, expense, net } = accumulateFlows(items);
    assert.equal(income, 0);
    assert.equal(expense, -571_249);
    assert.equal(net, 571_249);
    assert.equal(income - expense, net);
  });

  it("ujemny przychód", () => {
    const { income, expense, net } = accumulateFlows([
      { type: "income", amountPln: -450 },
    ]);
    assert.equal(income, -450);
    assert.equal(expense, 0);
    assert.equal(net, -450);
  });

  it("zwrot wydatku nie zwiększa przychodu", () => {
    const { income, expense } = accumulateFlows([
      { type: "expense", amountPln: -500 },
      { type: "expense", amountPln: 100 },
    ]);
    assert.equal(income, 0);
    assert.equal(expense, 400);
  });
});
