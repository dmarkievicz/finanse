import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { rpcCategoryBreakdown, rpcNetWorth, rpcPeriodCashflow } from "@/lib/supabase/rpc";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { monthRange } from "@/lib/format";

export interface MonthlyReportData {
  month: string;
  monthLabel: string;
  from: string;
  to: string;
  netWorth: number;
  income: number;
  expenses: number;
  surplus: number;
  savingsRate: number;
  categories: { name: string; total: number }[];
}

export async function buildMonthlyReport(
  supabase: ServerSupabaseClient,
  month: string
): Promise<MonthlyReportData> {
  const range = monthRange(month);
  if (!range) throw new Error("Nieprawidłowy miesiąc (YYYY-MM)");

  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);

  const [netWorth, cashflow, breakdown] = await Promise.all([
    rpcNetWorth(supabase, range.to, mode),
    rpcPeriodCashflow(supabase, range.from, range.to, mode),
    rpcCategoryBreakdown(supabase, range.from, range.to, mode),
  ]);

  const income = Number(cashflow.income_pln);
  const expenses = Number(cashflow.expense_pln);
  const surplus = Number(cashflow.surplus_pln);

  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));

  return {
    month,
    monthLabel,
    from: range.from,
    to: range.to,
    netWorth,
    income,
    expenses,
    surplus,
    savingsRate: income > 0 ? Math.round((surplus / income) * 1000) / 10 : 0,
    categories: breakdown.map((c) => ({
      name: c.category_name ?? "Bez kategorii",
      total: Number(c.total_pln),
    })),
  };
}
