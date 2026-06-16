/** Wspólna logika PLN — koryguje błędne amount_pln (np. 1:1 z kwotą obcą). */

export function normalizeCurrency(currency: string | null | undefined): string {
  if (!currency) return "PLN";
  const c = currency.trim().toUpperCase();
  if (c === "EURO") return "EUR";
  return c;
}

export function accountCurrency(
  entryCurrency: string,
  accountDefaultCurrency?: string | null
): string {
  return normalizeCurrency(accountDefaultCurrency ?? entryCurrency);
}

export function foreignFromPln(pln: number, currency: string, rate: number): number {
  const cur = normalizeCurrency(currency);
  if (cur === "PLN") return pln;
  const r = rate > 0 ? rate : 1;
  return Math.round((pln / r) * 100) / 100;
}

export function plnFromForeign(amount: number, rate: number): number {
  const r = rate > 0 ? rate : 1;
  return Math.round(Math.abs(amount) * r * 100) / 100;
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

  const fromRate = plnFromForeign(absAmount, rate);
  if (absPln <= absAmount * 1.05) {
    return sign * Math.max(fromRate, absPln);
  }
  return sign * Math.max(absPln, fromRate);
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
  const native = Math.abs(Number(foreignLeg.amount));

  if (native <= 0 || Math.abs(native - plnAmount) < 0.01) {
    return foreignFromPln(plnAmount, acctCur, rate);
  }
  if (native > plnAmount * 0.9) {
    return foreignFromPln(plnAmount, acctCur, rate);
  }
  return native;
}
