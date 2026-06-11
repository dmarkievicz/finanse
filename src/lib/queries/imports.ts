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

export interface ImportErrorRow {
  id: string;
  import_id: string;
  row_number: number | null;
  validation_errors: { code?: string; message?: string }[] | null;
  transaction_id: string | null;
  created_at: string;
}

export interface ImportsPageData {
  imports: ImportRecord[];
  stats: {
    transactions: number;
    accounts: number;
    categories: number;
    importRows: number;
    needsReview: number;
    confirmed: number;
    reconciled: number;
    errorRows: number;
    duplicateHashes: number;
  };
}

export async function fetchImportsPage(supabase: ServerSupabaseClient): Promise<ImportsPageData> {
  const [
    importsRes,
    txCount,
    accCount,
    catCount,
    rowsCount,
    reviewCount,
    confirmedCount,
    reconciledCount,
    errorRowsCount,
  ] = await Promise.all([
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
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "needs_review"),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "confirmed"),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "reconciled"),
    supabase
      .from("import_rows")
      .select("*", { count: "exact", head: true })
      .not("validation_errors", "is", null),
  ]);

  if (importsRes.error) throw importsRes.error;

  const { data: dupData } = await supabase
    .from("import_rows")
    .select("import_hash")
    .not("import_hash", "is", null);

  const hashCounts = new Map<string, number>();
  for (const row of dupData ?? []) {
    const h = (row as { import_hash: string }).import_hash;
    hashCounts.set(h, (hashCounts.get(h) ?? 0) + 1);
  }
  const duplicateHashes = [...hashCounts.values()].filter((c) => c > 1).length;

  return {
    imports: (importsRes.data ?? []) as ImportRecord[],
    stats: {
      transactions: txCount.count ?? 0,
      accounts: accCount.count ?? 0,
      categories: catCount.count ?? 0,
      importRows: rowsCount.count ?? 0,
      needsReview: reviewCount.count ?? 0,
      confirmed: confirmedCount.count ?? 0,
      reconciled: reconciledCount.count ?? 0,
      errorRows: errorRowsCount.count ?? 0,
      duplicateHashes,
    },
  };
}

export async function fetchImportErrorRows(
  supabase: ServerSupabaseClient,
  limit = 100
): Promise<ImportErrorRow[]> {
  const { data, error } = await supabase
    .from("import_rows")
    .select("id, import_id, row_number, validation_errors, transaction_id, created_at")
    .not("validation_errors", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as ImportErrorRow[]).filter(
    (r) => Array.isArray(r.validation_errors) && r.validation_errors.length > 0
  );
}
