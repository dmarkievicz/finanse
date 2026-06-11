import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { TransactionFilterState } from "@/lib/transactions/filter-state";
import { rpcFilterParams } from "@/lib/transactions/rpc-filters";

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
  const { data, error } = await supabase.rpc(
    "get_transactions_summary",
    rpcFilterParams(filters) as never
  );

  if (error) {
    if (error.code === "PGRST202" || error.message?.includes("get_transactions_summary")) {
      return emptySummary();
    }
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    tx_count: number;
    income_total: number;
    expense_total: number;
    max_income: number;
    max_expense: number;
  } | null;

  const income = Number(row?.income_total ?? 0);
  const expense = Number(row?.expense_total ?? 0);

  return {
    txCount: Number(row?.tx_count ?? 0),
    incomeTotal: income,
    expenseTotal: expense,
    balance: income - expense,
    maxIncome: Number(row?.max_income ?? 0),
    maxExpense: Number(row?.max_expense ?? 0),
  };
}

export async function fetchTransactionDailyBreakdown(
  supabase: ServerSupabaseClient,
  filters: TransactionFilterState
): Promise<DailyBreakdownRow[]> {
  const { data, error } = await supabase.rpc(
    "get_transactions_daily_breakdown",
    rpcFilterParams(filters) as never
  );

  if (error) {
    if (error.code === "PGRST202") return [];
    throw error;
  }

  const rows = (Array.isArray(data) ? data : []) as {
    day: string;
    income_pln: number;
    expense_pln: number;
    tx_count: number;
  }[];

  return rows.map((r) => ({
    day: r.day,
    incomePln: Number(r.income_pln),
    expensePln: Number(r.expense_pln),
    txCount: Number(r.tx_count),
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
