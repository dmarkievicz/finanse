import { signedAmountPln } from "@/lib/balances/invariants";
import { convertFromPln, convertToPlnAbs } from "@/lib/fx/convert";

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
  exchangeRate: number,
  currency = "PLN"
): { amount: number; amount_pln: number } {
  const amountPln = signedAmountPln(excelAmount, exchangeRate, currency);
  if (txType === "income") {
    return { amount: excelAmount, amount_pln: amountPln };
  }
  return { amount: -excelAmount, amount_pln: -amountPln };
}

/** Transfer / przewalutowanie — kwota w Excelu to zwykle wartość dodatnia. */
export function buildImportTransferAmounts(
  excelAmount: number,
  exchangeRate: number,
  currency = "PLN"
): { absAmount: number; amountPln: number } {
  const absAmount = Math.abs(excelAmount);
  const cur = currency.trim().toUpperCase();
  const amountPln =
    cur === "PLN"
      ? Math.round(absAmount * 100) / 100
      : Math.round(absAmount * exchangeRate * 100) / 100;
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
    const { absAmount, amountPln } = buildImportTransferAmounts(excelAmount, rate, excelCur);
    return {
      source: { amount: -absAmount, currency: srcCur, exchangeRate: rate, amountPln: -amountPln },
      target: { amount: absAmount, currency: tgtCur, exchangeRate: rate, amountPln },
    };
  }

  const plnFromExcel =
    excelCur === "PLN"
      ? absExcel
      : convertToPlnAbs(absExcel, excelCur, rate);

  if (srcCur === "PLN" && tgtCur !== "PLN") {
    const pln = plnFromExcel;
    const foreign = excelCur === tgtCur ? absExcel : convertFromPln(pln, tgtCur, rate);
    return {
      source: { amount: -pln, currency: "PLN", exchangeRate: 1, amountPln: -pln },
      target: { amount: foreign, currency: tgtCur, exchangeRate: rate, amountPln: pln },
    };
  }

  if (tgtCur === "PLN" && srcCur !== "PLN") {
    const pln = plnFromExcel;
    const foreign = excelCur === srcCur ? absExcel : convertFromPln(pln, srcCur, rate);
    return {
      source: { amount: -foreign, currency: srcCur, exchangeRate: rate, amountPln: -pln },
      target: { amount: pln, currency: "PLN", exchangeRate: 1, amountPln: pln },
    };
  }

  const { absAmount, amountPln } = buildImportTransferAmounts(excelAmount, rate, excelCur);
  return {
    source: { amount: -absAmount, currency: srcCur, exchangeRate: rate, amountPln: -amountPln },
    target: { amount: absAmount, currency: tgtCur, exchangeRate: rate, amountPln },
  };
}
