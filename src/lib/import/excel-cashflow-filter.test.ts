import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  importRawCurrencyOfAmount,
  isExcludedFromExcelCashflow,
} from "./excel-cashflow-filter.ts";

describe("excel-cashflow-filter", () => {
  it("pusty Currency of Amount → wykluczony", () => {
    const raw = {
      "Currency of Amount": "",
      " Amount ": 531.95,
    };
    assert.equal(importRawCurrencyOfAmount(raw), "");
    assert.equal(isExcludedFromExcelCashflow(raw), true);
  });

  it("PLN / EURO → wliczany", () => {
    assert.equal(isExcludedFromExcelCashflow({ "Currency of Amount": "PLN" }), false);
    assert.equal(isExcludedFromExcelCashflow({ "Currency of Amount": "EURO" }), false);
  });

  it("brak import_rows → nie wykluczaj", () => {
    assert.equal(isExcludedFromExcelCashflow(null), false);
    assert.equal(isExcludedFromExcelCashflow(undefined), false);
  });
});
