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

export interface TransferLegAmounts {
  amount: number;
  currency: string;
  exchangeRate: number;
  amountPln: number;
}

function normalizeCur(currency: string): string {
  const c = currency.trim().toUpperCase();
  return c === "EURO" ? "EUR" : c;
}

/** Dwie nogi transferu z uwzględnieniem waluty kont źródłowego i docelowego. */
export function buildTransferLegs(
  excelAmount: number,
  excelCurrency: string,
  exchangeRate: number,
  sourceCurrency: string,
  targetCurrency: string
): { source: TransferLegAmounts; target: TransferLegAmounts } {
  const rate = exchangeRate > 0 ? exchangeRate : 1;
  const srcCur = normalizeCur(sourceCurrency);
  const tgtCur = normalizeCur(targetCurrency);
  const excelCur = normalizeCur(excelCurrency);
  const absExcel = Math.abs(excelAmount);

  if (srcCur === tgtCur) {
    const { absAmount, amountPln } = buildImportTransferAmounts(excelAmount, rate);
    return {
      source: { amount: -absAmount, currency: srcCur, exchangeRate: rate, amountPln: -amountPln },
      target: { amount: absAmount, currency: tgtCur, exchangeRate: rate, amountPln },
    };
  }

  const plnFromExcel =
    excelCur === "PLN" ? absExcel : Math.round(absExcel * rate * 100) / 100;
  const foreignFromPln = (pln: number, cur: string) =>
    cur === "PLN" ? pln : Math.round((pln / rate) * 100) / 100;

  if (srcCur === "PLN" && tgtCur !== "PLN") {
    const pln = plnFromExcel;
    const foreign =
      excelCur === tgtCur ? absExcel : foreignFromPln(pln, tgtCur);
    return {
      source: { amount: -pln, currency: "PLN", exchangeRate: 1, amountPln: -pln },
      target: { amount: foreign, currency: tgtCur, exchangeRate: rate, amountPln: pln },
    };
  }

  if (tgtCur === "PLN" && srcCur !== "PLN") {
    const pln = plnFromExcel;
    const foreign =
      excelCur === srcCur ? absExcel : foreignFromPln(pln, srcCur);
    return {
      source: { amount: -foreign, currency: srcCur, exchangeRate: rate, amountPln: -pln },
      target: { amount: pln, currency: "PLN", exchangeRate: 1, amountPln: pln },
    };
  }

  const { absAmount, amountPln } = buildImportTransferAmounts(excelAmount, rate);
  return {
    source: { amount: -absAmount, currency: srcCur, exchangeRate: rate, amountPln: -amountPln },
    target: { amount: absAmount, currency: tgtCur, exchangeRate: rate, amountPln },
  };
}
