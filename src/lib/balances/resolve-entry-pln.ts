/** Wspólna logika PLN — koryguje błędne amount_pln i amount w historycznych wpisach. */

import {
  convertFromPln,
  convertToPln,
  convertToPlnAbs,
  normalizeCurrency,
} from "@/lib/fx/convert";

export { normalizeCurrency };

export function accountCurrency(
  entryCurrency: string,
  accountDefaultCurrency?: string | null
): string {
  return normalizeCurrency(accountDefaultCurrency ?? entryCurrency);
}

export interface EntryPlnInput {
  amount: number;
  amount_pln: number;
  currency: string;
  exchange_rate: number;
  accountCurrency?: string | null;
}

/** PLN pojedynczego wpisu — do sumowania sald kont. */
export function ledgerEntryPln(entry: EntryPlnInput): number {
  const amount = Number(entry.amount);
  const amountPln = Number(entry.amount_pln);
  const rate = Number(entry.exchange_rate) > 0 ? Number(entry.exchange_rate) : 1;
  const acctCur = accountCurrency(entry.currency, entry.accountCurrency);

  if (acctCur === "PLN") {
    const sign = amount < 0 ? -1 : amount > 0 ? 1 : amountPln < 0 ? -1 : 1;
    return sign * Math.max(Math.abs(amountPln), Math.abs(amount));
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

/**
 * Gdy suma PLN ≈ saldo obce (błędne amount_pln 1:1), przelicz z waluty konta.
 */
export function reconcileForeignBalancePln(
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

/** Zwraca poprawioną kwotę PLN ze znakiem (do sumowania sald). */
export function resolveSignedEntryPln(entry: EntryPlnInput): number {
  return ledgerEntryPln(entry);
}

/** Kwota PLN bez znaku (do wyświetlania transferów). */
export function resolveTransferPlnAmount(
  source: EntryPlnInput,
  target: EntryPlnInput
): number {
  const srcCur = accountCurrency(source.currency, source.accountCurrency);
  const tgtCur = accountCurrency(target.currency, target.accountCurrency);

  if (srcCur === "PLN") {
    return Math.max(
      Math.abs(Number(source.amount)),
      Math.abs(resolveSignedEntryPln(source))
    );
  }
  if (tgtCur === "PLN") {
    return Math.max(
      Math.abs(Number(target.amount)),
      Math.abs(resolveSignedEntryPln(target))
    );
  }

  return Math.max(
    Math.abs(resolveSignedEntryPln(source)),
    Math.abs(resolveSignedEntryPln(target))
  );
}

export function resolveForeignNativeAmount(
  foreignLeg: EntryPlnInput,
  plnAmount: number
): number {
  const acctCur = accountCurrency(foreignLeg.currency, foreignLeg.accountCurrency);
  const rate = Number(foreignLeg.exchange_rate) > 0 ? Number(foreignLeg.exchange_rate) : 1;
  const stored = Math.abs(Number(foreignLeg.amount));
  const fromPln = convertFromPln(plnAmount, acctCur, rate);

  if (stored > 0) {
    const impliedPln = convertToPlnAbs(stored, acctCur, rate);
    if (Math.abs(impliedPln - plnAmount) <= Math.max(1, plnAmount * 0.01)) {
      return stored;
    }
  }
  return fromPln;
}

// Zachowanie kompatybilności w parse-list-item
export function foreignFromPln(pln: number, currency: string, rate: number): number {
  return convertFromPln(pln, currency, rate);
}

export function plnFromForeign(amount: number, currency: string, rate: number): number {
  return convertToPlnAbs(amount, currency, rate);
}
