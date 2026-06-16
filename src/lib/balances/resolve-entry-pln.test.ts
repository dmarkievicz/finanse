import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertFromPln,
  convertToPln,
  convertToPlnAbs,
  normalizeCurrency,
} from "../fx/convert.ts";

function accountCurrency(
  entryCurrency: string,
  accountDefaultCurrency?: string | null
): string {
  return normalizeCurrency(accountDefaultCurrency ?? entryCurrency);
}

function ledgerEntryPln(entry: {
  amount: number;
  amount_pln: number;
  currency: string;
  exchange_rate: number;
  accountCurrency?: string | null;
}): number {
  const amount = Number(entry.amount);
  const amountPln = Number(entry.amount_pln);
  const rate = Number(entry.exchange_rate) > 0 ? Number(entry.exchange_rate) : 1;
  const acctCur = accountCurrency(entry.currency, entry.accountCurrency);

  if (acctCur === "PLN") {
    const sign = amount < 0 ? -1 : amount > 0 ? 1 : amountPln < 0 ? -1 : 1;
    const absAmt = Math.abs(amount);
    const absStored = Math.abs(amountPln);
    const entryCur = normalizeCurrency(entry.currency);
    if (entryCur === "PLN" && rate !== 1 && absAmt > 0 && absStored > absAmt * 1.5) {
      return sign * absAmt;
    }
    return sign * Math.max(absStored, absAmt);
  }
  if (rate === 1) {
    if (Math.abs(amountPln) > Math.abs(amount) * 1.5) return amountPln;
    return amount;
  }
  const fromNative = convertToPln(amount, acctCur, rate);
  const absFrom = Math.abs(fromNative);
  const absStored = Math.abs(amountPln);
  if (absFrom > absStored * 10 && absStored > 0) {
    return amount < 0 || amountPln < 0 ? -absStored : absStored;
  }
  if (absStored > 0 && absStored <= Math.abs(amount) * 1.05) {
    return fromNative;
  }
  return absFrom >= absStored ? fromNative : amountPln;
}

function reconcileForeignBalancePln(
  native: number,
  summedPln: number,
  currency: string,
  entryRatesNewestFirst: number[],
  fallbackNbpRate?: number | null
): number {
  const cur = normalizeCurrency(currency);
  if (cur === "PLN" || native === 0) return summedPln;
  const ratio = Math.abs(summedPln / native);
  if (ratio >= 1.5) return summedPln;
  const rate =
    entryRatesNewestFirst.find((r) => r > 0 && r !== 1) ??
    (fallbackNbpRate && fallbackNbpRate > 0 ? fallbackNbpRate : null);
  if (!rate) return summedPln;
  return convertToPln(native, cur, rate);
}

function resolveTransferPlnAmount(
  source: Parameters<typeof ledgerEntryPln>[0],
  target: Parameters<typeof ledgerEntryPln>[0]
): number {
  const srcCur = accountCurrency(source.currency, source.accountCurrency);
  const tgtCur = accountCurrency(target.currency, target.accountCurrency);
  if (srcCur === "PLN") {
    return Math.max(Math.abs(Number(source.amount)), Math.abs(ledgerEntryPln(source)));
  }
  if (tgtCur === "PLN") {
    return Math.max(Math.abs(Number(target.amount)), Math.abs(ledgerEntryPln(target)));
  }
  return Math.max(Math.abs(ledgerEntryPln(source)), Math.abs(ledgerEntryPln(target)));
}

function resolveForeignNativeAmount(
  foreignLeg: Parameters<typeof ledgerEntryPln>[0],
  plnAmount: number
): number {
  const acctCur = accountCurrency(foreignLeg.currency, foreignLeg.accountCurrency);
  const rate = Number(foreignLeg.exchange_rate) > 0 ? Number(foreignLeg.exchange_rate) : 1;
  const stored = Math.abs(Number(foreignLeg.amount));
  const fromPln = convertFromPln(plnAmount, acctCur, rate);
  if (stored > 0) {
    const impliedPln = convertToPlnAbs(stored, acctCur, rate);
    if (Math.abs(impliedPln - plnAmount) <= Math.max(1, plnAmount * 0.01)) return stored;
  }
  return fromPln;
}

describe("ledgerEntryNative", () => {
  function ledgerEntryNative(entry: Parameters<typeof ledgerEntryPln>[0]): number {
    const amount = Number(entry.amount);
    const amountPln = Number(entry.amount_pln);
    const rate = Number(entry.exchange_rate) > 0 ? Number(entry.exchange_rate) : 1;
    const entryCur = normalizeCurrency(entry.currency);
    const acctCur = accountCurrency(entry.currency, entry.accountCurrency);
    const sign = amount < 0 ? -1 : amount > 0 ? 1 : amountPln < 0 ? -1 : 1;
    const absAmt = Math.abs(amount);
    const absStored = Math.abs(amountPln);

    if (acctCur === "PLN") {
      if (entryCur === "PLN") return amount;
      return sign * Math.max(absAmt, convertToPlnAbs(amount, entryCur, rate));
    }
    if (entryCur === acctCur) return amount;
    if (entryCur === "PLN") {
      if (rate === 1 && absStored > 0 && Math.abs(absAmt - absStored) < 0.02) return amount;
      if (absStored > 0 && absStored < absAmt * 0.5) return sign * absStored;
      return sign * convertFromPln(absAmt, acctCur, rate);
    }
    const pln = convertToPln(amount, entryCur, rate);
    return (pln < 0 ? -1 : 1) * convertFromPln(Math.abs(pln), acctCur, rate);
  }

  it("transfer PLN→EUR: amount w PLN, amount_pln w EUR (stary import)", () => {
    const native = ledgerEntryNative({
      amount: 31457.23,
      amount_pln: 7349.82,
      currency: "PLN",
      exchange_rate: 0.233645,
      accountCurrency: "EUR",
    });
    assert.ok(Math.abs(native - 7349.82) < 0.01);
  });

  it("saldo otwarcia EUR", () => {
    const native = ledgerEntryNative({
      amount: 2712.04,
      amount_pln: 2712.04,
      currency: "EUR",
      exchange_rate: 1,
      accountCurrency: "EUR",
    });
    assert.equal(native, 2712.04);
  });

  it("wydatek EUR z błędną etykietą PLN (rate=1)", () => {
    const native = ledgerEntryNative({
      amount: -253.38,
      amount_pln: -253.38,
      currency: "PLN",
      exchange_rate: 1,
      accountCurrency: "EUR",
    });
    assert.equal(native, -253.38);
  });
});

describe("ledgerEntryPln", () => {
  it("noga EUR z kursem 0,233645 i błędnym amount_pln 1:1", () => {
    const pln = ledgerEntryPln({
      amount: 7350,
      amount_pln: 7350,
      currency: "EUR",
      exchange_rate: 0.233645,
      accountCurrency: "EUR",
    });
    assert.ok(Math.abs(pln - 31457.23) < 1);
  });

  it("PLN na koncie PLN — nie mnoży amount×rate w amount_pln (IKEA)", () => {
    const pln = ledgerEntryPln({
      amount: -531.95,
      amount_pln: -2260.79,
      currency: "PLN",
      exchange_rate: 4.25,
      accountCurrency: "PLN",
    });
    assert.equal(pln, -531.95);
  });
});

describe("resolveTransferPlnAmount", () => {
  it("transfer PLN→EUR po kursie 0,233645 EUR/PLN", () => {
    const pln = resolveTransferPlnAmount(
      {
        amount: -31457.23,
        amount_pln: -31457.23,
        currency: "PLN",
        exchange_rate: 1,
        accountCurrency: "PLN",
      },
      {
        amount: 134636.86,
        amount_pln: 31457.23,
        currency: "EUR",
        exchange_rate: 0.233645,
        accountCurrency: "EUR",
      }
    );
    assert.equal(pln, 31457.23);
  });
});

describe("resolveForeignNativeAmount", () => {
  it("koryguje błędnie zapisane amount (dzielenie zamiast mnożenia)", () => {
    const native = resolveForeignNativeAmount(
      {
        amount: 134636.86,
        amount_pln: 31457.23,
        currency: "EUR",
        exchange_rate: 0.233645,
        accountCurrency: "EUR",
      },
      31457.23
    );
    assert.ok(Math.abs(native - 7349.82) < 0.1);
  });

  it("zachowuje poprawną kwotę EUR z bazy", () => {
    const native = resolveForeignNativeAmount(
      {
        amount: 7350,
        amount_pln: 31457.23,
        currency: "EUR",
        exchange_rate: 0.233645,
        accountCurrency: "EUR",
      },
      31457.23
    );
    assert.equal(native, 7350);
  });
});
