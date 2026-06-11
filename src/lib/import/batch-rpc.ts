import type { SupabaseClient } from "@supabase/supabase-js";

export interface ImportBatchItem {
  import_row: {
    row_number: number;
    raw_data: Record<string, unknown>;
    import_hash: string;
    status: "valid" | "error";
    validation_errors: unknown[] | null;
  };
  transaction: {
    date: string;
    type: string;
    description: string | null;
    details: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    status: string;
    validation_issues: unknown[];
  } | null;
  entries: {
    account_id: string;
    amount: number;
    currency: string;
    exchange_rate: number;
    amount_pln: number;
    sort_order: number;
  }[];
}

export interface ImportBatchResult {
  imported: number;
  errors: number;
}

export async function rpcImportTransactionBatch(
  supabase: SupabaseClient,
  userId: string,
  importId: string,
  items: ImportBatchItem[]
): Promise<ImportBatchResult> {
  const { data, error } = await supabase.rpc("import_transaction_batch", {
    p_user_id: userId,
    p_import_id: importId,
    p_items: items,
  } as never);

  if (error) throw error;

  const result = data as { imported?: number; errors?: number } | null;
  return {
    imported: Number(result?.imported ?? 0),
    errors: Number(result?.errors ?? 0),
  };
}
