import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AccountBalance,
  AccountManageRow,
  CategoryBreakdown,
  MonthlyCashflow,
} from "@/types/database";

export type BalanceMode = "current" | "full";

async function getAnalysisStartDate(supabase: ServerSupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("analysis_start_date")
    .maybeSingle();
  if (error) throw error;
  return (data as { analysis_start_date?: string | null } | null)?.analysis_start_date ?? null;
}

function clampFromToAnalysisStart(from: string, analysisStartDate: string | null, mode: BalanceMode) {
  if (mode === "full" || !analysisStartDate) return from;
  // Both are YYYY-MM-DD strings, so lexicographic compare works.
  return analysisStartDate > from ? analysisStartDate : from;
}

async function rpcSignedPeriodCashflow(
  supabase: ServerSupabaseClient,
  from: string,
  to: string,
  mode: BalanceMode
): Promise<MonthlyCashflow> {
  const analysisStartDate = await getAnalysisStartDate(supabase);
  const clampedFrom = clampFromToAnalysisStart(from, analysisStartDate, mode);

  const { data, error } = await supabase.rpc(
    "get_transactions_summary",
    {
      p_date_from: clampedFrom,
      p_date_to: to,
      p_type: "all",
      p_category_id: null,
      p_subcategory_id: null,
      p_account_id: null,
      p_source_account_id: null,
      p_target_account_id: null,
      p_search: null,
      p_currency: null,
      p_amount_min: null,
      p_amount_max: null,
      p_import_only: false,
      p_manual_only: false,
      // Historycznie dashboard liczył też reconciled (stare get_period_cashflow nie wykluczało).
      p_include_reconciled: true,
    } as never
  );

  if (error) {
    if (error.code === "PGRST202") {
      return { income_pln: 0, expense_pln: 0, surplus_pln: 0 };
    }
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { income_total?: number; expense_total?: number }
    | null
    | undefined;

  const income = Number(row?.income_total ?? 0);
  const expense = Number(row?.expense_total ?? 0);
  return { income_pln: income, expense_pln: expense, surplus_pln: income - expense };
}

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
  return rpcSignedPeriodCashflow(supabase, from, to, mode).catch(async (e) => {
    // Fallback for older DBs without signed-aware summary functions.
    const { data, error } = await supabase.rpc(
      "get_monthly_cashflow",
      { p_year: year, p_month: month, p_mode: mode } as never
    );
    if (error) throw e;
    const row = (Array.isArray(data) ? data[0] : data) as MonthlyCashflow | null | undefined;
    return {
      income_pln: Number(row?.income_pln ?? 0),
      expense_pln: Number(row?.expense_pln ?? 0),
      surplus_pln: Number(row?.surplus_pln ?? 0),
    };
  });
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
  return rpcSignedPeriodCashflow(supabase, from, to, mode).catch(async (e) => {
    const { data, error } = await supabase.rpc(
      "get_period_cashflow",
      { p_from: from, p_to: to, p_mode: mode } as never
    );
    if (error) {
      if (error.code === "PGRST202") {
        return { income_pln: 0, expense_pln: 0, surplus_pln: 0 };
      }
      throw e;
    }
    const row = (Array.isArray(data) ? data[0] : data) as MonthlyCashflow | null | undefined;
    return {
      income_pln: Number(row?.income_pln ?? 0),
      expense_pln: Number(row?.expense_pln ?? 0),
      surplus_pln: Number(row?.surplus_pln ?? 0),
    };
  });
}

export async function rpcCashflowHistory(
  supabase: ServerSupabaseClient,
  months: number,
  asOfDate: string,
  mode: BalanceMode = "current"
): Promise<CashflowHistoryRow[]> {
  // Signed-aware path: compute N months using get_transactions_summary (refunds as income, negative income allowed).
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

  try {
    const rows = await Promise.all(
      monthKeys.map(async (k) => {
        const cf = await rpcSignedPeriodCashflow(supabase, k.from, k.to, mode);
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
  } catch {
    // Fallback for older DBs.
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
}

export async function rpcVerifyBalanceIntegrity(supabase: ServerSupabaseClient, userId?: string) {
  const { data, error } = await supabase.rpc(
    "verify_balance_integrity",
    userId ? ({ p_user_id: userId } as never) : ({} as never)
  );
  if (error) throw error;
  return (data ?? []) as BalanceIntegrityRow[];
}
