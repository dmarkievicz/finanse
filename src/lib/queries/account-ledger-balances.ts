import type { BalanceMode } from "@/lib/supabase/rpc";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

interface LedgerRow {
  account_id: string;
  amount: number;
  transactions: {
    date: string;
    deleted_at: string | null;
    is_opening_balance: boolean;
  };
}

export async function fetchAccountLedgerBalances(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  analysisStart: string | null,
  mode: BalanceMode
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("transaction_entries")
    .select(
      "account_id, amount, transactions!inner(date, deleted_at, is_opening_balance)"
    )
    .is("transactions.deleted_at", null)
    .lte("transactions.date", asOfDate);

  if (error) throw error;

  const useCurrent =
    mode === "current" || (mode !== "full" && analysisStart != null);

  const totals = new Map<string, number>();

  for (const row of (data ?? []) as LedgerRow[]) {
    const tx = row.transactions;
    if (useCurrent && analysisStart) {
      const inWindow =
        tx.date > analysisStart ||
        (tx.is_opening_balance && tx.date === analysisStart);
      if (!inWindow) continue;
    }

    const id = row.account_id;
    totals.set(id, (totals.get(id) ?? 0) + Number(row.amount));
  }

  return totals;
}
