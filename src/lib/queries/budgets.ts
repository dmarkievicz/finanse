import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { rpcCategoryBreakdown } from "@/lib/supabase/rpc";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { monthRange } from "@/lib/format";

export interface BudgetRow {
  id: string;
  category_id: string;
  category_name: string;
  year: number;
  month: number;
  limit_pln: number;
  spent_pln: number;
  pct: number;
  overBudget: boolean;
}

export async function fetchBudgetsForMonth(
  supabase: ServerSupabaseClient,
  year: number,
  month: number
): Promise<BudgetRow[]> {
  const { data: budgets, error } = await supabase
    .from("budgets")
    .select("id, category_id, year, month, limit_pln, categories(name)")
    .eq("year", year)
    .eq("month", month)
    .order("limit_pln", { ascending: false });

  if (error) throw error;
  if (!budgets?.length) return [];

  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);
  const range = monthRange(`${year}-${String(month).padStart(2, "0")}`)!;
  const { from, to } = range;
  const breakdown = await rpcCategoryBreakdown(supabase, from, to, mode);
  const spentMap = new Map(breakdown.map((b) => [b.category_id, Number(b.total_pln)]));

  return (budgets as {
    id: string;
    category_id: string;
    year: number;
    month: number;
    limit_pln: number;
    categories: { name: string } | null;
  }[]).map((b) => {
    const spent = spentMap.get(b.category_id) ?? 0;
    const limit = Number(b.limit_pln);
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    return {
      id: b.id,
      category_id: b.category_id,
      category_name: b.categories?.name ?? "—",
      year: b.year,
      month: b.month,
      limit_pln: limit,
      spent_pln: spent,
      pct,
      overBudget: spent > limit,
    };
  });
}
