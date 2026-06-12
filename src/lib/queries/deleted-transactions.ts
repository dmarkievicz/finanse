import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_PAGE_SIZE } from "@/lib/transactions/filter-state";
import { formatPln } from "@/lib/format";

export interface DeletedTransactionRow {
  id: string;
  date: string;
  type: string;
  details: string | null;
  description: string | null;
  deleted_at: string;
  category_name: string | null;
  amount_pln: number | null;
  amount_label: string;
}

export interface DeletedTransactionsPageData {
  items: DeletedTransactionRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchDeletedTransactions(
  supabase: ServerSupabaseClient,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<DeletedTransactionsPageData> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from("transactions")
    .select(
      `id, date, type, details, description, deleted_at,
       categories (name),
       transaction_entries (amount_pln, sort_order)`,
      { count: "exact" }
    )
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const items: DeletedTransactionRow[] = ((data ?? []) as {
    id: string;
    date: string;
    type: string;
    details: string | null;
    description: string | null;
    deleted_at: string;
    categories: { name: string } | null;
    transaction_entries: { amount_pln: number; sort_order?: number }[];
  }[]).map((row) => {
    const entries = [...(row.transaction_entries ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    const primary = entries[0];
    const amountPln = primary ? Number(primary.amount_pln) : null;
    return {
      id: row.id,
      date: row.date,
      type: row.type,
      details: row.details,
      description: row.description,
      deleted_at: row.deleted_at,
      category_name: row.categories?.name ?? null,
      amount_pln: amountPln,
      amount_label: amountPln != null ? formatPln(amountPln) : "—",
    };
  });

  return {
    items,
    total: count ?? 0,
    page,
    pageSize,
  };
}
