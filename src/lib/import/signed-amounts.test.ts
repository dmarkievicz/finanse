import { describe, it } from "node:test";
import assert from "node:assert/strict";
function signedAmountPln(amount: number, exchangeRate: number): number {
  const abs = Math.round(Math.abs(amount) * exchangeRate * 100) / 100;
  return amount < 0 ? -abs : abs;
}

function buildImportIncomeExpenseEntry(
  txType: "income" | "expense",
  excelAmount: number,
  exchangeRate: number
) {
  const amountPln = signedAmountPln(excelAmount, exchangeRate);
  if (txType === "income") {
    return { amount: excelAmount, amount_pln: amountPln };
  }
  return { amount: -excelAmount, amount_pln: -amountPln };
}

function buildImportTransferAmounts(excelAmount: number, exchangeRate: number) {
  const absAmount = Math.abs(excelAmount);
  const amountPln = Math.round(absAmount * exchangeRate * 100) / 100;
  return { absAmount, amountPln };
}

describe("buildImportIncomeExpenseEntry", () => {
  it("income dodatni → wpływ na konto", () => {
    const e = buildImportIncomeExpenseEntry("income", 3000, 1);
    assert.equal(e.amount, 3000);
    assert.equal(e.amount_pln, 3000);
  });

  it("income ujemny → odliczenie od przychodu (czynsz, podatek)", () => {
    const e = buildImportIncomeExpenseEntry("income", -450, 1);
    assert.equal(e.amount, -450);
    assert.equal(e.amount_pln, -450);
  });

  it("expense dodatni → wydatek z konta", () => {
    const e = buildImportIncomeExpenseEntry("expense", 120, 1);
    assert.equal(e.amount, -120);
    assert.equal(e.amount_pln, -120);
  });

  it("expense ujemny → zwrot na konto", () => {
    const e = buildImportIncomeExpenseEntry("expense", -80, 1);
    assert.equal(e.amount, 80);
    assert.equal(e.amount_pln, 80);
  });

  it("zachowuje znak przy kursie EUR", () => {
    const e = buildImportIncomeExpenseEntry("expense", -50, 4.3);
    assert.equal(e.amount, 50);
    assert.equal(e.amount_pln, 215);
  });
});

describe("buildImportTransferAmounts", () => {
  it("transfer zawsze używa wartości bezwzględnej", () => {
    const t = buildImportTransferAmounts(-200, 1);
    assert.equal(t.absAmount, 200);
    assert.equal(t.amountPln, 200);
  });
});
