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

function resolveSignedEntryPln(entry: {
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
  const sign =
    amount < 0 ? -1 : amount > 0 ? 1 : amountPln < 0 ? -1 : amountPln > 0 ? 1 : 0;
  if (sign === 0) return 0;
  const absAmount = Math.abs(amount);
  const absPln = Math.abs(amountPln);
  if (acctCur === "PLN") return sign * Math.max(absPln, absAmount);
  const plnViaAmount = convertToPlnAbs(amount, acctCur, rate);
  const plnViaStored = absPln;
  if (plnViaAmount > plnViaStored * 10 && plnViaStored > 0) return sign * plnViaStored;
  if (plnViaStored <= absAmount * 1.05) return sign * Math.max(plnViaAmount, plnViaStored);
  return sign * Math.max(plnViaStored, plnViaAmount);
}

function resolveTransferPlnAmount(
  source: Parameters<typeof resolveSignedEntryPln>[0],
  target: Parameters<typeof resolveSignedEntryPln>[0]
): number {
  const srcCur = accountCurrency(source.currency, source.accountCurrency);
  const tgtCur = accountCurrency(target.currency, target.accountCurrency);
  if (srcCur === "PLN") {
    return Math.max(Math.abs(Number(source.amount)), Math.abs(resolveSignedEntryPln(source)));
  }
  if (tgtCur === "PLN") {
    return Math.max(Math.abs(Number(target.amount)), Math.abs(resolveSignedEntryPln(target)));
  }
  return Math.max(Math.abs(resolveSignedEntryPln(source)), Math.abs(resolveSignedEntryPln(target)));
}

function resolveForeignNativeAmount(
  foreignLeg: Parameters<typeof resolveSignedEntryPln>[0],
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

  it("noga EUR z kursem EUR/PLN 0,233645", () => {
    const pln = resolveSignedEntryPln({
      amount: 7350,
      amount_pln: 7350,
      currency: "EUR",
      exchange_rate: 0.233645,
      accountCurrency: "EUR",
    });
    assert.ok(Math.abs(pln - 31457.23) < 1);
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
