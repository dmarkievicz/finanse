import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { AccountBalance, CategoryBreakdown, MonthlyCashflow } from "@/types/database";

export async function rpcNetWorth(supabase: ServerSupabaseClient, asOfDate: string) {
  const { data, error } = await supabase.rpc(
    "get_net_worth",
    { p_as_of_date: asOfDate } as never
  );
  if (error) throw error;
  return Number(data ?? 0);
}

export async function rpcAccountBalances(supabase: ServerSupabaseClient, asOfDate: string) {
  const { data, error } = await supabase.rpc(
    "get_account_balances",
    { p_as_of_date: asOfDate } as never
  );
  if (error) throw error;
  return (data ?? []) as AccountBalance[];
}

export async function rpcMonthlyCashflow(
  supabase: ServerSupabaseClient,
  year: number,
  month: number
): Promise<MonthlyCashflow> {
  const { data, error } = await supabase.rpc(
    "get_monthly_cashflow",
    { p_year: year, p_month: month } as never
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
  to: string
) {
  const { data, error } = await supabase.rpc(
    "get_category_breakdown",
    { p_from: from, p_to: to } as never
  );
  if (error) throw error;
  return (data ?? []) as CategoryBreakdown[];
}

export async function rpcNeedsReviewCount(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase.rpc("get_needs_review_count");
  if (error) throw error;
  return Number(data ?? 0);
}
