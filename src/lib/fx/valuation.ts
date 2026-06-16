import { normalizeCurrency } from "./convert";

/** Wartość portfela: saldo w walucie × kurs NBP / ręczny (PLN za 1 jednostkę obcą). */
export function valuateNativeToPln(
  nativeBalance: number,
  currency: string,
  plnPerForeignUnit: number
): number {
  const cur = normalizeCurrency(currency);
  if (cur === "PLN") return nativeBalance;
  if (!plnPerForeignUnit || plnPerForeignUnit <= 0) return nativeBalance;
  return Math.round(nativeBalance * plnPerForeignUnit * 100) / 100;
}
