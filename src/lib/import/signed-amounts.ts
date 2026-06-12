import { signedAmountPln } from "@/lib/balances/invariants";

/**
 * Kwoty w Excelu mogą być ze znakiem:
 * - income + = wpływ, income − = koszt odliczany od przychodu (czynsz, podatek)
 * - expense + = wydatek, expense − = zwrot / korekta wydatku
 *
 * Wpis na koncie:
 * - income: ten sam znak co w Excelu
 * - expense: odwrotny znak (dodatni Excel → ujemny wpis na koncie)
 */
export function buildImportIncomeExpenseEntry(
  txType: "income" | "expense",
  excelAmount: number,
  exchangeRate: number
): { amount: number; amount_pln: number } {
  const amountPln = signedAmountPln(excelAmount, exchangeRate);
  if (txType === "income") {
    return { amount: excelAmount, amount_pln: amountPln };
  }
  return { amount: -excelAmount, amount_pln: -amountPln };
}

/** Transfer / przewalutowanie — kwota w Excelu to zwykle wartość dodatnia. */
export function buildImportTransferAmounts(
  excelAmount: number,
  exchangeRate: number
): { absAmount: number; amountPln: number } {
  const absAmount = Math.abs(excelAmount);
  const amountPln = Math.round(absAmount * exchangeRate * 100) / 100;
  return { absAmount, amountPln };
}
