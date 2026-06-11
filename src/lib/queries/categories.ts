import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { rpcCategoryBreakdown } from "@/lib/supabase/rpc";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { monthRange } from "@/lib/format";
import type { CategoryType } from "@/types/database";

export interface CategoryListItem {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  monthSpent: number;
  txCount: number;
}

export interface CategoryDetailData {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  currentMonthSpent: number;
  currentMonthTxCount: number;
  monthlyTrend: { month: string; label: string; total: number }[];
  topTransactions: {
    id: string;
    date: string;
    details: string | null;
    amount_pln: number;
  }[];
}

export async function fetchCategoriesList(
  supabase: ServerSupabaseClient,
  year: number,
  month: number
): Promise<CategoryListItem[]> {
  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);
  const { from, to } = monthRange(`${year}-${String(month).padStart(2, "0")}`)!;

  const [breakdown, catsRes] = await Promise.all([
    rpcCategoryBreakdown(supabase, from, to, mode),
    supabase
      .from("categories")
      .select("id, name, type, color")
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (catsRes.error) throw catsRes.error;

  const spentMap = new Map(
    breakdown.map((b) => [b.category_id, { total: Number(b.total_pln), count: Number(b.tx_count) }])
  );

  return ((catsRes.data ?? []) as { id: string; name: string; type: string; color: string | null }[])
    .map((c) => {
      const s = spentMap.get(c.id);
      return {
        id: c.id,
        name: c.name,
        type: c.type as CategoryType,
        color: c.color,
        monthSpent: s?.total ?? 0,
        txCount: s?.count ?? 0,
      };
    })
    .sort((a, b) => b.monthSpent - a.monthSpent);
}

export async function fetchCategoryDetail(
  supabase: ServerSupabaseClient,
  categoryId: string,
  reference = new Date()
): Promise<CategoryDetailData | null> {
  const { data: cat, error } = await supabase
    .from("categories")
    .select("id, name, type, color")
    .eq("id", categoryId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!cat) return null;

  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);
  const year = reference.getFullYear();
  const month = reference.getMonth() + 1;
  const currentRange = monthRange(`${year}-${String(month).padStart(2, "0")}`)!;
  const { from, to } = currentRange;

  const monthlyTrend: CategoryDetailData["monthlyTrend"] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const r = monthRange(`${y}-${String(m).padStart(2, "0")}`)!;
    const rows = await rpcCategoryBreakdown(supabase, r.from, r.to, mode);
    const row = rows.find((x) => x.category_id === categoryId);
    monthlyTrend.push({
      month: `${y}-${String(m).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("pl-PL", { month: "short", year: "2-digit" }).format(d),
      total: row ? Number(row.total_pln) : 0,
    });
  }

  const currentBreakdown = await rpcCategoryBreakdown(supabase, from, to, mode);
  const current = currentBreakdown.find((x) => x.category_id === categoryId);

  const { data: topTx } = await supabase
    .from("transactions")
    .select("id, date, details, transaction_entries(amount_pln)")
    .eq("category_id", categoryId)
    .eq("type", "expense")
    .is("deleted_at", null)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .limit(10);

  const topTransactions = ((topTx ?? []) as {
    id: string;
    date: string;
    details: string | null;
    transaction_entries: { amount_pln: number }[];
  }[]).map((t) => ({
    id: t.id,
    date: t.date,
    details: t.details,
    amount_pln: Math.abs(Number(t.transaction_entries?.[0]?.amount_pln ?? 0)),
  }));

  const c = cat as { id: string; name: string; type: string; color: string | null };

  return {
    id: c.id,
    name: c.name,
    type: c.type as CategoryType,
    color: c.color,
    currentMonthSpent: current ? Number(current.total_pln) : 0,
    currentMonthTxCount: current ? Number(current.tx_count) : 0,
    monthlyTrend,
    topTransactions,
  };
}
