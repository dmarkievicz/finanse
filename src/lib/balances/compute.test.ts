import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  shouldIncludeInBalance,
  sumEntryBalances,
  computeMonthlyCashflow,
} from "./compute.ts";

describe("shouldIncludeInBalance", () => {
  const start = "2024-01-01";

  it("tryb full — wszystkie daty do as_of", () => {
    assert.equal(
      shouldIncludeInBalance(
        { date: "2023-06-01", status: "confirmed" },
        { asOfDate: "2024-12-31", mode: "full", analysisStartDate: start }
      ),
      true
    );
    assert.equal(
      shouldIncludeInBalance(
        { date: "2025-01-01", status: "confirmed" },
        { asOfDate: "2024-12-31", mode: "full", analysisStartDate: start }
      ),
      false
    );
  });

  it("tryb current — tylko po dacie startu + saldo otwarcia", () => {
    const opts = { asOfDate: "2024-12-31", mode: "current" as const, analysisStartDate: start };
    assert.equal(
      shouldIncludeInBalance({ date: "2023-12-31", status: "confirmed" }, opts),
      false
    );
    assert.equal(
      shouldIncludeInBalance(
        { date: start, status: "confirmed", is_opening_balance: true },
        opts
      ),
      true
    );
    assert.equal(
      shouldIncludeInBalance({ date: "2024-06-15", status: "confirmed" }, opts),
      true
    );
  });
});

describe("sumEntryBalances", () => {
  it("pomija needs_review i sumuje wpisy", () => {
    const opts = {
      asOfDate: "2024-12-31",
      mode: "full" as const,
      analysisStartDate: null,
    };
    const total = sumEntryBalances(
      [
        { date: "2024-01-01", status: "confirmed", amount_pln: 100 },
        { date: "2024-02-01", status: "needs_review", amount_pln: 50 },
        { date: "2024-03-01", status: "confirmed", amount_pln: -30 },
      ],
      opts
    );
    assert.equal(total, 70);
  });
});

describe("computeMonthlyCashflow", () => {
  const rows = [
    { type: "income", amount_pln: 5000, status: "confirmed", year: 2024, month: 3 },
    { type: "expense", amount_pln: -1200, status: "confirmed", year: 2024, month: 3 },
    { type: "transfer", amount_pln: -3000, status: "confirmed", year: 2024, month: 3 },
    { type: "income", amount_pln: 200, status: "needs_review", year: 2024, month: 3 },
    { type: "expense", amount_pln: -50, status: "confirmed", year: 2024, month: 4 },
  ];

  it("liczy przychody, wydatki i nadwyżkę bez transferów", () => {
    const cf = computeMonthlyCashflow(rows, 2024, 3);
    assert.equal(cf.income_pln, 5000);
    assert.equal(cf.expense_pln, 1200);
    assert.equal(cf.surplus_pln, 3800);
  });

  it("pusty miesiąc zwraca zera", () => {
    const cf = computeMonthlyCashflow(rows, 2020, 1);
    assert.equal(cf.income_pln, 0);
    assert.equal(cf.expense_pln, 0);
    assert.equal(cf.surplus_pln, 0);
  });
});
