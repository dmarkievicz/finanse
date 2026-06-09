import type { TransactionStatus, TransactionType } from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { rpcNeedsReviewCount } from "@/lib/supabase/rpc";

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
}

export interface TransactionsPageData {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
  needsReviewCount: number;
}

const PAGE_SIZE = 50;

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
  } = {}
): Promise<TransactionsPageData> {
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("transactions")
    .select(
      `id, date, type, status, details,
       categories (name),
       subcategories (name),
       transaction_entries (amount_pln, accounts (name))`,
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options.type && options.type !== "all") {
    query = query.eq("type", options.type);
  }

  if (options.reviewOnly) {
    query = query.eq("status", "needs_review");
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

  const items: TransactionListItem[] = ((listRes.data ?? []) as TxRow[]).map((tx) => {
    const entries = tx.transaction_entries ?? [];
    const { amountPln, accountLabel } = formatAccountLabel(tx.type, entries);
    const cat = tx.categories as { name: string } | null;
    const sub = tx.subcategories as { name: string } | null;

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
    };
  });

  return {
    items,
    total: listRes.count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    needsReviewCount,
  };
}
