import type { ServerSupabaseClient } from "@/lib/supabase/server";

export interface ImportRecord {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_rows: number;
  started_at: string;
  completed_at: string | null;
  error_log: { needs_review?: number; warnings?: number } | null;
}

export interface ImportsPageData {
  imports: ImportRecord[];
  stats: {
    transactions: number;
    accounts: number;
    categories: number;
    importRows: number;
  };
}

export async function fetchImportsPage(supabase: ServerSupabaseClient): Promise<ImportsPageData> {
  const [importsRes, txCount, accCount, catCount, rowsCount] = await Promise.all([
    supabase
      .from("imports")
      .select(
        "id, filename, status, total_rows, imported_rows, skipped_rows, error_rows, started_at, completed_at, error_log"
      )
      .order("started_at", { ascending: false })
      .limit(20),
    supabase.from("transactions").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("accounts").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("categories").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("import_rows").select("*", { count: "exact", head: true }),
  ]);

  if (importsRes.error) throw importsRes.error;

  return {
    imports: (importsRes.data ?? []) as ImportRecord[],
    stats: {
      transactions: txCount.count ?? 0,
      accounts: accCount.count ?? 0,
      categories: catCount.count ?? 0,
      importRows: rowsCount.count ?? 0,
    },
  };
}
