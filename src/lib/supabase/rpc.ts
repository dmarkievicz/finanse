import type { ServerSupabaseClient } from "@/lib/supabase/server";
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
  const { data, error } = await supabase.rpc(
    "get_monthly_cashflow",
    { p_year: year, p_month: month, p_mode: mode } as never
  );
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as MonthlyCashflow | null | undefined;
  return {
    income_pln: Number(row?.income_pln ?? 0),
    expense_pln: Number(row?.expense_pln ?? 0),
    surplus_pln: Number(row?.surplus_pln ?? 0),
  };
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
  const { data, error } = await supabase.rpc(
    "get_period_cashflow",
    { p_from: from, p_to: to, p_mode: mode } as never
  );
  if (error) {
    if (error.code === "PGRST202") {
      return { income_pln: 0, expense_pln: 0, surplus_pln: 0 };
    }
    throw error;
  }
  const row = (Array.isArray(data) ? data[0] : data) as MonthlyCashflow | null | undefined;
  return {
    income_pln: Number(row?.income_pln ?? 0),
    expense_pln: Number(row?.expense_pln ?? 0),
    surplus_pln: Number(row?.surplus_pln ?? 0),
  };
}

export async function rpcCashflowHistory(
  supabase: ServerSupabaseClient,
  months: number,
  asOfDate: string,
  mode: BalanceMode = "current"
): Promise<CashflowHistoryRow[]> {
  const { data, error } = await supabase.rpc(
    "get_cashflow_history",
    { p_months: months, p_as_of_date: asOfDate, p_mode: mode } as never
  );
  if (error) {
    if (error.code === "PGRST202") return [];
    throw error;
  }
  return ((data ?? []) as CashflowHistoryRow[]).map((r) => ({
    year: Number(r.year),
    month: Number(r.month),
    income_pln: Number(r.income_pln),
    expense_pln: Number(r.expense_pln),
    surplus_pln: Number(r.surplus_pln),
    has_data: Boolean(r.has_data),
  }));
}

export async function rpcVerifyBalanceIntegrity(supabase: ServerSupabaseClient, userId?: string) {
  const { data, error } = await supabase.rpc(
    "verify_balance_integrity",
    userId ? ({ p_user_id: userId } as never) : ({} as never)
  );
  if (error) throw error;
  return (data ?? []) as BalanceIntegrityRow[];
}
