/** Logika sald i cashflow — odzwierciedla SQL z migracji 07 (bez auth). */

export type BalanceMode = "current" | "full";

export interface BalanceTxMeta {
  date: string;
  status: string;
  is_opening_balance?: boolean;
}

export interface BalanceFilterOptions {
  asOfDate: string;
  mode: BalanceMode;
  analysisStartDate: string | null;
}

/** Czy transakcja wpływa na saldo w trybie current/full (jak get_account_balance). */
export function shouldIncludeInBalance(tx: BalanceTxMeta, opts: BalanceFilterOptions): boolean {
  if (tx.date > opts.asOfDate) return false;
  if (opts.mode === "full") return true;
  if (!opts.analysisStartDate) return true;
  if (tx.date > opts.analysisStartDate) return true;
  if (tx.is_opening_balance && tx.date === opts.analysisStartDate) return true;
  return false;
}

export interface EntryForBalance extends BalanceTxMeta {
  amount_pln: number;
}

export function sumEntryBalances(
  entries: EntryForBalance[],
  opts: BalanceFilterOptions
): number {
  return entries
    .filter((e) => e.status !== "needs_review")
    .filter((e) => shouldIncludeInBalance(e, opts))
    .reduce((s, e) => s + e.amount_pln, 0);
}

export interface CashflowRow {
  type: string;
  amount_pln: number;
  status: string;
  year: number;
  month: number;
}

/** Odpowiednik get_monthly_cashflow — tylko income/expense, bez transferów. */
export function computeMonthlyCashflow(
  rows: CashflowRow[],
  year: number,
  month: number
): { income_pln: number; expense_pln: number; surplus_pln: number } {
  const monthRows = rows.filter(
    (r) =>
      r.year === year &&
      r.month === month &&
      r.status !== "needs_review" &&
      (r.type === "income" || r.type === "expense")
  );

  const income_pln = monthRows
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + r.amount_pln, 0);

  const expense_pln = monthRows
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + Math.abs(r.amount_pln), 0);

  return {
    income_pln,
    expense_pln,
    surplus_pln: income_pln - expense_pln,
  };
}
