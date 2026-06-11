import type { SupabaseClient } from "@supabase/supabase-js";

export interface ClearDataResult {
  deleted: {
    transaction_entries: number;
    transactions: number;
    import_rows: number;
    imports: number;
    subcategories: number;
    categories: number;
    accounts: number;
  };
}

const BATCH_SIZE = 500;

async function countBefore(
  supabase: SupabaseClient,
  table: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

async function deleteByUserInBatches(
  supabase: SupabaseClient,
  table: string,
  userId: string
): Promise<void> {
  while (true) {
    const { data: rows, error: selectError } = await supabase
      .from(table)
      .select("id")
      .eq("user_id", userId)
      .limit(BATCH_SIZE);

    if (selectError) throw selectError;
    if (!rows?.length) break;

    const ids = rows.map((row) => row.id);
    const { error: deleteError } = await supabase.from(table).delete().in("id", ids);
    if (deleteError) throw deleteError;
  }
}

async function deleteByUser(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  batched: boolean
): Promise<void> {
  if (batched) {
    await deleteByUserInBatches(supabase, table, userId);
    return;
  }

  const { error } = await supabase.from(table).delete().eq("user_id", userId);
  if (error) throw error;
}

export async function clearUserImportData(
  supabase: SupabaseClient,
  userId: string
): Promise<ClearDataResult> {
  const tables = [
    { name: "transaction_entries", batched: true },
    { name: "transactions", batched: true },
    { name: "import_rows", batched: true },
    { name: "imports", batched: false },
    { name: "subcategories", batched: false },
    { name: "categories", batched: false },
    { name: "accounts", batched: false },
  ] as const;

  const before: Record<string, number> = {};
  for (const { name } of tables) {
    before[name] = await countBefore(supabase, name, userId);
  }

  for (const { name, batched } of tables) {
    await deleteByUser(supabase, name, userId, batched);
  }

  return {
    deleted: {
      transaction_entries: before.transaction_entries,
      transactions: before.transactions,
      import_rows: before.import_rows,
      imports: before.imports,
      subcategories: before.subcategories,
      categories: before.categories,
      accounts: before.accounts,
    },
  };
}
