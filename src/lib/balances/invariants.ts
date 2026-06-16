function normalizeAmountCurrency(currency?: string): string | undefined {
  if (!currency?.trim()) return undefined;
  const c = currency.trim().toUpperCase();
  return c === "EURO" ? "EUR" : c;
}

/** Zaokrąglenie kwoty PLN zgodne z importem Excel. */
export function computeAmountPln(
  amount: number,
  exchangeRate: number,
  currency?: string
): number {
  const cur = normalizeAmountCurrency(currency);
  const abs =
    cur === "PLN"
      ? Math.round(Math.abs(amount) * 100) / 100
      : Math.round(Math.abs(amount) * exchangeRate * 100) / 100;
  return abs * Math.sign(amount || 1);
}

export function signedAmountPln(
  amount: number,
  exchangeRate: number,
  currency?: string
): number {
  const cur = normalizeAmountCurrency(currency);
  const abs =
    cur === "PLN"
      ? Math.round(Math.abs(amount) * 100) / 100
      : Math.round(Math.abs(amount) * exchangeRate * 100) / 100;
  return amount < 0 ? -abs : abs;
}

export interface EntryLike {
  amount: number;
  exchange_rate: number;
  amount_pln: number;
}

/** Czy amount_pln ≈ amount × kurs (tolerancja 2 gr). */
export function isAmountPlnConsistent(entry: EntryLike, tolerance = 0.02): boolean {
  const expected = signedAmountPln(entry.amount, entry.exchange_rate);
  return Math.abs(entry.amount_pln - expected) <= tolerance;
}

/** Transfer / przewalutowanie: suma wpisów PLN ≈ 0. */
export function areEntriesBalanced(
  entries: { amount_pln: number }[],
  tolerance = 0.02
): boolean {
  const sum = entries.reduce((s, e) => s + e.amount_pln, 0);
  return Math.abs(sum) <= tolerance;
}
