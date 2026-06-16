import { describe, it } from "node:test";
import assert from "node:assert/strict";

function valuateNativeToPln(
  nativeBalance: number,
  currency: string,
  plnPerForeignUnit: number
): number {
  const cur = currency.toUpperCase() === "EURO" ? "EUR" : currency.toUpperCase();
  if (cur === "PLN") return nativeBalance;
  if (!plnPerForeignUnit || plnPerForeignUnit <= 0) return nativeBalance;
  return Math.round(nativeBalance * plnPerForeignUnit * 100) / 100;
}

describe("valuateNativeToPln", () => {
  it("EUR × kurs NBP", () => {
    const pln = valuateNativeToPln(-3151.95, "EUR", 4.28);
    assert.ok(Math.abs(pln + 13490) < 50);
  });

  it("PLN bez zmian", () => {
    assert.equal(valuateNativeToPln(1000, "PLN", 1), 1000);
  });
});
