import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveForeignNativeAmount,
  resolveSignedEntryPln,
  resolveTransferPlnAmount,
} from "./resolve-entry-pln.ts";

describe("resolveSignedEntryPln", () => {
  it("noga PLN: bierze max(amount, amount_pln)", () => {
    const pln = resolveSignedEntryPln({
      amount: -31457.23,
      amount_pln: -7350,
      currency: "PLN",
      exchange_rate: 1,
      accountCurrency: "PLN",
    });
    assert.equal(pln, -31457.23);
  });

  it("noga EUR z błędnym amount_pln 1:1", () => {
    const pln = resolveSignedEntryPln({
      amount: 7350,
      amount_pln: 7350,
      currency: "PLN",
      exchange_rate: 4.28,
      accountCurrency: "EUR",
    });
    assert.ok(Math.abs(pln - 31458) < 1);
  });
});

describe("resolveTransferPlnAmount", () => {
  it("transfer PLN→EUR z błędnymi wpisami", () => {
    const pln = resolveTransferPlnAmount(
      {
        amount: -31457.23,
        amount_pln: -7350,
        currency: "PLN",
        exchange_rate: 1,
        accountCurrency: "PLN",
      },
      {
        amount: 7350,
        amount_pln: 7350,
        currency: "PLN",
        exchange_rate: 4.28,
        accountCurrency: "EUR",
      }
    );
    assert.equal(pln, 31457.23);
  });
});

describe("resolveForeignNativeAmount", () => {
  it("zachowuje poprawną kwotę EUR gdy amount jest już w obcej walucie", () => {
    const native = resolveForeignNativeAmount(
      {
        amount: 7350,
        amount_pln: 7350,
        currency: "PLN",
        exchange_rate: 4.28,
        accountCurrency: "EUR",
      },
      31457.23
    );
    assert.equal(native, 7350);
  });

  it("odzyskuje EUR gdy amount wygląda jak PLN", () => {
    const native = resolveForeignNativeAmount(
      {
        amount: 31457.23,
        amount_pln: 7350,
        currency: "EUR",
        exchange_rate: 4.28,
        accountCurrency: "EUR",
      },
      31457.23
    );
    assert.ok(Math.abs(native - 7349.82) < 0.1);
  });
});
