import type { TransactionStatus, TransactionType } from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { rpcNeedsReviewCount } from "@/lib/supabase/rpc";
import { hintFromImportRaw } from "@/lib/import/parse-raw-row";
import { mapTransactionRow } from "@/lib/transactions/parse-list-item";
import {
  DEFAULT_PAGE_SIZE,
  resolveDateRange,
  type TransactionFilterState,
} from "@/lib/transactions/filter-state";
import { rpcFilterParams } from "@/lib/transactions/rpc-filters";

export interface TransactionListItem {
  id: string;
  date: string;
  type: TransactionType;
  status: TransactionStatus;
  category: string | null;
  subcategory: string | null;
  details: string | null;
  amountPln: number | null;
  accountLabel: string;
  sourceAccount: string | null;
  targetAccount: string | null;
  originalAmount: number | null;
  currency: string | null;
  exchangeRate: number | null;
  importId: string | null;
  pendingAmountPln?: number | null;
  pendingAmount?: number | null;
  pendingCurrency?: string | null;
  pendingExchangeRate?: number | null;
  pendingSourceAccount?: string | null;
  pendingTargetAccount?: string | null;
  pendingAccountLabel?: string | null;
  reviewMessage?: string | null;
}

export interface TransactionsPageData {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
  needsReviewCount: number;
}

export async function fetchAccountTransactionCount(
  supabase: ServerSupabaseClient,
  accountId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("transactions")
    .select("id, transaction_entries!inner(account_id)", { count: "exact", head: true })
    .is("deleted_at", null)
    .neq("status", "needs_review")
    .eq("transaction_entries.account_id", accountId);

  if (error) throw error;
  return count ?? 0;
}

export interface TransactionQueryOptions {
  page?: number;
  pageSize?: number;
  type?: TransactionType | "all";
  reviewOnly?: boolean;
  status?: string;
  filters?: TransactionFilterState;
  /** @deprecated użyj filters */
  accountId?: string;
  categoryId?: string;
  month?: string;
  search?: string;
}

type TxRow = {
  id: string;
  date: string;
  type: string;
  status: string;
  details: string | null;
  import_id: string | null;
  categories: { name: string } | null;
  subcategories: { name: string } | null;
  transaction_entries: {
    amount: number;
    amount_pln: number;
    currency: string;
    exchange_rate: number;
    account_id: string;
    sort_order?: number;
    accounts: { name: string; default_currency: string } | null;
  }[];
};

const TX_SELECT = `id, date, type, status, details, import_id,
  categories (name),
  subcategories (name),
  transaction_entries (amount, amount_pln, currency, exchange_rate, account_id, sort_order, accounts (name, default_currency))`;

async function mapRowsToItems(
  supabase: ServerSupabaseClient,
  rows: TxRow[]
): Promise<TransactionListItem[]> {
  const needsHintIds = rows
    .filter((tx) => tx.status === "needs_review" && !(tx.transaction_entries?.length))
    .map((tx) => tx.id);

  const hintByTxId = new Map<string, ReturnType<typeof hintFromImportRaw>>();

  if (needsHintIds.length > 0) {
    const { data: importRows } = await supabase
      .from("import_rows")
      .select("transaction_id, raw_data, validation_errors")
      .in("transaction_id", needsHintIds);

    for (const row of importRows ?? []) {
      const rid = (row as { transaction_id: string }).transaction_id;
      hintByTxId.set(
        rid,
        hintFromImportRaw(
          (row as { raw_data: Record<string, unknown> }).raw_data,
          (row as { validation_errors: { message?: string }[] | null }).validation_errors
        )
      );
    }
  }

  return rows.map((tx) => mapTransactionRow(tx, hintByTxId.get(tx.id) ?? undefined));
}

async function fetchPageViaRpc(
  supabase: ServerSupabaseClient,
  filters: TransactionFilterState,
  page: number,
  pageSize: number
): Promise<{ ids: string[]; total: number } | null> {
  const { data, error } = await supabase.rpc(
    "get_transaction_page_ids",
    {
      ...rpcFilterParams(filters),
      p_sort: filters.sort,
      p_sort_dir: filters.sortDir,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    } as never
  );

  if (error) return null;

  const rows = (data ?? []) as { id: string; total_count: number }[];
  if (!rows.length) return { ids: [], total: rows[0]?.total_count ?? 0 };

  return {
    ids: rows.map((r) => r.id),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

export async function fetchTransactions(
  supabase: ServerSupabaseClient,
  options: TransactionQueryOptions = {}
): Promise<TransactionsPageData> {
  const filters = options.filters;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, options.page ?? filters?.page ?? 1);
  const needsReviewCount = await rpcNeedsReviewCount(supabase);

  if (filters && !options.reviewOnly && !options.status) {
    const pageResult = await fetchPageViaRpc(supabase, filters, page, pageSize);
    if (pageResult) {
      if (!pageResult.ids.length) {
        return { items: [], total: pageResult.total, page, pageSize, needsReviewCount };
      }
      const { data, error } = await supabase
        .from("transactions")
        .select(TX_SELECT)
        .in("id", pageResult.ids);

      if (error) throw error;

      const byId = new Map(((data ?? []) as TxRow[]).map((r) => [r.id, r]));
      const rows = pageResult.ids
        .map((id) => byId.get(id))
        .filter((r): r is TxRow => Boolean(r));

      const items = await mapRowsToItems(supabase, rows);
      return { items, total: pageResult.total, page, pageSize, needsReviewCount };
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const accountId = filters?.accountId ?? options.accountId;
  const needsInnerJoin = Boolean(accountId || filters?.currency);

  const entriesSelect = needsInnerJoin
    ? "transaction_entries!inner (amount, amount_pln, currency, exchange_rate, account_id, sort_order, accounts (name))"
    : "transaction_entries (amount, amount_pln, currency, exchange_rate, account_id, sort_order, accounts (name))";

  let query = supabase
    .from("transactions")
    .select(
      `id, date, type, status, details, import_id,
       categories (name),
       subcategories (name),
       ${entriesSelect}`,
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const type = filters?.type ?? options.type ?? "all";
  if (type !== "all") query = query.eq("type", type);

  if (options.reviewOnly) {
    query = query.eq("status", "needs_review");
  } else if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  } else if (!options.reviewOnly) {
    query = query.neq("status", "needs_review");
    if (!filters?.includeReconciled) query = query.neq("status", "reconciled");
  }

  if (accountId) query = query.eq("transaction_entries.account_id", accountId);

  const categoryId = filters?.categoryId ?? options.categoryId;
  if (categoryId) query = query.eq("category_id", categoryId);
  if (filters?.subcategoryId) query = query.eq("subcategory_id", filters.subcategoryId);

  const range = filters ? resolveDateRange(filters) : null;
  if (range) query = query.gte("date", range.from).lte("date", range.to);

  const search = filters?.search ?? options.search;
  if (search?.trim()) {
    query = query.or(
      `details.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`
    );
  }

  if (filters?.currency) query = query.eq("transaction_entries.currency", filters.currency);
  if (filters?.importOnly) query = query.not("import_id", "is", null);
  if (filters?.manualOnly) query = query.is("import_id", null);

  const listRes = await query;
  if (listRes.error) throw listRes.error;

  const rows = (listRes.data ?? []) as TxRow[];
  const items = await mapRowsToItems(supabase, rows);

  return {
    items,
    total: listRes.count ?? 0,
    page,
    pageSize,
    needsReviewCount,
  };
}

/** Eksport CSV — wszystkie ID pasujące do filtrów (bez paginacji). */
export async function fetchAllTransactionIdsForExport(
  supabase: ServerSupabaseClient,
  filters: TransactionFilterState,
  maxRows = 50000
): Promise<string[]> {
  const { data, error } = await supabase.rpc(
    "get_transaction_page_ids",
    {
      ...rpcFilterParams(filters),
      p_sort: filters.sort,
      p_sort_dir: filters.sortDir,
      p_limit: maxRows,
      p_offset: 0,
    } as never
  );

  if (error) throw error;
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

export async function fetchTransactionsByIds(
  supabase: ServerSupabaseClient,
  ids: string[]
): Promise<TransactionListItem[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("transactions").select(TX_SELECT).in("id", ids);
  if (error) throw error;
  const byId = new Map(((data ?? []) as TxRow[]).map((r) => [r.id, r]));
  const rows = ids.map((id) => byId.get(id)).filter((r): r is TxRow => Boolean(r));
  return mapRowsToItems(supabase, rows);
}

export async function fetchCategoryName(
  supabase: ServerSupabaseClient,
  categoryId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .eq("id", categoryId)
    .maybeSingle();
  if (error) throw error;
  return (data as { name: string } | null)?.name ?? null;
}

export async function fetchSubcategoryName(
  supabase: ServerSupabaseClient,
  subcategoryId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("subcategories")
    .select("name")
    .eq("id", subcategoryId)
    .maybeSingle();
  if (error) throw error;
  return (data as { name: string } | null)?.name ?? null;
}

export async function fetchLookupForFilters(supabase: ServerSupabaseClient) {
  const [accounts, categories, subcategories] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, default_currency, lifecycle_status")
      .is("deleted_at", null)
      .eq("lifecycle_status", "active")
      .order("name"),
    supabase
      .from("categories")
      .select("id, name")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("subcategories")
      .select("id, name, category_id")
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (accounts.error) throw accounts.error;
  if (categories.error) throw categories.error;
  if (subcategories.error) throw subcategories.error;

  return {
    accounts: (accounts.data ?? []) as {
      id: string;
      name: string;
      default_currency: string;
      lifecycle_status: string;
    }[],
    categories: (categories.data ?? []) as { id: string; name: string }[],
    subcategories: (subcategories.data ?? []) as {
      id: string;
      name: string;
      category_id: string;
    }[],
  };
}
