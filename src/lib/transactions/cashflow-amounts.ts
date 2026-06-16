/**
 * Rozdziela wpływ PLN transakcji na składowe przychodu i wydatku (do podsumowań).
 *
 * - income: kwota ze znakiem (ujemna = odliczenie od przychodu)
 * - expense ujemny wpis: wydatek (wartość dodatnia w kolumnie „wydatki”)
 * - expense dodatni wpis: zwrot (trafia do przychodów dnia)
 */
export function splitTransactionFlow(
  type: string,
  amountPln: number
): { income: number; expense: number } {
  if (type === "income") {
    return { income: amountPln, expense: 0 };
  }
  if (type === "expense") {
    if (amountPln < 0) return { income: 0, expense: -amountPln };
    if (amountPln > 0) return { income: amountPln, expense: 0 };
    return { income: 0, expense: 0 };
  }
  return { income: 0, expense: 0 };
}

export function accumulateFlows(
  items: { type: string; amountPln?: number | null; pendingAmountPln?: number | null }[]
): { income: number; expense: number; net: number } {
  let income = 0;
  let expense = 0;
  let net = 0;

  for (const t of items) {
    const amt = t.amountPln ?? t.pendingAmountPln ?? 0;
    if (t.type !== "income" && t.type !== "expense") continue;
    const part = splitTransactionFlow(t.type, amt);
    income += part.income;
    expense += part.expense;
    net += amt;
  }

  return { income, expense, net };
}

/** Wpływ na konto: dodatni przychód lub zwrot wydatku. */
export function isTransactionCashInflow(type: string, amountPln: number): boolean {
  return (type === "income" || type === "expense") && amountPln > 0;
}
