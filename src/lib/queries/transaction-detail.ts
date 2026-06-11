import type { TransactionStatus, TransactionType } from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

export interface TransactionEntryDetail {
  id: string;
  account_id: string;
  account_name: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  amount_pln: number;
}

export interface TransactionDetail {
  id: string;
  date: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string | null;
  details: string | null;
  category_id: string | null;
  category_name: string | null;
  subcategory_id: string | null;
  subcategory_name: string | null;
  import_id: string | null;
  is_opening_balance: boolean;
  entries: TransactionEntryDetail[];
  import_raw: Record<string, unknown> | null;
  import_validation_errors: { code?: string; message?: string }[] | null;
}

export async function fetchTransactionDetail(
  supabase: ServerSupabaseClient,
  id: string
): Promise<TransactionDetail | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, date, type, status, description, details, category_id, subcategory_id, import_id, is_opening_balance,
       categories (name),
       subcategories (name),
       transaction_entries (id, account_id, amount, currency, exchange_rate, amount_pln, accounts (name))`
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  type Row = {
    id: string;
    date: string;
    type: string;
    status: string;
    description: string | null;
    details: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    import_id: string | null;
    is_opening_balance: boolean;
    categories: { name: string } | null;
    subcategories: { name: string } | null;
    transaction_entries: {
      id: string;
      account_id: string;
      amount: number;
      currency: string;
      exchange_rate: number;
      amount_pln: number;
      accounts: { name: string } | null;
    }[];
  };

  const tx = data as Row;

  let import_raw: Record<string, unknown> | null = null;
  let import_validation_errors: { code?: string; message?: string }[] | null = null;
  if (tx.import_id) {
    const { data: importRow } = await supabase
      .from("import_rows")
      .select("raw_data, validation_errors")
      .eq("transaction_id", tx.id)
      .maybeSingle();
    const row = importRow as {
      raw_data: Record<string, unknown>;
      validation_errors: { code?: string; message?: string }[] | null;
    } | null;
    import_raw = row?.raw_data ?? null;
    import_validation_errors = row?.validation_errors ?? null;
  }

  return {
    id: tx.id,
    date: tx.date,
    type: tx.type as TransactionType,
    status: tx.status as TransactionStatus,
    description: tx.description,
    details: tx.details,
    category_id: tx.category_id,
    category_name: tx.categories?.name ?? null,
    subcategory_id: tx.subcategory_id,
    subcategory_name: tx.subcategories?.name ?? null,
    import_id: tx.import_id,
    is_opening_balance: tx.is_opening_balance,
    entries: (tx.transaction_entries ?? []).map((e) => ({
      id: e.id,
      account_id: e.account_id,
      account_name: e.accounts?.name ?? "—",
      amount: Number(e.amount),
      currency: e.currency,
      exchange_rate: Number(e.exchange_rate),
      amount_pln: Number(e.amount_pln),
    })),
    import_raw,
    import_validation_errors,
  };
}

export async function fetchLookupData(supabase: ServerSupabaseClient) {
  const [accounts, categories] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, default_currency, lifecycle_status")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("categories")
      .select("id, name, type")
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (accounts.error) throw accounts.error;
  if (categories.error) throw categories.error;

  return {
    accounts: (accounts.data ?? []) as {
      id: string;
      name: string;
      default_currency: string;
      lifecycle_status: string;
    }[],
    categories: (categories.data ?? []) as { id: string; name: string; type: string }[],
  };
}
