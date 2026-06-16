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

function normalizeCur(currency: string): string {
  const c = currency.trim().toUpperCase();
  return c === "EURO" ? "EUR" : c;
}

function buildTransferLegs(
  excelAmount: number,
  excelCurrency: string,
  exchangeRate: number,
  sourceCurrency: string,
  targetCurrency: string
) {
  const rate = exchangeRate > 0 ? exchangeRate : 1;
  const srcCur = normalizeCur(sourceCurrency);
  const tgtCur = normalizeCur(targetCurrency);
  const excelCur = normalizeCur(excelCurrency);
  const absExcel = Math.abs(excelAmount);

  if (srcCur === tgtCur) {
    const { absAmount, amountPln } = buildImportTransferAmounts(excelAmount, rate);
    return {
      source: { amount: -absAmount, currency: srcCur, exchangeRate: rate, amountPln: -amountPln },
      target: { amount: absAmount, currency: tgtCur, exchangeRate: rate, amountPln },
    };
  }

  const plnFromExcel =
    excelCur === "PLN" ? absExcel : Math.round(absExcel * rate * 100) / 100;
  const foreignFromPln = (pln: number, cur: string) => {
    if (normalizeCur(cur) === "PLN") return pln;
    return rate < 1
      ? Math.round(pln * rate * 100) / 100
      : Math.round((pln / rate) * 100) / 100;
  };

  if (srcCur === "PLN" && tgtCur !== "PLN") {
    const pln = plnFromExcel;
    const foreign = excelCur === tgtCur ? absExcel : foreignFromPln(pln, tgtCur);
    return {
      source: { amount: -pln, currency: "PLN", exchangeRate: 1, amountPln: -pln },
      target: { amount: foreign, currency: tgtCur, exchangeRate: rate, amountPln: pln },
    };
  }

  if (tgtCur === "PLN" && srcCur !== "PLN") {
    const pln = plnFromExcel;
    const foreign = excelCur === srcCur ? absExcel : foreignFromPln(pln, srcCur);
    return {
      source: { amount: -foreign, currency: srcCur, exchangeRate: rate, amountPln: -pln },
      target: { amount: pln, currency: "PLN", exchangeRate: 1, amountPln: pln },
    };
  }

  const { absAmount, amountPln } = buildImportTransferAmounts(excelAmount, rate);
  return {
    source: { amount: -absAmount, currency: srcCur, exchangeRate: rate, amountPln: -amountPln },
    target: { amount: absAmount, currency: tgtCur, exchangeRate: rate, amountPln },
  };
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

describe("buildTransferLegs", () => {
  it("PLN → EUR po kursie NBP (PLN za EUR)", () => {
    const legs = buildTransferLegs(31457.23, "PLN", 4.28, "PLN", "EUR");
    assert.equal(legs.source.currency, "PLN");
    assert.equal(legs.source.amount, -31457.23);
    assert.equal(legs.source.amountPln, -31457.23);
    assert.equal(legs.target.currency, "EUR");
    assert.ok(Math.abs(legs.target.amount - 7349.82) < 0.1);
    assert.equal(legs.target.amountPln, 31457.23);
  });

  it("PLN → EUR po kursie Excel (EUR za PLN)", () => {
    const legs = buildTransferLegs(31457.23, "PLN", 0.233645, "PLN", "EUR");
    assert.ok(Math.abs(legs.target.amount - 7349.82) < 0.1);
    assert.equal(legs.target.amountPln, 31457.23);
  });

  it("ta sama waluta: obie nogi w tej samej walucie", () => {
    const legs = buildTransferLegs(500, "PLN", 1, "PLN", "PLN");
    assert.equal(legs.source.amount, -500);
    assert.equal(legs.target.amount, 500);
    assert.equal(legs.source.currency, "PLN");
    assert.equal(legs.target.currency, "PLN");
  });
});
