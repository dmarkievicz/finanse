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

/** Zwraca poprawioną kwotę PLN ze znakiem (do sumowania sald). */
export function resolveSignedEntryPln(entry: EntryPlnInput): number {
  const amount = Number(entry.amount);
  const amountPln = Number(entry.amount_pln);
  const rate = Number(entry.exchange_rate) > 0 ? Number(entry.exchange_rate) : 1;
  const acctCur = accountCurrency(entry.currency, entry.accountCurrency);
  const sign =
    amount < 0 ? -1 : amount > 0 ? 1 : amountPln < 0 ? -1 : amountPln > 0 ? 1 : 0;
  if (sign === 0) return 0;

  const absAmount = Math.abs(amount);
  const absPln = Math.abs(amountPln);

  if (acctCur === "PLN") {
    return sign * Math.max(absPln, absAmount);
  }

  const plnViaAmount = convertToPlnAbs(amount, acctCur, rate);
  const plnViaStored = absPln;

  if (plnViaAmount > plnViaStored * 10 && plnViaStored > 0) {
    return sign * plnViaStored;
  }

  if (plnViaStored <= absAmount * 1.05) {
    return sign * Math.max(plnViaAmount, plnViaStored);
  }
  return sign * Math.max(plnViaStored, plnViaAmount);
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
