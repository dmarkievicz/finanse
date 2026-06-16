export function normalizeCurrency(currency: string | null | undefined): string {
  if (!currency) return "PLN";
  const c = currency.trim().toUpperCase();
  if (c === "EURO") return "EUR";
  return c;
}

export type RateSemantics = "pln_per_foreign" | "foreign_per_pln";

/**
 * W bazie kurs może być zapisany na dwa sposoby:
 * - PLN za 1 jednostkę obcą (NBP, formularz „Kurs → PLN”, np. 4,28)
 * - obca za 1 PLN (Excel „euro za złotówkę”, np. 0,233645)
 */
export function detectRateSemantics(currency: string, rate: number): RateSemantics {
  const cur = normalizeCurrency(currency);
  if (cur === "PLN" || rate <= 0) return "pln_per_foreign";
  if (rate >= 2) return "pln_per_foreign";
  if (rate < 1) return "foreign_per_pln";
  return "pln_per_foreign";
}

export function convertToPln(amount: number, currency: string, rate: number): number {
  const cur = normalizeCurrency(currency);
  if (cur === "PLN") return amount;
  const sign = amount < 0 ? -1 : amount > 0 ? 1 : 1;
  const abs = Math.abs(amount);
  const semantics = detectRateSemantics(cur, rate);
  const pln =
    semantics === "foreign_per_pln"
      ? Math.round((abs / rate) * 100) / 100
      : Math.round(abs * rate * 100) / 100;
  return sign * pln;
}

export function convertFromPln(pln: number, currency: string, rate: number): number {
  const cur = normalizeCurrency(currency);
  if (cur === "PLN") return pln;
  const abs = Math.abs(pln);
  const semantics = detectRateSemantics(cur, rate);
  return semantics === "foreign_per_pln"
    ? Math.round(abs * rate * 100) / 100
    : Math.round((abs / rate) * 100) / 100;
}

export function convertToPlnAbs(amount: number, currency: string, rate: number): number {
  return Math.abs(convertToPln(amount, currency, rate));
}
