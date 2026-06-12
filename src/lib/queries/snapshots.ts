import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { PortfolioSnapshotRow, WealthSnapshotData } from "@/lib/snapshots/types";

export async function fetchPortfolioSnapshots(
  supabase: ServerSupabaseClient,
  limit = 24
): Promise<PortfolioSnapshotRow[]> {
  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("id, date, data, created_at")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as { id: string; date: string; data: WealthSnapshotData; created_at: string }[]).map(
    (row) => ({
      id: row.id,
      date: row.date,
      data: row.data,
      created_at: row.created_at,
    })
  );
}
