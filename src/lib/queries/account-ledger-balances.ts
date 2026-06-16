import type { BalanceMode } from "@/lib/supabase/rpc";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { ledgerEntryNative } from "@/lib/balances/resolve-entry-pln";
import { normalizeCurrency } from "@/lib/fx/convert";

const LEDGER_PAGE_SIZE = 1000;

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
}

async function fetchAccountCurrencyMap(
  supabase: ServerSupabaseClient
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, default_currency")
    .is("deleted_at", null);

  if (error) throw error;

  const rows = (data ?? []) as { id: string; default_currency: string }[];
  return new Map(rows.map((row) => [row.id, row.default_currency]));
}

async function fetchAllLedgerRows(
  supabase: ServerSupabaseClient,
  asOfDate: string
): Promise<LedgerRow[]> {
  const rows: LedgerRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("transaction_entries")
      .select(
        "account_id, amount, amount_pln, currency, exchange_rate, accounts(default_currency), transactions!inner(date, deleted_at, is_opening_balance)"
      )
      .is("transactions.deleted_at", null)
      .lte("transactions.date", asOfDate)
      .range(offset, offset + LEDGER_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as LedgerRow[]));
    if (data.length < LEDGER_PAGE_SIZE) break;
    offset += LEDGER_PAGE_SIZE;
  }

  return rows;
}

export async function fetchAccountLedgerBalances(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  analysisStart: string | null,
  mode: BalanceMode
): Promise<AccountLedgerBalances> {
  const [rows, accountCurrencies] = await Promise.all([
    fetchAllLedgerRows(supabase, asOfDate),
    fetchAccountCurrencyMap(supabase),
  ]);

  const useCurrent =
    mode === "current" || (mode !== "full" && analysisStart != null);

  const native = new Map<string, number>();

  for (const row of rows) {
    const tx = row.transactions;
    if (useCurrent && analysisStart) {
      const inWindow =
        tx.date > analysisStart ||
        (tx.is_opening_balance && tx.date === analysisStart);
      if (!inWindow) continue;
    }

    const id = row.account_id;
    const nativeAmt = ledgerEntryNative({
      amount: Number(row.amount),
      amount_pln: Number(row.amount_pln),
      currency: row.currency,
      exchange_rate: Number(row.exchange_rate),
      accountCurrency:
        row.accounts?.default_currency ?? accountCurrencies.get(id) ?? null,
    });
    native.set(id, (native.get(id) ?? 0) + nativeAmt);
  }

  return { native };
}

export function resolveAccountNativeBalance(
  accountId: string,
  currency: string,
  nativeLedger: Map<string, number>,
  rpcBalancePln: number
): number {
  if (nativeLedger.has(accountId)) {
    return nativeLedger.get(accountId)!;
  }
  if (normalizeCurrency(currency) === "PLN") return rpcBalancePln;
  return 0;
}
