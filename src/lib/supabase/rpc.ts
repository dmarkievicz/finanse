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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function computeRefundAwareCashflow(
  supabase: ServerSupabaseClient,
  from: string,
  to: string,
  mode: BalanceMode
): Promise<MonthlyCashflow> {
  const analysisStartDate = await getAnalysisStartDate(supabase);
  const clampedFrom = clampFromToAnalysisStart(from, analysisStartDate, mode);

  // Refund-aware cashflow:
  // - income type: net_pln contributes to income (can be negative => odliczenie od przychodu)
  // - expense type:
  //   - net_pln < 0 => normal expense => contributes to expenses as positive (-net_pln)
  //   - net_pln > 0 => refund/correction => contributes to income as positive (+net_pln)
  let income = 0;
  let expense = 0;

  const pageSize = 500;
  let offset = 0;

  while (true) {
    const { data: txPage, error: txError } = await supabase
      .from("transactions")
      .select("id, type, status, date, created_at")
      .is("deleted_at", null)
      .in("type", ["income", "expense"])
      .neq("status", "needs_review")
      .gte("date", clampedFrom)
      .lte("date", to)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (txError) throw txError;

    const txs = (txPage ?? []) as { id: string; type: string; status: string; date: string }[];
    if (!txs.length) break;

    const ids = txs.map((t) => t.id);
    const { data: entries, error: entriesError } = await supabase
      .from("transaction_entries")
      .select("transaction_id, amount_pln")
      .in("transaction_id", ids);

    if (entriesError) throw entriesError;

    const netByTx = new Map<string, number>();
    for (const e of (entries ?? []) as { transaction_id: string; amount_pln: number | null }[]) {
      const tid = e.transaction_id;
      const amt = Number(e.amount_pln ?? 0);
      netByTx.set(tid, (netByTx.get(tid) ?? 0) + amt);
    }

    for (const t of txs) {
      const net = netByTx.get(t.id) ?? 0;
      if (t.type === "income") {
        income += net;
      } else if (t.type === "expense") {
        if (net > 0) income += net;
        else if (net < 0) expense += -net;
      }
    }

    if (txs.length < pageSize) break;
    offset += pageSize;
  }

  return {
    income_pln: round2(income),
    expense_pln: round2(expense),
    surplus_pln: round2(income - expense),
  };
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
