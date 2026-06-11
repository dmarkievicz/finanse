import type { TransactionStatus, TransactionType } from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { rpcNeedsReviewCount } from "@/lib/supabase/rpc";
import { monthRange } from "@/lib/format";
import {
  formatPendingAccountLabel,
  hintFromImportRaw,
} from "@/lib/import/parse-raw-row";

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
  /** Kwota z Excela gdy brak wpisów księgowych (needs_review). */
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

const DEFAULT_PAGE_SIZE = 50;

function formatAccountLabel(
  type: string,
  entries: { amount_pln: number; accounts: { name: string } | null }[]
): { amountPln: number | null; accountLabel: string } {
  if (!entries.length) {
    return { amountPln: null, accountLabel: "—" };
  }

  if (type === "transfer") {
    const source = entries.find((e) => Number(e.amount_pln) < 0);
    const target = entries.find((e) => Number(e.amount_pln) > 0);
    const amount = Math.abs(Number(source?.amount_pln ?? entries[0].amount_pln));
    const from = source?.accounts?.name ?? "?";
    const to = target?.accounts?.name ?? "?";
    return { amountPln: amount, accountLabel: `${from} → ${to}` };
  }

  const entry = entries[0];
  return {
    amountPln: Number(entry.amount_pln),
    accountLabel: entry.accounts?.name ?? "—",
  };
}

export async function fetchTransactions(
  supabase: ServerSupabaseClient,
  options: {
    page?: number;
    type?: TransactionType | "all";
    reviewOnly?: boolean;
    accountId?: string;
    categoryId?: string;
    month?: string;
    pageSize?: number;
    search?: string;
    status?: string;
  } = {}
): Promise<TransactionsPageData> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const entriesSelect = options.accountId
    ? "transaction_entries!inner (amount_pln, account_id, accounts (name))"
    : "transaction_entries (amount_pln, accounts (name))";

  let query = supabase
    .from("transactions")
    .select(
      `id, date, type, status, details,
       categories (name),
       subcategories (name),
       ${entriesSelect}`,
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options.accountId) {
    query = query.eq("transaction_entries.account_id", options.accountId);
  }

  if (options.type && options.type !== "all") {
    query = query.eq("type", options.type);
  }

  if (options.reviewOnly) {
    query = query.eq("status", "needs_review");
  } else if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  const range = options.month ? monthRange(options.month) : null;
  if (range) {
    query = query.gte("date", range.from).lte("date", range.to);
  }

  if (options.search?.trim()) {
    query = query.or(
      `details.ilike.%${options.search.trim()}%,description.ilike.%${options.search.trim()}%`
    );
  }

  const [listRes, needsReviewCount] = await Promise.all([query, rpcNeedsReviewCount(supabase)]);

  if (listRes.error) throw listRes.error;

  type TxRow = {
    id: string;
    date: string;
    type: string;
    status: string;
    details: string | null;
    categories: { name: string } | null;
    subcategories: { name: string } | null;
    transaction_entries: { amount_pln: number; accounts: { name: string } | null }[];
  };

  const rows = (listRes.data ?? []) as TxRow[];
  const needsHintIds = rows
    .filter((tx) => tx.status === "needs_review" && !(tx.transaction_entries?.length))
    .map((tx) => tx.id);

  const hintByTxId = new Map<
    string,
    ReturnType<typeof hintFromImportRaw>
  >();

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

  const items: TransactionListItem[] = rows.map((tx) => {
    const entries = tx.transaction_entries ?? [];
    const { amountPln, accountLabel } = formatAccountLabel(tx.type, entries);
    const cat = tx.categories as { name: string } | null;
    const sub = tx.subcategories as { name: string } | null;
    const hint = hintByTxId.get(tx.id);

    return {
      id: tx.id,
      date: tx.date,
      type: tx.type as TransactionType,
      status: tx.status as TransactionStatus,
      category: cat?.name ?? null,
      subcategory: sub?.name ?? null,
      details: tx.details,
      amountPln,
      accountLabel,
      pendingAmountPln: hint?.amountPln ?? null,
      pendingAmount: hint?.amount ?? null,
      pendingCurrency: hint?.currency ?? null,
      pendingExchangeRate: hint?.exchangeRate ?? null,
      pendingSourceAccount: hint?.sourceAccount || null,
      pendingTargetAccount: hint?.targetAccount || null,
      pendingAccountLabel: hint ? formatPendingAccountLabel(tx.type, hint) : null,
      reviewMessage: hint?.reviewMessage ?? null,
    };
  });

  return {
    items,
    total: listRes.count ?? 0,
    page,
    pageSize,
    needsReviewCount,
  };
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
