import type { BalanceMode } from "@/lib/supabase/rpc";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSignedEntryPln } from "@/lib/balances/resolve-entry-pln";

interface LedgerRow {
  account_id: string;
  amount: number;
  amount_pln: number;
  currency: string;
  exchange_rate: number;
  accounts: { default_currency: string } | null;
  transactions: {
    date: string;
    deleted_at: string | null;
    is_opening_balance: boolean;
  };
}

export interface AccountLedgerBalances {
  native: Map<string, number>;
  pln: Map<string, number>;
}

export async function fetchAccountLedgerBalances(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  analysisStart: string | null,
  mode: BalanceMode
): Promise<AccountLedgerBalances> {
  const { data, error } = await supabase
    .from("transaction_entries")
    .select(
      "account_id, amount, amount_pln, currency, exchange_rate, accounts(default_currency), transactions!inner(date, deleted_at, is_opening_balance)"
    )
    .is("transactions.deleted_at", null)
    .lte("transactions.date", asOfDate);

  if (error) throw error;

  const useCurrent =
    mode === "current" || (mode !== "full" && analysisStart != null);

  const native = new Map<string, number>();
  const pln = new Map<string, number>();

  for (const row of (data ?? []) as LedgerRow[]) {
    const tx = row.transactions;
    if (useCurrent && analysisStart) {
      const inWindow =
        tx.date > analysisStart ||
        (tx.is_opening_balance && tx.date === analysisStart);
      if (!inWindow) continue;
    }

    const id = row.account_id;
    const amount = Number(row.amount);
    native.set(id, (native.get(id) ?? 0) + amount);

    const plnDelta = resolveSignedEntryPln({
      amount,
      amount_pln: Number(row.amount_pln),
      currency: row.currency,
      exchange_rate: Number(row.exchange_rate),
      accountCurrency: row.accounts?.default_currency,
    });
    pln.set(id, (pln.get(id) ?? 0) + plnDelta);
  }

  return { native, pln };
}
