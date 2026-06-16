import { normalizeCurrency } from "@/lib/fx/convert";
import { valuateNativeToPln } from "@/lib/fx/valuation";

/** Saldo PLN do wyświetlania na koncie (wycena po kursie rynkowym). */
export function valueAccountBalancePln(
  nativeBalance: number,
  currency: string,
  valuationRates: Map<string, number>
): number {
  const cur = normalizeCurrency(currency);
  if (cur === "PLN") return nativeBalance;
  const rate = valuationRates.get(cur);
  if (!rate || rate <= 0) return nativeBalance;
  return valuateNativeToPln(nativeBalance, cur, rate);
}
