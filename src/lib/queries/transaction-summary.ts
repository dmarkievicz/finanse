import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  computeFilteredCashflowSummary,
  computeFilteredDailyBreakdown,
} from "@/lib/transactions/compute-period-cashflow";
import type { TransactionFilterState } from "@/lib/transactions/filter-state";

export interface TransactionSummary {
  txCount: number;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  maxIncome: number;
  maxExpense: number;
}

export interface DailyBreakdownRow {
  day: string;
  incomePln: number;
  expensePln: number;
  txCount: number;
}

export async function fetchTransactionSummary(
  supabase: ServerSupabaseClient,
  filters: TransactionFilterState
): Promise<TransactionSummary> {
  const row = await computeFilteredCashflowSummary(supabase, filters);

  return {
    txCount: row.tx_count,
    incomeTotal: row.income_pln,
    expenseTotal: row.expense_pln,
    balance: row.surplus_pln,
    maxIncome: row.max_income,
    maxExpense: row.max_expense,
  };
}

export async function fetchTransactionDailyBreakdown(
  supabase: ServerSupabaseClient,
  filters: TransactionFilterState
): Promise<DailyBreakdownRow[]> {
  const rows = await computeFilteredDailyBreakdown(supabase, filters);

  return rows.map((r) => ({
    day: r.day,
    incomePln: r.income_pln,
    expensePln: r.expense_pln,
    txCount: r.tx_count,
  }));
}

export function emptySummary(): TransactionSummary {
  return {
    txCount: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    balance: 0,
    maxIncome: 0,
    maxExpense: 0,
  };
}
