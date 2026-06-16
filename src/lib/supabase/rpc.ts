import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { computeRefundAwareCashflow } from "@/lib/transactions/compute-period-cashflow";
import type {
  AccountBalance,
  AccountManageRow,
  CategoryBreakdown,
  MonthlyCashflow,
} from "@/types/database";

export type BalanceMode = "current" | "full";

export async function rpcNetWorth(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  mode: BalanceMode = "current"
) {
  const { data, error } = await supabase.rpc(
    "get_net_worth",
    { p_as_of_date: asOfDate, p_mode: mode } as never
  );
  if (error) throw error;
  return Number(data ?? 0);
}

export async function rpcAccountBalances(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  mode: BalanceMode = "current"
) {
  const { data, error } = await supabase.rpc(
    "get_account_balances",
    { p_as_of_date: asOfDate, p_mode: mode } as never
  );
  if (error) throw error;
  return (data ?? []) as AccountBalance[];
}

export async function rpcMonthlyCashflow(
  supabase: ServerSupabaseClient,
  year: number,
  month: number,
  mode: BalanceMode = "current"
): Promise<MonthlyCashflow> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = new Date(year, month, 0).toISOString().slice(0, 10); // last day of month
  return computeRefundAwareCashflow(supabase, from, to, mode);
}

export async function rpcCategoryBreakdown(
  supabase: ServerSupabaseClient,
  from: string,
  to: string,
  mode: BalanceMode = "current"
) {
  const { data, error } = await supabase.rpc(
    "get_category_breakdown",
    { p_from: from, p_to: to, p_mode: mode } as never
  );
  if (error) throw error;
  return (data ?? []) as CategoryBreakdown[];
}

export async function rpcCategoryBreakdownTyped(
  supabase: ServerSupabaseClient,
  from: string,
  to: string,
  txType: "income" | "expense",
  mode: BalanceMode = "current"
) {
  if (txType === "expense") {
    return rpcCategoryBreakdown(supabase, from, to, mode);
  }
  const { data, error } = await supabase.rpc(
    "get_category_breakdown_typed",
    { p_from: from, p_to: to, p_mode: mode, p_tx_type: txType } as never
  );
  if (error) {
    if (error.code === "PGRST202") return [] as CategoryBreakdown[];
    throw error;
  }
  return (data ?? []) as CategoryBreakdown[];
}

export async function rpcCategoriesAnalyticsBundle(
  supabase: ServerSupabaseClient,
  period: {
    current: { from: string; to: string };
    previous: { from: string; to: string };
    budgetYear: number;
    budgetMonth: number;
  },
  mode: BalanceMode = "current"
) {
  const { data, error } = await supabase.rpc(
    "get_categories_analytics_bundle",
    {
      p_current_from: period.current.from,
      p_current_to: period.current.to,
      p_prev_from: period.previous.from,
      p_prev_to: period.previous.to,
      p_mode: mode,
      p_budget_year: period.budgetYear,
      p_budget_month: period.budgetMonth,
    } as never
  );
  if (error) {
    if (error.code === "PGRST202" || /get_categories_analytics_bundle/i.test(error.message ?? "")) {
      return null;
    }
    throw error;
  }
  return data as Record<string, unknown>;
}

export async function rpcNeedsReviewCount(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase.rpc("get_needs_review_count");
  if (error) throw error;
  return Number(data ?? 0);
}

export async function rpcAllAccountBalances(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  mode: BalanceMode = "full"
) {
  const { data, error } = await supabase.rpc(
    "get_all_account_balances",
    { p_as_of_date: asOfDate, p_mode: mode } as never
  );
  if (error) throw error;
  return (data ?? []) as AccountManageRow[];
}

export async function rpcAccountsNeedsReviewCount(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase.rpc("get_accounts_needs_review_count");
  if (error) throw error;
  return Number(data ?? 0);
}

export interface BalanceIntegrityRow {
  check_name: string;
  issue_count: number;
  sample_ids: string[] | null;
}

export interface CashflowHistoryRow {
  year: number;
  month: number;
  income_pln: number;
  expense_pln: number;
  surplus_pln: number;
  has_data: boolean;
}

export async function rpcPeriodCashflow(
  supabase: ServerSupabaseClient,
  from: string,
  to: string,
  mode: BalanceMode = "current"
): Promise<MonthlyCashflow> {
  return computeRefundAwareCashflow(supabase, from, to, mode);
}

export async function rpcCashflowHistory(
  supabase: ServerSupabaseClient,
  months: number,
  asOfDate: string,
  mode: BalanceMode = "current"
): Promise<CashflowHistoryRow[]> {
  // Prosto i bezpiecznie: policz każdy miesiąc osobno przez refund-aware cashflow.
  // (months zwykle <= 12, więc to jest akceptowalne kosztowo)
  const end = new Date(asOfDate);
  const monthKeys: { year: number; month: number; from: string; to: string }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const to = new Date(y, m, 0).toISOString().slice(0, 10);
    monthKeys.push({ year: y, month: m, from, to });
  }

  const rows = await Promise.all(
    monthKeys.map(async (k) => {
      const cf = await computeRefundAwareCashflow(supabase, k.from, k.to, mode);
      return {
        year: k.year,
        month: k.month,
        income_pln: cf.income_pln,
        expense_pln: cf.expense_pln,
        surplus_pln: cf.surplus_pln,
        has_data: Math.abs(cf.income_pln) > 0.005 || Math.abs(cf.expense_pln) > 0.005,
      } satisfies CashflowHistoryRow;
    })
  );

  return rows;
}

export async function rpcVerifyBalanceIntegrity(supabase: ServerSupabaseClient, userId?: string) {
  const { data, error } = await supabase.rpc(
    "verify_balance_integrity",
    userId ? ({ p_user_id: userId } as never) : ({} as never)
  );
  if (error) throw error;
  return (data ?? []) as BalanceIntegrityRow[];
}
